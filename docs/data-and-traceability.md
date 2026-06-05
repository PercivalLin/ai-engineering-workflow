# Data And Traceability

AgentWolf separates project-local audit data from global engineering memory.

## Project-Local Data

Project data is written under the target repository:

```text
<target-project>/.agentwolf/project.yaml
<target-project>/.agentwolf/workflow-state.json
<target-project>/.agentwolf/trace-ledger.jsonl
<target-project>/.agentwolf/decision-log.jsonl
<target-project>/.agentwolf/evidence/
<target-project>/.agentwolf/changesets/
<target-project>/.agentwolf/context/
<target-project>/.agentwolf/context/task-packets/
<target-project>/.agentwolf/audit-bundles/
<target-project>/docs/ai-artifacts/
```

Important files:

| Path | Purpose |
| --- | --- |
| `.agentwolf/workflow-state.json` | Current phase, active goal, backlog, decisions, artifacts, evidence, and gate state. |
| `.agentwolf/trace-ledger.jsonl` | Append-oriented timeline of workflow events. |
| `.agentwolf/decision-log.jsonl` | User answers, AI assumptions, and high-impact decisions. |
| `.agentwolf/evidence/` | Test, scan, review, security, deployment, and manual evidence records. |
| `.agentwolf/changesets/` | ChangeSet metadata and patch snapshots. |
| `.agentwolf/context/task-packets/` | Role packets dispatched to external agents. |
| `.agentwolf/audit-bundles/` | Exported audit summaries and traceability matrices. |
| `docs/ai-artifacts/` | Requirements, ADRs, release notes, retrospectives, and other generated artifacts. |

## Global Memory

Global memory is stored at `AGENTWOLF_HOME` or `~/.agentwolf`:

```text
~/.agentwolf/memory/principles/
~/.agentwolf/memory/playbooks/
~/.agentwolf/memory/anti-patterns/
~/.agentwolf/memory/cases/
~/.agentwolf/memory/rules/
~/.agentwolf/memory/role-checklists/
~/.agentwolf/memory/stack-knowledge/
~/.agentwolf/memory/organization-preferences/
~/.agentwolf/agents/
~/.agentwolf/sandbox-rules/
```

Global memory should be cross-project and evidence-backed. Do not write lessons into global memory only because they sound plausible.

## ChangeSet Requirements

Every code modification should be recorded as a ChangeSet with:

- `change_id`
- linked task, requirement, or decision
- initiating role
- execution agent
- prompt or task packet hash
- context hash
- changed files
- diff hash
- commands run
- tests run
- evidence refs
- review refs
- risk level
- rollback plan
- timestamp

## Inspection Commands

```bash
tail -n 20 <target-project>/.agentwolf/trace-ledger.jsonl
tail -n 20 <target-project>/.agentwolf/decision-log.jsonl
find <target-project>/.agentwolf -maxdepth 2 -type f | sort
find ~/.agentwolf -maxdepth 3 -type f | sort
```

## Privacy Warning

Audit logs and task packets can include product strategy, file paths, private URLs, customer names, and implementation details. Do not publish `.agentwolf/` or `docs/ai-artifacts/` unless the target project has decided those artifacts are public.
