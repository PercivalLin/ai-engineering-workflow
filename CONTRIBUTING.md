# Contributing

Thanks for helping improve AI Engineering Workflow.

The project is intentionally small and dependency-light. Changes should make the workflow more reliable, traceable, and useful across agent harnesses without binding the runtime to one model provider.

## Development Setup

```bash
npm run verify
```

The project currently uses only Node.js built-ins. Node.js 20 or newer is required.

## Before Opening A Pull Request

Please run:

```bash
npm run verify
npm run pack:dry
```

For changes that affect runtime behavior, add or update tests in `tests/`.

For changes that affect role prompts, update `tests/roles.test.mjs` expectations if needed and keep role contracts explicit:

- mission
- prompt
- principles
- decision frameworks
- artifact contract
- quality bar
- inputs
- outputs
- gates

For changes that affect traceability, make sure the generated records still preserve:

```text
goal -> requirement -> decision -> task packet -> ChangeSet -> evidence -> review -> release
```

## Design Principles

- Prefer MCP as the primary product surface.
- Keep the CLI useful for debugging, not as the main workflow owner.
- Keep execution agents replaceable. Adapters execute tasks; the workflow runtime owns process decisions.
- Ask users only after exploration reveals a high-impact ambiguity.
- Require evidence for learning, gates, and audit claims.
- Make generated logs append-oriented and easy to inspect.

## Commit And PR Guidance

- Keep changes focused.
- Avoid unrelated refactors.
- Include tests for behavior changes.
- Update `README.md`, `TESTING.md`, or schema docs when public behavior changes.
- Do not commit generated `.ai-engineering/` runtime data unless a fixture explicitly needs it.
