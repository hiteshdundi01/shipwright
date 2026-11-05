// Links every skill in skills/ into each coding tool's skill folder, so Claude
// Code, Antigravity and Codex all read the same files. Prints the plan and
// changes nothing unless --apply is given. --restore undoes an earlier run.
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { REPO, SKILLS_DIR, isMain, listSkills, parseArgs, version } from "./lib.mjs";

export const TOOLS = [
  { slug: "claude", name: "Claude Code", root: ".claude", dir: ".claude/skills" },
  { slug: "antigravity", name: "Antigravity", root: ".gemini/config", dir: ".gemini/config/skills" },
  { slug: "codex", name: "Codex", root: ".codex", dir: ".codex/skills" },
];

// Skills reach this repo's scripts through ~/.master, whichever tool runs them.
const HOME_LINK = { slug: "home", name: "~/.master", root: ".", dir: "." };

// The older chain this repo replaces. --retire moves them to the backup.
export const RETIRED = [
  "idea-refine",
  "create-prd",
  "create-stories",
  "plan-feature",
  "implement-feature",
  "prime-for-feature",
  "create-global-rules",
  "cross-model-review",
  "validate",
];

// A file left in each copied folder, so a later --copy run knows the folder is
// its own: a refresh replaces it (and still backs the old copy up).
const COPY_MARK = ".from-master";

const USAGE = `Usage: node scripts/install.mjs [--apply] [--retire] [--copy] [--restore <stamp>] [--home <dir>]

Links each skill in skills/ into ~/.claude/skills, ~/.gemini/config/skills and
~/.codex/skills, and links ~/.master to this repo so a skill can run
node ~/.master/scripts/ask.mjs from any tool. Without --apply it prints what it
would do and changes nothing.

  --apply    make the changes
  --retire   also move the older chain's skills to the backup:
             ${RETIRED.join(", ")}
  --copy     copy the skill folders instead of linking them, for a tool that
             doesn't follow symlinks (re-run after every change to skills/)
  --only     only these skills, comma-separated (e.g. --only cross-review for a pilot)
  --restore  put back what the run with this backup stamp replaced, and remove
             what it added (see ~/.master-backup/ for the stamps)
  --home     act on another home folder (the tests use this)

Anything a run replaces is moved first to ~/.master-backup/<stamp>/<tool>/.`;

function linkedTo(path) {
  try {
    return lstatSync(path).isSymbolicLink() ? resolve(join(path, ".."), readlinkSync(path)) : null;
  } catch {
    return null;
  }
}

function present(path) {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

// Ours: a link to this repo's copy, or a folder an earlier --copy run made.
function ours(target, source) {
  return linkedTo(target) === source || existsSync(join(target, COPY_MARK));
}

// The steps for one home folder, without doing any of them.
export function planInstall({ home, retire = false, copy = false, skills = listSkills() }) {
  const steps = [];
  const master = join(home, ".master");
  if (linkedTo(master) === REPO) steps.push({ tool: HOME_LINK, name: ".master", action: "keep", target: master, source: REPO });
  else steps.push({ tool: HOME_LINK, name: ".master", action: present(master) ? "replace" : "add", target: master, source: REPO, link: true });
  for (const tool of TOOLS) {
    if (!existsSync(join(home, tool.root))) {
      steps.push({ tool, action: "skip-tool", note: `~/${tool.root} not found` });
      continue;
    }
    for (const name of skills) {
      const target = join(home, tool.dir, name);
      const source = join(SKILLS_DIR, name);
      if (!copy && linkedTo(target) === source) steps.push({ tool, name, action: "keep", target, source });
      else if (copy && existsSync(join(target, COPY_MARK))) steps.push({ tool, name, action: "refresh", target, source });
      else if (present(target)) steps.push({ tool, name, action: "replace", target, source });
      else steps.push({ tool, name, action: "add", target, source });
    }
    if (retire) {
      for (const name of RETIRED.filter((n) => !skills.includes(n))) {
        const target = join(home, tool.dir, name);
        if (present(target)) steps.push({ tool, name, action: "retire", target });
      }
    }
  }
  return steps;
}

export function applyInstall(steps, { home, copy = false, stamp = new Date().toISOString().replace(/[:.]/g, "-") }) {
  const backupRoot = join(home, ".master-backup", stamp);
  const added = [];
  for (const step of steps) {
    if (step.action === "skip-tool" || step.action === "keep") continue;
    // Everything a run takes away goes to the backup, this repo's own earlier
    // copies included, so --restore can always put back exactly what was there.
    if (step.action === "replace" || step.action === "retire" || step.action === "refresh") {
      const backup = join(backupRoot, step.tool.slug);
      mkdirSync(backup, { recursive: true });
      renameSync(step.target, join(backup, step.name));
    }
    if (step.action === "retire") continue;
    mkdirSync(join(step.target, ".."), { recursive: true });
    if (copy && !step.link) {
      cpSync(step.source, step.target, { recursive: true });
      writeFileSync(join(step.target, COPY_MARK), "Copied by master's scripts/install.mjs --copy. Edit skills/ in master, not this copy.\n");
    } else symlinkSync(step.source, step.target, "dir");
    added.push(step.target);
  }
  // What this run added, so --restore can take it out again.
  mkdirSync(backupRoot, { recursive: true });
  writeFileSync(join(backupRoot, "added.json"), JSON.stringify(added, null, 2));
  return backupRoot;
}

// Undo one run: remove what it added (only if it's still ours), and move back
// everything it set aside.
export function restoreInstall({ home, stamp }) {
  const backupRoot = join(home, ".master-backup", stamp);
  if (!existsSync(backupRoot)) throw new Error(`no backup at ${backupRoot}`);
  const done = [];
  const addedFile = join(backupRoot, "added.json");
  if (existsSync(addedFile)) {
    for (const target of JSON.parse(readFileSync(addedFile, "utf8"))) {
      const name = target.split("/").pop();
      const source = name === ".master" ? REPO : join(SKILLS_DIR, name);
      if (present(target) && ours(target, source)) {
        rmSync(target, { recursive: true, force: true });
        done.push(`removed ${target}`);
      }
    }
  }
  for (const slug of readdirSync(backupRoot).filter((f) => f !== "added.json")) {
    const tool = slug === "home" ? HOME_LINK : TOOLS.find((t) => t.slug === slug);
    for (const name of readdirSync(join(backupRoot, slug))) {
      const target = join(home, tool.dir, name);
      if (present(target)) {
        done.push(`left ${target}: something else is there now`);
        continue;
      }
      renameSync(join(backupRoot, slug, name), target);
      done.push(`restored ${target}`);
    }
  }
  return done;
}

function describe(step) {
  const where = `${step.tool.name}`.padEnd(12);
  switch (step.action) {
    case "skip-tool":
      return `${where} skipped: ${step.note}`;
    case "keep":
      return `${where} ${step.name}: already linked`;
    case "add":
      return `${where} ${step.name}: add`;
    case "replace":
      return `${where} ${step.name}: back up the existing one, then add`;
    case "refresh":
      return `${where} ${step.name}: refresh this repo's earlier copy`;
    case "retire":
      return `${where} ${step.name}: retire (move to the backup)`;
  }
}

function main() {
  const { flags } = parseArgs(process.argv.slice(2), ["apply", "retire", "copy", "help"]);
  if (flags.help) return console.log(USAGE);
  const home = flags.home ? resolve(flags.home) : homedir();
  if (flags.restore) {
    for (const line of restoreInstall({ home, stamp: flags.restore })) console.log(line);
    return;
  }
  console.log(`master ${version()}\n`);
  let skills = listSkills();
  if (flags.only) {
    const wanted = flags.only.split(",").map((s) => s.trim());
    const unknown = wanted.filter((s) => !skills.includes(s));
    if (unknown.length) throw new Error(`no such skill: ${unknown.join(", ")}. Skills: ${skills.join(", ")}`);
    skills = wanted;
  }
  const steps = planInstall({ home, retire: flags.retire && !flags.only, copy: flags.copy, skills });
  for (const step of steps) console.log(describe(step));
  const changes = steps.filter((s) => !["keep", "skip-tool"].includes(s.action)).length;
  if (!flags.apply) {
    console.log(`\n${changes} change(s) planned. Nothing changed. Run again with --apply to make them.`);
    return;
  }
  const backup = applyInstall(steps, { home, copy: flags.copy });
  const stamp = backup.split("/").pop();
  console.log(`\n${changes} change(s) made. To undo: node scripts/install.mjs --restore ${stamp}`);
}

if (isMain(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`install: ${error.message}`);
    process.exit(1);
  }
}
