import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { makeFixtureProject } from "./helpers.mjs";

const execFileAsync = promisify(execFile);
const bin = join(process.cwd(), "bin", "agentwolf.mjs");

async function cli(projectRoot, args) {
  const { stdout } = await execFileAsync("node", [bin, "--project", projectRoot, ...args], {
    cwd: process.cwd(),
    env: process.env,
    timeout: 10_000,
    maxBuffer: 10 * 1024 * 1024
  });
  return JSON.parse(stdout);
}

test("debug CLI exercises the main operator workflow in an isolated project", async () => {
  const fixture = await makeFixtureProject("agentwolf-cli-");
  try {
    assert.equal((await cli(fixture.projectRoot, ["init"])).ok, true);
    const goal = await cli(fixture.projectRoot, [
      "create-goal",
      "--title",
      "CLI goal",
      "--description",
      "Exercise debug CLI",
      "--risk",
      "high"
    ]);
    assert.equal(goal.ok, true);

    assert.equal((await cli(fixture.projectRoot, ["scan"])).ok, true);
    assert.equal((await cli(fixture.projectRoot, ["memory", "--query", "trace tests"])).ok, true);
    assert.equal((await cli(fixture.projectRoot, ["role", "--role", "qa"])).role, "qa");
    const decision = await cli(fixture.projectRoot, ["ask", "--topic", "success_metrics"]);
    assert.equal(decision.ok, true);
    assert.equal((await cli(fixture.projectRoot, ["answer", "--id", decision.decision.decision_id, "--answer", "All tools pass tests."])).ok, true);
    assert.equal((await cli(fixture.projectRoot, ["artifact", "--type", "release", "--title", "Release", "--content", "Ready."])).ok, true);
    assert.equal((await cli(fixture.projectRoot, ["backlog", "--title", "Verify CLI", "--done", "evidence recorded|audit exported"])).ok, true);
    const evidence = await cli(fixture.projectRoot, ["evidence", "--type", "test", "--outcome", "passed", "--summary", "CLI smoke passed"]);
    assert.equal(evidence.ok, true);
    const change = await cli(fixture.projectRoot, [
      "changeset",
      "--role",
      "developer",
      "--agent",
      "codex",
      "--rollback",
      "Revert the CLI smoke fixture."
    ]);
    assert.equal(change.ok, true);
    assert.equal((await cli(fixture.projectRoot, ["export"])).ok, true);
  } finally {
    fixture.restoreEnv();
  }
});
