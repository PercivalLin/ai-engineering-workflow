# Schemas

This directory contains portable JSON schemas for records produced by the workflow runtime.

| File | Record type |
| --- | --- |
| `changeset.schema.json` | Code modification metadata, diff hash, files, commands, tests, evidence, risk, and rollback. |
| `decision.schema.json` | User answers, AI assumptions, decision topic, impact, and default assumptions. |
| `evidence.schema.json` | Test, scan, QA, security, review, deployment, or manual evidence. |
| `experience.schema.json` | Global memory records such as playbooks, cases, anti-patterns, and policy rules. |

Schemas are intentionally small so other agent harnesses can validate records without importing the runtime.
