import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { advanceWorkflow } from "../src/core/workflow.mjs";
import { readProjectState } from "../src/core/project.mjs";
import { readJsonl } from "../src/core/fs-utils.mjs";
import { makeFixtureProject } from "./helpers.mjs";

test("advance_workflow creates a goal, scans, retrieves memory, and asks only high-impact missing product decisions", async () => {
  const fixture = await makeFixtureProject("aiwf-auto-question-");
  try {
    const result = await advanceWorkflow(fixture.projectRoot, {
      title: "Build automated planner",
      description: "The workflow should plan and record by itself.",
      risk_level: "high"
    });

    assert.equal(result.status, "user_input_required");
    assert.equal(result.pending_decisions.length, 1);
    assert.equal(result.pending_decisions[0].topic, "target_users");
    assert.ok(result.actions.some((action) => action.action === "create_goal"));
    assert.ok(result.actions.some((action) => action.action === "scan_project_context"));
    assert.ok(result.actions.some((action) => action.action === "retrieve_global_experience"));

    const state = await readProjectState(fixture.projectRoot);
    assert.equal(state.current_phase, "clarification_gate");
    assert.equal(state.pending_decisions[0].status, "pending");
  } finally {
    fixture.restoreEnv();
  }
});

test("advance_workflow can auto-plan and record artifacts until external implementation is required", async () => {
  const fixture = await makeFixtureProject("aiwf-auto-plan-");
  try {
    const result = await advanceWorkflow(fixture.projectRoot, {
      title: "Build traceable delivery feature",
      description: "Generate role plan and dispatch the developer without manual tool sequencing.",
      risk_level: "medium",
      skip_questions: true,
      adapter: "codex"
    });

    assert.equal(result.status, "external_agent_required");
    assert.equal(result.dispatch.dispatch.role, "developer");
    assert.equal(result.dispatch.dispatch.adapter, "codex");
    assert.ok(result.actions.some((action) => action.action === "record_artifact" && action.artifact_type === "requirements"));
    assert.ok(result.actions.some((action) => action.action === "record_artifact" && action.artifact_type === "adr"));
    assert.ok(result.actions.some((action) => action.action === "record_backlog"));
    assert.ok(result.actions.some((action) => action.action === "dispatch_agent_task"));

    const requirements = await readFile(join(fixture.projectRoot, "docs", "ai-artifacts", "requirements", result.actions.find((action) => action.artifact_type === "requirements").result.id + ".md"), "utf8");
    assert.match(requirements, /Success Criteria/);

    const trace = await readJsonl(join(fixture.projectRoot, ".ai-engineering", "trace-ledger.jsonl"));
    assert.ok(trace.some((event) => event.type === "workflow_advanced" && event.status === "external_agent_required"));
    assert.ok(trace.some((event) => event.type === "backlog_recorded"));

    const state = await readProjectState(fixture.projectRoot);
    assert.equal(state.current_phase, "build_loop");
    assert.ok(state.backlog.length >= 3);
  } finally {
    fixture.restoreEnv();
  }
});
