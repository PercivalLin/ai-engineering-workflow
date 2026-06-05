import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { PassThrough } from "node:stream";
import { startMcpServer } from "../src/server.mjs";
import { makeFixtureProject } from "./helpers.mjs";

function createMcpHarness() {
  const input = new PassThrough();
  const output = new PassThrough();
  const responses = [];
  let buffer = "";
  output.setEncoding("utf8");
  output.on("data", (chunk) => {
    buffer += chunk;
    let index = buffer.indexOf("\n");
    while (index >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (line) responses.push(JSON.parse(line));
      index = buffer.indexOf("\n");
    }
  });
  startMcpServer({ input, output });
  let id = 0;
  async function call(method, params = {}) {
    id += 1;
    input.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    while (!responses.some((response) => response.id === id)) {
      await once(output, "data");
    }
    const response = responses.find((item) => item.id === id);
    if (response.error) throw new Error(response.error.message);
    return response.result;
  }
  async function tool(name, args = {}) {
    const result = await call("tools/call", { name, arguments: args });
    assert.equal(result.content[0].type, "text");
    return JSON.parse(result.content[0].text);
  }
  return { call, tool, input };
}

test("MCP server exposes and executes every planned tool", async () => {
  const fixture = await makeFixtureProject("aiwf-mcp-");
  try {
    const mcp = createMcpHarness();
    const init = await mcp.call("initialize", { protocolVersion: "2024-11-05" });
    assert.equal(init.serverInfo.name, "vibe-engineering");

    const list = await mcp.call("tools/list");
    const toolNames = list.tools.map((item) => item.name).sort();
    assert.deepEqual(toolNames, [
      "advance_workflow",
      "ask_user_decision",
      "create_goal",
      "dispatch_agent_task",
      "export_audit_bundle",
      "get_role_action",
      "promote_or_rollback_rule",
      "propose_learning",
      "record_artifact",
      "record_backlog",
      "record_changeset",
      "record_evidence",
      "record_user_decision",
      "retrieve_global_experience",
      "run_gate",
      "scan_project_context"
    ].sort());

    const auto = await mcp.tool("advance_workflow", {
      project_root: fixture.projectRoot,
      product_goal: "The MCP runtime should automate planning from the user-provided product goal.",
      skip_questions: true
    });
    assert.equal(auto.status, "external_agent_required");
    assert.match(auto.progress_message, /Developer is active/);

    const goal = await mcp.tool("create_goal", {
      project_root: fixture.projectRoot,
      title: "MCP coverage goal",
      description: "Exercise every MCP tool.",
      risk_level: "high"
    });
    assert.equal(goal.ok, true);

    const context = await mcp.tool("scan_project_context", { project_root: fixture.projectRoot });
    assert.equal(context.context.package.name, "fixture");

    const memory = await mcp.tool("retrieve_global_experience", {
      project_root: fixture.projectRoot,
      query: "tests trace review",
      limit: 4
    });
    assert.ok(memory.experiences.length > 0);

    const role = await mcp.tool("get_role_action", {
      project_root: fixture.projectRoot,
      role: "architect",
      objective: "Design the trace runtime"
    });
    assert.equal(role.role, "architect");
    assert.match(role.progress_message, /Architect \/ Tech Lead is active/);

    const decision = await mcp.tool("ask_user_decision", {
      project_root: fixture.projectRoot,
      topic: "target_users"
    });
    assert.equal(decision.decision.status, "pending");
    assert.match(decision.progress_message, /Product Manager is active/);

    const answer = await mcp.tool("record_user_decision", {
      project_root: fixture.projectRoot,
      decision_id: decision.decision.decision_id,
      answer: "Primary users are AI coding agents and their operators.",
      answered_by: "test"
    });
    assert.equal(answer.decision.status, "answered");
    assert.match(answer.agent_feedback_prompt, /decision was recorded/);

    const artifact = await mcp.tool("record_artifact", {
      project_root: fixture.projectRoot,
      artifact_type: "requirements",
      role: "pm",
      title: "Requirements",
      content: "The system must expose traceable MCP tools.",
      assumptions: ["MCP is the primary integration surface."]
    });
    assert.equal(artifact.ok, true);

    const backlog = await mcp.tool("record_backlog", {
      project_root: fixture.projectRoot,
      items: [
        {
          title: "Record traceability data",
          role: "developer",
          definition_of_done: ["ChangeSet recorded", "Evidence recorded"]
        }
      ]
    });
    assert.equal(backlog.backlog.length, 1);

    const evidence = await mcp.tool("record_evidence", {
      project_root: fixture.projectRoot,
      evidence_type: "test",
      outcome: "passed",
      summary: "MCP test evidence.",
      command: "node --test tests/mcp-tools.test.mjs"
    });
    assert.equal(evidence.evidence.outcome, "passed");

    const change = await mcp.tool("record_changeset", {
      project_root: fixture.projectRoot,
      role: "developer",
      agent: "codex",
      prompt_ref: role.prompt_ref,
      context_ref: context.context.hash,
      files_changed: ["index.js"],
      evidence_refs: [evidence.evidence.evidence_id],
      risk_level: "low",
      rollback_plan: "Revert index.js."
    });
    assert.equal(change.changeset.agent, "codex");

    const dispatch = await mcp.tool("dispatch_agent_task", {
      project_root: fixture.projectRoot,
      adapter: "claude_code",
      role: "reviewer",
      objective: "Review ChangeSet"
    });
    assert.equal(dispatch.dispatch.adapter, "claude_code");

    const gate = await mcp.tool("run_gate", {
      project_root: fixture.projectRoot,
      phase: "build_loop"
    });
    assert.equal(gate.passed, true);
    assert.match(gate.progress_message, /build_loop/);

    const learning = await mcp.tool("propose_learning", {
      project_root: fixture.projectRoot,
      type: "case",
      scope: "global",
      trigger: "After MCP tool coverage tests",
      lesson: "Every public MCP tool should have a direct integration test.",
      evidence_refs: [evidence.evidence.evidence_id],
      confidence: 0.7
    });
    assert.equal(learning.learning.status, "candidate");

    const sandbox = await mcp.tool("promote_or_rollback_rule", {
      rule_id: learning.learning.id,
      action: "sandbox",
      reason: "Covered by MCP integration test."
    });
    assert.equal(sandbox.status, "sandbox");

    const audit = await mcp.tool("export_audit_bundle", {
      project_root: fixture.projectRoot
    });
    assert.equal(audit.ok, true);
    assert.equal(audit.traceability.missing_trace_findings.length, 0);
    mcp.input.end();
  } finally {
    fixture.restoreEnv();
  }
});
