import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

export async function makeFixtureProject(prefix = "aiwf-fixture-") {
  const projectRoot = await mkdtemp(join(tmpdir(), prefix));
  const globalRoot = await mkdtemp(join(tmpdir(), `${prefix}global-`));
  const previousHome = process.env.AI_ENGINEERING_HOME;
  process.env.AI_ENGINEERING_HOME = globalRoot;
  await writeFile(join(projectRoot, "package.json"), JSON.stringify({
    name: "fixture",
    type: "module",
    scripts: {
      test: "node --test",
      lint: "node --check index.js",
      build: "node --check index.js"
    },
    dependencies: {
      "@modelcontextprotocol/sdk": "^1.0.0"
    }
  }, null, 2));
  await writeFile(join(projectRoot, "index.js"), "export const ok = true;\n");
  await writeFile(join(projectRoot, "README.md"), "# Fixture\n");
  return {
    projectRoot,
    globalRoot,
    restoreEnv() {
      if (previousHome === undefined) {
        delete process.env.AI_ENGINEERING_HOME;
      } else {
        process.env.AI_ENGINEERING_HOME = previousHome;
      }
    }
  };
}
