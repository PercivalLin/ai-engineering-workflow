# Security Policy

AI Engineering Workflow records product goals, decisions, task packets, commands, evidence, ChangeSets, and audit bundles. Those records can contain sensitive project information.

## Supported Versions

The project is pre-1.0. Security fixes should target the latest published version and the main branch.

## Reporting A Vulnerability

Until a public repository security advisory channel is configured, please report vulnerabilities privately to the project maintainer.

When the GitHub repository is created, update this file with:

- the maintainer security contact
- the GitHub Security Advisories link
- expected response times

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
