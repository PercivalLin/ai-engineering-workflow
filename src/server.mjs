import { createGoal } from "./core/project.mjs";
import { scanProjectContext } from "./core/context.mjs";
import { retrieveGlobalExperience, proposeLearning, promoteOrRollbackRule } from "./core/memory.mjs";
import { askUserDecision, dispatchAgentTask, getRoleAction, recordUserDecision, runGate } from "./core/workflow.mjs";
import { exportAuditBundle, recordArtifact, recordBacklog, recordChangeset, recordEvidence } from "./core/trace.mjs";

const TOOLS = [
  {
    name: "create_goal",
    description: "Create a product goal or engineering task and initialize workflow state.",
    inputSchema: objectSchema({
      project_root: stringSchema("Repository root. Defaults to server working directory."),
      title: stringSchema("Goal title."),
      description: stringSchema("Goal description."),
      risk_level: stringSchema("low, medium, high, or critical.")
    }, ["title"])
  },
  {
    name: "scan_project_context",
    description: "Scan repository facts: files, languages, package scripts, CI, git status, and inferred test commands.",
    inputSchema: objectSchema({
      project_root: stringSchema("Repository root."),
      max_files: numberSchema("Maximum files to scan.")
    })
  },
  {
    name: "retrieve_global_experience",
    description: "Retrieve global engineering memory records relevant to a query, role, stack, or task.",
    inputSchema: objectSchema({
      project_root: stringSchema("Repository root."),
      query: stringSchema("Search query."),
      limit: numberSchema("Maximum number of results."),
      scopes: { type: "array", items: { type: "string" } }
    })
  },
  {
    name: "get_role_action",
    description: "Get the next task packet for a virtual engineering team role.",
    inputSchema: objectSchema({
      project_root: stringSchema("Repository root."),
      role: stringSchema("pm, architect, delivery_manager, developer, qa, security, sre, reviewer, writer, learning_coach, trace_auditor."),
      objective: stringSchema("Optional role objective.")
    }, ["role"])
  },
  {
    name: "ask_user_decision",
    description: "Create a structured high-impact question for the user after exploration.",
    inputSchema: objectSchema({
      project_root: stringSchema("Repository root."),
      topic: stringSchema("Decision topic."),
      impact: stringSchema("Decision impact."),
      question: stringSchema("Optional explicit question."),
      default_assumption: stringSchema("Default if user does not answer.")
    })
  },
  {
    name: "record_user_decision",
    description: "Record the user's answer to a pending decision and append it to the decision log.",
    inputSchema: objectSchema({
      project_root: stringSchema("Repository root."),
      decision_id: stringSchema("Decision ID."),
      answer: stringSchema("User answer."),
      answered_by: stringSchema("Who answered.")
    }, ["decision_id", "answer"])
  },
  {
    name: "dispatch_agent_task",
    description: "Create an external-agent dispatch packet for Codex, Claude Code, Cursor, or another adapter.",
    inputSchema: objectSchema({
      project_root: stringSchema("Repository root."),
      adapter: stringSchema("codex, claude_code, cursor, gemini_cli, or custom."),
      role: stringSchema("Role to dispatch."),
      objective: stringSchema("Task objective.")
    }, ["adapter", "role"])
  },
  {
    name: "record_changeset",
    description: "Record a traceable ChangeSet with diff hash, files, agent, evidence refs, and rollback plan.",
    inputSchema: objectSchema({
      project_root: stringSchema("Repository root."),
      task_id: stringSchema("Task ID."),
      role: stringSchema("Role that initiated the change."),
      agent: stringSchema("Execution agent, such as Codex or Claude Code."),
      prompt_ref: stringSchema("Prompt/task packet hash."),
      context_ref: stringSchema("Context hash."),
      risk_level: stringSchema("Risk level."),
      rollback_plan: stringSchema("Rollback plan."),
      files_changed: { type: "array", items: { type: "string" } },
      commands_run: { type: "array", items: { type: "string" } },
      tests_run: { type: "array", items: { type: "string" } },
      evidence_refs: { type: "array", items: { type: "string" } },
      review_refs: { type: "array", items: { type: "string" } }
    })
  },
  {
    name: "record_artifact",
    description: "Record a role artifact such as requirements, ADR, release notes, or retrospective into the trace ledger.",
    inputSchema: objectSchema({
      project_root: stringSchema("Repository root."),
      artifact_type: stringSchema("requirements, adr, architecture, release, retro, or other."),
      role: stringSchema("Role that produced the artifact."),
      title: stringSchema("Artifact title."),
      content: stringSchema("Markdown content."),
      assumptions: { type: "array", items: { type: "string" } }
    }, ["artifact_type", "title", "content"])
  },
  {
    name: "record_backlog",
    description: "Record Delivery Manager backlog items and update workflow state.",
    inputSchema: objectSchema({
      project_root: stringSchema("Repository root."),
      role: stringSchema("Usually delivery_manager."),
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            role: { type: "string" },
            priority: { type: "number" },
            status: { type: "string" },
            definition_of_done: { type: "array", items: { type: "string" } },
            risk_level: { type: "string" }
          },
          required: ["title"]
        }
      }
    }, ["items"])
  },
  {
    name: "record_evidence",
    description: "Record test, scan, review, security, deployment, or manual evidence.",
    inputSchema: objectSchema({
      project_root: stringSchema("Repository root."),
      evidence_type: stringSchema("test, scan, review, security, qa, deploy, manual."),
      outcome: stringSchema("passed, failed, approved, blocked, unknown."),
      summary: stringSchema("Evidence summary."),
      command: stringSchema("Command that produced evidence."),
      artifact_refs: { type: "array", items: { type: "string" } },
      related_changesets: { type: "array", items: { type: "string" } }
    })
  },
  {
    name: "run_gate",
    description: "Run the current or specified workflow phase gate and advance if it passes.",
    inputSchema: objectSchema({
      project_root: stringSchema("Repository root."),
      phase: stringSchema("Optional workflow phase.")
    })
  },
  {
    name: "propose_learning",
    description: "Create a candidate global engineering memory record from real evidence.",
    inputSchema: objectSchema({
      project_root: stringSchema("Repository root."),
      type: stringSchema("case, anti_pattern, policy_rule, playbook."),
      scope: stringSchema("global, stack:<name>, domain:<name>, org:<name>, or repo:<id>."),
      trigger: stringSchema("When this lesson applies."),
      lesson: stringSchema("Reusable lesson."),
      evidence_refs: { type: "array", items: { type: "string" } },
      confidence: numberSchema("Initial confidence.")
    }, ["lesson", "evidence_refs"])
  },
  {
    name: "promote_or_rollback_rule",
    description: "Move a candidate rule to sandbox/default or deprecate it based on evidence.",
    inputSchema: objectSchema({
      rule_id: stringSchema("Rule or memory record ID."),
      action: stringSchema("sandbox, promote, or rollback."),
      reason: stringSchema("Reason for status change.")
    }, ["rule_id", "action"])
  },
  {
    name: "export_audit_bundle",
    description: "Export full timeline, decisions, evidence, ChangeSets, traceability matrix, and audit summary.",
    inputSchema: objectSchema({
      project_root: stringSchema("Repository root."),
      task_id: stringSchema("Optional task ID.")
    })
  }
];

const TOOL_HANDLERS = {
  create_goal: (args) => createGoal(root(args), args),
  scan_project_context: (args) => scanProjectContext(root(args), args),
  retrieve_global_experience: (args) => retrieveGlobalExperience(root(args), args),
  get_role_action: (args) => getRoleAction(root(args), args),
  ask_user_decision: (args) => askUserDecision(root(args), args),
  record_user_decision: (args) => recordUserDecision(root(args), args),
  dispatch_agent_task: (args) => dispatchAgentTask(root(args), args),
  record_changeset: (args) => recordChangeset(root(args), args),
  record_artifact: (args) => recordArtifact(root(args), args),
  record_backlog: (args) => recordBacklog(root(args), args),
  record_evidence: (args) => recordEvidence(root(args), args),
  run_gate: (args) => runGate(root(args), args),
  propose_learning: (args) => proposeLearning(root(args), args),
  promote_or_rollback_rule: (args) => promoteOrRollbackRule(args),
  export_audit_bundle: (args) => exportAuditBundle(root(args), args)
};

export async function startMcpServer({ input = process.stdin, output = process.stdout } = {}) {
  input.setEncoding("utf8");
  let buffer = "";
  input.on("data", async (chunk) => {
    buffer += chunk;
    let index = buffer.indexOf("\n");
    while (index >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      index = buffer.indexOf("\n");
      if (!line) continue;
      await handleLine(line, output);
    }
  });
}

async function handleLine(line, output) {
  let request;
  try {
    request = JSON.parse(line);
  } catch (error) {
    write(output, { jsonrpc: "2.0", id: null, error: { code: -32700, message: error.message } });
    return;
  }
  if (!request.id && request.method?.startsWith("notifications/")) return;
  try {
    const result = await handleRequest(request);
    if (request.id !== undefined) write(output, { jsonrpc: "2.0", id: request.id, result });
  } catch (error) {
    if (request.id !== undefined) {
      write(output, {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32000,
          message: error.message,
          data: error.stack
        }
      });
    }
  }
}

async function handleRequest(request) {
  if (request.method === "initialize") {
    return {
      protocolVersion: request.params?.protocolVersion || "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: {
        name: "ai-engineering-workflow",
        version: "0.1.0"
      }
    };
  }
  if (request.method === "tools/list") {
    return { tools: TOOLS };
  }
  if (request.method === "tools/call") {
    const name = request.params?.name;
    const args = request.params?.arguments || {};
    const handler = TOOL_HANDLERS[name];
    if (!handler) throw new Error(`Unknown tool: ${name}`);
    const value = await handler(args);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(value, null, 2)
        }
      ]
    };
  }
  if (request.method === "ping") return {};
  throw new Error(`Unsupported MCP method: ${request.method}`);
}

function write(output, message) {
  output.write(`${JSON.stringify(message)}\n`);
}

function root(args = {}) {
  return args.project_root || args.projectRoot || process.cwd();
}

function objectSchema(properties, required = []) {
  return {
    type: "object",
    properties,
    required
  };
}

function stringSchema(description) {
  return { type: "string", description };
}

function numberSchema(description) {
  return { type: "number", description };
}
