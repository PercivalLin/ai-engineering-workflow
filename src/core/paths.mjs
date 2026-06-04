import { homedir } from "node:os";
import { join } from "node:path";

export function globalRoot() {
  return process.env.AI_ENGINEERING_HOME || join(homedir(), ".ai-engineering");
}

export function projectPaths(projectRoot) {
  const project = join(projectRoot, ".ai-engineering");
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
