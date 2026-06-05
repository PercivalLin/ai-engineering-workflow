import { join, relative } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { appendDecisionEvent, appendTraceEvent, initProject, readProjectState } from "./project.mjs";
import { appendJsonl, ensureDir, exists, hashObject, hashText, listFiles, newId, nowIso, readJson, readJsonl, writeJson, writeText } from "./fs-utils.mjs";
import { projectPaths } from "./paths.mjs";

const execFileAsync = promisify(execFile);

async function tryGit(projectRoot, args) {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd: projectRoot, timeout: 5000, maxBuffer: 20 * 1024 * 1024 });
    return stdout;
  } catch {
    return null;
  }
}

async function currentDiff(projectRoot) {
  const diff = await tryGit(projectRoot, ["diff", "--binary"]);
  if (diff !== null) return diff;
  const files = await listFiles(projectRoot, { maxFiles: 3000, maxDepth: 8 });
  return `No git diff available. Working tree snapshot files:\n${files.map((file) => relative(projectRoot, file)).join("\n")}\n`;
}

async function changedFiles(projectRoot, fallback = []) {
  if (fallback.length > 0) return fallback;
  const status = await tryGit(projectRoot, ["status", "--short"]);
  if (!status) return [];
  return status
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
}

export async function recordChangeset(projectRoot, input = {}) {
  await initProject(projectRoot);
  const paths = projectPaths(projectRoot);
  await ensureDir(paths.changesets);
  const state = await readProjectState(projectRoot);
  const inferredRefs = await inferLatestTaskPacketRefs(paths, state, input);
  const diff = input.diff || await currentDiff(projectRoot);
  const diffHash = input.diff_hash || hashText(diff);
  const changeId = input.change_id || newId("change");
  const filesChanged = await changedFiles(projectRoot, input.files_changed || input.filesChanged || []);
  const change = {
    change_id: changeId,
    task_id: input.task_id || state.active_task_id,
    requirement_id: input.requirement_id || null,
    decision_id: input.decision_id || null,
    role: input.role || "developer",
    agent: input.agent || "unknown",
    prompt_ref: input.prompt_ref || input.promptRef || inferredRefs.prompt_ref || null,
    context_ref: input.context_ref || input.contextRef || inferredRefs.context_ref || null,
    files_changed: filesChanged,
    diff_hash: diffHash,
    commands_run: input.commands_run || input.commandsRun || [],
    tests_run: input.tests_run || input.testsRun || [],
    evidence_refs: input.evidence_refs || input.evidenceRefs || [],
    review_refs: input.review_refs || input.reviewRefs || [],
    risk_level: input.risk_level || input.riskLevel || "medium",
    rollback_plan: input.rollback_plan || input.rollbackPlan || "Revert this ChangeSet patch or restore affected files from version control.",
    timestamp: nowIso()
  };

  const changeFile = join(paths.changesets, `${changeId}.json`);
  const patchFile = join(paths.changesets, `${changeId}.patch`);
  await writeJson(changeFile, change);
  await writeText(patchFile, diff);

  await appendTraceEvent(projectRoot, {
    type: "changeset_recorded",
    task_id: change.task_id,
    role: change.role,
    agent: change.agent,
    change_id: changeId,
    prompt_ref: change.prompt_ref,
    context_ref: change.context_ref,
    diff_hash: diffHash,
    files_changed: filesChanged,
    evidence_refs: change.evidence_refs,
    artifact_refs: [changeFile, patchFile]
  });

  return {
    ok: true,
    changeset: change,
    files: {
      metadata: changeFile,
      patch: patchFile
    }
  };
}

async function inferLatestTaskPacketRefs(paths, state, input) {
  const hasPromptRef = Boolean(input.prompt_ref || input.promptRef);
  const hasContextRef = Boolean(input.context_ref || input.contextRef);
  if (hasPromptRef && hasContextRef) return {};

  const taskId = input.task_id || state.active_task_id;
  if (!taskId) return {};

  const trace = await readJsonl(paths.traceLedger);
  const role = input.role || null;
  const exact = latestRoleAction(trace, taskId, role);
  const fallback = exact || latestRoleAction(trace, taskId, null);
  return {
    prompt_ref: hasPromptRef ? null : fallback?.prompt_ref || null,
    context_ref: hasContextRef ? null : fallback?.context_ref || null
  };
}

function latestRoleAction(trace, taskId, role) {
  for (let index = trace.length - 1; index >= 0; index -= 1) {
    const event = trace[index];
    if (event.type !== "role_action_created") continue;
    if (event.task_id !== taskId) continue;
    if (role && event.role !== role) continue;
    return event;
  }
  return null;
}

export async function recordEvidence(projectRoot, input = {}) {
  await initProject(projectRoot);
  const paths = projectPaths(projectRoot);
  const evidenceId = input.evidence_id || newId("evidence");
  const evidence = {
    evidence_id: evidenceId,
    task_id: input.task_id || (await readProjectState(projectRoot)).active_task_id,
    evidence_type: input.evidence_type || input.type || "manual",
    role: input.role || null,
    agent: input.agent || null,
    outcome: input.outcome || "unknown",
    summary: input.summary || "",
    command: input.command || null,
    stdout_ref: input.stdout_ref || null,
    artifact_refs: input.artifact_refs || input.artifacts || [],
    related_changesets: input.related_changesets || input.changesets || [],
    timestamp: nowIso(),
    hash: null
  };
  evidence.hash = hashObject(evidence);
  const evidenceFile = join(paths.evidence, `${evidenceId}.json`);
  await writeJson(evidenceFile, evidence);

  await appendTraceEvent(projectRoot, {
    type: "evidence_recorded",
    task_id: evidence.task_id,
    role: evidence.role,
    evidence_id: evidenceId,
    evidence_type: evidence.evidence_type,
    outcome: evidence.outcome,
    artifact_refs: [evidenceFile, ...evidence.artifact_refs]
  });

  return {
    ok: true,
    evidence,
    file: evidenceFile
  };
}

export async function recordArtifact(projectRoot, input = {}) {
  await initProject(projectRoot);
  const paths = projectPaths(projectRoot);
  const state = await readProjectState(projectRoot);
  const artifactId = input.artifact_id || newId("artifact");
  const artifactType = normalizeArtifactType(input.artifact_type || input.type || "other");
  const role = input.role || null;
  const title = input.title || `${artifactType} artifact`;
  const content = input.content || "";
  const dir = artifactDir(paths, artifactType);
  const file = join(dir, `${artifactId}.md`);
  const frontMatter = [
    "---",
    `artifact_id: ${artifactId}`,
    `task_id: ${input.task_id || state.active_task_id || ""}`,
    `artifact_type: ${artifactType}`,
    `role: ${role || ""}`,
    `created_at: ${nowIso()}`,
    "---",
    ""
  ].join("\n");
  await writeText(file, `${frontMatter}# ${title}\n\n${content}\n`);

  for (const assumption of input.assumptions || []) {
    await appendDecisionEvent(projectRoot, {
      type: "assumption_recorded",
      task_id: input.task_id || state.active_task_id,
      artifact_id: artifactId,
      role,
      assumption
    });
  }

  await appendTraceEvent(projectRoot, {
    type: "artifact_recorded",
    task_id: input.task_id || state.active_task_id,
    role,
    artifact_id: artifactId,
    artifact_type: artifactType,
    title,
    artifact_refs: [file],
    assumptions: input.assumptions || []
  });

  return {
    ok: true,
    artifact: {
      artifact_id: artifactId,
      task_id: input.task_id || state.active_task_id,
      artifact_type: artifactType,
      role,
      title,
      file
    }
  };
}

export async function recordBacklog(projectRoot, input = {}) {
  await initProject(projectRoot);
  const paths = projectPaths(projectRoot);
  const state = await readProjectState(projectRoot);
  const items = (input.items || []).map((item, index) => ({
    backlog_id: item.backlog_id || newId("backlog"),
    task_id: state.active_task_id,
    title: item.title || `Backlog item ${index + 1}`,
    description: item.description || "",
    role: item.role || "developer",
    priority: item.priority || index + 1,
    status: item.status || "ready",
    definition_of_done: item.definition_of_done || item.definitionOfDone || [],
    risk_level: item.risk_level || item.riskLevel || "medium",
    created_at: nowIso()
  }));
  state.backlog = items;
  state.role_queue = [...new Set([...(state.role_queue || []), ...items.map((item) => item.role)])];
  state.updated_at = nowIso();
  await writeJson(paths.workflowState, state);

  const backlogFile = join(paths.context, `backlog-${state.active_task_id || "project"}.json`);
  await writeJson(backlogFile, items);
  await appendTraceEvent(projectRoot, {
    type: "backlog_recorded",
    task_id: state.active_task_id,
    role: input.role || "delivery_manager",
    count: items.length,
    artifact_refs: [backlogFile]
  });

  return {
    ok: true,
    backlog: items,
    file: backlogFile
  };
}

export async function exportAuditBundle(projectRoot, input = {}) {
  await initProject(projectRoot);
  const paths = projectPaths(projectRoot);
  const state = await readProjectState(projectRoot);
  const taskId = input.task_id || state.active_task_id || "project";
  const trace = await readJsonl(paths.traceLedger);
  const decisions = await readJsonl(paths.decisionLog);
  const evidenceFiles = await listFiles(paths.evidence, { maxDepth: 1, maxFiles: 5000, ignore: [] });
  const changesetFiles = await listFiles(paths.changesets, { maxDepth: 1, maxFiles: 5000, ignore: [] });
  const artifacts = await listFiles(paths.docsRoot, { maxDepth: 4, maxFiles: 5000, ignore: [] });
  const evidence = [];
  const changesets = [];
  for (const file of evidenceFiles.filter((file) => file.endsWith(".json"))) {
    evidence.push(await readJson(file));
  }
  for (const file of changesetFiles.filter((file) => file.endsWith(".json"))) {
    changesets.push(await readJson(file));
  }

  const traceability = buildTraceability({ state, trace, decisions, evidence, changesets });
  const bundle = {
    bundle_id: newId("audit"),
    task_id: taskId,
    exported_at: nowIso(),
    project_root: projectRoot,
    state,
    trace,
    decisions,
    evidence,
    changesets,
    artifacts,
    traceability,
    hash: null
  };
  bundle.hash = hashObject(bundle);

  const bundleJson = join(paths.auditBundles, `${bundle.bundle_id}.json`);
  const bundleMd = join(paths.auditBundles, `${bundle.bundle_id}.md`);
  await writeJson(bundleJson, bundle);
  await writeText(bundleMd, renderAuditMarkdown(bundle));

  await appendTraceEvent(projectRoot, {
    type: "audit_bundle_exported",
    task_id: taskId,
    role: "trace_auditor",
    bundle_id: bundle.bundle_id,
    artifact_refs: [bundleJson, bundleMd]
  });

  await appendDecisionEvent(projectRoot, {
    type: "audit_export",
    task_id: taskId,
    bundle_id: bundle.bundle_id,
    hash: bundle.hash
  });

  return {
    ok: true,
    bundle_id: bundle.bundle_id,
    files: {
      json: bundleJson,
      markdown: bundleMd
    },
    traceability
  };
}

function buildTraceability({ state, trace, decisions, evidence, changesets }) {
  const requirements = [];
  for (const goal of state.goals || []) {
    requirements.push({
      requirement_id: goal.task_id,
      title: goal.title,
      decisions: decisions.filter((decision) => decision.task_id === goal.task_id || decision.decision_id),
      changesets: changesets.filter((change) => change.task_id === goal.task_id),
      evidence: evidence.filter((item) => item.task_id === goal.task_id),
      trace_events: trace.filter((event) => event.task_id === goal.task_id)
    });
  }
  const byFile = {};
  for (const change of changesets) {
    for (const file of change.files_changed || []) {
      byFile[file] ||= [];
      byFile[file].push({
        change_id: change.change_id,
        task_id: change.task_id,
        role: change.role,
        agent: change.agent,
        diff_hash: change.diff_hash,
        evidence_refs: change.evidence_refs,
        rollback_plan: change.rollback_plan
      });
    }
  }
  return {
    requirements,
    files: byFile,
    missing_trace_findings: findMissingTrace(changesets)
  };
}

function findMissingTrace(changesets) {
  const findings = [];
  for (const change of changesets) {
    if (!change.task_id) findings.push({ change_id: change.change_id, issue: "Missing task_id" });
    if (!change.diff_hash) findings.push({ change_id: change.change_id, issue: "Missing diff_hash" });
    if (!change.agent) findings.push({ change_id: change.change_id, issue: "Missing agent" });
    if (!change.prompt_ref) findings.push({ change_id: change.change_id, issue: "Missing prompt_ref" });
    if (!change.context_ref) findings.push({ change_id: change.change_id, issue: "Missing context_ref" });
    if (!change.files_changed || change.files_changed.length === 0) findings.push({ change_id: change.change_id, issue: "Missing files_changed" });
    if (!change.evidence_refs || change.evidence_refs.length === 0) findings.push({ change_id: change.change_id, issue: "Missing evidence_refs" });
    if (!change.rollback_plan) findings.push({ change_id: change.change_id, issue: "Missing rollback_plan" });
  }
  return findings;
}

function normalizeArtifactType(type) {
  return String(type || "other").toLowerCase().replace(/[\s-]+/g, "_");
}

function artifactDir(paths, type) {
  if (["requirements", "prd", "srs", "acceptance"].includes(type)) return paths.requirements;
  if (["adr", "architecture", "design", "threat_model"].includes(type)) return paths.adr;
  if (["release", "changelog", "handoff", "deployment"].includes(type)) return paths.release;
  if (["retro", "retrospective", "learning"].includes(type)) return paths.retro;
  return paths.docsRoot;
}

function renderAuditMarkdown(bundle) {
  return [
    `# Audit Bundle ${bundle.bundle_id}`,
    "",
    `- Task ID: ${bundle.task_id}`,
    `- Exported at: ${bundle.exported_at}`,
    `- Hash: ${bundle.hash}`,
    "",
    "## Summary",
    "",
    `- Trace events: ${bundle.trace.length}`,
    `- Decisions: ${bundle.decisions.length}`,
    `- Evidence records: ${bundle.evidence.length}`,
    `- ChangeSets: ${bundle.changesets.length}`,
    `- Artifacts: ${bundle.artifacts.length}`,
    "",
    "## Missing Trace Findings",
    "",
    ...(bundle.traceability.missing_trace_findings.length
      ? bundle.traceability.missing_trace_findings.map((finding) => `- ${finding.change_id}: ${finding.issue}`)
      : ["- None"]),
    "",
    "## ChangeSets",
    "",
    ...bundle.changesets.map((change) => `- ${change.change_id}: ${change.agent} / ${change.role} / ${change.diff_hash}`),
    ""
  ].join("\n");
}
