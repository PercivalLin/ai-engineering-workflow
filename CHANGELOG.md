# Changelog

All notable changes to this project will be documented in this file.

This project follows semantic versioning once published.

## 0.1.0 - Unreleased

### Added

- MCP server exposing the AI engineering workflow runtime.
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
