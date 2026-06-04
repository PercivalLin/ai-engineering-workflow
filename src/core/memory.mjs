import { basename, join } from "node:path";
import { DEFAULT_ANTI_PATTERNS, DEFAULT_PLAYBOOKS, DEFAULT_PRINCIPLES, DEFAULT_ROLE_CHECKLISTS } from "./defaults.mjs";
import { appendJsonl, ensureDir, exists, hashObject, newId, nowIso, readJson, writeJson, writeText, listFiles } from "./fs-utils.mjs";
import { globalPaths } from "./paths.mjs";
import { appendTraceEvent } from "./project.mjs";

const DEFAULT_GROUPS = [
  ["principles", DEFAULT_PRINCIPLES],
  ["playbooks", DEFAULT_PLAYBOOKS],
  ["antiPatterns", DEFAULT_ANTI_PATTERNS],
  ["roleChecklists", DEFAULT_ROLE_CHECKLISTS]
];

export async function ensureGlobalMemory() {
  const paths = globalPaths();
  await Promise.all(Object.values(paths).map((path) => ensureDir(path)));
  for (const [key, records] of DEFAULT_GROUPS) {
    const dir = paths[key];
    for (const record of records) {
      const file = join(dir, `${record.id}.json`);
      if (!(await exists(file))) {
        await writeJson(file, {
          ...record,
          created_at: nowIso(),
          updated_at: nowIso(),
          source: "default_seed"
        });
      }
    }
  }
  const codexAgent = join(paths.agents, "codex.json");
  if (!(await exists(codexAgent))) {
    await writeJson(codexAgent, {
      id: "codex",
      title: "Codex",
      execution_mode: "external_agent",
      command_template: "codex",
      owns_workflow_decisions: false,
      notes: "Receives role task packets from the workflow runtime and records ChangeSets after edits."
    });
  }
  const claudeAgent = join(paths.agents, "claude_code.json");
  if (!(await exists(claudeAgent))) {
    await writeJson(claudeAgent, {
      id: "claude_code",
      title: "Claude Code",
      execution_mode: "external_agent",
      command_template: "claude",
      owns_workflow_decisions: false,
      notes: "Receives role task packets from the workflow runtime and records ChangeSets after edits."
    });
  }
  return paths;
}

async function loadMemoryRecords() {
  const paths = await ensureGlobalMemory();
  const dirs = [
    paths.principles,
    paths.playbooks,
    paths.antiPatterns,
    paths.cases,
    paths.rules,
    paths.roleChecklists,
    paths.stackKnowledge,
    paths.organizationPreferences,
    paths.sandboxRules
  ];
  const records = [];
  for (const dir of dirs) {
    const files = await listFiles(dir, { maxDepth: 2, maxFiles: 5000, ignore: [] });
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const record = await readJson(file);
        records.push({ ...record, file, bucket: basename(dir) });
      } catch {
        // Ignore malformed experimental memory rather than failing the runtime.
      }
    }
  }
  return records;
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9_\u4e00-\u9fa5]+/u)
    .filter((token) => token.length > 1);
}

function scoreRecord(record, queryTokens, scopes) {
  const haystack = [
    record.id,
    record.type,
    record.scope,
    record.status,
    record.trigger,
    record.lesson,
    record.bucket
  ].join(" ").toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    if (haystack.includes(token)) score += 2;
  }
  if (record.status === "default") score += 1;
  if (record.status === "sandbox") score += 0.5;
  if (scopes.length > 0 && scopes.some((scope) => String(record.scope || "").includes(scope))) score += 3;
  return score;
}

export async function retrieveGlobalExperience(projectRoot, input = {}) {
  const query = input.query || "";
  const limit = Number(input.limit || 8);
  const scopes = input.scopes || [];
  const records = await loadMemoryRecords();
  const queryTokens = tokenize(query);
  const ranked = records
    .map((record) => ({ record, score: scoreRecord(record, queryTokens, scopes) }))
    .filter(({ score, record }) => score > 0 || queryTokens.length === 0 || record.status === "default")
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ record, score }) => ({
      id: record.id,
      type: record.type,
      scope: record.scope,
      status: record.status,
      trigger: record.trigger,
      lesson: record.lesson,
      confidence: record.confidence,
      evidence: record.evidence || [],
      score,
      file: record.file
    }));

  if (projectRoot) {
    await appendTraceEvent(projectRoot, {
      type: "experience_retrieved",
      role: "learning_coach",
      query,
      scopes,
      result_ids: ranked.map((record) => record.id)
    });
  }

  return {
    ok: true,
    query,
    count: ranked.length,
    experiences: ranked
  };
}

export async function proposeLearning(projectRoot, input = {}) {
  const evidenceRefs = input.evidence_refs || input.evidenceRefs || [];
  if (!Array.isArray(evidenceRefs) || evidenceRefs.length === 0) {
    return {
      ok: false,
      blocked: true,
      reason: "Learning proposals must reference real evidence such as tests, review comments, failures, incidents, or delivery metrics."
    };
  }

  const paths = await ensureGlobalMemory();
  const id = input.id || newId("learning");
  const record = {
    id,
    type: input.type || "case",
    scope: input.scope || "global",
    status: "candidate",
    trigger: input.trigger || "Post-task retrospective",
    lesson: input.lesson || input.summary || "Review the attached evidence and convert it into a reusable engineering lesson.",
    evidence: evidenceRefs,
    confidence: Number(input.confidence || 0.5),
    source_task_id: input.task_id || null,
    created_at: nowIso(),
    updated_at: nowIso(),
    hash: null
  };
  record.hash = hashObject(record);

  const dir = record.type === "anti_pattern" ? paths.antiPatterns : record.type === "policy_rule" ? paths.rules : paths.cases;
  const file = join(dir, `${id}.json`);
  await writeJson(file, record);

  const caseMd = join(paths.cases, `${id}.md`);
  await writeText(caseMd, [
    `# Learning Proposal ${id}`,
    "",
    `- Type: ${record.type}`,
    `- Scope: ${record.scope}`,
    `- Status: ${record.status}`,
    `- Confidence: ${record.confidence}`,
    "",
    "## Trigger",
    "",
    record.trigger,
    "",
    "## Lesson",
    "",
    record.lesson,
    "",
    "## Evidence",
    "",
    ...evidenceRefs.map((ref) => `- ${ref}`),
    ""
  ].join("\n"));

  if (projectRoot) {
    await appendTraceEvent(projectRoot, {
      type: "learning_proposed",
      role: "learning_coach",
      learning_id: id,
      evidence_refs: evidenceRefs,
      artifact_refs: [file, caseMd]
    });
  }

  return {
    ok: true,
    learning: record,
    files: [file, caseMd]
  };
}

export async function promoteOrRollbackRule(input = {}) {
  const paths = await ensureGlobalMemory();
  const ruleId = input.rule_id || input.id;
  const action = input.action || "sandbox";
  if (!ruleId) return { ok: false, reason: "rule_id is required" };

  const candidates = await loadMemoryRecords();
  const match = candidates.find((record) => record.id === ruleId);
  if (!match) return { ok: false, reason: `No memory rule or record found for ${ruleId}` };

  const nextStatus = action === "promote" ? "default" : action === "rollback" ? "deprecated" : "sandbox";
  const updated = {
    ...match,
    status: nextStatus,
    updated_at: nowIso(),
    status_reason: input.reason || `Status changed by ${action}`
  };
  delete updated.file;
  delete updated.bucket;

  const targetDir = nextStatus === "sandbox" ? paths.sandboxRules : match.file.includes("/rules/") ? paths.rules : undefined;
  const file = targetDir ? join(targetDir, `${ruleId}.json`) : match.file;
  await writeJson(file, updated);

  const eventsPath = join(paths.root, "memory-events.jsonl");
  await appendJsonl(eventsPath, {
    event_id: newId("memory_evt"),
    timestamp: nowIso(),
    rule_id: ruleId,
    action,
    next_status: nextStatus,
    reason: input.reason || ""
  });

  return {
    ok: true,
    rule_id: ruleId,
    status: nextStatus,
    file
  };
}
