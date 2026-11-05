// Starts a new product: the playbook layer from template/, optionally laid over
// the code of a base repo such as the reference agent template.
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { REPO, TEMPLATE_DIR, isMain, parseArgs, uncommitted, version, walk } from "./lib.mjs";

export const KITS_DIR = join(REPO, "kits");

// A kit's manifest (kits/<kit>/kit.json): which of its files go where in a
// product, the standards CODE_STANDARDS links to, and the AGENTS.md route.
export function readKit(kit) {
  const manifest = join(KITS_DIR, kit, "kit.json");
  if (!existsSync(manifest)) {
    const known = existsSync(KITS_DIR) ? readdirSync(KITS_DIR).filter((k) => existsSync(join(KITS_DIR, k, "kit.json"))) : [];
    throw new Error(`no kit "${kit}". Kits: ${known.join(", ") || "none"}`);
  }
  return { name: kit, dir: join(KITS_DIR, kit), ...JSON.parse(readFileSync(manifest, "utf8")) };
}

// The base's own choices: when the base has one of these, it stays, because
// it describes the code being kept. Otherwise the template's starter is used.
export const KEEP_FROM_BASE = ["docs/TECH_STACK.md", "docs/CODE_STANDARDS.md", "docs/BRAND.md", "GLOSSARY.md"];

// The base's example: its spec, status and plans describe the example product,
// not the new one. They always move to docs/base/, to read while planning.
const EXAMPLE = (file) => /^docs\/PLAN(_[^/]+)?\.md$/.test(file) || file === "docs/SPEC.md" || file === "docs/STATUS.md";
export const ASIDE = "docs/base";

// A base that already follows the playbook (it tracks .process-version) has
// adapted these to its own code: the check command, the stand-ins, its
// high-stakes paths. They stay. From any other base they are an older process's
// docs, so they move to docs/base/ and the template's replace them. Every other
// playbook file (the review protocol, the templates, roster.json) is master's.
export const ADAPTED = ["AGENTS.md", "docs/PROCESS.md", "review.config.yaml"];

const TEXT = /\.(md|json|ya?ml|txt|mjs|js|ts|toml)$/;

// Files that hold secrets by convention. Never copied from a base, even when
// the base tracks one by mistake. .env.example is the documented exception.
export const SECRET_LIKE = /(^|\/)\.env(\.(?!example$)[^/]+)?$|\.(pem|key|p12)$/;

const USAGE = `Usage: node scripts/new-product.mjs <folder> --name "<Product name>" [--base <repo>] [--kit <kit>] [--no-git] [--allow-uncommitted]

Creates <folder> (which must not exist, or be empty) with the playbook from
template/. With --base, copies the base repo's tracked files first (never its
.env, history or ignored files), then lays the playbook over them: the base
keeps its own stack, standards and brand; its spec, status and plans move to
docs/base/ to read; and the two .gitignore files are merged. A base that already
follows the playbook (it tracks .process-version) also keeps its AGENTS.md,
docs/PROCESS.md and review.config.yaml. Any other base's process docs move to
docs/base/ too.

  --name    the product's name, written into AGENTS.md and the docs
  --kit     add a kit's standards to the playbook, e.g. --kit agent for a
            product where a model decides or acts (kits/<kit>/README.md)
  --base    a git repo to start the code from, e.g. ~/projects/my-agent
  --no-git  don't run git init or make the first commit
  --allow-uncommitted
            make it even though master has uncommitted changes under
            template/ or kits/, or ignored files where it copies from. Without it, new-product refuses, because the
            product would get files its .process-version commit doesn't have.
            With it, the pin says so and lists them.`;

// The master paths a product is copied from: the template, and a kit's manifest
// and the files it lists. The pin is only true if these match master's commit.
export function sources(kit) {
  const spec = typeof kit === "string" ? readKit(kit) : kit;
  return ["template", ...(spec ? [`kits/${spec.name}/kit.json`, ...Object.keys(spec.files).map((f) => `kits/${spec.name}/${f}`)] : [])];
}

// What in master differs from the commit a product would pin: any edited,
// staged or new file in template/ or kits/, and ignored files only where they
// would be copied (an untracked __pycache__ in a kit's checks is never copied).
export function masterChanges(kit, repo = REPO) {
  const all = [...uncommitted(repo, ["template", "kits"]), ...uncommitted(repo, sources(kit), { ignored: true })];
  return [...new Set(all)].sort();
}

// Why new-product won't run on master's uncommitted template, or null when it may.
export function refuseUncommitted(changes, allow) {
  if (!changes.length || allow) return null;
  return `master has uncommitted changes, so .process-version wouldn't name the commit this product starts from: ${changes.join(", ")}.\nCommit them first, or pass --allow-uncommitted to pin with a note listing them.`;
}

function trackedFiles(repo) {
  return execFileSync("git", ["-C", repo, "ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
}

function isLink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

// A symlink is copied as a link, never as the file it points to: a tracked
// link to something outside the base (a key, a home-folder config) must not
// bring that file's contents into the new product.
function copy(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  if (lstatSync(from).isSymbolicLink()) symlinkSync(readlinkSync(from), to);
  else copyFileSync(from, to);
}

// The secret scan before the first commit. Only a scan that ran and came back
// clean allows a commit: a scanner that's missing, crashed or exited oddly
// counts as not clean, whatever it printed.
export function scanForSecrets(dir) {
  const scan = spawnSync("gitleaks", ["detect", "--no-git", "--no-banner", "--redact", "--follow-symlinks", "--source", dir], { encoding: "utf8" });
  if (scan.error) return { ok: false, report: "gitleaks isn't installed (brew install gitleaks), so the new product wasn't scanned" };
  if (scan.status === 0) return { ok: true, report: "" };
  return { ok: false, report: `${scan.stdout}${scan.stderr}`.trim() || `gitleaks exited with ${scan.status} and printed nothing` };
}

// Lays a kit over the product: its files where the product has none, a link
// from CODE_STANDARDS.md to its standards, and a route in AGENTS.md. Each step
// is skipped, and reported, when the product already has it.
function applyKit(target, kit, name) {
  const done = { name: kit.name, wrote: [], kept: [], linked: false, routed: false };
  for (const [from, to] of Object.entries(kit.files)) {
    const path = join(target, to);
    if (existsSync(path) || isLink(path)) {
      done.kept.push(to);
      continue;
    }
    copy(join(kit.dir, from), path);
    writeFileSync(path, readFileSync(path, "utf8").replaceAll("{{PRODUCT}}", name));
    done.wrote.push(to);
  }
  const standards = join(target, "docs/CODE_STANDARDS.md");
  if (existsSync(standards) && !isLink(standards)) {
    const text = readFileSync(standards, "utf8");
    if (!text.includes(kit.standards)) writeFileSync(standards, `${text.replace(/\n*$/, "\n")}\n${kit.standardsSection}`);
    done.linked = true;
  }
  const agents = join(target, "AGENTS.md");
  if (existsSync(agents) && !isLink(agents)) {
    const text = readFileSync(agents, "utf8");
    const lines = text.split("\n");
    const at = lines.findIndex((line) => line.startsWith(kit.routeAfter));
    // Already routed if AGENTS.md names the standards anywhere. Otherwise a row in
    // its routing table, or, with no table, a short section at the end.
    if (!text.includes(kit.standards)) {
      if (at >= 0) {
        lines.splice(at + 1, 0, kit.route);
        writeFileSync(agents, lines.join("\n"));
      } else writeFileSync(agents, `${text.replace(/\n*$/, "\n")}\n${kit.routeSection}`);
    }
    done.routed = true;
  }
  return done;
}

// Every folder above a path: "docs/templates/PLAN.md" gives docs, docs/templates.
const parents = (path) => path.split("/").slice(0, -1).map((_, i, parts) => parts.slice(0, i + 1).join("/"));

// Returns what was written, for the report and the tests.
export function createProduct({ folder, name, base, kit, git = true, scan = scanForSecrets, changes }) {
  const target = resolve(folder);
  if (isLink(target)) throw new Error(`${target} is a symlink: give a real folder, so nothing is written wherever it points`);
  if (existsSync(target) && readdirSync(target).length > 0) throw new Error(`${target} exists and is not empty`);
  if (!name) throw new Error("--name is required");
  const kitSpec = kit ? readKit(kit) : null;

  // The playbook writes into folders like docs/. If the base tracks one of them
  // as a symlink, those writes would land wherever it points, outside the new
  // product. Refuse before anything is written.
  if (base) {
    const repo = resolve(base);
    const links = new Set(trackedFiles(repo).filter((f) => isLink(join(repo, f))));
    const writes = walk(TEMPLATE_DIR)
      .flatMap((f) => [f, `${ASIDE}/${f}`])
      .concat([".process-version", `${ASIDE}/docs/PLAN.md`], Object.values(kitSpec?.files ?? {}));
    const blocked = [...new Set(writes.flatMap(parents).filter((dir) => links.has(dir)))];
    if (blocked.length)
      throw new Error(`the base tracks ${blocked.join(", ")} as a symlink, and the playbook writes inside it. Make it a real folder in the base first.`);
  }
  mkdirSync(target, { recursive: true });

  const fromBase = [];
  const skipped = [];
  if (base) {
    const repo = resolve(base);
    for (const file of trackedFiles(repo)) {
      if (!existsSync(join(repo, file)) && !isLink(join(repo, file))) continue; // deleted in the working tree
      if (SECRET_LIKE.test(file)) {
        skipped.push(file);
        continue;
      }
      copy(join(repo, file), join(target, file));
      fromBase.push(file);
    }
  }

  const kept = [];
  const written = [];
  const asideFiles = [];
  const present = new Set(fromBase);
  const followsPlaybook = present.has(".process-version");
  const pin = join(target, ".process-version");
  const baseVersion = followsPlaybook && !isLink(pin) ? readFileSync(pin, "utf8").split("\n")[0] : followsPlaybook ? "a linked pin" : null;
  const moveAside = (file) => {
    copy(join(target, file), join(target, ASIDE, file));
    rmSync(join(target, file));
    present.delete(file);
    asideFiles.push(file);
  };
  for (const file of fromBase.filter(EXAMPLE)) moveAside(file);

  const templateFiles = walk(TEMPLATE_DIR);
  for (const file of templateFiles) {
    const to = join(target, file);
    const inBase = present.has(file);
    if (inBase && (KEEP_FROM_BASE.includes(file) || (followsPlaybook && ADAPTED.includes(file)))) {
      kept.push(file);
      continue;
    }
    if (inBase && file === ".gitignore" && !isLink(to)) {
      // Merge: the base's ignores stay, and the playbook's are added.
      const have = readFileSync(to, "utf8");
      const add = readFileSync(join(TEMPLATE_DIR, file), "utf8")
        .split("\n")
        .filter((line) => line && !have.split("\n").includes(line));
      writeFileSync(to, `${have.replace(/\n?$/, "\n")}${add.length ? `\n${add.join("\n")}\n` : ""}`);
      written.push(file);
      continue;
    }
    if (inBase && !followsPlaybook) moveAside(file);
    // Never write through the base's copy: if it's a symlink, the write would
    // land wherever it points.
    else if (inBase) rmSync(to);
    copy(join(TEMPLATE_DIR, file), to);
    if (TEXT.test(file)) writeFileSync(to, readFileSync(to, "utf8").replaceAll("{{PRODUCT}}", name));
    written.push(file);
  }

  // Base docs the playbook doesn't know about: the owner should check each.
  const toCheck = fromBase.filter((f) => f.startsWith("docs/") && !templateFiles.includes(f) && !asideFiles.includes(f) && !KEEP_FROM_BASE.includes(f));

  const kitDone = kitSpec ? applyKit(target, kitSpec, name) : null;

  // The playbook is pinned: an upgrade is a deliberate change (docs/PROCESS.md).
  // A pin names a commit; uncommitted template changes make that a half-truth,
  // so the first line, which an upgrade reads, says so.
  if (isLink(pin)) rmSync(pin); // never write through a link
  const dirty = changes ? changes() : masterChanges(kitSpec);
  writeFileSync(
    pin,
    `master ${version()}${dirty.length ? " + uncommitted changes" : ""}\n${kitSpec ? `kit: ${kitSpec.name}\n` : ""}The playbook in docs/ came from this commit of master.${dirty.length ? ` Master also had uncommitted changes: ${dirty.join(", ")}.` : ""} Upgrade on purpose: "Please upgrade the process to master <commit>".\n`,
  );
  written.push(".process-version");

  // A last check before anything is committed: a secret under another name.
  const scanned = scan(target);

  let committed = false;
  if (git) {
    const run = (...args) => execFileSync("git", ["-C", target, ...args], { stdio: "pipe" });
    run("init", "-b", "main");
    if (scanned.ok) {
      run("add", "-A");
      run("commit", "-q", "-m", `Start ${name} from the master template`);
      committed = true;
    }
  }
  return { target, kit: kitDone, fromBase: fromBase.length, followsPlaybook, baseVersion, kept, written, aside: asideFiles, toCheck, skipped, scanned, committed };
}

// "docs/addons/ (10 files)" instead of ten paths.
function byFolder(files) {
  const folders = new Map();
  for (const file of files) {
    const folder = file.includes("/", 5) ? file.slice(0, file.lastIndexOf("/") + 1) : file;
    folders.set(folder, (folders.get(folder) ?? 0) + 1);
  }
  return [...folders].map(([folder, n]) => (folder.endsWith("/") ? `${folder} (${n} file${n > 1 ? "s" : ""})` : folder));
}

function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2), ["no-git", "help", "allow-uncommitted"]);
  if (flags.help || positional.length !== 1) return console.log(USAGE);
  const refusal = refuseUncommitted(masterChanges(flags.kit), flags["allow-uncommitted"]);
  if (refusal) {
    console.error(refusal);
    process.exitCode = 1;
    return;
  }
  const result = createProduct({ folder: positional[0], name: flags.name, base: flags.base, kit: flags.kit, git: !flags["no-git"] });
  console.log(`Created ${result.target}`);
  if (flags.base) console.log(`- ${result.fromBase} files from ${flags.base}`);
  console.log(`- ${result.written.length} playbook files from template/`);
  if (result.followsPlaybook) console.log(`- the base follows the playbook (${result.baseVersion}); now pinned to master ${version()}`);
  if (result.kept.length) console.log(`- kept the base's own ${result.kept.join(", ")}. Rename the product in them.`);
  if (result.aside.length)
    console.log(`- moved the base's ${result.aside.join(", ")} to ${ASIDE}/, to read while planning${result.aside.includes("review.config.yaml") ? " (copy its high-stakes globs into review.config.yaml)" : ""}`);
  if (result.kit) {
    const k = result.kit;
    console.log(`- the ${k.name} kit: wrote ${k.wrote.join(", ") || "nothing"}${k.kept.length ? `; kept the product's own ${k.kept.join(", ")}` : ""}`);
    if (!k.linked) console.log(`  docs/CODE_STANDARDS.md is missing or a link: point it to the kit's standards by hand`);
    if (!k.routed) console.log(`  AGENTS.md is missing or a link: route agent work to the kit's standards by hand`);
  }
  if (result.skipped.length) console.log(`- skipped the base's secret-looking files: ${result.skipped.join(", ")}`);
  if (result.toCheck.length) console.log(`- check these base docs against the playbook, then keep, rewrite or delete each: ${byFolder(result.toCheck).join(", ")}`);
  if (!result.scanned.ok) console.log(`\nThe secret scan didn't come back clean, so nothing was committed${flags["no-git"] ? "" : " (git is initialized)"}. Fix it, scan again, then commit:\n${result.scanned.report}`);
  console.log(`\nNext: open it in Claude Code and use the spec skill to write docs/SPEC.md. PLAYBOOK.md in master has the whole route.`);
}

if (isMain(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`new-product: ${error.message}`);
    process.exit(1);
  }
}
