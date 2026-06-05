# MCP Tools

The MCP server is the primary product surface. Agents should normally call `advance_workflow`; lower-level tools exist for debugging, custom harnesses, and explicit role handoff.

## Primary Tool

| Tool | Use |
| --- | --- |
| `advance_workflow` | Automatically move from the current workflow state to the next user decision, external agent task, gate result, completion, or blocker. |

## Planning And Context

| Tool | Use |
| --- | --- |
| `create_goal` | Create a product goal or engineering task manually. |
| `scan_project_context` | Scan repository structure, languages, package scripts, CI, git status, and inferred test commands. |
| `retrieve_global_experience` | Retrieve relevant global memory by query, role, stack, or task. |
| `get_role_action` | Produce a task packet for a specific virtual team role. |

## Decisions

| Tool | Use |
| --- | --- |
| `ask_user_decision` | Create a structured high-impact question after exploration. |
| `record_user_decision` | Record the user's answer in the decision log and trace ledger. |

## Execution And Evidence

| Tool | Use |
| --- | --- |
| `dispatch_agent_task` | Create an external-agent task packet for Codex, Claude Code, Cursor, Gemini CLI, or custom adapters. |
| `record_changeset` | Record a code modification, changed files, diff hash, commands, tests, evidence, reviews, risk, and rollback plan. |
| `record_artifact` | Record requirements, ADRs, release notes, retrospectives, or other role artifacts. |
| `record_backlog` | Record Delivery Manager backlog items and update workflow state. |
| `record_evidence` | Record test, scan, review, QA, security, deployment, or manual evidence. |
| `run_gate` | Run the current or specified phase gate and record the result. |

## Learning And Audit

| Tool | Use |
| --- | --- |
| `propose_learning` | Create a candidate global memory record from real evidence. |
| `promote_or_rollback_rule` | Move a candidate rule to sandbox/default or deprecate it based on evidence. |
| `export_audit_bundle` | Export full timeline, decisions, evidence, ChangeSets, traceability matrix, and audit summary. |

## Recommended Call Pattern

```text
advance_workflow
  -> user decision required? ask user, then record_user_decision
  -> external task required? execute task packet, then record_changeset and record_evidence
  -> gate blocked? fix missing evidence or route to the correct role
  -> complete? export_audit_bundle
```

## Minimal `advance_workflow` Request

```json
{
  "project_root": "/absolute/path/to/target-product",
  "product_goal": "Build a traceable task manager with owners, status history, and audit export.",
  "adapter": "codex",
  "risk_level": "medium"
}
```

## Lower-Level Debugging Commands

```bash
ai-engineering scan --project /absolute/path/to/target-product
ai-engineering role --project /absolute/path/to/target-product --role pm
ai-engineering gate --project /absolute/path/to/target-product
ai-engineering export --project /absolute/path/to/target-product
```
