import test from "node:test";
import assert from "node:assert/strict";
import { createGoal, initProject } from "../src/core/project.mjs";
import { scanProjectContext } from "../src/core/context.mjs";
import { getRoleAction, runGate } from "../src/core/workflow.mjs";
import { recordChangeset, recordEvidence, exportAuditBundle } from "../src/core/trace.mjs";
import { proposeLearning } from "../src/core/memory.mjs";
import { makeFixtureProject } from "./helpers.mjs";

test("gates block missing evidence and audit flags weak ChangeSets", async () => {
  const fixture = await makeFixtureProject("aiwf-gates-");
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
    const finalAudit = await exportAuditBundle(fixture.projectRoot);
    const completeFindings = finalAudit.traceability.missing_trace_findings.filter((finding) => !finding.change_id.includes("change_"));
    assert.deepEqual(completeFindings, []);
  } finally {
    fixture.restoreEnv();
  }
});

test("learning proposals require evidence refs", async () => {
  const fixture = await makeFixtureProject("aiwf-learning-");
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

test("build gate accepts read-only analysis evidence without a ChangeSet", async () => {
  const fixture = await makeFixtureProject("aiwf-readonly-analysis-gate-");
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
