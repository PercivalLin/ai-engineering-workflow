<h1 align="center">AgentWolf</h1>

<p align="center">
  <strong>Turn AI coding agents into a traceable virtual engineering team.</strong>
</p>

<p align="center">
  <a href="https://github.com/PercivalLin/agentwolf/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/PercivalLin/agentwolf/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://www.npmjs.com/package/agentwolf"><img alt="npm" src="https://img.shields.io/npm/v/agentwolf.svg"></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <img alt="Node.js 20+" src="https://img.shields.io/badge/node-20%2B-339933.svg">
  <img alt="MCP" src="https://img.shields.io/badge/MCP-server-6f42c1.svg">
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a>
  ·
  <a href="#mcp-configuration">MCP Config</a>
  ·
  <a href="#how-it-works">How It Works</a>
  ·
  <a href="./docs/README.md">Docs</a>
  ·
  <a href="./README.zh-CN.md">中文</a>
</p>

---

AgentWolf is an agent-neutral MCP runtime for organizing Codex, Claude Code, Cursor, Gemini CLI, and similar tools into a disciplined engineering workflow.

It does not replace coding agents. It gives them the process around coding:

- product and architecture gates
- role-specific task packets
- global engineering memory
- user questions only when the ambiguity matters
- project-local trace ledger, evidence, ChangeSets, and audit bundles
- progress feedback showing who is active and which phase is running

## Why

Coding agents can produce code quickly, but production engineering also needs scope, design, verification, review, release notes, rollback, and learning.

This project provides the control plane for that work. The workflow runtime owns process decisions; external agents execute delegated role tasks.

## Quickstart

Install globally:

```bash
npm install -g agentwolf
agentwolf server
```

Or run with `npx`:

```bash
npx -y agentwolf server
```

From source:

```bash
git clone https://github.com/PercivalLin/agentwolf.git
cd agentwolf
npm run verify
node ./bin/agentwolf.mjs server
```

Requires Node.js 20 or newer.

## MCP Configuration

Using npm:

```json
{
  "mcpServers": {
    "agentwolf": {
      "command": "npx",
      "args": ["-y", "agentwolf", "server"],
      "env": {
        "AGENTWOLF_HOME": "/Users/you/.agentwolf"
      }
    }
  }
}
```

Using a local checkout:

```json
{
  "mcpServers": {
    "agentwolf": {
      "command": "node",
      "args": ["/absolute/path/to/agentwolf/bin/agentwolf.mjs", "server"],
      "env": {
        "AGENTWOLF_HOME": "/Users/you/.agentwolf"
      }
    }
  }
}
```

`AGENTWOLF_HOME` is optional. By default, global memory is stored in `~/.agentwolf`.

## First Workflow Call

Use `advance_workflow` as the main entrypoint:

```json
{
  "project_root": "/absolute/path/to/target-product",
  "product_goal": "Build a traceable task manager with owners, status history, and audit export.",
  "adapter": "codex",
  "risk_level": "medium"
}
```

The runtime will scan the repository, retrieve global experience, generate role artifacts, ask only for high-impact unknowns, and stop at the next user decision, external agent task, gate blocker, or audit completion.

## How It Works

```text
user product goal
  -> context scan
  -> global memory retrieval
  -> clarification gate
  -> requirements
  -> architecture
  -> planning
  -> role task packet
  -> evidence / ChangeSet / review
  -> audit bundle
```

The workflow adapts the next execution role to the task type. Implementation work goes to Developer, documentation work goes to Writer, security review goes to Security, and read-only analysis goes to Reviewer.

## Runtime Data

Project-local workflow data is written to the target repository:

```text
<target-project>/.agentwolf/
<target-project>/docs/ai-artifacts/
```

Global memory is written to:

```text
~/.agentwolf/
```

These logs can contain sensitive project details. Review them before sharing.

## Documentation

| Guide | Purpose |
| --- | --- |
| [Architecture](./docs/architecture.md) | Runtime components and trust boundaries. |
| [Workflow](./docs/workflow.md) | Phases, gates, stopping points, and feedback. |
| [MCP Tools](./docs/mcp-tools.md) | Public tool list and call patterns. |
| [Roles](./docs/roles.md) | Virtual team roles and handoff rules. |
| [Data And Traceability](./docs/data-and-traceability.md) | Logs, ChangeSets, evidence, and audit trails. |
| [Repository Structure](./docs/repository-structure.md) | Source tree and contribution map. |
| [Publishing](./docs/publishing.md) | GitHub and npm release checklist. |

Examples live in [`examples/`](./examples/README.md).

## Development

```bash
npm run check
npm test
npm run verify
npm run ci
```

`npm run ci` runs syntax checks, tests, audit, and package dry-run validation.

## Status

Early alpha. The MCP runtime, role packets, trace ledger, gates, global memory, and audit bundle export are implemented. External adapters are currently task-packet based.

## License

MIT
