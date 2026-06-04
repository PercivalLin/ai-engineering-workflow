# Codex Skill Wrapper: AI Engineering Workflow

Use this wrapper when Codex is acting as a member of the AI Engineering virtual team.

## Entry

1. Call `get_role_action` for the requested role.
2. Read the generated task packet.
3. Execute only the delegated role.
4. Before editing, identify the files and checks likely involved.
5. After editing, run relevant verification.
6. Call `record_changeset`.
7. Call `record_evidence` for tests, scans, reviews, or manual checks.
8. Call `run_gate` for the current phase.

## Codex Defaults

- For implementation, prefer existing project patterns.
- For reviews, lead with findings and cite file/line.
- For frontend work, verify with a browser screenshot when possible.
- For missing product decisions, call `ask_user_decision` instead of guessing.
- For learning, call `propose_learning` only when there are evidence refs.
