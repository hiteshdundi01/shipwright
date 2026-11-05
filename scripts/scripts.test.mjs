// Tests for the repo's scripts. Each runs against a temporary folder, never
// against the real home folder or a real product.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildCall, checkEvidence, outsideLinks, sessionOf } from "./ask.mjs";
import { checkRepo } from "./check.mjs";
import { RETIRED, applyInstall, planInstall, restoreInstall } from "./install.mjs";
import { REPO, SKILLS_DIR, listSkills, readRoster, resolveModel, uncommitted, walk } from "./lib.mjs";
import { commitStats, measureRepo, milestones, ownerMessages, reviewTimes } from "./measure.mjs";
import { createProduct, masterChanges, readKit, refuseUncommitted, sources } from "./new-product.mjs";
import { spawnSync } from "node:child_process";

const temp = (label) => mkdtempSync(join(tmpdir(), `master-${label}-`));
const write = (path, text) => {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, text);
};

test("this repo passes its own check", () => {
  assert.deepEqual(checkRepo(REPO), []);
});

test("every script runs when reached through a link, as the skills reach ~/.master", () => {
  const link = join(temp("link"), "master");
  symlinkSync(REPO, link);
  for (const script of ["ask", "install", "measure", "new-product"]) {
    const run = spawnSync(process.execPath, [join(link, "scripts", `${script}.mjs`), "--help"], { encoding: "utf8" });
    assert.match(run.stdout + run.stderr, /Usage/, `${script}.mjs printed nothing through a link`);
  }
});

test("check catches a dangling ~/.master pointer and a kit manifest that wouldn't work", () => {
  const root = temp("kits");
  write(join(root, "skills/s/SKILL.md"), "---\nname: s\ndescription: d\n---\nRun node ~/.master/scripts/ask.mjs, then read ~/.master/kits/agent/gone.md.\n");
  write(join(root, "scripts/ask.mjs"), "");
  write(join(root, "template/AGENTS.md"), "| When you are | Read |\n| --- | --- |\n| Writing code | x |\n");
  write(join(root, "kits/k/A.md"), "# {{PRODUCT}} and {{OWNER}}\n");
  write(join(root, "kits/k/ci.yml"), "runs-on: ${{ matrix.os }}\n");
  write(join(root, "kits/k/kit.json"), JSON.stringify({ files: { "A.md": "docs/A.md", "B.md": "docs/B.md" }, standards: "docs/C.md", standardsSection: "see docs/A.md", routeAfter: "| Reviewing |" }));
  const problems = checkRepo(root).join("\n");
  assert.match(problems, /skills\/s\/SKILL.md:5: points to ~\/\.master\/kits\/agent\/gone\.md/);
  assert.doesNotMatch(problems, /scripts\/ask\.mjs, which/);
  assert.match(problems, /kits\/k\/A.md:1: a \{\{placeholder\}\}/);
  assert.doesNotMatch(problems, /kits\/k\/ci\.yml/, "a GitHub Actions expression is not a placeholder");
  assert.match(problems, /files names B\.md, which isn't in kits\/k\//);
  assert.match(problems, /standards \(docs\/C\.md\) isn't one of the files/);
  assert.match(problems, /standardsSection must name the standards file/);
  assert.match(problems, /routeAfter "\| Reviewing \|" matches no row/);
  assert.match(problems, /route and routeSection must both name the standards file/);
});

test("a long skill is a warning, a long always-read AGENTS.md is a failure", () => {
  const root = temp("budget");
  write(join(root, "skills/long/SKILL.md"), `---\nname: long\ndescription: d\n---\n${"line\n".repeat(200)}`);
  write(join(root, "template/AGENTS.md"), "line\n".repeat(80));
  const warnings = [];
  const problems = checkRepo(root, warnings);
  assert.ok(warnings.some((w) => w.startsWith("skills/long/SKILL.md")));
  assert.ok(!problems.some((p) => p.startsWith("skills/long/SKILL.md")));
  assert.ok(problems.some((p) => p.startsWith("template/AGENTS.md") && /read every session/.test(p)));
});

test("check catches each rule it exists for", () => {
  const root = temp("check");
  write(join(root, "skills/good/SKILL.md"), "---\nname: wrong\ndescription: d\n---\nAsk the reviewer_a role.\n");
  write(join(root, "skills/naming/SKILL.md"), "---\nname: naming\ndescription: d\n---\nSend it to Astra. Then call view_file.\n");
  write(join(root, "skills/yaml/SKILL.md"), "---\nname: yaml\ndescription: Plan the work: design and slices.\n---\nBody.\n");
  write(join(root, "skills/quoted/SKILL.md"), '---\nname: quoted\ndescription: "Plan the work: design and slices."\n---\nBody.\n');
  write(join(root, "template/docs/X.md"), "See [spec](SPEC.md). Fill {{OWNER}}.\n");
  write(join(root, "template/roster.json"), JSON.stringify({ models: { a: { name: "A", cli: "codex", id: "a", effort: "high" } }, roles: { reviewer_a: "b" } }));
  const problems = checkRepo(root).join("\n");
  assert.match(problems, /skills\/good\/SKILL.md:2: name is "wrong"/);
  assert.match(problems, /skills\/naming\/SKILL.md:5: names a model \("Astra"\)/);
  assert.match(problems, /names a tool one coding agent has \("view_file"\)/);
  assert.match(problems, /template\/docs\/X.md:1: links to SPEC.md/);
  assert.match(problems, /a \{\{placeholder\}\} new-product.mjs won't fill/);
  assert.match(problems, /roles.reviewer_a names "b"/);
  assert.match(problems, /skills\/yaml\/SKILL.md:3: the description has ": "/);
  assert.match(problems, /template\/docs\/X.md:1: a \{\{placeholder\}\}/);
  assert.doesNotMatch(problems, /skills\/quoted\//);
});

test("install plans without changing anything, then links, backs up and retires", () => {
  const home = temp("home");
  const skills = listSkills();
  assert.ok(skills.length > 0, "skills/ has skills");
  const first = skills[0];
  // Claude Code has an older copy of one skill and a retired skill; Codex isn't installed.
  write(join(home, ".claude/skills", first, "SKILL.md"), "old");
  write(join(home, ".claude/skills", RETIRED[0], "SKILL.md"), "old");
  mkdirSync(join(home, ".gemini/config/skills"), { recursive: true });

  const plan = planInstall({ home, retire: true });
  assert.equal(readFileSync(join(home, ".claude/skills", first, "SKILL.md"), "utf8"), "old", "planning changes nothing");
  assert.ok(plan.some((s) => s.tool.slug === "codex" && s.action === "skip-tool"));
  assert.ok(plan.some((s) => s.tool.slug === "claude" && s.name === first && s.action === "replace"));
  assert.ok(plan.some((s) => s.tool.slug === "claude" && s.name === RETIRED[0] && s.action === "retire"));

  const backup = applyInstall(plan, { home, stamp: "t1" });
  for (const dir of [".claude/skills", ".gemini/config/skills"]) {
    const link = join(home, dir, first);
    assert.ok(lstatSync(link).isSymbolicLink());
    assert.equal(readlinkSync(link), join(SKILLS_DIR, first));
  }
  assert.equal(readFileSync(join(backup, "claude", first, "SKILL.md"), "utf8"), "old");
  assert.ok(existsSync(join(backup, "claude", RETIRED[0], "SKILL.md")));
  assert.ok(!existsSync(join(home, ".claude/skills", RETIRED[0])));

  const again = planInstall({ home, retire: true });
  assert.ok(again.filter((s) => s.tool.slug !== "codex").every((s) => s.action === "keep"), "a second run has nothing to do");
});

test("install links ~/.master, and --restore undoes a run exactly", () => {
  const home = temp("restore");
  const skills = listSkills();
  write(join(home, ".claude/skills", skills[0], "SKILL.md"), "the owner's old one");
  write(join(home, ".claude/skills", RETIRED[0], "SKILL.md"), "retired");
  write(join(home, ".claude/skills/unrelated/SKILL.md"), "not ours");

  applyInstall(planInstall({ home, retire: true }), { home, stamp: "t1" });
  assert.equal(readlinkSync(join(home, ".master")), REPO);

  const done = restoreInstall({ home, stamp: "t1" });
  assert.ok(done.length > 0);
  assert.equal(readFileSync(join(home, ".claude/skills", skills[0], "SKILL.md"), "utf8"), "the owner's old one");
  assert.equal(readFileSync(join(home, ".claude/skills", RETIRED[0], "SKILL.md"), "utf8"), "retired");
  assert.equal(readFileSync(join(home, ".claude/skills/unrelated/SKILL.md"), "utf8"), "not ours");
  assert.ok(!existsSync(join(home, ".master")));
  for (const name of skills.slice(1)) assert.ok(!existsSync(join(home, ".claude/skills", name)), `${name} removed`);
  assert.throws(() => restoreInstall({ home, stamp: "nope" }), /no backup/);
});

test("install --only plans just the named skills and never retires", () => {
  const home = temp("only");
  mkdirSync(join(home, ".claude/skills"), { recursive: true });
  const plan = planInstall({ home, skills: ["cross-review"] });
  assert.deepEqual([...new Set(plan.filter((s) => s.tool.slug === "claude").map((s) => s.name))], ["cross-review"]);
});

test("install --copy refreshes its own copies, and --restore brings the previous copy back", () => {
  const home = temp("copy");
  mkdirSync(join(home, ".codex/skills"), { recursive: true });
  const skill = listSkills()[0];
  applyInstall(planInstall({ home, copy: true }), { home, copy: true, stamp: "t1" });
  // Mark the first copy, so we can tell it from the refreshed one.
  writeFileSync(join(home, ".codex/skills", skill, "first-copy"), "1");
  const again = planInstall({ home, copy: true }).filter((s) => s.tool.slug === "codex");
  assert.ok(again.every((s) => s.action === "refresh"));
  applyInstall(planInstall({ home, copy: true }), { home, copy: true, stamp: "t2" });
  assert.ok(!existsSync(join(home, ".codex/skills", skill, "first-copy")), "the refresh is a fresh copy");
  // Found in review: restoring a refresh used to delete the skill and bring nothing back.
  restoreInstall({ home, stamp: "t2" });
  assert.ok(existsSync(join(home, ".codex/skills", skill, "first-copy")), "the previous copy is back");
});

test("new-product lays the playbook over a base repo's tracked files", () => {
  const base = temp("base");
  execFileSync("git", ["init", "-q", "-b", "main", base]);
  write(join(base, "app.py"), "print('hi')\n");
  write(join(base, "docs/SPEC.md"), "the base's own spec\n");
  write(join(base, "docs/PROCESS.md"), "the base's old process\n");
  write(join(base, "docs/PLAN.md"), "the example's plan\n");
  write(join(base, "docs/CODE_STANDARDS.md"), "the stack's own rules\n");
  write(join(base, "docs/ADAPTING.md"), "how to adapt the base\n");
  write(join(base, ".env"), "SECRET=1\n");
  write(join(base, ".gitignore"), "node_modules/\n.env\n");
  const outside = join(temp("outside"), "id_key");
  writeFileSync(outside, "PRIVATE KEY\n");
  symlinkSync(outside, join(base, "deploy-key"));
  execFileSync("git", ["-C", base, "add", "-A"]);

  const folder = join(temp("product"), "acme");
  const result = createProduct({ folder, name: "Acme", base, git: false });
  const read = (path) => readFileSync(join(folder, path), "utf8");
  assert.equal(read("app.py"), "print('hi')\n");
  assert.ok(!existsSync(join(folder, ".env")), "an ignored file never travels");
  assert.ok(lstatSync(join(folder, "deploy-key")).isSymbolicLink(), "a tracked symlink stays a link");
  assert.equal(readlinkSync(join(folder, "deploy-key")), outside, "and its target's contents are never copied in");
  assert.equal(read("docs/CODE_STANDARDS.md"), "the stack's own rules\n", "the base's standards stay");
  assert.match(read("docs/SPEC.md"), /^# Acme: spec/, "the new product starts its own spec");
  assert.equal(read("docs/base/docs/SPEC.md"), "the base's own spec\n", "the example's spec is kept aside to read");
  assert.equal(read("docs/base/docs/PROCESS.md"), "the base's old process\n");
  assert.equal(read("docs/base/docs/PLAN.md"), "the example's plan\n");
  assert.ok(!existsSync(join(folder, "docs/PLAN.md")), "no stale plan where the new one goes");
  assert.notEqual(read("docs/PROCESS.md"), "the base's old process\n", "the playbook replaces the process");
  const ignore = read(".gitignore").split("\n");
  assert.ok(ignore.includes("node_modules/") && ignore.includes(".env") && ignore.includes("review/"), "the two .gitignore files are merged");
  assert.equal(ignore.filter((l) => l === ".env").length, 1, "no duplicate lines");
  assert.match(read("AGENTS.md"), /Acme/);
  assert.ok(!read("AGENTS.md").includes("{{PRODUCT}}"));
  assert.deepEqual(result.kept, ["docs/CODE_STANDARDS.md"]);
  assert.deepEqual(result.toCheck, ["docs/ADAPTING.md"]);
  assert.match(readFileSync(join(folder, ".process-version"), "utf8"), /^master \S+/);
  assert.throws(() => createProduct({ folder, name: "Acme", git: false }), /not empty/);
});

test("new-product keeps a playbook base's own adapted docs, and sets aside only its example", () => {
  // Found while bringing the reference template onto the playbook: every
  // playbook file it had adapted was moved aside as if it were old process.
  const base = temp("playbook-base");
  execFileSync("git", ["init", "-q", "-b", "main", base]);
  const own = {
    ".process-version": "master abc1234 2026-11-04\n",
    "AGENTS.md": "# Reference agent, its own pointers\n",
    "docs/PROCESS.md": "npm run check, with its stand-ins\n",
    "review.config.yaml": "high_stakes:\n  sign_in_and_permissions: [backend/auth.py]\n",
    "docs/CODE_STANDARDS.md": "its rules\n",
    "docs/REVIEW_PROTOCOL.md": "an older copy of the protocol\n",
    "docs/templates/PLAN.md": "an older plan template\n",
    "roster.json": "{}\n",
    "CLAUDE.md": "@AGENTS.md\n",
    "docs/SPEC.md": "the example's spec\n",
    "docs/STATUS.md": "the example's status\n",
    "docs/PLAN.md": "the example's plan\n",
    "docs/addons/EVALS.md": "a later brief\n",
  };
  for (const [path, text] of Object.entries(own)) write(join(base, path), text);
  symlinkSync(join(temp("elsewhere"), "pin"), join(base, "docs/templates/BRAND.md"));
  execFileSync("git", ["-C", base, "add", "-A"]);

  const folder = join(temp("from-playbook-base"), "p");
  const result = createProduct({ folder, name: "P", base, git: false });
  const read = (path) => readFileSync(join(folder, path), "utf8");
  assert.equal(result.followsPlaybook, true);
  assert.equal(result.baseVersion, "master abc1234 2026-11-04");
  for (const path of ["AGENTS.md", "docs/PROCESS.md", "review.config.yaml", "docs/CODE_STANDARDS.md"]) assert.equal(read(path), own[path], `${path} is the base's own`);
  for (const path of ["docs/REVIEW_PROTOCOL.md", "docs/templates/PLAN.md", "roster.json"])
    assert.equal(read(path), readFileSync(join(REPO, "template", path), "utf8"), `${path} is master's`);
  assert.ok(!lstatSync(join(folder, "docs/templates/BRAND.md")).isSymbolicLink(), "a linked template is replaced, not written through");
  assert.deepEqual(result.aside.sort(), ["docs/PLAN.md", "docs/SPEC.md", "docs/STATUS.md"]);
  assert.match(read("docs/SPEC.md"), /^# P: spec/);
  assert.equal(read("docs/base/docs/SPEC.md"), "the example's spec\n");
  assert.match(read(".process-version"), /^master \S+/);
  assert.notEqual(read(".process-version"), own[".process-version"], "pinned to this master, not the base's");
  assert.deepEqual(result.toCheck, ["docs/addons/EVALS.md"]);
});

test("new-product never copies a base's secret-looking files, and won't commit a leak", (t) => {
  const base = temp("leaky");
  execFileSync("git", ["init", "-q", "-b", "main", base]);
  write(join(base, ".env"), "DB_PASSWORD=x\n"); // tracked by mistake
  write(join(base, ".env.local"), "TOKEN=x\n");
  write(join(base, "certs/server.pem"), "PEM\n");
  write(join(base, ".env.example"), "DB_PASSWORD=\n");
  write(join(base, "app.py"), "print('hi')\n");
  execFileSync("git", ["-C", base, "add", "-A", "-f"]);
  const folder = join(temp("leaky-product"), "p");
  const result = createProduct({ folder, name: "P", base, git: false });
  assert.deepEqual(result.skipped.sort(), [".env", ".env.local", "certs/server.pem"]);
  assert.ok(existsSync(join(folder, ".env.example")) && !existsSync(join(folder, ".env")));

  if (result.scanned.report.includes("isn't installed")) return t.skip("gitleaks isn't installed");
  // A secret under an ordinary name is caught by the scan, and nothing is committed.
  // Built at run time, so this file itself never trips the scanner.
  write(join(base, "config.txt"), `token = ${["ghp", "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8"].join("_")}\n`);
  execFileSync("git", ["-C", base, "add", "-A", "-f"]);
  const second = join(temp("leaky-product"), "q");
  const scanned = createProduct({ folder: second, name: "Q", base });
  assert.equal(scanned.scanned.ok, false, "the scan reports the leak");
  assert.equal(scanned.committed, false);
  assert.throws(() => execFileSync("git", ["-C", second, "log"], { stdio: "pipe" }), "no commit exists");
});

test("new-product commits only after a scan that ran and came back clean", () => {
  // Found in review: a scanner that failed silently still let the commit through.
  for (const scan of [() => ({ ok: false, report: "gitleaks exited with 2 and printed nothing" }), () => ({ ok: false, report: "gitleaks isn't installed" })]) {
    const folder = join(temp("unscanned"), "p");
    const result = createProduct({ folder, name: "P", scan });
    assert.equal(result.committed, false);
    assert.throws(() => execFileSync("git", ["-C", folder, "log"], { stdio: "pipe" }), "no commit exists");
  }
});

test("new-product refuses a base whose folder the playbook writes into is a symlink", () => {
  // Found in review: a base tracking docs/ as a link had shared files overwritten through it.
  const root = temp("dirlink");
  const base = join(root, "base");
  const shared = join(root, "shared");
  mkdirSync(base);
  write(join(shared, "SPEC.md"), "keep this");
  symlinkSync(shared, join(base, "docs"), "dir");
  execFileSync("git", ["init", "-q", base]);
  execFileSync("git", ["-C", base, "add", "docs"]);
  const folder = join(root, "product");
  assert.throws(() => createProduct({ folder, name: "P", base, git: false }), /tracks docs as a symlink/);
  assert.equal(readFileSync(join(shared, "SPEC.md"), "utf8"), "keep this");
  assert.ok(!existsSync(folder), "nothing was written");
});

test("new-product --kit agent adds the agent standards, links them and routes to them", () => {
  const folder = join(temp("kit"), "desk");
  const result = createProduct({ folder, name: "Desk", kit: "agent", git: false });
  const read = (path) => readFileSync(join(folder, path), "utf8");
  assert.deepEqual(result.kit.wrote, ["docs/AGENT_STANDARDS.md", "docs/TECH_STACK.md"]);
  assert.match(read("docs/AGENT_STANDARDS.md"), /^# Agent standards for Desk/);
  assert.ok(!read("docs/AGENT_STANDARDS.md").includes("{{PRODUCT}}") && !read("docs/TECH_STACK.md").includes("{{PRODUCT}}"));
  const kit = readKit("agent");
  assert.equal(read("docs/CODE_STANDARDS.md").split(kit.standards).length - 1, 1, "CODE_STANDARDS links the kit's standards once");
  const agents = read("AGENTS.md").split("\n");
  assert.equal(agents[agents.findIndex((l) => l.startsWith(kit.routeAfter)) + 1], kit.route, "the route sits after Writing code");
  assert.match(read(".process-version"), /^kit: agent$/m);
  assert.ok(result.kit.linked && result.kit.routed);
});

test("new-product refuses a destination that is a symlink, and writes nothing through it", () => {
  // Found in review: the kit and template were written into wherever the link pointed.
  const root = temp("dest-link");
  const outside = join(root, "outside");
  mkdirSync(outside);
  symlinkSync(outside, join(root, "product"));
  assert.throws(() => createProduct({ folder: join(root, "product"), name: "P", kit: "agent", git: false }), /is a symlink/);
  assert.deepEqual(readdirSync(outside), []);
});

test("new-product --kit routes to the standards even when AGENTS.md has no routing table", () => {
  // Found in review: a playbook base's own AGENTS.md without the anchor row got no route.
  const base = temp("route-base");
  execFileSync("git", ["init", "-q", "-b", "main", base]);
  write(join(base, ".process-version"), "master x\n");
  write(join(base, "AGENTS.md"), "# Existing product\nRead docs/PROCESS.md.\n");
  execFileSync("git", ["-C", base, "add", "-A"]);
  const folder = join(temp("route-product"), "p");
  const result = createProduct({ folder, name: "P", base, kit: "agent", git: false });
  const agents = readFileSync(join(folder, "AGENTS.md"), "utf8");
  assert.ok(result.kit.routed);
  assert.ok(agents.startsWith("# Existing product\nRead docs/PROCESS.md.\n"), "the base's own text stays");
  assert.ok(agents.endsWith(readKit("agent").routeSection));
});

test("new-product --kit keeps a base's own stack, and refuses an unknown kit before writing", () => {
  const base = temp("kit-base");
  execFileSync("git", ["init", "-q", "-b", "main", base]);
  write(join(base, "docs/TECH_STACK.md"), "the base's own stack\n");
  execFileSync("git", ["-C", base, "add", "-A"]);
  const folder = join(temp("kit-product"), "p");
  const result = createProduct({ folder, name: "P", base, kit: "agent", git: false });
  assert.deepEqual(result.kit.kept, ["docs/TECH_STACK.md"]);
  assert.equal(readFileSync(join(folder, "docs/TECH_STACK.md"), "utf8"), "the base's own stack\n");
  const nowhere = join(temp("no-kit"), "q");
  assert.throws(() => createProduct({ folder: nowhere, name: "Q", kit: "nope", git: false }), /no kit "nope"\. Kits: agent/);
  assert.ok(!existsSync(nowhere));
});

const python = spawnSync("python3", ["--version"]).status === 0;
const runPython = (code, cwd) => spawnSync("python3", ["-I", "-c", code], { cwd, encoding: "utf8" });

test("the agent kit's api_rules finds each broken rule, and passes a clean schema", { skip: !python && "python3 isn't installed" }, () => {
  const schema = {
    paths: {
      "/ok": { get: { operationId: "ok", description: "Reads it.", tags: ["agent"], parameters: [{ name: "id", required: true }] } },
      "/bad": {
        post: {
          description: "Two\nlines",
          tags: ["agent"],
          parameters: [{ name: "page", required: false }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Body" } } } },
        },
      },
    },
    components: {
      schemas: {
        Body: { properties: { a: {}, inner: { $ref: "#/components/schemas/Inner" } }, required: ["a", "inner"] },
        Inner: { properties: { b: {}, note: {} }, required: ["b"] },
        Batch: { type: "array", items: { $ref: "#/components/schemas/Item" } },
        Item: { type: "object", properties: { note: { type: "string" } } },
      },
    },
  };
  // Found in review: optional fields reached through an array's items passed.
  schema.paths["/batch"] = {
    post: { operationId: "batch", description: "Works a batch.", tags: ["agent"], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Batch" } } } } },
  };
  const dir = temp("api-rules");
  writeFileSync(join(dir, "schema.json"), JSON.stringify(schema));
  const code = `import json, sys; sys.path.insert(0, ${JSON.stringify(join(REPO, "kits/agent/checks"))}); from api_rules import rule_breaks; print(json.dumps(rule_breaks(json.load(open("schema.json")))))`;
  const run = runPython(code, dir);
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(run.stdout), [
    "POST /bad has no operation id",
    "POST /bad needs a one-line description",
    "POST /bad: page is optional",
    "POST /bad: Inner.note is optional",
    "POST /batch: Item.note is optional",
  ]);
});

test("the agent kit's boundary test passes a clean agent and fails each kind of break", { skip: !python && "python3 isn't installed" }, () => {
  const runFor = (files) => {
    const root = temp("boundaries");
    const imports = { connection: "", api: "from agent import connection", models: "", checkpoints: "", tools: "from agent import api", harness: "from agent import tools, models", entrypoint: "from agent import harness" };
    for (const [module, line] of Object.entries({ ...imports, ...files })) write(join(root, "agent", `${module}.py`), `${line}\n`);
    write(join(root, "agent/tests/test_boundaries.py"), readFileSync(join(REPO, "kits/agent/checks/test_boundaries.py"), "utf8"));
    const code = `import runpy
ns = runpy.run_path("agent/tests/test_boundaries.py")
failures = []
for name, fn in ns.items():
    if name.startswith("test_"):
        try: fn()
        except AssertionError: failures.append(name)
print(",".join(failures))`;
    const run = runPython(code, root);
    assert.equal(run.status, 0, run.stderr);
    return run.stdout.trim();
  };
  assert.equal(runFor({}), "");
  assert.equal(runFor({ api: "from agent import harness" }), "test_each_module_imports_only_what_it_may");
  assert.equal(runFor({ tools: "import httpx\nclient = httpx.Client()" }), "test_only_the_connection_makes_an_http_client");
  assert.equal(runFor({ models: "from backend.main import app" }), "test_the_agent_never_imports_what_it_must_not");
  assert.equal(runFor({ api: "from agent import entrypoint" }), "test_each_module_imports_only_what_it_may,test_nothing_imports_the_app");
  assert.equal(runFor({ extra: "" }), "test_every_module_is_listed");
  // Found in review: relative imports went unseen.
  assert.equal(runFor({ api: "from .entrypoint import app" }), "test_each_module_imports_only_what_it_may,test_nothing_imports_the_app");
  assert.equal(runFor({ tools: "from . import harness" }), "test_each_module_imports_only_what_it_may");
  assert.equal(runFor({ harness: "from .tools import run\nfrom . import models" }), "", "allowed relative imports still pass");
});

test("every Python file in the kits compiles", { skip: !python && "python3 isn't installed" }, () => {
  for (const file of walk(join(REPO, "kits")).filter((f) => f.endsWith(".py"))) {
    const run = spawnSync("python3", ["-I", "-c", "import ast, sys; ast.parse(open(sys.argv[1]).read())", join(REPO, "kits", file)], { encoding: "utf8" });
    assert.equal(run.status, 0, `${file}: ${run.stderr}`);
  }
});

test("new-product without a base starts git with one commit", () => {
  const folder = join(temp("fresh"), "solo");
  createProduct({ folder, name: "Solo" });
  const log = execFileSync("git", ["-C", folder, "log", "--format=%s"], { encoding: "utf8" }).trim();
  assert.equal(log, "Start Solo from the master template");
  assert.match(readFileSync(join(folder, "docs/SPEC.md"), "utf8"), /^# Solo: spec/);
});

// Found while piloting the Harness² slices: new-product copied master's working
// tree but pinned its last commit, so a product made mid-edit named a commit
// whose files it didn't have.
test("new-product's pin says when master's template had uncommitted changes, and the command refuses them unless asked", () => {
  const master = temp("master");
  const git = (...args) => execFileSync("git", ["-C", master, "-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { encoding: "utf8" });
  git("init", "-q");
  for (const [file, text] of Object.entries({ "template/a.md": "a\n", "kits/k/b.md": "b\n", "notes.md": "n\n", ".gitignore": "*.log\nnode_modules/\n" })) {
    mkdirSync(join(master, file, ".."), { recursive: true });
    writeFileSync(join(master, file), text);
  }
  git("add", "-A");
  git("commit", "-qm", "start");
  assert.deepEqual(uncommitted(master), [], "a clean tree has nothing to report");
  writeFileSync(join(master, "template/a.md"), "a changed\n");
  mkdirSync(join(master, "kits/k/new"), { recursive: true });
  writeFileSync(join(master, "kits/k/new/c.md"), "c\n");
  writeFileSync(join(master, "notes.md"), "n changed\n");
  assert.deepEqual(uncommitted(master).sort(), ["kits/k/new/c.md", "template/a.md"], "edited and new files under template/ and kits/, nothing else");
  // Found in review: walk() copies ignored files too, so they count; node_modules it skips.
  writeFileSync(join(master, "template/debug.log"), "x\n");
  mkdirSync(join(master, "template/node_modules/m"), { recursive: true });
  writeFileSync(join(master, "template/node_modules/m/i.js"), "x\n");
  assert.deepEqual(uncommitted(master, ["template"], { ignored: true }).sort(), ["template/a.md", "template/debug.log"]);
  assert.deepEqual(uncommitted(master, ["template"]), ["template/a.md"], "ignored files only when asked");
  mkdirSync(join(master, "kits/k/__pycache__"), { recursive: true });
  writeFileSync(join(master, "kits/k/__pycache__/x.log"), "x\n");
  // Found in review round 2: an edit anywhere in kits/ still counts; ignored files only where copied.
  assert.deepEqual(masterChanges(null, master), ["kits/k/new/c.md", "template/a.md", "template/debug.log"]);
  assert.deepEqual(sources(null), ["template"]);
  assert.deepEqual(sources("agent"), ["template", "kits/agent/kit.json", "kits/agent/AGENT_STANDARDS.md", "kits/agent/TECH_STACK.md"]);
  // Found in review: a failed git call read as "clean".
  assert.throws(() => uncommitted(temp("not-git")), /couldn't read git status/);

  const pinOf = (changes) => {
    const folder = join(temp("pin"), "p");
    createProduct({ folder, name: "P", git: false, changes: () => changes });
    return readFileSync(join(folder, ".process-version"), "utf8");
  };
  assert.doesNotMatch(pinOf([]), /uncommitted/);
  const pin = pinOf(["template/a.md"]);
  assert.match(pin.split("\n")[0], /^master \S+ \S+ \+ uncommitted changes$/, "the first line, which upgrades read, says it isn't that commit exactly");
  assert.match(pin, /template\/a\.md/, "and names the files");

  assert.match(refuseUncommitted(["template/a.md"], false), /template\/a\.md[\s\S]*Commit them first[\s\S]*--allow-uncommitted/);
  assert.equal(refuseUncommitted(["template/a.md"], true), null);
  assert.equal(refuseUncommitted([], false), null);
});

test("ask builds read-only calls from the roster", () => {
  const { roster } = readRoster(null);
  const astra = resolveModel(roster, "reviewer_a");
  const fresh = buildCall({ model: astra, dir: "/snap", prompt: "p", out: "/o.md" });
  assert.equal(fresh.command, "codex");
  assert.deepEqual(fresh.args.slice(0, 3), ["exec", "-m", astra.id]);
  assert.ok(fresh.args.includes("read-only"));
  assert.ok(fresh.args.includes(`model_reasoning_effort="${astra.effort}"`));
  assert.equal(fresh.stdin, "p");

  const resumed = buildCall({ model: astra, dir: "/snap", prompt: "p", out: "/o.md", resume: "abc" });
  assert.deepEqual(resumed.args.slice(0, 3), ["exec", "resume", "abc"]);
  assert.ok(resumed.args.includes('sandbox_mode="read-only"'));

  const argon = buildCall({ model: resolveModel(roster, "argon"), dir: "/snap", prompt: "p", out: "/o.md" });
  assert.equal(argon.command, "agy");
  assert.ok(argon.args.includes("--sandbox"));
  assert.ok(!argon.args.includes("--dangerously-skip-permissions"));

  assert.throws(() => buildCall({ model: resolveModel(roster, "builder"), dir: "/", prompt: "", out: "/o" }), /expected codex or agy/);
  assert.throws(() => resolveModel(roster, "nobody"), /unknown role or model/);
  assert.equal(sessionOf(astra, "model: x\nsession id: 019a5c3e-1111-7222-8333-944455556666\n"), "019a5c3e-1111-7222-8333-944455556666");
});

test("ask counts an answer only when the CLI's own log shows the asked model and effort", () => {
  const { roster } = readRoster(null);
  const astra = resolveModel(roster, "astra");
  const header = (model, effort, sandbox = "read-only") => `model: ${model}\nprovider: openai\nsandbox: ${sandbox}\nreasoning effort: ${effort}\n`;
  assert.deepEqual(checkEvidence(astra, header(astra.id, astra.effort)), []);
  // The resume bug: a resumed session quietly running another model.
  assert.match(checkEvidence(astra, header("gpt-6.1-sol", astra.effort)).join(), /model gpt-6.1-sol, not gpt-6-astra/);
  assert.match(checkEvidence(astra, header(astra.id, "medium")).join(), /effort medium/);
  assert.match(checkEvidence(astra, header(astra.id, astra.effort, "workspace-write")).join(), /sandbox workspace-write/);
  assert.match(checkEvidence(astra, "no header at all").join(), /model unknown/);
  const argon = resolveModel(roster, "argon");
  const label = `label="${argon.name} (High)"`;
  assert.deepEqual(checkEvidence(argon, "", `Resolving model ${argon.id}\nPropagating selected model override ${label}`), []);
  // Found in review: a longer id that starts the same, and a log with no effort label, both passed.
  assert.match(checkEvidence(argon, "", `Resolving model ${argon.id}-other\n${label}`).join(), /Resolving model/);
  assert.match(checkEvidence(argon, "", `Resolving model ${argon.id}`).join(), /label=/);
  assert.match(checkEvidence(argon, "", `Resolving model ${argon.id}\nlabel="${argon.name} (Low)"`).join(), /label=/);
  assert.equal(checkEvidence(argon, "", "Resolving model something-else").length, 2);
});

test("ask finds symlinks that would let a reviewer read outside its folder", () => {
  const dir = temp("snap");
  write(join(dir, "src/app.py"), "x\n");
  symlinkSync(join(dir, "src/app.py"), join(dir, "inside-link"));
  const secret = join(temp("secret"), "key.pem");
  writeFileSync(secret, "KEY\n");
  mkdirSync(join(dir, "deep"));
  symlinkSync(secret, join(dir, "deep/key-link"));
  symlinkSync(join(dir, "nowhere"), join(dir, "dangling"));
  const found = outsideLinks(dir);
  assert.equal(found.length, 1);
  assert.match(found[0], /^deep\/key-link -> .*key\.pem$/);
});

test("measure reads milestones, owner messages and the commit mix", () => {
  assert.deepEqual(commitStats(["Record round 2", "Add the search page", "P3: metrics"]), { total: 3, process: 1, share: 33 });
  assert.deepEqual(milestones("- Spec approved: 2026-11-05\n- First usable in the real environment (slice 1 merged and used by the owner): 2026-11-09\n- First release to someone other than the owner: <date>\n"), {
    "Spec approved": "2026-11-05",
    "First usable in the real environment (slice 1 merged and used by the owner)": "2026-11-09",
  });
  const lines = [
    { type: "user", message: { content: "build the search page" } },
    { type: "user", message: { content: [{ type: "text", text: "and the export" }] } },
    { type: "user", message: { content: "<system-reminder>not the owner</system-reminder>" } },
    { type: "user", message: { content: [{ type: "tool_result", content: "x" }] } },
    { type: "user", isSidechain: true, message: { content: "a subagent's prompt" } },
    { type: "assistant", message: { content: "ok" } },
    { type: "user", origin: { kind: "human" }, turnOrigin: "human", message: { content: "Run round 23" } },
    { type: "user", origin: { kind: "peer", from: "local_x" }, message: { content: "Background (from the session that started this one)" } },
    { type: "user", turnOrigin: "task_notification", message: { content: "A background task finished" } },
    { type: "user", isCompactSummary: true, message: { content: "This session is being continued from a previous conversation" } },
  ].map((e) => JSON.stringify(e));
  assert.deepEqual(ownerMessages([...lines, "not json"]), { total: 3, review: 1 });
});

test("measure takes review and rework time from the review log's Opened and Closed times", () => {
  const status = [
    "## Review log",
    "",
    "| Unit | Opened | Closed | Reviewer (session) | Rounds and verdicts | Proven blockers | Notes kept |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    "| Slice 1 | 2026-11-05 09:00 | 2026-11-05 11:30 | reviewer_a | R1 PASS | none | none |",
    "| Slice 2 | 2026-11-06 10:00 | 2026-11-06 11:00 | reviewer_a | R1 BLOCK, R2 PASS | D1 | none |",
    "| Slice 3 | 2026-11-07 10:00 | 2026-11-07 16:00 | reviewer_a | R1 BLOCK, R2 PASS | D1 | none |",
    "| Slice 4 | 2026-11-08 10:00 | <YYYY-MM-DD HH:MM> | reviewer_a | R1 BLOCK | open | none |",
    "| <slice or fix> | <YYYY-MM-DD HH:MM> | <YYYY-MM-DD HH:MM> | <role> | R1 | x | y |",
    "",
    "## Milestones",
  ].join("\n");
  assert.deepEqual(reviewTimes(status), { units: 4, closed: 3, medianHours: 2.5 });
  assert.deepEqual(reviewTimes("no log here"), { units: 0, closed: 0, medianHours: null });
  // Found in review: an even count took the lower middle value instead of the mean of the two.
  const even = ["## Review log", "| Unit | Opened | Closed |", "| --- | --- | --- |", "| A | 2026-11-05 09:00 | 2026-11-05 10:00 |", "| B | 2026-11-05 09:00 | 2026-11-05 18:00 |"].join("\n");
  assert.equal(reviewTimes(even).medianHours, 5);
});

test("measure works on a product with no commits yet, and finds its transcripts", () => {
  const repo = temp("empty");
  execFileSync("git", ["init", "-q", repo]);
  const home = temp("measure-home");
  write(join(home, ".claude/projects", repo.replace(/[/.]/g, "-"), "s1.jsonl"), `${JSON.stringify({ type: "user", message: { content: "start it" } })}\n`);
  const result = measureRepo(repo, home);
  assert.equal(result.stats.total, 0);
  assert.deepEqual(result.owner, { total: 1, review: 0 });
  assert.equal(result.sessions, 1);
});
