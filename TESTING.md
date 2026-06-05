# Testing And Experiment Matrix

This project treats each public workflow capability as an experiment with executable evidence.

## Verification Command

```bash
npm run verify
```

`verify` runs syntax checks for every `.mjs` source/test file and then runs the Node test suite.

## Experiments

| Experiment | Covered capability | Evidence |
| --- | --- | --- |
| Core workflow lifecycle | project initialization, goal creation, context scan, experience retrieval, role packets, decisions, evidence, ChangeSets, dispatch, learning, sandbox promotion, gate, audit export | `tests/workflow.test.mjs` |
| Automatic advancement | one high-level call plans/scans/retrieves/records artifacts, avoids unnecessary questions, and stops only when a discovered ambiguity is high-impact | `tests/auto-advance.test.mjs` |
| Role prompt contracts | every virtual team role has executable role guidance, artifact contract, frameworks, and quality bar exposed in task packets | `tests/roles.test.mjs` |
| Agent progress feedback | workflow, role, dispatch, decision, and gate responses expose progress messages and agent feedback prompts | `tests/auto-advance.test.mjs`, `tests/workflow.test.mjs`, `tests/mcp-tools.test.mjs` |
| MCP tool coverage | every MCP tool can be listed and executed through stdio JSON-RPC | `tests/mcp-tools.test.mjs` |
| CLI smoke | debug CLI can run the operator workflow in an isolated repository | `tests/cli-smoke.test.mjs` |
| Gate blocking | incomplete phases are blocked until required context, ChangeSets, and evidence exist | `tests/gates-and-trace.test.mjs` |
| Trace audit | weak ChangeSets are flagged for missing prompt refs, context refs, changed files, evidence refs, or rollback data | `tests/gates-and-trace.test.mjs` |
| Learning safety | learning proposals cannot enter memory without evidence references | `tests/gates-and-trace.test.mjs` |

## Acceptance Mapping

- MCP Server usable: verified by `tests/mcp-tools.test.mjs`.
- Automatic planning and recording: verified by `tests/auto-advance.test.mjs`.
- Agent adapters dispatch task packets: verified by `dispatch_agent_task` in `tests/workflow.test.mjs` and `tests/mcp-tools.test.mjs`.
- Global Memory Store usable: verified by `retrieve_global_experience`, `propose_learning`, and `promote_or_rollback_rule`.
- Workflow Runtime usable: verified by `run_gate` pass/fail cases.
- Trace Ledger usable: verified by ChangeSet, Evidence, Decision, Artifact, Backlog, and Audit Bundle tests.
- Prompt Pack / schemas present: syntax-independent static artifacts tracked in the repository and referenced by README.
- CLI debugging usable: verified by `tests/cli-smoke.test.mjs`.

## Git Hygiene

Runtime output is intentionally ignored:

- `.ai-engineering/`
- `docs/ai-artifacts/`

This keeps generated project traces out of the tool source repository while still allowing target projects to choose whether they want to commit their own audit artifacts.
