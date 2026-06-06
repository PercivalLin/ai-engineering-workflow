# Changelog

All notable changes to this project will be documented in this file.

This project follows semantic versioning once published.

## 0.1.2 - 2026-06-06

### Fixed

- Require ChangeSet `evidence_refs` to point to existing passing evidence records for the same task.
- Scope verification, review, requirements, architecture, and release gates to the active task.
- Block failed, stale, or cross-task evidence from passing verification and review gates.
- Capture staged Git changes and untracked files in ChangeSet patch snapshots.
- Filter AgentWolf runtime output from inferred `files_changed`.
- Report invalid evidence refs and empty patches in audit bundle trace findings.
- Return only the MCP protocol version actually supported by this stdio tools server.

## 0.1.1 - 2026-06-05

### Fixed

- Route read-only analysis workflow goals to Reviewer instead of always dispatching Developer.
- Allow read-only analysis tasks to pass the build gate with recorded evidence instead of requiring a ChangeSet.
- Infer missing ChangeSet `prompt_ref` and `context_ref` from the latest task packet for the active task.
- Shorten the English README into a focused project landing page.

### Changed

- Rename the public project and npm package to AgentWolf / `agentwolf`.
- Rename the primary CLI entrypoint to `agentwolf`.
- Use `AGENTWOLF_HOME` and `.agentwolf` as the new default runtime names while keeping compatibility with the legacy environment variable and project directory.
- Add `npm audit --omit=dev` to local CI verification.

## 0.1.0 - 2026-06-05

### Added

- MCP server exposing the AgentWolf runtime.
- `advance_workflow` high-level entrypoint for automatic workflow advancement.
- Project-local trace ledger, decision log, evidence records, ChangeSets, task packets, and audit bundles.
- Global engineering memory layout for principles, playbooks, anti-patterns, cases, rules, stack knowledge, role checklists, and organization preferences.
- Virtual team roles for PM, Architect, Delivery Manager, Developer, QA, Security, SRE / DevOps, Reviewer, Writer, Learning Coach, and Trace Auditor.
- Role prompt contracts with missions, principles, decision frameworks, artifact contracts, quality bars, inputs, outputs, and gates.
- Clarification protocol that asks only after discovering high-impact ambiguity.
- Agent progress feedback fields for role, phase, status, user-facing progress, and agent-facing status prompts.
- Prompt packs for Codex, Claude Code, and generic agents.
- CLI commands for local debugging, scanning, role packets, decisions, dispatch, evidence, gates, ChangeSets, and audit export.
- Executable test suite covering workflow advancement, MCP tools, gates, traceability, role contracts, and CLI smoke behavior.
