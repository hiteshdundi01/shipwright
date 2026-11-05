// Shared helpers for the scripts in this folder. Node built-ins only.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// This repo's last commit, as "<short sha> <date>", for pinning and display.
export function version(repo = REPO) {
  try {
    return execFileSync("git", ["-C", repo, "log", "-1", "--format=%h %cs"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "uncommitted";
  }
}

// The files under `paths` that differ from this repo's last commit: edited,
// staged and new, and with `ignored`, new but ignored too (walk() copies those,
// except under node_modules). A failed git call throws: it never reads as "clean".
export function uncommitted(repo = REPO, paths = ["template", "kits"], { ignored = false } = {}) {
  let out;
  try {
    out = execFileSync("git", ["-C", repo, "status", "--porcelain=v1", "-z", "--untracked-files=all", ...(ignored ? ["--ignored"] : []), "--", ...paths], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    throw new Error(`couldn't read git status in ${repo}, so it can't tell whether the files match the pin: ${String(error.stderr || error.message).trim()}`);
  }
  const entries = out.split("\0").filter(Boolean);
  const files = [];
  for (let i = 0; i < entries.length; i++) {
    const file = entries[i].slice(3);
    if (!/(^|\/)node_modules\//.test(file)) files.push(file);
    if (/^[RC]/.test(entries[i])) i++; // a rename or copy is followed by its old path
  }
  return files;
}

// True when the module at `url` is the script node was asked to run. Node runs a
// script by its real path, so one reached through a link (the skills call
// ~/.master/scripts/...) is compared by its real path too.
export function isMain(url) {
  if (!process.argv[1]) return false;
  let script = resolve(process.argv[1]);
  try {
    script = realpathSync(script);
  } catch {
    // A path that doesn't exist can't be this module.
  }
  return url === pathToFileURL(script).href;
}

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const SKILLS_DIR = join(REPO, "skills");
export const TEMPLATE_DIR = join(REPO, "template");
export const DEFAULT_ROSTER = join(TEMPLATE_DIR, "roster.json");

// The frontmatter of a SKILL.md, as flat `key: value` pairs. Skills here keep
// their frontmatter flat on purpose, so this needs no YAML library.
export function frontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split("\n")) {
    const pair = /^([a-z][a-z0-9-]*):\s*(.*)$/.exec(line);
    if (pair) fields[pair[1]] = pair[2].replace(/^"(.*)"$/, "$1");
  }
  return fields;
}

// Every skill folder: one that holds a SKILL.md.
export function listSkills(dir = SKILLS_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => !name.startsWith("."))
    .filter((name) => existsSync(join(dir, name, "SKILL.md")))
    .sort();
}

// The roster: which model fills each role. A product's own roster.json wins
// over the template's default.
export function readRoster(productDir) {
  const own = productDir && join(productDir, "roster.json");
  const path = own && existsSync(own) ? own : DEFAULT_ROSTER;
  return { path, roster: JSON.parse(readFileSync(path, "utf8")) };
}

// A role ("reviewer_a") or a model key ("astra") to the model it names.
export function resolveModel(roster, key) {
  const name = roster.roles?.[key] ?? key;
  const model = roster.models?.[name];
  if (!model) {
    const known = [...Object.keys(roster.roles ?? {}), ...Object.keys(roster.models ?? {})];
    throw new Error(`unknown role or model "${key}". Known: ${known.join(", ")}`);
  }
  return { key: name, ...model };
}

// Every file under a folder, as paths relative to it, skipping dot-folders.
export function walk(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, base));
    else out.push(full.slice(base.length + 1));
  }
  return out.sort();
}

// Parses `--flag value` and `--switch` arguments after the positional ones.
export function parseArgs(argv, switches = []) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) positional.push(arg);
    else if (switches.includes(arg.slice(2))) flags[arg.slice(2)] = true;
    else flags[arg.slice(2)] = argv[++i];
  }
  return { positional, flags };
}
