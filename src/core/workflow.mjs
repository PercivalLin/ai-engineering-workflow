import { join } from "node:path";
import { PHASE_OWNER, ROLES, WORKFLOW_PHASES } from "./defaults.mjs";
import { hashObject, newId, nowIso, readJson, readJsonl, writeJson, writeText } from "./fs-utils.mjs";
import { retrieveGlobalExperience } from "./memory.mjs";
import { appendDecisionEvent, appendTraceEvent, initProject, readProjectState, writeProjectState } from "./project.mjs";
import { projectPaths } from "./paths.mjs";

export async function getRoleAction(projectRoot, input = {}) {
  await initProject(projectRoot);
  const state = await readProjectState(projectRoot);
  const role = normalizeRole(input.role || PHASE_OWNER[state.current_phase] || "delivery_manager");
  const roleDef = ROLES[role];
  if (!roleDef) return { ok: false, reason: `Unknown role: ${input.role}` };

  const context = await readLatestContext(projectRoot);
  const memoryQuery = [
    input.objective,
    state.current_phase,
    role,
    state.goals?.find((goal) => goal.task_id === state.active_task_id)?.title
  ].filter(Boolean).join(" ");
  const memory = await retrieveGlobalExperience(projectRoot, {
    query: memoryQuery,
    limit: input.limit || 8,
    scopes: inferScopes(context)
  });
  const packet = buildRolePacket({ state, role, roleDef, context, memory, objective: input.objective || "" });
  const promptRef = hashObject(packet);
  const paths = projectPaths(projectRoot);
  const packetFile = join(paths.taskPackets, `${packet.packet_id}.json`);
  const packetMd = join(paths.taskPackets, `${packet.packet_id}.md`);
  await writeJson(packetFile, { ...packet, prompt_ref: promptRef });
  await writeText(packetMd, renderRolePacketMarkdown({ ...packet, prompt_ref: promptRef }));

  await appendTraceEvent(projectRoot, {
    type: "role_action_created",
    task_id: state.active_task_id,
    role,
    phase: state.current_phase,
    prompt_ref: promptRef,
    context_ref: context?.hash || null,
    artifact_refs: [packetFile, packetMd]
  });

  return {
    ok: true,
    role,
    phase: state.current_phase,
    prompt_ref: promptRef,
    packet,
    files: {
      json: packetFile,
      markdown: packetMd
    }
  };
}

export async function askUserDecision(projectRoot, input = {}) {
  await initProject(projectRoot);
  const state = await readProjectState(projectRoot);
  const goal = activeGoal(state);
  const question = buildDecisionQuestion({ state, goal, input });
  state.pending_decisions.push(question);
  await writeProjectState(projectRoot, state);
  await appendDecisionEvent(projectRoot, {
    type: "decision_requested",
    task_id: state.active_task_id,
    decision_id: question.decision_id,
    question: question.question,
    default_assumption: question.default_assumption,
    affected_roles: question.affected_roles,
    affected_gates: question.affected_gates
  });
  await appendTraceEvent(projectRoot, {
    type: "decision_requested",
    task_id: state.active_task_id,
    role: "pm",
    decision_id: question.decision_id,
    summary: question.question
  });
  return {
    ok: true,
    decision: question
  };
}

export async function recordUserDecision(projectRoot, input = {}) {
  await initProject(projectRoot);
  const decisionId = input.decision_id || input.id;
  if (!decisionId) return { ok: false, reason: "decision_id is required" };
  const state = await readProjectState(projectRoot);
  const decision = state.pending_decisions.find((item) => item.decision_id === decisionId);
  if (!decision) return { ok: false, reason: `No pending decision found for ${decisionId}` };
  decision.status = "answered";
  decision.answer = input.answer || "";
  decision.answered_by = input.answered_by || input.by || "user";
  decision.answered_at = nowIso();
  await writeProjectState(projectRoot, state);
  await appendDecisionEvent(projectRoot, {
    type: "decision_answered",
    task_id: state.active_task_id,
    decision_id: decisionId,
    answer: decision.answer,
    answered_by: decision.answered_by,
    affected_roles: decision.affected_roles,
    affected_gates: decision.affected_gates
  });
  await appendTraceEvent(projectRoot, {
    type: "decision_answered",
    task_id: state.active_task_id,
    role: "pm",
    decision_id: decisionId,
    summary: decision.answer
  });
  return {
    ok: true,
    decision
  };
}

export async function dispatchAgentTask(projectRoot, input = {}) {
  await initProject(projectRoot);
  const adapter = input.adapter || "codex";
  const role = input.role || "developer";
  const roleAction = await getRoleAction(projectRoot, {
    role,
    objective: input.objective || ""
  });
  if (!roleAction.ok) return roleAction;
  const taskId = roleAction.packet.task_id;
  const dispatch = {
    dispatch_id: newId("dispatch"),
    adapter,
    role,
    task_id: taskId,
    prompt_ref: roleAction.prompt_ref,
    mode: "external_agent",
    owns_workflow_decisions: false,
    instructions: adapterInstructions(adapter, roleAction.files.markdown),
    created_at: nowIso()
  };
  await appendTraceEvent(projectRoot, {
    type: "agent_task_dispatched",
    task_id: taskId,
    role,
    agent: adapter,
    dispatch_id: dispatch.dispatch_id,
    prompt_ref: dispatch.prompt_ref,
    artifact_refs: [roleAction.files.markdown]
  });
  return {
    ok: true,
    dispatch,
    role_action: roleAction
  };
}

export async function runGate(projectRoot, input = {}) {
  await initProject(projectRoot);
  const state = await readProjectState(projectRoot);
  const phase = input.phase || state.current_phase;
  const paths = projectPaths(projectRoot);
  const trace = await readJsonl(paths.traceLedger);
  const decisions = await readJsonl(paths.decisionLog);
  const evidence = await loadEvidence(paths);
  const changesets = await loadChangesets(paths);
  const artifacts = await listArtifactNames(paths);
  const findings = gateFindings({ phase, state, trace, decisions, evidence, changesets, artifacts });
  const passed = findings.every((finding) => finding.severity !== "blocker");
  let next_phase = state.current_phase;

  if (passed && phase === state.current_phase) {
    const index = WORKFLOW_PHASES.indexOf(phase);
    if (index >= 0 && index < WORKFLOW_PHASES.length - 1) {
      next_phase = WORKFLOW_PHASES[index + 1];
      state.current_phase = next_phase;
      state.phase_history.push({ phase: next_phase, task_id: state.active_task_id, entered_at: nowIso() });
      const owner = PHASE_OWNER[next_phase];
      if (owner && !state.role_queue.includes(owner)) state.role_queue.push(owner);
      await writeProjectState(projectRoot, state);
    }
  }

  await appendTraceEvent(projectRoot, {
    type: "gate_run",
    task_id: state.active_task_id,
    role: PHASE_OWNER[phase] || "delivery_manager",
    phase,
    passed,
    next_phase,
    findings
  });

  return {
    ok: true,
    phase,
    passed,
    next_phase,
    findings
  };
}

function normalizeRole(role) {
  return String(role || "").toLowerCase().replace(/[\s-]+/g, "_");
}

async function readLatestContext(projectRoot) {
  const paths = projectPaths(projectRoot);
  return readJson(join(paths.context, "latest-context.json"), null);
}

function activeGoal(state) {
  return (state.goals || []).find((goal) => goal.task_id === state.active_task_id) || state.goals?.at(-1) || null;
}

function inferScopes(context) {
  if (!context) return ["global"];
  const scopes = ["global"];
  for (const language of Object.keys(context.language_counts || {})) {
    scopes.push(`stack:${language}`);
  }
  return scopes;
}

function buildRolePacket({ state, role, roleDef, context, memory, objective }) {
  const goal = activeGoal(state);
  return {
    packet_id: newId("packet"),
    task_id: state.active_task_id,
    phase: state.current_phase,
    role,
    role_title: roleDef.title,
    mission: roleDef.mission,
    objective: objective || goal?.title || state.current_phase,
    goal,
    required_inputs: roleDef.inputs,
    required_outputs: roleDef.outputs,
    gates: roleDef.gates,
    project_context_ref: context?.hash || null,
    project_context_summary: context ? {
      file_count: context.file_count,
      language_counts: context.language_counts,
      notable_files: context.notable_files,
      ci_files: context.ci_files,
      inferred_test_commands: context.inferred_test_commands
    } : null,
    global_experience: memory.experiences || [],
    operating_rules: [
      "Explore repository facts before asking the user.",
      "Ask the user only for decisions that materially affect product behavior, cost, compliance, architecture, or risk.",
      "Record assumptions in the decision log.",
      "Every code modification must produce a ChangeSet with diff hash, commands, tests, evidence, review references, and rollback plan.",
      "Do not bypass tests, security checks, review gates, or trace requirements."
    ],
    expected_next_action: expectedNextAction(role, state.current_phase),
    created_at: nowIso()
  };
}

function expectedNextAction(role, phase) {
  if (phase === "context_scan") return "Run or request scan_project_context, then retrieve global experience.";
  if (phase === "clarification_gate") return "Generate only high-impact user questions that cannot be answered from context.";
  if (role === "developer") return "Implement the smallest useful slice, run relevant checks, then record a ChangeSet.";
  if (role === "reviewer") return "Review ChangeSets against requirements, ADR, evidence, and rollback plan.";
  if (role === "trace_auditor") return "Export an audit bundle and report missing traceability.";
  return "Produce the role outputs and record artifacts or evidence before running the next gate.";
}

function renderRolePacketMarkdown(packet) {
  return [
    `# ${packet.role_title} Task Packet`,
    "",
    `- Packet ID: ${packet.packet_id}`,
    `- Task ID: ${packet.task_id || "none"}`,
    `- Phase: ${packet.phase}`,
    `- Prompt ref: ${packet.prompt_ref}`,
    "",
    "## Mission",
    "",
    packet.mission,
    "",
    "## Objective",
    "",
    packet.objective || "_No objective provided._",
    "",
    "## Required Outputs",
    "",
    ...packet.required_outputs.map((item) => `- ${item}`),
    "",
    "## Operating Rules",
    "",
    ...packet.operating_rules.map((item) => `- ${item}`),
    "",
    "## Global Experience",
    "",
    ...(packet.global_experience.length
      ? packet.global_experience.map((item) => `- ${item.id}: ${item.lesson}`)
      : ["- No matching global experience found."]),
    "",
    "## Project Context",
    "",
    packet.project_context_summary ? JSON.stringify(packet.project_context_summary, null, 2) : "_No scan found. Run scan_project_context._",
    "",
    "## Expected Next Action",
    "",
    packet.expected_next_action,
    ""
  ].join("\n");
}

function buildDecisionQuestion({ state, goal, input }) {
  const topic = input.topic || inferQuestionTopic(goal);
  const impact = input.impact || "high";
  const decisionId = input.decision_id || newId("decision");
  const base = {
    decision_id: decisionId,
    task_id: state.active_task_id,
    topic,
    impact,
    status: "pending",
    created_at: nowIso()
  };
  if (topic === "target_users") {
    return {
      ...base,
      question: "Who are the primary users for this product or feature?",
      recommended_option: "Use the most likely target users from the product goal, then validate during review.",
      alternatives: ["Ask for a named persona", "Treat it as an internal engineering tool until corrected"],
      default_assumption: "Primary users are developers using AI coding agents.",
      affected_roles: ["pm", "qa", "writer"],
      affected_gates: ["requirements", "review_gate"]
    };
  }
  if (topic === "success_metrics") {
    return {
      ...base,
      question: "What measurable result defines success for this product or feature?",
      recommended_option: "Use observable delivery and quality metrics tied to the stated goal.",
      alternatives: ["Use user acceptance only", "Use operational metrics only"],
      default_assumption: "Success means the AI can produce a traceable deliverable with passing verification and audit export.",
      affected_roles: ["pm", "delivery_manager", "qa", "trace_auditor"],
      affected_gates: ["requirements", "release_readiness", "archive"]
    };
  }
  return {
    ...base,
    question: input.question || `Please clarify: ${topic}`,
    recommended_option: input.recommended_option || "Proceed with the safest reversible option.",
    alternatives: input.alternatives || ["Pause until clarified", "Use a narrow assumption and record it"],
    default_assumption: input.default_assumption || "Use a conservative, reversible default and record it in the decision log.",
    affected_roles: input.affected_roles || ["pm", "architect", "delivery_manager"],
    affected_gates: input.affected_gates || ["clarification_gate", "requirements"]
  };
}

function inferQuestionTopic(goal) {
  if (!goal?.target_users) return "target_users";
  if (!goal?.success_metrics?.length) return "success_metrics";
  return "decision";
}

function adapterInstructions(adapter, packetPath) {
  const base = `Use the task packet at ${packetPath}. Follow the role, produce required artifacts, then record evidence and a ChangeSet.`;
  if (adapter === "codex") {
    return `${base} In Codex, open the repository, read the packet, execute the work, and call record_changeset after edits.`;
  }
  if (adapter === "claude_code") {
    return `${base} In Claude Code, load the packet into the session, execute only the delegated role, and return evidence refs.`;
  }
  if (adapter === "cursor") {
    return `${base} In Cursor, paste the packet into the agent chat and keep changes scoped to the delegated task.`;
  }
  return base;
}

async function loadEvidence(paths) {
  const events = [];
  try {
    const files = await (await import("./fs-utils.mjs")).listFiles(paths.evidence, { maxDepth: 1, maxFiles: 5000, ignore: [] });
    for (const file of files.filter((item) => item.endsWith(".json"))) events.push(await readJson(file));
  } catch {
    return [];
  }
  return events;
}

async function loadChangesets(paths) {
  const changesets = [];
  try {
    const files = await (await import("./fs-utils.mjs")).listFiles(paths.changesets, { maxDepth: 1, maxFiles: 5000, ignore: [] });
    for (const file of files.filter((item) => item.endsWith(".json"))) changesets.push(await readJson(file));
  } catch {
    return [];
  }
  return changesets;
}

async function listArtifactNames(paths) {
  try {
    const { listFiles } = await import("./fs-utils.mjs");
    return await listFiles(paths.docsRoot, { maxDepth: 4, maxFiles: 5000, ignore: [] });
  } catch {
    return [];
  }
}

function gateFindings({ phase, state, trace, decisions, evidence, changesets, artifacts }) {
  const findings = [];
  const unresolved = (state.pending_decisions || []).filter((decision) => decision.status !== "answered");
  if (phase === "intake" && !state.active_task_id) {
    findings.push(blocker("No active task exists. Run create_goal first."));
  }
  if (phase === "context_scan" && !trace.some((event) => event.type === "context_scanned")) {
    findings.push(blocker("Project context has not been scanned."));
  }
  if (phase === "experience_retrieval" && !trace.some((event) => event.type === "experience_retrieved")) {
    findings.push(blocker("Global engineering experience has not been retrieved."));
  }
  if (phase === "clarification_gate" && unresolved.length > 0) {
    findings.push(blocker(`There are ${unresolved.length} unresolved user decisions.`));
  }
  if (phase === "requirements" && !artifacts.some((file) => file.includes("/requirements/"))) {
    findings.push(blocker("Requirements artifact is missing."));
  }
  if (phase === "architecture" && !artifacts.some((file) => file.includes("/adr/"))) {
    findings.push(blocker("Architecture ADR artifact is missing."));
  }
  if (phase === "planning" && (!state.backlog || state.backlog.length === 0)) {
    findings.push(blocker("Backlog is empty. Delivery Manager must split work into traceable tasks."));
  }
  if (phase === "build_loop" && changesets.length === 0) {
    findings.push(blocker("No ChangeSet has been recorded."));
  }
  if (phase === "verification_loop" && !evidence.some((item) => ["test", "scan", "security", "qa"].includes(item.evidence_type))) {
    findings.push(blocker("Verification evidence is missing."));
  }
  if (phase === "review_gate" && !evidence.some((item) => item.evidence_type === "review" && ["passed", "approved"].includes(item.outcome))) {
    findings.push(blocker("Passing review evidence is missing."));
  }
  if (phase === "release_readiness" && !artifacts.some((file) => file.includes("/release/"))) {
    findings.push(blocker("Release readiness artifact is missing."));
  }
  if (phase === "retro_learn" && !trace.some((event) => event.type === "learning_proposed")) {
    findings.push(warning("No learning proposal has been recorded yet."));
  }
  if (phase === "archive" && !trace.some((event) => event.type === "audit_bundle_exported")) {
    findings.push(blocker("Audit bundle has not been exported."));
  }
  if (findings.length === 0) findings.push({ severity: "info", message: "Gate passed." });
  return findings;
}

function blocker(message) {
  return { severity: "blocker", message };
}

function warning(message) {
  return { severity: "warning", message };
}
