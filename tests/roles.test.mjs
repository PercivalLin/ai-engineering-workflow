import test from "node:test";
import assert from "node:assert/strict";
import { ROLES } from "../src/core/defaults.mjs";
import { getRoleAction } from "../src/core/workflow.mjs";
import { createGoal, initProject } from "../src/core/project.mjs";
import { scanProjectContext } from "../src/core/context.mjs";
import { makeFixtureProject } from "./helpers.mjs";

test("every virtual team role has an executable role prompt contract", () => {
  for (const [roleName, role] of Object.entries(ROLES)) {
    assert.equal(typeof role.title, "string", `${roleName} title`);
    assert.match(role.mission, /\w+/, `${roleName} mission`);
    assert.match(role.prompt, /\w+/, `${roleName} prompt`);
    assert.ok(role.prompt.includes("You are"), `${roleName} prompt should establish identity`);
    assert.ok(role.principles.length >= 3, `${roleName} principles`);
    assert.ok(role.decision_frameworks.length >= 1, `${roleName} decision frameworks`);
    assert.ok(role.artifact_contract.length >= 3, `${roleName} artifact contract`);
    assert.ok(role.quality_bar.length >= 3, `${roleName} quality bar`);
    assert.ok(role.inputs.length >= 3, `${roleName} inputs`);
    assert.ok(role.outputs.length >= 3, `${roleName} outputs`);
    assert.ok(role.gates.length >= 1, `${roleName} gates`);
  }
});

test("role task packets expose detailed prompts for every role", async () => {
  const fixture = await makeFixtureProject("aiwf-roles-");
  try {
    await initProject(fixture.projectRoot);
    await createGoal(fixture.projectRoot, {
      title: "Role prompt coverage",
      description: "Verify every role can receive a detailed task packet."
    });
    await scanProjectContext(fixture.projectRoot);

    for (const roleName of Object.keys(ROLES)) {
      const action = await getRoleAction(fixture.projectRoot, {
        role: roleName,
        objective: `Exercise ${roleName}`
      });
      assert.equal(action.ok, true, roleName);
      assert.equal(action.packet.role, roleName);
      assert.match(action.packet.role_prompt, /\w+/, `${roleName} role prompt`);
      assert.ok(action.packet.role_principles.length >= 3, `${roleName} role principles`);
      assert.ok(action.packet.artifact_contract.length >= 3, `${roleName} artifact contract`);
      assert.ok(action.packet.quality_bar.length >= 3, `${roleName} quality bar`);
    }
  } finally {
    fixture.restoreEnv();
  }
});
