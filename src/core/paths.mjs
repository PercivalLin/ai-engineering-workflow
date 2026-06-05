import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";

export function globalRoot() {
  return process.env.VIBE_ENGINEERING_HOME || process.env.AI_ENGINEERING_HOME || join(homedir(), ".vibe-engineering");
}

export function projectPaths(projectRoot) {
  const project = projectRuntimeDir(projectRoot);
  return {
    root: projectRoot,
    project,
    projectYaml: join(project, "project.yaml"),
    workflowState: join(project, "workflow-state.json"),
    traceLedger: join(project, "trace-ledger.jsonl"),
    decisionLog: join(project, "decision-log.jsonl"),
    evidence: join(project, "evidence"),
    changesets: join(project, "changesets"),
    context: join(project, "context"),
    taskPackets: join(project, "context", "task-packets"),
    auditBundles: join(project, "audit-bundles"),
    docsRoot: join(projectRoot, "docs", "ai-artifacts"),
    requirements: join(projectRoot, "docs", "ai-artifacts", "requirements"),
    adr: join(projectRoot, "docs", "ai-artifacts", "adr"),
    release: join(projectRoot, "docs", "ai-artifacts", "release"),
    retro: join(projectRoot, "docs", "ai-artifacts", "retro")
  };
}

function projectRuntimeDir(projectRoot) {
  const current = join(projectRoot, ".vibe-engineering");
  const legacy = join(projectRoot, ".ai-engineering");
  if (!existsSync(current) && existsSync(legacy)) return legacy;
  return current;
}

export function globalPaths() {
  const root = globalRoot();
  return {
    root,
    principles: join(root, "memory", "principles"),
    playbooks: join(root, "memory", "playbooks"),
    antiPatterns: join(root, "memory", "anti-patterns"),
    cases: join(root, "memory", "cases"),
    rules: join(root, "memory", "rules"),
    roleChecklists: join(root, "memory", "role-checklists"),
    stackKnowledge: join(root, "memory", "stack-knowledge"),
    organizationPreferences: join(root, "memory", "organization-preferences"),
    agents: join(root, "agents"),
    sandboxRules: join(root, "sandbox-rules")
  };
}
