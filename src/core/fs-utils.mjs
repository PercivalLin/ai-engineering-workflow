import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile, stat, readdir, appendFile, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

export async function readJson(path, fallback = null) {
  if (!(await exists(path))) return fallback;
  return JSON.parse(await readFile(path, "utf8"));
}

export async function writeJson(path, value) {
  await ensureDir(dirname(path));
  const tmp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tmp, path);
}

export async function writeText(path, value) {
  await ensureDir(dirname(path));
  const tmp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tmp, value, "utf8");
  await rename(tmp, path);
}

export async function appendJsonl(path, value) {
  await ensureDir(dirname(path));
  await appendFile(path, `${JSON.stringify(value)}\n`, "utf8");
}

export async function readJsonl(path) {
  if (!(await exists(path))) return [];
  const text = await readFile(path, "utf8");
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function nowIso() {
  return new Date().toISOString();
}

export function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
}

export function hashText(text) {
  return createHash("sha256").update(String(text)).digest("hex");
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashObject(value) {
  return hashText(stableStringify(value));
}

export async function copyIfExists(from, to) {
  if (!(await exists(from))) return false;
  await ensureDir(dirname(to));
  await copyFile(from, to);
  return true;
}

export async function listFiles(root, options = {}) {
  const {
    maxFiles = 1000,
    maxDepth = 8,
    ignore = [".git", "node_modules", ".agentwolf", ".ai-engineering", "dist", "build", ".next", "coverage"]
  } = options;
  const results = [];

  async function walk(dir, depth) {
    if (results.length >= maxFiles || depth > maxDepth) return;
    let entries = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= maxFiles) return;
      if (ignore.includes(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(path, depth + 1);
      } else if (entry.isFile()) {
        results.push(path);
      }
    }
  }

  await walk(root, 0);
  return results;
}
