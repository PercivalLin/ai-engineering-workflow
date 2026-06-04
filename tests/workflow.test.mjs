import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createGoal, initProject, readProjectState } from "../src/core/project.mjs";
import { scanProjectContext } from "../src/core/context.mjs";
import { retrieveGlobalExperience, proposeLearning, promoteOrRollbackRule } from "../src/core/memory.mjs";
import { askUserDecision, dispatchAgentTask, getRoleAction, recordUserDecision, runGate } from "../src/core/workflow.mjs";
import { exportAuditBundle, recordArtifact, recordBacklog, recordChangeset, recordEvidence } from "../src/core/trace.mjs";

test("runs the core workflow and exports an audit bundle", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aiwf-project-"));
  process.env.AI_ENGINEERING_HOME = await mkdtemp(join(tmpdir(), "aiwf-global-"));
  await writeFile(join(projectRoot, "package.json"), JSON.stringify({
    name: "fixture",
    type: "module",
    scripts: {
      test: "node --test",
      lint: "node --check index.js"
    }
  }, null, 2));
  await writeFile(join(projectRoot, "index.js"), "export const ok = true;\n");

  const init = await initProject(projectRoot);
  assert.equal(init.ok, true);

  const goal = await createGoal(projectRoot, {
    title: "Build traceable AI team runtime",
    description: "Verify the runtime can coordinate agents and record evidence.",
    risk_level: "high"
  });
  assert.equal(goal.ok, true);
  assert.ok(goal.goal.task_id);

  const context = await scanProjectContext(projectRoot);
  assert.equal(context.ok, true);
  assert.equal(context.context.package.name, "fixture");

  const memory = await retrieveGlobalExperience(projectRoot, {
    query: "traceable changes tests",
    limit: 5
  });
  assert.equal(memory.ok, true);
  assert.ok(memory.experiences.length > 0);

  const roleAction = await getRoleAction(projectRoot, {
    role: "developer",
    objective: "Implement the smallest useful slice"
  });
  assert.equal(roleAction.ok, true);
  assert.equal(roleAction.role, "developer");
  assert.ok(roleAction.prompt_ref);

  const artifact = await recordArtifact(projectRoot, {
    artifact_type: "adr",
    role: "architect",
    title: "Runtime architecture",
    content: "Use MCP as the primary integration surface.",
    assumptions: ["External agents execute code; workflow runtime owns gates."]
  });
  assert.equal(artifact.ok, true);

  const backlog = await recordBacklog(projectRoot, {
    items: [
      {
        title: "Implement trace ledger",
        role: "developer",
        definition_of_done: ["ChangeSet recorded", "Audit bundle exports"]
      }
    ]
  });
  assert.equal(backlog.ok, true);
  assert.equal(backlog.backlog.length, 1);

  const decision = await askUserDecision(projectRoot, {
    topic: "success_metrics"
  });
  assert.equal(decision.ok, true);
  const answered = await recordUserDecision(projectRoot, {
    decision_id: decision.decision.decision_id,
    answer: "Success means audit bundle export succeeds.",
    answered_by: "test"
  });
  assert.equal(answered.ok, true);

  const evidence = await recordEvidence(projectRoot, {
    evidence_type: "test",
    outcome: "passed",
    summary: "Fixture verification passed.",
    command: "node --test"
  });
  assert.equal(evidence.ok, true);

  const change = await recordChangeset(projectRoot, {
    role: "developer",
    agent: "codex",
    prompt_ref: roleAction.prompt_ref,
    context_ref: context.context.hash,
    files_changed: ["index.js"],
    evidence_refs: [evidence.evidence.evidence_id],
    risk_level: "low",
    rollback_plan: "Revert index.js to its previous version."
  });
  assert.equal(change.ok, true);
  assert.ok(change.changeset.diff_hash);

  const dispatch = await dispatchAgentTask(projectRoot, {
    adapter: "codex",
    role: "reviewer",
    objective: "Review the implementation"
  });
  assert.equal(dispatch.ok, true);
  assert.equal(dispatch.dispatch.adapter, "codex");

  const learning = await proposeLearning(projectRoot, {
    type: "case",
    lesson: "Audit export should be verified after trace-ledger changes.",
    evidence_refs: [evidence.evidence.evidence_id],
    confidence: 0.6
  });
  assert.equal(learning.ok, true);

  const sandboxed = await promoteOrRollbackRule({
    rule_id: learning.learning.id,
    action: "sandbox",
    reason: "Exercise sandbox activation."
  });
  assert.equal(sandboxed.ok, true);
  assert.equal(sandboxed.status, "sandbox");

  const gate = await runGate(projectRoot, { phase: "build_loop" });
  assert.equal(gate.ok, true);
  assert.equal(gate.passed, true);

  const audit = await exportAuditBundle(projectRoot);
  assert.equal(audit.ok, true);
  assert.ok(audit.files.json.endsWith(".json"));
  assert.equal(audit.traceability.missing_trace_findings.length, 0);

  const state = await readProjectState(projectRoot);
  assert.equal(state.active_task_id, goal.goal.task_id);
});
