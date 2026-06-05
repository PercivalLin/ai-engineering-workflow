# AI Engineering Workflow

Agent-neutral workflow runtime for turning Codex, Claude Code, Cursor, Gemini CLI, and similar coding agents into a traceable virtual engineering team.

AI Engineering Workflow is not another coding model. It is the engineering system around coding models: roles, gates, memory, questions, trace logs, evidence, ChangeSets, and audit bundles.

## Why This Exists

Modern coding agents can implement quickly, but they often miss the habits that make software engineering reliable:

- clarify product intent only when the ambiguity matters
- separate product, architecture, delivery, implementation, QA, security, review, and release responsibilities
- keep changes small, reversible, and tied to requirements
- record what was changed, by which agent, from which task packet, with which tests
- learn reusable lessons across projects instead of only inside one repository

This project gives agents a workflow kernel so they can act less like a single autocomplete session and more like a disciplined engineering team.

## What It Provides

- MCP server as the primary integration surface
- automatic workflow advancement from a user-provided product goal
- virtual team roles with role-specific prompts and artifact contracts
- global engineering memory across projects
- project-local trace ledger, decision log, evidence log, ChangeSets, and audit bundles
- question protocol that explores first and asks only for high-impact unknowns
- task packets for external execution agents
- progress feedback fields so Codex, Claude Code, or another harness can tell the user who is active and what phase is running
- prompt packs for agents that do not support MCP yet
- lightweight CLI for debugging, smoke tests, and audit export

## What It Is Not

- It is not a replacement for Codex, Claude Code, Cursor, or Gemini CLI.
- It does not own your source control or silently publish changes.
- It does not invent the product goal. The user still gives the product objective.
- It does not ask a fixed upfront questionnaire. It discovers ambiguity while working and pauses only for important decisions.
- It does not treat generated logs as magic truth. Gates depend on recorded evidence.

## Status

The project is early alpha. The runtime is usable as a local MCP server and has executable tests for the current workflow kernel, but the external agent adapters are still task-packet based rather than fully autonomous process supervisors.

Use it first on non-critical repositories or small product slices.

## Documentation

| Link | Purpose |
| --- | --- |
| [Repository Structure](./docs/repository-structure.md) | Understand the source tree and where to add new work. |
| [Architecture](./docs/architecture.md) | Understand the MCP server, runtime, memory store, trace ledger, and adapter boundary. |
| [Workflow](./docs/workflow.md) | Understand phases, gates, stopping points, and progress feedback. |
| [MCP Tools](./docs/mcp-tools.md) | Understand public tools and recommended call patterns. |
| [Roles](./docs/roles.md) | Understand the virtual engineering team and role handoffs. |
| [Data And Traceability](./docs/data-and-traceability.md) | Understand where logs are saved and how audit trails are built. |
| [Publishing](./docs/publishing.md) | Prepare GitHub and npm releases. |
| [Testing Matrix](./TESTING.md) | Map public capabilities to executable tests. |

## Repository Layout

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
└── .github/              # CI, issue templates, and pull request template
```

## Installation

### From npm

After the package is published:

```bash
npm install -g ai-engineering-workflow
ai-engineering server
```

Or run it without a global install:

```bash
npx -y ai-engineering-workflow server
```

### From source

```bash
git clone <your-repository-url> ai-engineering-workflow
cd ai-engineering-workflow
npm run verify
node ./bin/ai-engineering.mjs server
```

The package requires Node.js 20 or newer.

## MCP Configuration

Use the MCP server from npm:

```json
{
  "mcpServers": {
    "ai-engineering-workflow": {
      "command": "npx",
      "args": ["-y", "ai-engineering-workflow", "server"],
      "env": {
        "AI_ENGINEERING_HOME": "/Users/you/.ai-engineering"
      }
    }
  }
}
```

Use the MCP server from a local checkout:

```json
{
  "mcpServers": {
    "ai-engineering-workflow": {
      "command": "node",
      "args": ["/absolute/path/to/Vibe-Engineering/bin/ai-engineering.mjs", "server"],
      "env": {
        "AI_ENGINEERING_HOME": "/Users/you/.ai-engineering"
      }
    }
  }
}
```

`AI_ENGINEERING_HOME` is optional. If omitted, global memory is stored at `~/.ai-engineering`.

## First Run

The normal entrypoint is `advance_workflow`.

Give the agent a product goal, then let it call the MCP tool against the target repository:

```json
{
  "project_root": "/absolute/path/to/target-product",
  "product_goal": "Build a traceable task manager where users can create tasks, assign owners, record status changes, and export an audit trail.",
  "adapter": "codex",
  "risk_level": "medium"
}
```

The runtime will:

1. register the user-provided product goal
2. scan the target repository
3. retrieve relevant global engineering memory
4. ask only if a discovered ambiguity affects product, architecture, cost, compliance, data, release, or acceptance criteria
5. generate requirements, architecture notes, and backlog artifacts
6. dispatch the next role task packet
7. require evidence before gates pass
8. record trace events and export an audit bundle

For CLI debugging:

```bash
ai-engineering advance \
  --project /absolute/path/to/target-product \
  --goal "Build a traceable task manager..." \
  --adapter codex
```

## Agent Progress Feedback

MCP responses include progress fields that an agent harness can surface directly to the user:

- `current_role`: active virtual team role, such as `developer` or `architect`
- `current_phase`: workflow phase, such as `requirements`, `architecture`, or `build_loop`
- `progress_message`: concise human-facing status
- `agent_feedback_prompt`: instruction telling the execution agent how to explain the current status before continuing

Example:

```json
{
  "current_role": "developer",
  "current_phase": "build_loop",
  "status": "external_agent_required",
  "progress_message": "[AI Engineering Workflow] Developer is active. Phase: build_loop. Status: external_agent_required.",
  "agent_feedback_prompt": "You are currently acting as: Developer.\nWorkflow phase: build_loop.\nWorkflow status: external_agent_required.\nTell the user this status briefly before continuing."
}
```

These fields are returned by `advance_workflow`, `get_role_action`, `dispatch_agent_task`, `ask_user_decision`, `record_user_decision`, and `run_gate`.

## Logs And Data

Project logs are stored inside the target product repository, not inside this tool repository unless this tool repository is the target.

Project-local runtime state:

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

Global memory:

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

Useful inspection commands:

```bash
tail -n 20 <target-project>/.ai-engineering/trace-ledger.jsonl
tail -n 20 <target-project>/.ai-engineering/decision-log.jsonl
find <target-project>/.ai-engineering -maxdepth 2 -type f | sort
find ~/.ai-engineering -maxdepth 3 -type f | sort
```

## Virtual Team Roles

| Role | Responsibility | Primary outputs |
| --- | --- | --- |
| PM | clarify product goal, users, scope, priorities, acceptance criteria | PRD or lightweight spec, requirements, success criteria |
| Architect / Tech Lead | design technical approach, interfaces, risks, migration, rollback | ADR, interface contract, risk register |
| Delivery Manager | break work into small batches and keep gates moving | backlog, task queue, Definition of Ready, Definition of Done |
| Developer | implement focused, traceable code changes | code, tests, ChangeSet, implementation notes |
| QA | verify acceptance, regression, edge, and failure paths | test matrix, test evidence, failure reproduction |
| Security | check threats, dependencies, secrets, permissions, data risk | security review, risk findings, evidence |
| SRE / DevOps | check CI, deployment, observability, SLO, rollback | release readiness, operational evidence |
| Reviewer | independently review diff, architecture fit, tests, maintainability | review findings, approval or blocker |
| Writer | produce user/developer-facing delivery docs | README, API docs, changelog, release notes |
| Learning Coach | convert evidence-backed outcomes into reusable memory | candidate playbooks, anti-patterns, policy rules |
| Trace Auditor | verify traceability from goal to code to evidence to release | audit bundle, traceability matrix, missing-link findings |

Each role has a mission, principles, decision frameworks, artifact contract, quality bar, inputs, outputs, and gates in `src/core/defaults.mjs`.

## Workflow

The automated state machine follows this shape:

1. Intake
2. Context Scan
3. Experience Retrieval
4. Clarification Gate
5. Requirements
6. Architecture
7. Planning
8. Build Loop
9. Verification Loop
10. Review Gate
11. Release Readiness
12. Retro / Learn
13. Archive

`advance_workflow` moves through as many safe steps as it can, then stops at one of these boundaries:

- user decision required
- external agent task required
- gate blocked
- task complete
- workflow cannot safely continue

## Question Protocol

The runtime should explore before asking.

It should ask the user when ambiguity affects:

- product goal, target user, or success criteria
- architecture, cost, compliance, long-term maintenance, or user experience
- data deletion, migration, compatibility, public API behavior, paid services, or release window
- acceptance criteria that cannot be inferred from the repository or prior decisions

It should not ask for:

- facts discoverable from repository files, tests, README, CI, or package metadata
- minor implementation details
- code style choices already implied by the project
- low-risk defaults

Questions are recorded in the decision log with default assumptions and impact.

## Traceability Model

Every code modification should be recorded as a ChangeSet.

A ChangeSet records:

- `change_id`
- `task_id`, `requirement_id`, or `decision_id`
- initiating role
- execution agent
- task packet or prompt hash
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

This enables two directions of traceability:

- requirement -> design -> task -> code -> tests -> review -> release
- file change -> requirement -> decision -> agent -> evidence -> rollback

## MCP Tools

| Tool | Purpose |
| --- | --- |
| `advance_workflow` | high-level automatic workflow advancement |
| `create_goal` | create a product goal or engineering task |
| `scan_project_context` | scan repository facts and inferred test commands |
| `retrieve_global_experience` | search global engineering memory |
| `get_role_action` | get the next task packet for a role |
| `ask_user_decision` | create a structured high-impact question |
| `record_user_decision` | record a user answer |
| `dispatch_agent_task` | create a task packet for Codex, Claude Code, Cursor, Gemini CLI, or another adapter |
| `record_changeset` | record traceable modification metadata |
| `record_artifact` | record requirements, ADRs, release notes, retros, or other artifacts |
| `record_backlog` | record Delivery Manager backlog items |
| `record_evidence` | record tests, scans, reviews, security checks, deployments, or manual evidence |
| `run_gate` | run the current or selected phase gate |
| `propose_learning` | create evidence-backed global memory candidates |
| `promote_or_rollback_rule` | move rules through candidate, sandbox, default, or deprecated states |
| `export_audit_bundle` | export timeline, decisions, evidence, ChangeSets, matrix, and summary |

## Prompt Packs

For agents or environments that cannot use MCP directly, see:

```text
prompt-pack/codex-skill.md
prompt-pack/claude-code.md
prompt-pack/generic-agent.md
```

These prompt packs tell the agent how to behave as one role in the virtual team and what evidence it must return.

## Development

```bash
npm run check
npm test
npm run verify
npm run ci
npm run smoke
```

The implementation is dependency-light on purpose. The MCP server uses stdio JSON-RPC directly so the workflow kernel remains portable across agent harnesses.

See `TESTING.md` for the experiment matrix that maps public capabilities to executable tests. See `docs/` for architecture, workflow, roles, data, and publishing guides.

## Release Checklist

Before publishing:

1. Create the public GitHub repository and update `package.json` with `repository`, `homepage`, and `bugs` URLs.
2. Review `docs/` and `examples/` for stale placeholders.
3. Confirm the npm package name is available:

```bash
npm view ai-engineering-workflow version
```

An npm 404 usually means the package name is not currently published.

4. Log in to npm:

```bash
npm adduser
npm whoami
```

This package sets `publishConfig.registry` to the official npm registry so publishing does not accidentally target a local mirror.

5. Run verification:

```bash
npm run ci
```

6. Review what will be published:

```bash
npm pack --dry-run
```

7. Publish:

```bash
npm publish
```

For a scoped public package such as `@your-scope/ai-engineering-workflow`, use:

```bash
npm publish --access public
```

The npm docs recommend reviewing package contents for sensitive or unnecessary information before publishing, testing the package, and using `--access public` for scoped public packages. See the official npm docs for `package.json`, `npm publish`, and scoped public packages:

- https://docs.npmjs.com/files/package.json/
- https://docs.npmjs.com/cli/publish/
- https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/

## Security And Privacy

This tool writes project workflow data to the target repository and global memory to `AI_ENGINEERING_HOME` or `~/.ai-engineering`.

Before sharing logs, audit bundles, or global memory, check for:

- product strategy
- proprietary code paths
- user data
- secrets
- credentials
- private URLs
- vendor or customer names

Do not publish generated `.ai-engineering/` runtime directories by default unless the target project intentionally treats audit logs as public artifacts.

## Roadmap

- richer Codex and Claude Code execution adapters
- adapter health checks and retry policies
- stronger schema validation for all ledger records
- configurable gate policies
- global memory conflict detection
- import/export for organization preferences
- CI examples for package provenance and release automation

## Role Prompt References

The role prompts in `src/core/defaults.mjs` are original syntheses for this project. They do not vendor or copy complete third-party skill prompts. The design was informed by these public references:

- [BMAD Method agents](https://docs.bmad-method.org/reference/agents/): informed the multi-role agent model, including PM, Architect, Developer, Scrum/Delivery-style planning, QA, and implementation readiness workflows.
- [BMAD named agents](https://docs.bmad-method.org/explanation/named-agents/): informed phase-anchored role identity, role customization, and reducing user cognitive load through named agents.
- [aj-geddes product-manager skill](https://github.com/aj-geddes/claude-code-bmad-skills/tree/main/bmad-skills/product-manager): informed PM requirements discipline around PRD vs tech spec choice, functional/non-functional requirements, prioritization, acceptance criteria, and traceability.
- [Product-Manager-Skills](https://github.com/deanpeters/Product-Manager-Skills): informed agent-agnostic skill packaging and PM workflow structure across multiple AI coding harnesses.
- [Google Engineering Practices](https://google.github.io/eng-practices/): informed Developer and Reviewer guidance around small changes, tests, code health, and review standards.
- [The Kanban Guide](https://kanbanguides.org/english/): informed Delivery Manager guidance around visualizing work, WIP, explicit policies, flow, and continuous improvement.
- [Scrum Guide](https://scrumguides.org/scrum-guide.html): informed delivery gates, Definition of Done, transparency, inspection, and adaptation language.
- [Google SRE Book](https://sre.google/sre-book/): informed SRE/DevOps guidance around SLOs, release engineering, monitoring, rollback, incident readiness, and reliable release processes.
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/): informed Security role verification thinking for application security controls.
- [NIST SSDF SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final): informed Security, Learning Coach, and Trace Auditor guidance around secure development practices and evidence.
- [SLSA](https://slsa.dev/spec/v1.0/levels): informed Trace Auditor and SRE supply-chain/provenance language.
- [Google developer documentation style guide](https://developers.google.com/style/): informed Writer guidance around clear, consistent, accessible developer documentation.
- [Anthropic guide to building skills](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf): influenced the progressive-disclosure shape: concise role metadata first, detailed role guidance only inside the role task packet.

Adaptation notes:

- We use MoSCoW as the default prioritization language because it is compact for autonomous planning.
- RICE is included only when comparable reach, impact, confidence, and effort inputs are available.
- The PM role is forbidden from prescribing low-level implementation details unless they are already project constraints.
- All roles must preserve traceability from product goal to requirements, stories, acceptance criteria, backlog, implementation, tests, evidence, review, release, learning, and ChangeSets.
- Role prompts are not meant to replace the workflow gates; they tell each role how to produce evidence that the gates can verify.

## License

MIT
