import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { createGoal, initProject } from "../src/core/project.mjs";
import { scanProjectContext } from "../src/core/context.mjs";
import { getRoleAction, runGate } from "../src/core/workflow.mjs";
import { recordArtifact, recordChangeset, recordEvidence, exportAuditBundle } from "../src/core/trace.mjs";
import { proposeLearning } from "../src/core/memory.mjs";
import { makeFixtureProject } from "./helpers.mjs";

const execFileAsync = promisify(execFile);

test("gates block missing evidence and weak ChangeSets", async () => {
  const fixture = await makeFixtureProject("agentwolf-gates-");
  try {
    await initProject(fixture.projectRoot);
    await createGoal(fixture.projectRoot, {
      title: "Gate negative coverage",
      description: "Prove gates reject incomplete work."
    });

    const contextGateBeforeScan = await runGate(fixture.projectRoot, { phase: "context_scan" });
    assert.equal(contextGateBeforeScan.passed, false);
    assert.match(contextGateBeforeScan.findings[0].message, /not been scanned/);

    await scanProjectContext(fixture.projectRoot);
    const contextGateAfterScan = await runGate(fixture.projectRoot, { phase: "context_scan" });
    assert.equal(contextGateAfterScan.passed, true);

    const buildGateBeforeChange = await runGate(fixture.projectRoot, { phase: "build_loop" });
    assert.equal(buildGateBeforeChange.passed, false);
    assert.match(buildGateBeforeChange.findings[0].message, /No ChangeSet/);

    await recordChangeset(fixture.projectRoot, {
      role: "developer",
      agent: "codex",
      rollback_plan: "Revert generated patch."
    });
    const weakAudit = await exportAuditBundle(fixture.projectRoot);
    assert.ok(weakAudit.traceability.missing_trace_findings.some((finding) => finding.issue === "Missing prompt_ref"));
    assert.ok(weakAudit.traceability.missing_trace_findings.some((finding) => finding.issue === "Missing evidence_refs"));

    const buildGateAfterWeakChange = await runGate(fixture.projectRoot, { phase: "build_loop" });
    assert.equal(buildGateAfterWeakChange.passed, false);
    assert.ok(buildGateAfterWeakChange.findings.some((finding) => /Weak ChangeSet/.test(finding.message)));
  } finally {
    fixture.restoreEnv();
  }
});

test("complete ChangeSet trace passes build gate and audit", async () => {
  const fixture = await makeFixtureProject("agentwolf-complete-trace-");
  try {
    await initProject(fixture.projectRoot);
    await createGoal(fixture.projectRoot, {
      title: "Complete trace coverage",
      description: "Prove complete trace data passes gates."
    });
    await scanProjectContext(fixture.projectRoot);
    const roleAction = await getRoleAction(fixture.projectRoot, { role: "developer" });
    const evidence = await recordEvidence(fixture.projectRoot, {
      evidence_type: "test",
      outcome: "passed",
      summary: "Complete ChangeSet evidence."
    });
    const completeChange = await recordChangeset(fixture.projectRoot, {
      role: "developer",
      agent: "codex",
      files_changed: ["index.js"],
      evidence_refs: [evidence.evidence.evidence_id],
      rollback_plan: "Revert index.js."
    });
    assert.equal(completeChange.changeset.prompt_ref, roleAction.prompt_ref);
    assert.equal(completeChange.changeset.context_ref, roleAction.packet.project_context_ref);
    const gate = await runGate(fixture.projectRoot, { phase: "build_loop" });
    assert.equal(gate.passed, true);
    const finalAudit = await exportAuditBundle(fixture.projectRoot);
    assert.deepEqual(finalAudit.traceability.missing_trace_findings, []);
  } finally {
    fixture.restoreEnv();
  }
});

test("learning proposals require evidence refs", async () => {
  const fixture = await makeFixtureProject("agentwolf-learning-");
  try {
    await initProject(fixture.projectRoot);
    const blocked = await proposeLearning(fixture.projectRoot, {
      lesson: "A lesson without evidence should not enter memory."
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.blocked, true);
  } finally {
    fixture.restoreEnv();
  }
});

test("learning proposals require existing passing evidence", async () => {
  const fixture = await makeFixtureProject("agentwolf-learning-evidence-");
  try {
    await initProject(fixture.projectRoot);
    await createGoal(fixture.projectRoot, {
      title: "Learning evidence validation",
      description: "Prove learning proposals reject fake or failed evidence."
    });
    const fake = await proposeLearning(fixture.projectRoot, {
      lesson: "Fake evidence should not enter memory.",
      evidence_refs: ["evidence_does_not_exist"]
    });
    assert.equal(fake.ok, false);
    assert.match(fake.findings[0].issue, /does not exist/);

    const failedEvidence = await recordEvidence(fixture.projectRoot, {
      evidence_type: "test",
      outcome: "failed",
      summary: "A failed test cannot support global learning."
    });
    const failed = await proposeLearning(fixture.projectRoot, {
      lesson: "Failed evidence should not enter memory.",
      evidence_refs: [failedEvidence.evidence.evidence_id]
    });
    assert.equal(failed.ok, false);
    assert.match(failed.findings[0].issue, /not passing/);
  } finally {
    fixture.restoreEnv();
  }
});

test("build gate accepts read-only analysis evidence without a ChangeSet", async () => {
  const fixture = await makeFixtureProject("agentwolf-readonly-analysis-gate-");
  try {
    await initProject(fixture.projectRoot);
    await createGoal(fixture.projectRoot, {
      title: "Read-only repository analysis",
      description: "Analyze repository adoption risks and do not modify source code."
    });

    const blocked = await runGate(fixture.projectRoot, { phase: "build_loop" });
    assert.equal(blocked.passed, false);
    assert.match(blocked.findings[0].message, /analysis evidence/);

    await recordEvidence(fixture.projectRoot, {
      evidence_type: "review",
      outcome: "passed",
      summary: "Read-only analysis findings were recorded."
    });
    const passed = await runGate(fixture.projectRoot, { phase: "build_loop" });
    assert.equal(passed.passed, true);
  } finally {
    fixture.restoreEnv();
  }
});

test("record_changeset rejects fake evidence refs", async () => {
  const fixture = await makeFixtureProject("agentwolf-fake-evidence-ref-");
  try {
    await initProject(fixture.projectRoot);
    await createGoal(fixture.projectRoot, {
      title: "Reject fake evidence",
      description: "Implement a change with fake evidence refs."
    });
    const change = await recordChangeset(fixture.projectRoot, {
      role: "developer",
      agent: "codex",
      files_changed: ["index.js"],
      evidence_refs: ["evidence_does_not_exist"],
      rollback_plan: "Revert index.js."
    });
    assert.equal(change.ok, false);
    assert.equal(change.blocked, true);
    assert.match(change.findings[0].issue, /does not exist/);
  } finally {
    fixture.restoreEnv();
  }
});

test("verification and review gates require current task passing evidence", async () => {
  const fixture = await makeFixtureProject("agentwolf-task-scoped-evidence-");
  try {
    await initProject(fixture.projectRoot);
    await createGoal(fixture.projectRoot, {
      title: "First task",
      description: "Record old passing evidence."
    });
    await recordEvidence(fixture.projectRoot, {
      evidence_type: "test",
      outcome: "passed",
      summary: "Old task test evidence."
    });
    await recordEvidence(fixture.projectRoot, {
      evidence_type: "review",
      outcome: "approved",
      summary: "Old task review evidence."
    });

    await createGoal(fixture.projectRoot, {
      title: "Second task",
      description: "Old evidence must not pass new gates."
    });
    const verificationWithOldEvidence = await runGate(fixture.projectRoot, { phase: "verification_loop" });
    assert.equal(verificationWithOldEvidence.passed, false);
    assert.match(verificationWithOldEvidence.findings[0].message, /Verification evidence/);
    const reviewWithOldEvidence = await runGate(fixture.projectRoot, { phase: "review_gate" });
    assert.equal(reviewWithOldEvidence.passed, false);
    assert.match(reviewWithOldEvidence.findings[0].message, /Passing review/);

    await recordEvidence(fixture.projectRoot, {
      evidence_type: "test",
      outcome: "failed",
      summary: "Failed current task evidence."
    });
    const verificationWithFailedEvidence = await runGate(fixture.projectRoot, { phase: "verification_loop" });
    assert.equal(verificationWithFailedEvidence.passed, false);

    await recordEvidence(fixture.projectRoot, {
      evidence_type: "test",
      outcome: "passed",
      summary: "Passing current task evidence."
    });
    const verificationWithPassingEvidence = await runGate(fixture.projectRoot, { phase: "verification_loop" });
    assert.equal(verificationWithPassingEvidence.passed, true);
  } finally {
    fixture.restoreEnv();
  }
});

test("requirements and architecture gates require current task artifacts", async () => {
  const fixture = await makeFixtureProject("agentwolf-task-scoped-artifacts-");
  try {
    await initProject(fixture.projectRoot);
    await createGoal(fixture.projectRoot, {
      title: "First task",
      description: "Record old task artifacts."
    });
    await recordArtifact(fixture.projectRoot, {
      artifact_type: "requirements",
      role: "pm",
      title: "Old requirements",
      content: "Old task requirements."
    });
    await recordArtifact(fixture.projectRoot, {
      artifact_type: "adr",
      role: "architect",
      title: "Old ADR",
      content: "Old task ADR."
    });
    await recordArtifact(fixture.projectRoot, {
      artifact_type: "release",
      role: "sre",
      title: "Old release",
      content: "Old task release notes."
    });

    await createGoal(fixture.projectRoot, {
      title: "Second task",
      description: "Old artifacts must not pass new gates."
    });
    assert.equal((await runGate(fixture.projectRoot, { phase: "requirements" })).passed, false);
    assert.equal((await runGate(fixture.projectRoot, { phase: "architecture" })).passed, false);
    assert.equal((await runGate(fixture.projectRoot, { phase: "release_readiness" })).passed, false);

    await recordArtifact(fixture.projectRoot, {
      artifact_type: "requirements",
      role: "pm",
      title: "New requirements",
      content: "New task requirements."
    });
    await recordArtifact(fixture.projectRoot, {
      artifact_type: "adr",
      role: "architect",
      title: "New ADR",
      content: "New task ADR."
    });
    await recordArtifact(fixture.projectRoot, {
      artifact_type: "release",
      role: "sre",
      title: "New release",
      content: "New task release notes."
    });
    assert.equal((await runGate(fixture.projectRoot, { phase: "requirements" })).passed, true);
    assert.equal((await runGate(fixture.projectRoot, { phase: "architecture" })).passed, true);
    assert.equal((await runGate(fixture.projectRoot, { phase: "release_readiness" })).passed, true);
  } finally {
    fixture.restoreEnv();
  }
});

test("ChangeSet captures staged and untracked git diffs while ignoring runtime files", async () => {
  const fixture = await makeFixtureProject("agentwolf-git-diff-");
  try {
    await execFileAsync("git", ["init"], { cwd: fixture.projectRoot });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: fixture.projectRoot });
    await execFileAsync("git", ["config", "user.name", "Test"], { cwd: fixture.projectRoot });
    await execFileAsync("git", ["add", "package.json", "index.js", "README.md"], { cwd: fixture.projectRoot });
    await execFileAsync("git", ["commit", "-m", "init"], { cwd: fixture.projectRoot });

    await initProject(fixture.projectRoot);
    await createGoal(fixture.projectRoot, {
      title: "Staged diff capture",
      description: "Capture staged and untracked files."
    });
    await writeFile(`${fixture.projectRoot}/index.js`, "export const ok = false;\n");
    await execFileAsync("git", ["add", "index.js"], { cwd: fixture.projectRoot });
    await writeFile(`${fixture.projectRoot}/README.md`, "# Fixture\n\nUnstaged edit.\n");
    await writeFile(`${fixture.projectRoot}/new-file.js`, "export const added = true;\n");

    const evidence = await recordEvidence(fixture.projectRoot, {
      evidence_type: "test",
      outcome: "passed",
      summary: "Git diff capture evidence."
    });
    const roleAction = await getRoleAction(fixture.projectRoot, { role: "developer" });
    const change = await recordChangeset(fixture.projectRoot, {
      role: "developer",
      agent: "codex",
      prompt_ref: roleAction.prompt_ref,
      context_ref: roleAction.packet.project_context_ref,
      evidence_refs: [evidence.evidence.evidence_id],
      rollback_plan: "Revert index.js and remove new-file.js."
    });
    assert.equal(change.ok, true);
    assert.deepEqual(change.changeset.files_changed.sort(), ["README.md", "index.js", "new-file.js"]);
    const patch = await readFile(change.files.patch, "utf8");
    assert.match(patch, /diff --git a\/index\.js b\/index\.js/);
    assert.match(patch, /diff --git a\/README\.md b\/README\.md/);
    assert.match(patch, /diff --git a\/new-file\.js b\/new-file\.js/);
    assert.doesNotMatch(patch, /\.agentwolf/);
  } finally {
    fixture.restoreEnv();
  }
});

test("audit and build gate flag empty patches for changed files", async () => {
  const fixture = await makeFixtureProject("agentwolf-empty-patch-");
  try {
    await initProject(fixture.projectRoot);
    await createGoal(fixture.projectRoot, {
      title: "Empty patch trace",
      description: "Reject changed files without patch contents."
    });
    await scanProjectContext(fixture.projectRoot);
    const roleAction = await getRoleAction(fixture.projectRoot, { role: "developer" });
    const evidence = await recordEvidence(fixture.projectRoot, {
      evidence_type: "test",
      outcome: "passed",
      summary: "Evidence exists but patch is empty."
    });
    const change = await recordChangeset(fixture.projectRoot, {
      role: "developer",
      agent: "codex",
      prompt_ref: roleAction.prompt_ref,
      context_ref: roleAction.packet.project_context_ref,
      files_changed: ["index.js"],
      diff: "",
      evidence_refs: [evidence.evidence.evidence_id],
      rollback_plan: "Revert index.js."
    });
    assert.equal(change.ok, true);
    const audit = await exportAuditBundle(fixture.projectRoot);
    assert.ok(audit.traceability.missing_trace_findings.some((finding) => finding.issue === "Empty patch for changed files"));
    const gate = await runGate(fixture.projectRoot, { phase: "build_loop" });
    assert.equal(gate.passed, false);
    assert.ok(gate.findings.some((finding) => /Empty patch/.test(finding.message)));
  } finally {
    fixture.restoreEnv();
  }
});
