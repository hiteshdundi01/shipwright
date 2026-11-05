// Checks this repo's own rules. Each rule here is a lesson that was written as
// prose somewhere else first and kept being broken; now a run fails instead.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { REPO, frontmatter, isMain, listSkills, walk } from "./lib.mjs";

// Model names belong in roster.json only, so swapping a model is one edit.
// These files must name roles instead.
const MODEL = /\b(gpt-\d|gemini-\d|claude-opus|GPT-\d|Gemini \d|Opus \d|Sonnet \d|Haiku \d|Sol|Astra|Argon)\b/;
const ROLE_SCOPED = (file) =>
  (file.startsWith("skills/") || file.startsWith("template/") || file === "PLAYBOOK.md") && file !== "template/roster.json";

// Tool calls that exist in one coding tool only. A skill says what to do.
const TOOL_SPECIFIC = /\b(view_file|grep_search|list_dir|mcp_atlassian\w*)\b|~\/\.gemini\/antigravity\/knowledge/;

// The always-read files have a hard size limit: they cost context on every
// turn. Everything else gets a warning, never a failure (debate R6).
const HARD_BUDGETS = { "template/AGENTS.md": 60, "AGENTS.md": 60 };
const SOFT_BUDGETS = { "PLAYBOOK.md": 160 };
const SKILL_BUDGET = 120;

export function checkRepo(root = REPO, warnings = []) {
  const problems = [];
  const add = (file, line, message) => problems.push(`${file}${line ? `:${line}` : ""}: ${message}`);
  const warn = (file, message) => warnings.push(`${file}: ${message}`);
  const files = walk(root).filter((f) => !f.startsWith("out/"));

  for (const name of listSkills(join(root, "skills"))) {
    const file = `skills/${name}/SKILL.md`;
    const text = readFileSync(join(root, file), "utf8");
    const fields = frontmatter(text);
    if (!fields) add(file, 1, "no frontmatter → start the file with --- name/description ---");
    else {
      if (fields.name !== name) add(file, 2, `name is "${fields.name}" → make it "${name}", the folder's name`);
      if (!fields.description) add(file, 2, "no description → say what it does and when to use it");
      else if (fields.description.length > 1024) add(file, 2, `description is ${fields.description.length} characters → keep it under 1024`);
      const raw = /^description: (.*)$/m.exec(text)?.[1] ?? "";
      if (!/^["']/.test(raw) && /: |\s#/.test(raw))
        add(file, 3, 'the description has ": " or " #", which breaks YAML for the tools that load it → reword it, or quote the whole value');
    }
    const lines = text.split("\n").length;
    if (lines > SKILL_BUDGET) warn(file, `${lines} lines. Over ${SKILL_BUDGET}, consider moving reference into a file beside it`);
  }

  for (const file of files.filter((f) => /\.(md|json|ya?ml|mjs)$/.test(f))) {
    const text = readFileSync(join(root, file), "utf8");
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      if (ROLE_SCOPED(file) && file.endsWith(".md") && MODEL.test(line))
        add(file, i + 1, `names a model ("${MODEL.exec(line)[0]}") → name a role from template/roster.json instead`);
      if (file.startsWith("skills/") && TOOL_SPECIFIC.test(line))
        add(file, i + 1, `names a tool one coding agent has ("${TOOL_SPECIFIC.exec(line)[0]}") → say what to do, not which tool to call`);
      // GitHub Actions' own ${{ ... }} expressions aren't placeholders.
      if ((file.startsWith("template/") || file.startsWith("kits/")) && /(?<!\$)\{\{(?!PRODUCT\}\})/.test(line))
        add(file, i + 1, "a {{placeholder}} new-product.mjs won't fill → use {{PRODUCT}} or an <angle> placeholder");
      // A pointer into master from a skill or a product's docs must lead somewhere.
      for (const match of file.endsWith(".md") ? line.matchAll(/~\/\.master\/([\w./-]+[\w/])/g) : [])
        if (!existsSync(join(root, match[1]))) add(file, i + 1, `points to ~/.master/${match[1]}, which doesn't exist in master → fix the path`);
    });
    if (file.endsWith(".md")) {
      for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
        const target = match[1].split("#")[0];
        if (!target || /^[a-z]+:/.test(target)) continue;
        if (!existsSync(join(root, dirname(file), target))) {
          const line = text.slice(0, match.index).split("\n").length;
          add(file, line, `links to ${match[1]}, which doesn't exist → fix the path or drop the link`);
        }
      }
    }
    const hard = HARD_BUDGETS[file];
    if (hard && lines.length > hard) add(file, null, `${lines.length} lines → keep it under ${hard}: it's read every session, so point to docs instead of inlining them`);
    const soft = SOFT_BUDGETS[file];
    if (soft && lines.length > soft) warn(file, `${lines.length} lines. Over ${soft}, look for what to cut`);
  }

  // A secret-looking string anywhere here would make ask.mjs refuse to send
  // this repo to a reviewer, so it fails the check. Tests build fake secrets at
  // run time instead of writing them out.
  if (root === REPO) {
    const scan = spawnSync("gitleaks", ["detect", "--no-git", "--no-banner", "--redact", "--source", root], { encoding: "utf8" });
    if (scan.error) warn("gitleaks", "not installed, so this repo wasn't scanned for secrets (brew install gitleaks)");
    else if (scan.status !== 0) add("(repo)", null, `gitleaks found a secret-looking string → remove it, or build it at run time in a test\n${scan.stdout}${scan.stderr}`);
  }

  // Each kit's manifest must match what new-product will find: its files, its
  // standards among them, and the template's AGENTS.md row it routes after.
  const kitsDir = join(root, "kits");
  if (existsSync(kitsDir)) {
    const agentsMd = existsSync(join(root, "template/AGENTS.md")) ? readFileSync(join(root, "template/AGENTS.md"), "utf8").split("\n") : [];
    for (const kit of readdirSync(kitsDir).filter((k) => existsSync(join(kitsDir, k, "kit.json")))) {
      const file = `kits/${kit}/kit.json`;
      const spec = JSON.parse(readFileSync(join(root, file), "utf8"));
      for (const from of Object.keys(spec.files ?? {}))
        if (!existsSync(join(kitsDir, kit, from))) add(file, null, `files names ${from}, which isn't in kits/${kit}/`);
      if (!Object.values(spec.files ?? {}).includes(spec.standards)) add(file, null, `standards (${spec.standards}) isn't one of the files it copies`);
      if (!spec.standardsSection?.includes(spec.standards)) add(file, null, "standardsSection must name the standards file, or the link is added again on every run");
      if (!spec.route?.includes(spec.standards) || !spec.routeSection?.includes(spec.standards))
        add(file, null, "route and routeSection must both name the standards file, or AGENTS.md is routed again on every run");
      if (!agentsMd.some((l) => l.startsWith(spec.routeAfter)))
        add(file, null, `routeAfter "${spec.routeAfter}" matches no row in template/AGENTS.md → the route would never be added`);
    }
  }

  const rosterFile = "template/roster.json";
  if (existsSync(join(root, rosterFile))) {
    const roster = JSON.parse(readFileSync(join(root, rosterFile), "utf8"));
    for (const [key, model] of Object.entries(roster.models ?? {}))
      for (const field of ["name", "cli", "id", "effort"]) if (!model[field]) add(rosterFile, null, `models.${key} has no ${field}`);
    for (const [role, key] of Object.entries(roster.roles ?? {}))
      if (!roster.models?.[key]) add(rosterFile, null, `roles.${role} names "${key}", which isn't in models`);
  }
  return problems;
}

if (isMain(import.meta.url)) {
  const warnings = [];
  const problems = checkRepo(REPO, warnings);
  for (const warning of warnings) console.warn(`warning: ${warning}`);
  for (const problem of problems) console.error(problem);
  if (problems.length) {
    console.error(`\n${problems.length} problem(s).`);
    process.exit(1);
  }
  console.log("check: every rule holds.");
}
