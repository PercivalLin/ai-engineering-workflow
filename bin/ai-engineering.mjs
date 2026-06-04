#!/usr/bin/env node

import { createGoal, initProject, readProjectState } from "../src/core/project.mjs";
import { scanProjectContext } from "../src/core/context.mjs";
import { retrieveGlobalExperience } from "../src/core/memory.mjs";
import { getRoleAction, askUserDecision, recordUserDecision, dispatchAgentTask, runGate } from "../src/core/workflow.mjs";
import { recordArtifact, recordBacklog, recordChangeset, recordEvidence, exportAuditBundle } from "../src/core/trace.mjs";
import { startMcpServer } from "../src/server.mjs";

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i += 1;
      }
    } else {
      args._.push(token);
    }
  }
  return args;
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || "help";
  const projectRoot = args.project || process.cwd();

  if (command === "server") {
    await startMcpServer();
    return;
  }

  if (command === "init") {
    printJson(await initProject(projectRoot));
    return;
  }

  if (command === "create-goal") {
    printJson(await createGoal(projectRoot, {
      title: args.title || "Untitled goal",
      description: args.description || "",
      risk_level: args.risk || "medium",
      created_by: "cli"
    }));
    return;
  }

  if (command === "scan") {
    printJson(await scanProjectContext(projectRoot));
    return;
  }

  if (command === "memory") {
    printJson(await retrieveGlobalExperience(projectRoot, {
      query: args.query || "",
      limit: Number(args.limit || 8),
      scopes: args.scope ? String(args.scope).split(",") : []
    }));
    return;
  }

  if (command === "role") {
    printJson(await getRoleAction(projectRoot, {
      role: args.role || "delivery_manager",
      objective: args.objective || ""
    }));
    return;
  }

  if (command === "ask") {
    printJson(await askUserDecision(projectRoot, {
      topic: args.topic || "",
      impact: args.impact || "normal"
    }));
    return;
  }

  if (command === "answer") {
    printJson(await recordUserDecision(projectRoot, {
      decision_id: args.id,
      answer: args.answer || "",
      answered_by: "cli"
    }));
    return;
  }

  if (command === "dispatch") {
    printJson(await dispatchAgentTask(projectRoot, {
      adapter: args.adapter || "codex",
      role: args.role || "developer",
      objective: args.objective || ""
    }));
    return;
  }

  if (command === "changeset") {
    printJson(await recordChangeset(projectRoot, {
      role: args.role || "developer",
      agent: args.agent || "unknown",
      task_id: args.task,
      risk_level: args.risk || "medium",
      rollback_plan: args.rollback || "Revert the recorded patch or restore the affected files from version control."
    }));
    return;
  }

  if (command === "evidence") {
    printJson(await recordEvidence(projectRoot, {
      evidence_type: args.type || "manual",
      outcome: args.outcome || "unknown",
      summary: args.summary || "",
      command: args.command || ""
    }));
    return;
  }

  if (command === "artifact") {
    printJson(await recordArtifact(projectRoot, {
      artifact_type: args.type || "other",
      role: args.role || "writer",
      title: args.title || "Artifact",
      content: args.content || ""
    }));
    return;
  }

  if (command === "backlog") {
    printJson(await recordBacklog(projectRoot, {
      items: [
        {
          title: args.title || "Backlog item",
          description: args.description || "",
          role: args.role || "developer",
          definition_of_done: args.done ? String(args.done).split("|") : []
        }
      ]
    }));
    return;
  }

  if (command === "gate") {
    printJson(await runGate(projectRoot, {
      phase: args.phase
    }));
    return;
  }

  if (command === "export") {
    printJson(await exportAuditBundle(projectRoot, {
      task_id: args.task
    }));
    return;
  }

  if (command === "status") {
    printJson(await readProjectState(projectRoot));
    return;
  }

  process.stdout.write(`AI Engineering Workflow

Usage:
  ai-engineering server
  ai-engineering init
  ai-engineering create-goal --title "..." --description "..." --risk high
  ai-engineering scan
  ai-engineering memory --query "database migration"
  ai-engineering role --role architect
  ai-engineering ask --topic "target users"
  ai-engineering answer --id decision_x --answer "..."
  ai-engineering dispatch --adapter codex --role developer --objective "..."
  ai-engineering changeset --role developer --agent codex
  ai-engineering evidence --type test --outcome passed --summary "npm test"
  ai-engineering artifact --type requirements --title "PRD" --content "..."
  ai-engineering backlog --title "Implement slice" --done "tests pass|changeset recorded"
  ai-engineering gate --phase verification_loop
  ai-engineering export
`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
