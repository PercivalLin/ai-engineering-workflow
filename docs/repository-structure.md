# Repository Structure

AgentWolf is organized so new contributors can quickly distinguish runtime code, schemas, prompt packs, docs, examples, and release infrastructure.

## Top-Level Layout

```text
.
├── bin/                  # CLI entrypoint and MCP server launcher
├── src/                  # Runtime source code
│   ├── server.mjs        # Stdio JSON-RPC MCP server
│   └── core/             # Workflow, memory, trace, context, and project modules
├── schemas/              # JSON schemas for portable records
├── prompt-pack/          # Prompt-only adapter guidance for non-MCP agents
├── tests/                # Node test suite
├── docs/                 # Long-form documentation
├── examples/             # Copyable MCP configs and request examples
├── .github/              # CI, issue templates, and PR template
├── README.md             # Public landing page and quickstart
├── TESTING.md            # Experiment matrix
├── CHANGELOG.md          # Version history
├── CONTRIBUTING.md       # Contribution guide
├── SECURITY.md           # Security and sensitive data policy
├── LICENSE               # MIT license
└── package.json          # npm metadata and scripts
```

## Runtime Code

`src/server.mjs` exposes the MCP tools over stdio JSON-RPC.

`src/core/` contains the workflow kernel:

| File | Responsibility |
| --- | --- |
| `workflow.mjs` | Automatic workflow advancement, role task packets, user decisions, dispatch, gates, and progress feedback. |
| `defaults.mjs` | Built-in role definitions, role prompts, and seed global memory. |
| `project.mjs` | Project initialization, project state, and decision log writes. |
| `context.mjs` | Repository scanning for languages, package scripts, CI, git status, files, and inferred checks. |
| `memory.mjs` | Global engineering memory retrieval, candidate learning, rule promotion, and rollback. |
| `trace.mjs` | Artifacts, backlog, evidence, ChangeSets, audit bundles, and traceability matrix. |
| `paths.mjs` | Project-local and global data paths. |
| `fs-utils.mjs` | Small filesystem helpers. |

## Public Interfaces

| Surface | Location | Notes |
| --- | --- | --- |
| MCP server | `src/server.mjs` | Primary product interface. |
| CLI | `bin/agentwolf.mjs` | Debugging, smoke tests, and local inspection. |
| Schemas | `schemas/` | Portable record contracts for ChangeSets, decisions, evidence, and experience. |
| Prompt packs | `prompt-pack/` | Fallback guidance for agents without MCP support. |

## Where To Add New Work

- Add workflow behavior in `src/core/workflow.mjs`.
- Add trace or audit behavior in `src/core/trace.mjs`.
- Add global memory behavior in `src/core/memory.mjs`.
- Add role prompt changes in `src/core/defaults.mjs` and update role tests.
- Add new MCP tools in `src/server.mjs` and cover them in `tests/mcp-tools.test.mjs`.
- Add examples under `examples/`.
- Add long-form docs under `docs/`.

## Generated Runtime Data

Runtime data belongs to the target project and is ignored by this repository:

```text
.agentwolf/
docs/ai-artifacts/
```

Target projects may choose to commit their own audit artifacts, but that should be an explicit project decision.
