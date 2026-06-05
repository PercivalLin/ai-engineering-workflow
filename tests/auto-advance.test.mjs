import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { advanceWorkflow } from "../src/core/workflow.mjs";
import { readProjectState } from "../src/core/project.mjs";
import { readJsonl } from "../src/core/fs-utils.mjs";
import { makeFixtureProject } from "./helpers.mjs";

test("advance_workflow refuses to invent a product goal", async () => {
  const fixture = await makeFixtureProject("agentwolf-auto-needs-goal-");
  try {
    const result = await advanceWorkflow(fixture.projectRoot, {});

    assert.equal(result.status, "needs_product_goal");
    assert.match(result.reason, /user-provided product goal/);
    assert.match(result.progress_message, /Product Manager is active/);
    assert.match(result.agent_feedback_prompt, /Workflow phase: intake/);

    const state = await readProjectState(fixture.projectRoot);
    assert.equal(state.active_task_id, null);
    assert.equal(state.goals.length, 0);
  } finally {
    fixture.restoreEnv();
  }
});

test("advance_workflow does not ask unnecessary questions for a concrete product goal", async () => {
  const fixture = await makeFixtureProject("agentwolf-auto-no-question-");
  try {
    const result = await advanceWorkflow(fixture.projectRoot, {
      product_goal: "Build an automated planner that registers a user product goal, scans the repository, creates requirements and ADR artifacts, records backlog, and dispatches Codex for implementation.",
      risk_level: "high"
    });

    assert.equal(result.status, "external_agent_required");
    assert.match(result.progress_message, /Developer is active/);
    assert.match(result.agent_feedback_prompt, /Workflow phase: build_loop/);
    assert.ok(result.actions.some((action) => action.action === "create_goal"));
    assert.ok(result.actions.some((action) => action.action === "scan_project_context"));
    assert.ok(result.actions.some((action) => action.action === "retrieve_global_experience"));
    assert.ok(!result.actions.some((action) => action.action === "ask_user_decision"));

    const state = await readProjectState(fixture.projectRoot);
    assert.equal(state.current_phase, "build_loop");
    assert.deepEqual(state.pending_decisions, []);
  } finally {
    fixture.restoreEnv();
  }
});

test("advance_workflow stops to ask when a high-impact ambiguity is discovered during planning", async () => {
  const fixture = await makeFixtureProject("agentwolf-auto-discovered-question-");
  try {
    const result = await advanceWorkflow(fixture.projectRoot, {
      product_goal: "Add production login and RBAC for admin users.",
      risk_level: "critical"
    });

    assert.equal(result.status, "user_input_required");
    assert.match(result.progress_message, /Architect \/ Tech Lead is active/);
    assert.match(result.agent_feedback_prompt, /Workflow phase: architecture/);
    assert.equal(result.pending_decisions.length, 1);
    assert.equal(result.pending_decisions[0].topic, "auth_security_model");
    assert.match(result.reason, /architecture/);
    assert.ok(result.actions.some((action) => action.action === "record_artifact" && action.artifact_type === "requirements"));

    const state = await readProjectState(fixture.projectRoot);
    assert.equal(state.current_phase, "architecture");
    assert.equal(state.pending_decisions[0].status, "pending");
  } finally {
    fixture.restoreEnv();
  }
});

test("advance_workflow can auto-plan and record artifacts until external implementation is required", async () => {
  const fixture = await makeFixtureProject("agentwolf-auto-plan-");
  try {
    const result = await advanceWorkflow(fixture.projectRoot, {
      product_goal: "Build a traceable delivery feature that generates a role plan and dispatches the developer without manual tool sequencing.",
      risk_level: "medium",
      skip_questions: true,
      adapter: "codex"
    });

    assert.equal(result.status, "external_agent_required");
    assert.match(result.progress_message, /Developer is active/);
    assert.match(result.agent_feedback_prompt, /task packet/);
    assert.equal(result.dispatch.dispatch.role, "developer");
    assert.equal(result.dispatch.dispatch.adapter, "codex");
    assert.ok(result.actions.some((action) => action.action === "record_artifact" && action.artifact_type === "requirements"));
    assert.ok(result.actions.some((action) => action.action === "record_artifact" && action.artifact_type === "adr"));
    assert.ok(result.actions.some((action) => action.action === "record_backlog"));
    assert.ok(result.actions.some((action) => action.action === "dispatch_agent_task"));

    const requirements = await readFile(join(fixture.projectRoot, "docs", "ai-artifacts", "requirements", result.actions.find((action) => action.artifact_type === "requirements").result.id + ".md"), "utf8");
    assert.match(requirements, /Success Criteria/);

    const trace = await readJsonl(join(fixture.projectRoot, ".agentwolf", "trace-ledger.jsonl"));
    assert.ok(trace.some((event) => event.type === "workflow_advanced" && event.status === "external_agent_required"));
    assert.ok(trace.some((event) => event.type === "backlog_recorded"));

    const state = await readProjectState(fixture.projectRoot);
    assert.equal(state.current_phase, "build_loop");
    assert.ok(state.backlog.length >= 3);
  } finally {
    fixture.restoreEnv();
  }
});

test("advance_workflow routes read-only analysis goals to reviewer instead of developer", async () => {
  const fixture = await makeFixtureProject("agentwolf-auto-analysis-route-");
  try {
    const result = await advanceWorkflow(fixture.projectRoot, {
      product_goal: "Analyze the current repository, identify prioritized adoption improvements, and do not modify source code during this analysis.",
      risk_level: "low",
      skip_questions: true,
      adapter: "codex"
    });

    assert.equal(result.status, "external_agent_required");
    assert.equal(result.dispatch.dispatch.role, "reviewer");
    assert.match(result.progress_message, /Code Reviewer is active/);
    assert.equal(result.dispatch.role_action.packet.workflow_classification.kind, "analysis");
    assert.equal(result.dispatch.role_action.packet.workflow_classification.requires_changes, false);

    const state = await readProjectState(fixture.projectRoot);
    assert.equal(state.current_phase, "build_loop");
    assert.equal(state.backlog[0].role, "reviewer");
    assert.match(state.backlog[0].title, /analyzes/i);
  } finally {
    fixture.restoreEnv();
  }
});
