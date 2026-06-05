# Roles

Vibe Engineering uses explicit virtual team roles so external agents do not act as one vague all-purpose developer.

Each role definition includes:

- mission
- prompt
- principles
- decision frameworks
- artifact contract
- quality bar
- inputs
- outputs
- gates

The role definitions live in `src/core/defaults.mjs`.

## Role Map

| Role | Main responsibility | Gate |
| --- | --- | --- |
| PM | Convert product goal into testable, prioritized, traceable requirements. | requirements |
| Architect / Tech Lead | Design architecture, interfaces, data flow, risks, rollout, and rollback. | architecture |
| Delivery Manager | Break work into small batches, limit WIP, and keep the workflow moving. | planning |
| Developer | Implement focused, traceable changes with tests and ChangeSets. | build_loop |
| QA | Verify acceptance criteria, regressions, edge cases, and failures. | verification_loop |
| Security | Check threats, dependencies, secrets, permissions, and data risk. | verification_loop |
| SRE / DevOps | Check CI, deployment, observability, SLOs, and rollback readiness. | release_readiness |
| Reviewer | Independently review diff, architecture fit, tests, and maintainability. | review_gate |
| Writer | Produce user-facing and developer-facing delivery documentation. | release_readiness |
| Learning Coach | Turn evidence-backed outcomes into reusable global memory. | retro_learn |
| Trace Auditor | Verify the audit chain from product goal to release evidence. | archive |

## Handoff Rules

- PM does not prescribe low-level implementation unless it is an existing constraint.
- Architect does not invent new frameworks unless the goal cannot be met safely without them.
- Delivery Manager does not dispatch work that depends on unresolved product or architecture decisions.
- Developer does not broaden the task beyond the delegated slice.
- QA does not approve without evidence.
- Security does not rely on claims when a scan, code review, or configuration check is possible.
- SRE does not mark release ready without rollback and operational visibility.
- Reviewer leads with blocking findings before summary.
- Writer documents behavior, setup, release notes, and known risks without hiding limitations.
- Learning Coach cannot write global memory without evidence references.
- Trace Auditor blocks archive when the chain is not reconstructable.

## Task Packets

Agents receive task packets rather than open-ended instructions. A task packet includes role identity, prompt, phase, artifacts, project context, global memory, and the expected output contract.

This makes role behavior portable across Codex, Claude Code, Cursor, Gemini CLI, and custom adapters.
