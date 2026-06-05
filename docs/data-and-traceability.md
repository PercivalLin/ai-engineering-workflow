# Data And Traceability

Vibe Engineering separates project-local audit data from global engineering memory.

## Project-Local Data

Project data is written under the target repository:

```text
<target-project>/.vibe-engineering/project.yaml
<target-project>/.vibe-engineering/workflow-state.json
<target-project>/.vibe-engineering/trace-ledger.jsonl
<target-project>/.vibe-engineering/decision-log.jsonl
<target-project>/.vibe-engineering/evidence/
<target-project>/.vibe-engineering/changesets/
<target-project>/.vibe-engineering/context/
<target-project>/.vibe-engineering/context/task-packets/
<target-project>/.vibe-engineering/audit-bundles/
<target-project>/docs/ai-artifacts/
```

Important files:

| Path | Purpose |
| --- | --- |
| `.vibe-engineering/workflow-state.json` | Current phase, active goal, backlog, decisions, artifacts, evidence, and gate state. |
| `.vibe-engineering/trace-ledger.jsonl` | Append-oriented timeline of workflow events. |
| `.vibe-engineering/decision-log.jsonl` | User answers, AI assumptions, and high-impact decisions. |
| `.vibe-engineering/evidence/` | Test, scan, review, security, deployment, and manual evidence records. |
| `.vibe-engineering/changesets/` | ChangeSet metadata and patch snapshots. |
| `.vibe-engineering/context/task-packets/` | Role packets dispatched to external agents. |
| `.vibe-engineering/audit-bundles/` | Exported audit summaries and traceability matrices. |
| `docs/ai-artifacts/` | Requirements, ADRs, release notes, retrospectives, and other generated artifacts. |

## Global Memory

Global memory is stored at `VIBE_ENGINEERING_HOME` or `~/.vibe-engineering`:

```text
~/.vibe-engineering/memory/principles/
~/.vibe-engineering/memory/playbooks/
~/.vibe-engineering/memory/anti-patterns/
~/.vibe-engineering/memory/cases/
~/.vibe-engineering/memory/rules/
~/.vibe-engineering/memory/role-checklists/
~/.vibe-engineering/memory/stack-knowledge/
~/.vibe-engineering/memory/organization-preferences/
~/.vibe-engineering/agents/
~/.vibe-engineering/sandbox-rules/
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
tail -n 20 <target-project>/.vibe-engineering/trace-ledger.jsonl
tail -n 20 <target-project>/.vibe-engineering/decision-log.jsonl
find <target-project>/.vibe-engineering -maxdepth 2 -type f | sort
find ~/.vibe-engineering -maxdepth 3 -type f | sort
```

## Privacy Warning

Audit logs and task packets can include product strategy, file paths, private URLs, customer names, and implementation details. Do not publish `.vibe-engineering/` or `docs/ai-artifacts/` unless the target project has decided those artifacts are public.
