# AI Engineering Workflow

AI Engineering Workflow is an agent-neutral runtime for turning Codex, Claude Code, Cursor, and similar coding agents into a traceable virtual engineering team.

The tool does not try to be the coding model. It provides the engineering system around coding models:

- virtual team roles
- automated workflow gates
- global engineering memory
- structured user-question protocol
- trace ledger and ChangeSets
- evidence recording
- audit bundle export
- MCP tools for agent integration

## Current Shape

The main product surface is an MCP server:

```bash
node ./bin/ai-engineering.mjs server
```

The CLI exists for debugging and smoke tests:

```bash
node ./bin/ai-engineering.mjs advance --goal "User product goal..."
node ./bin/ai-engineering.mjs init
node ./bin/ai-engineering.mjs create-goal --title "Build product" --description "..."
node ./bin/ai-engineering.mjs scan
node ./bin/ai-engineering.mjs role --role pm
node ./bin/ai-engineering.mjs export
```

## MCP Tools

- `advance_workflow`
- `create_goal`
- `scan_project_context`
- `retrieve_global_experience`
- `get_role_action`
- `ask_user_decision`
- `record_user_decision`
- `dispatch_agent_task`
- `record_changeset`
- `record_artifact`
- `record_backlog`
- `record_evidence`
- `run_gate`
- `propose_learning`
- `promote_or_rollback_rule`
- `export_audit_bundle`

## Virtual Team Roles

- PM
- Architect / Tech Lead
- Delivery Manager
- Developer
- QA
- Security
- SRE / DevOps
- Reviewer
- Writer
- Learning Coach
- Trace Auditor

Each role has a mission, required inputs, required outputs, and gates. Agents receive role task packets rather than free-form work.

## Data Layout

Global memory:

```text
~/.ai-engineering/memory/principles/
~/.ai-engineering/memory/playbooks/
~/.ai-engineering/memory/anti-patterns/
~/.ai-engineering/memory/cases/
~/.ai-engineering/memory/rules/
~/.ai-engineering/agents/
~/.ai-engineering/sandbox-rules/
```

Project state:

```text
.ai-engineering/project.yaml
.ai-engineering/workflow-state.json
.ai-engineering/trace-ledger.jsonl
.ai-engineering/decision-log.jsonl
.ai-engineering/evidence/
.ai-engineering/changesets/
.ai-engineering/context/
docs/ai-artifacts/
```

## Traceability

Every modification should be recorded as a ChangeSet with:

- task and decision links
- role and execution agent
- prompt and context refs
- changed files
- diff hash
- commands and tests
- evidence and review refs
- risk level
- rollback plan
- timestamp

Audit bundles support both requirement-to-code and code-to-requirement tracing.

## Example MCP Config

Use a stdio MCP server command in any compatible agent:

```json
{
  "mcpServers": {
    "ai-engineering-workflow": {
      "command": "node",
      "args": ["/Users/jochen/program/Vibe-Engineering/bin/ai-engineering.mjs", "server"],
      "env": {
        "AI_ENGINEERING_HOME": "/Users/jochen/.ai-engineering"
      }
    }
  }
}
```

## Development

```bash
npm run verify
npm run smoke
```

The implementation is dependency-light on purpose. The MCP server uses stdio JSON-RPC directly so the workflow kernel remains portable across agents.

See [TESTING.md](./TESTING.md) for the experiment matrix that maps each public capability to executable tests.

## Recommended Practice

Use `advance_workflow` as the normal entrypoint. The other tools are lower-level primitives used by the runtime and by advanced debugging.

`advance_workflow` starts from a user-provided product goal, then automatically:

- registers the user's product goal as the active internal task
- scans project context
- retrieves global experience
- asks only when it discovers a high-impact ambiguity during requirements, architecture, planning, verification, or release work
- records generated requirements, ADR, and backlog artifacts
- dispatches the next execution role when code, verification, review, or learning needs an external agent
- records every advancement in the trace ledger

## Agent Progress Feedback

MCP responses include progress fields that Codex, Claude Code, Cursor, or another harness can surface directly to the user:

- `current_role`: the active virtual team role, such as `developer` or `architect`.
- `current_phase`: the workflow phase, such as `requirements`, `architecture`, or `build_loop`.
- `progress_message`: a concise human-facing status message.
- `agent_feedback_prompt`: a short instruction telling the execution agent how to explain the current status before continuing.

The high-level `advance_workflow` tool and the lower-level `get_role_action`, `dispatch_agent_task`, `ask_user_decision`, `record_user_decision`, and `run_gate` tools all return progress feedback. Trace events also record progress messages so the audit bundle can reconstruct who was active and what phase the workflow was in.

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
