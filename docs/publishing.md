# Publishing

Use this checklist when preparing a GitHub release or npm publish.

## Repository Readiness

- Root README explains the product, not only the implementation.
- `docs/` contains deeper usage, architecture, workflow, data, and publishing guides.
- `examples/` contains copyable MCP configuration and request examples.
- `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, and `LICENSE` are present.
- `.github/` contains issue templates, pull request template, and CI workflow.
- Runtime output is ignored:

```text
.agentwolf/
docs/ai-artifacts/
```

## GitHub Setup

After creating the public repository, update `package.json` with real URLs:

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/<owner>/agentwolf.git"
  },
  "bugs": {
    "url": "https://github.com/<owner>/agentwolf/issues"
  },
  "homepage": "https://github.com/<owner>/agentwolf#readme"
}
```

Then push:

```bash
git remote add origin git@github.com:<owner>/agentwolf.git
git push -u origin main
```

## npm Readiness

Check package name availability:

```bash
npm view agentwolf version
```

An npm 404 usually means the package name is not currently published.

Log in:

```bash
npm adduser
npm whoami
```

Run verification:

```bash
npm run ci
```

Preview package contents:

```bash
npm pack --dry-run
npm publish --dry-run
```

Publish:

```bash
npm publish
```

For a scoped public package:

```bash
npm publish --access public
```

This project sets `publishConfig.registry` to `https://registry.npmjs.org/` to avoid accidentally publishing to a configured mirror.

## Release Tag

After publishing:

```bash
git tag v0.1.1
git push origin v0.1.1
```

Then create a GitHub release using the notes in `CHANGELOG.md`.
