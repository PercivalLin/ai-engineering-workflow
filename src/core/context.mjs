import { extname, relative } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { appendTraceEvent } from "./project.mjs";
import { ensureDir, exists, hashObject, listFiles, newId, nowIso, readJson, writeJson } from "./fs-utils.mjs";
import { projectPaths } from "./paths.mjs";

const execFileAsync = promisify(execFile);

const LANGUAGE_BY_EXT = {
  ".js": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".jsx": "javascript",
  ".py": "python",
  ".rs": "rust",
  ".go": "go",
  ".java": "java",
  ".kt": "kotlin",
  ".swift": "swift",
  ".rb": "ruby",
  ".php": "php",
  ".cs": "csharp",
  ".html": "html",
  ".css": "css",
  ".scss": "scss",
  ".md": "markdown",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml"
};

async function tryGit(projectRoot, args) {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd: projectRoot, timeout: 3000 });
    return stdout.trim();
  } catch {
    return null;
  }
}

function summarizeFiles(projectRoot, files) {
  const language_counts = {};
  const notable_files = [];
  const ci_files = [];
  for (const file of files) {
    const rel = relative(projectRoot, file);
    const ext = extname(file);
    const language = LANGUAGE_BY_EXT[ext] || "other";
    language_counts[language] = (language_counts[language] || 0) + 1;
    if (/^(README|package\.json|pyproject\.toml|Cargo\.toml|go\.mod|Makefile|Dockerfile|docker-compose|tsconfig|vite\.config|next\.config)/i.test(rel)) {
      notable_files.push(rel);
    }
    if (/^\.github\/workflows\/|\.gitlab-ci\.yml$|Jenkinsfile$|circleci|buildkite/i.test(rel)) {
      ci_files.push(rel);
    }
  }
  return { language_counts, notable_files, ci_files };
}

async function inferPackage(projectRoot) {
  const packagePath = `${projectRoot}/package.json`;
  if (!(await exists(packagePath))) return null;
  const pkg = await readJson(packagePath, {});
  return {
    name: pkg.name || null,
    version: pkg.version || null,
    type: pkg.type || null,
    scripts: pkg.scripts || {},
    dependencies: Object.keys(pkg.dependencies || {}),
    devDependencies: Object.keys(pkg.devDependencies || {})
  };
}

export async function scanProjectContext(projectRoot, input = {}) {
  const paths = projectPaths(projectRoot);
  await ensureDir(paths.context);
  const files = await listFiles(projectRoot, {
    maxFiles: Number(input.max_files || input.maxFiles || 2000),
    maxDepth: Number(input.max_depth || input.maxDepth || 8)
  });
  const summary = summarizeFiles(projectRoot, files);
  const packageInfo = await inferPackage(projectRoot);
  const gitStatus = await tryGit(projectRoot, ["status", "--short", "--branch"]);
  const gitHead = await tryGit(projectRoot, ["rev-parse", "HEAD"]);

  const context = {
    context_id: newId("ctx"),
    scanned_at: nowIso(),
    project_root: projectRoot,
    file_count: files.length,
    files: files.map((file) => relative(projectRoot, file)).sort(),
    ...summary,
    package: packageInfo,
    git: {
      is_repo: gitStatus !== null,
      head: gitHead,
      status: gitStatus
    },
    inferred_test_commands: inferTestCommands(packageInfo),
    hash: null
  };
  context.hash = hashObject(context);
  const contextFile = `${paths.context}/${context.context_id}.json`;
  await writeJson(contextFile, context);
  await writeJson(`${paths.context}/latest-context.json`, context);

  await appendTraceEvent(projectRoot, {
    type: "context_scanned",
    role: "delivery_manager",
    context_id: context.context_id,
    context_ref: context.hash,
    artifact_refs: [contextFile],
    summary: `${files.length} files scanned`
  });

  return {
    ok: true,
    context,
    context_file: contextFile
  };
}

function inferTestCommands(packageInfo) {
  if (!packageInfo) return [];
  const scripts = packageInfo.scripts || {};
  const commands = [];
  for (const name of ["test", "lint", "typecheck", "build"]) {
    if (scripts[name]) commands.push(`npm run ${name}`);
  }
  return commands;
}
