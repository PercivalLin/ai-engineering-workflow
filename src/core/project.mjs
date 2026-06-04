import { join } from "node:path";
import { ROLES, WORKFLOW_PHASES } from "./defaults.mjs";
import { appendJsonl, ensureDir, exists, newId, nowIso, readJson, writeJson, writeText } from "./fs-utils.mjs";
import { ensureGlobalMemory } from "./memory.mjs";
import { projectPaths } from "./paths.mjs";

export async function initProject(projectRoot) {
  const paths = projectPaths(projectRoot);
  await Promise.all([
    ensureDir(paths.project),
    ensureDir(paths.evidence),
    ensureDir(paths.changesets),
    ensureDir(paths.context),
    ensureDir(paths.taskPackets),
    ensureDir(paths.auditBundles),
    ensureDir(paths.requirements),
    ensureDir(paths.adr),
    ensureDir(paths.release),
    ensureDir(paths.retro)
  ]);
  await ensureGlobalMemory();

  if (!(await exists(paths.projectYaml))) {
    await writeText(paths.projectYaml, [
      "name: AI Engineering Project",
      "risk_mode: high_compliance",
      "automation:",
      "  allow_code_changes: true",
      "  require_trace_for_changes: true",
      "  release_requires_human_approval: true",
      "memory:",
      "  prefer_global_experience: true",
      "  project_context_only: true",
      ""
    ].join("\n"));
  }

  if (!(await exists(paths.workflowState))) {
    await writeJson(paths.workflowState, {
      version: 1,
      project_root: projectRoot,
      current_phase: "intake",
      active_task_id: null,
      goals: [],
      pending_decisions: [],
      backlog: [],
      role_queue: [],
      phase_history: [],
      created_at: nowIso(),
      updated_at: nowIso()
    });
  }

  return {
    ok: true,
    project_dir: paths.project,
    global_memory_initialized: true,
    roles: Object.keys(ROLES),
    phases: WORKFLOW_PHASES
  };
}

export async function readProjectState(projectRoot) {
  await initProject(projectRoot);
  return readJson(projectPaths(projectRoot).workflowState);
}

export async function writeProjectState(projectRoot, state) {
  const paths = projectPaths(projectRoot);
  state.updated_at = nowIso();
  await writeJson(paths.workflowState, state);
  return state;
}

export async function appendTraceEvent(projectRoot, event) {
  const paths = projectPaths(projectRoot);
  const entry = {
    event_id: newId("evt"),
    timestamp: nowIso(),
    ...event
  };
  await appendJsonl(paths.traceLedger, entry);
  return entry;
}

export async function appendDecisionEvent(projectRoot, event) {
  const paths = projectPaths(projectRoot);
  const entry = {
    event_id: newId("decision_evt"),
    timestamp: nowIso(),
    ...event
  };
  await appendJsonl(paths.decisionLog, entry);
  return entry;
}

export async function createGoal(projectRoot, input = {}) {
  await initProject(projectRoot);
  const state = await readProjectState(projectRoot);
  const taskId = input.task_id || newId("task");
  const goal = {
    task_id: taskId,
    title: input.title || "Untitled goal",
    description: input.description || "",
    risk_level: input.risk_level || "medium",
    target_users: input.target_users || null,
    success_metrics: input.success_metrics || [],
    status: "active",
    created_by: input.created_by || "agent",
    created_at: nowIso()
  };
  state.goals.push(goal);
  state.active_task_id = taskId;
  state.current_phase = "intake";
  state.phase_history.push({ phase: "intake", task_id: taskId, entered_at: nowIso() });
  state.role_queue = ["pm", "delivery_manager", "learning_coach"];
  await writeProjectState(projectRoot, state);

  const paths = projectPaths(projectRoot);
  const taskCard = join(paths.requirements, `${taskId}-task-card.md`);
  await writeText(taskCard, [
    `# Task Card: ${goal.title}`,
    "",
    `- Task ID: ${taskId}`,
    `- Risk level: ${goal.risk_level}`,
    `- Created by: ${goal.created_by}`,
    `- Created at: ${goal.created_at}`,
    "",
    "## Goal",
    "",
    goal.description || "_No description provided yet._",
    "",
    "## Trace Policy",
    "",
    "Every code modification must produce a ChangeSet with diff hash, agent, evidence, review references, and rollback plan.",
    ""
  ].join("\n"));

  await appendTraceEvent(projectRoot, {
    type: "goal_created",
    task_id: taskId,
    role: "pm",
    summary: goal.title,
    artifact_refs: [taskCard]
  });

  return {
    ok: true,
    goal,
    task_card: taskCard,
    next_phase: "context_scan"
  };
}
