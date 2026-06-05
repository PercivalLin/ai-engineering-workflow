# Data And Traceability

AI Engineering Workflow separates project-local audit data from global engineering memory.

## Project-Local Data

Project data is written under the target repository:

```text
<target-project>/.ai-engineering/project.yaml
<target-project>/.ai-engineering/workflow-state.json
<target-project>/.ai-engineering/trace-ledger.jsonl
<target-project>/.ai-engineering/decision-log.jsonl
<target-project>/.ai-engineering/evidence/
<target-project>/.ai-engineering/changesets/
<target-project>/.ai-engineering/context/
<target-project>/.ai-engineering/context/task-packets/
<target-project>/.ai-engineering/audit-bundles/
<target-project>/docs/ai-artifacts/
```

Important files:

| Path | Purpose |
| --- | --- |
| `.ai-engineering/workflow-state.json` | Current phase, active goal, backlog, decisions, artifacts, evidence, and gate state. |
| `.ai-engineering/trace-ledger.jsonl` | Append-oriented timeline of workflow events. |
| `.ai-engineering/decision-log.jsonl` | User answers, AI assumptions, and high-impact decisions. |
| `.ai-engineering/evidence/` | Test, scan, review, security, deployment, and manual evidence records. |
| `.ai-engineering/changesets/` | ChangeSet metadata and patch snapshots. |
| `.ai-engineering/context/task-packets/` | Role packets dispatched to external agents. |
| `.ai-engineering/audit-bundles/` | Exported audit summaries and traceability matrices. |
| `docs/ai-artifacts/` | Requirements, ADRs, release notes, retrospectives, and other generated artifacts. |

## Global Memory

Global memory is stored at `AI_ENGINEERING_HOME` or `~/.ai-engineering`:

```text
~/.ai-engineering/memory/principles/
~/.ai-engineering/memory/playbooks/
~/.ai-engineering/memory/anti-patterns/
~/.ai-engineering/memory/cases/
~/.ai-engineering/memory/rules/
~/.ai-engineering/memory/role-checklists/
~/.ai-engineering/memory/stack-knowledge/
~/.ai-engineering/memory/organization-preferences/
~/.ai-engineering/agents/
~/.ai-engineering/sandbox-rules/
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
tail -n 20 <target-project>/.ai-engineering/trace-ledger.jsonl
tail -n 20 <target-project>/.ai-engineering/decision-log.jsonl
find <target-project>/.ai-engineering -maxdepth 2 -type f | sort
find ~/.ai-engineering -maxdepth 3 -type f | sort
```

## Privacy Warning

Audit logs and task packets can include product strategy, file paths, private URLs, customer names, and implementation details. Do not publish `.ai-engineering/` or `docs/ai-artifacts/` unless the target project has decided those artifacts are public.
