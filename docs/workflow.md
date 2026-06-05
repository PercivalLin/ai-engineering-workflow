# Workflow

The normal entrypoint is `advance_workflow`. It advances automatically from the current state until it reaches a boundary that should be surfaced to the user or an external agent.

## Phase Model

| Phase | Owner | Purpose | Typical stop condition |
| --- | --- | --- | --- |
| Intake | PM | Register the user-provided product goal. | Missing product goal. |
| Context Scan | Delivery Manager | Discover repository facts, scripts, CI, stack, and files. | Scan complete. |
| Experience Retrieval | Delivery Manager | Pull relevant global memory. | Memory attached. |
| Clarification Gate | PM / Architect | Ask only for discovered high-impact ambiguity. | User decision required or no question needed. |
| Requirements | PM | Produce requirements, scope, success criteria, and acceptance criteria. | Requirements artifact recorded. |
| Architecture | Architect | Produce ADR, interfaces, risk, rollout, rollback, and verification plan. | ADR recorded or architecture decision required. |
| Planning | Delivery Manager | Build ordered backlog and role queue. | Backlog recorded. |
| Build Loop | Developer | Implement a small traceable slice. | External agent task required. |
| Verification Loop | QA / Security / SRE | Run tests, scans, reviews, operational checks, and record evidence. | Evidence missing or checks complete. |
| Review Gate | Reviewer | Independently review diff, tests, architecture fit, and maintainability. | Approved, blocked, or rework needed. |
| Release Readiness | Writer / SRE | Prepare changelog, release notes, rollback notes, and audit context. | Release bundle ready. |
| Retro / Learn | Learning Coach | Propose evidence-backed reusable lessons. | Candidate memory recorded. |
| Archive | Trace Auditor | Export audit bundle and traceability matrix. | Task complete. |

## Automatic Advancement Rules

`advance_workflow` should keep moving when:

- repository facts can answer the question
- the next step is deterministic
- risk is low and a conservative assumption is safe
- the current phase has enough evidence to pass its gate

It should stop when:

- the user product goal is missing
- an ambiguity changes product behavior, architecture, cost, compliance, data handling, public API compatibility, rollout, or acceptance criteria
- implementation requires Codex, Claude Code, Cursor, Gemini CLI, or another external execution agent
- evidence is missing
- a gate blocks the task

## Progress Feedback

MCP responses include:

```json
{
  "current_role": "developer",
  "current_phase": "build_loop",
  "progress_message": "[AgentWolf] Developer is active. Phase: build_loop. Status: external_agent_required.",
  "agent_feedback_prompt": "You are currently acting as: Developer.\nWorkflow phase: build_loop.\nWorkflow status: external_agent_required.\nTell the user this status briefly before continuing."
}
```

Agent harnesses should show `progress_message` to the user and follow `agent_feedback_prompt` before continuing.

## Gate Philosophy

Gates should block for missing evidence, not for perfection.

Examples:

- Requirements gate blocks if there are no testable acceptance criteria.
- Architecture gate blocks if high-risk API, migration, or data decisions are unresolved.
- Build gate blocks if a code change has no ChangeSet.
- Verification gate blocks if evidence is missing.
- Review gate blocks if blocking findings are unresolved.
- Archive gate blocks if the audit bundle cannot reconstruct decisions, changes, evidence, and rollback.
