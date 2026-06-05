# Security Policy

AI Engineering Workflow records product goals, decisions, task packets, commands, evidence, ChangeSets, and audit bundles. Those records can contain sensitive project information.

## Supported Versions

The project is pre-1.0. Security fixes should target the latest published version and the main branch.

## Reporting A Vulnerability

Please report vulnerabilities through GitHub Security Advisories:

https://github.com/PercivalLin/ai-engineering-workflow/security/advisories/new

If GitHub Security Advisories are unavailable for your account, contact the maintainer through the GitHub profile linked from the repository owner.

Please include:

- affected version or commit
- reproduction steps
- expected impact
- whether the issue affects local project logs, global memory, MCP tool calls, package installation, or published artifacts

Expected initial response time is best-effort during the pre-1.0 phase.

## Sensitive Data Handling

Before publishing logs, examples, screenshots, audit bundles, or generated memory records, check for:

- credentials, tokens, or private keys
- customer or user data
- private repository paths
- proprietary product plans
- internal URLs
- vendor or customer names
- generated task packets that include confidential context

Project runtime directories are ignored by default in this repository:

```text
.ai-engineering/
docs/ai-artifacts/
```

Target projects may choose to commit their own audit artifacts, but that should be an explicit project decision.

## Dependency Surface

The runtime currently has no third-party package dependencies. If dependencies are added, include a security rationale in the pull request and update the verification strategy.
