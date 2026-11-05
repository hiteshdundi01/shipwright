// One way to ask a reviewer or debater model a question, read-only, at the
// effort the roster sets. The review and debate skills call this; nothing else
// should build a Codex or Antigravity command by hand.
import { spawnSync } from "node:child_process";
import { closeSync, lstatSync, openSync, readdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { isMain, parseArgs, readRoster, resolveModel } from "./lib.mjs";

const USAGE = `Usage: node scripts/ask.mjs <role|model> --prompt <file> --out <file> [--dir <folder>] [--resume <session>] [--dry-run]

Asks one model, read-only, and writes its answer to --out. The model and its
effort come from roster.json (the product's own, or template/roster.json).

  <role|model>  a role such as reviewer_a or debater, or a model key such as astra
  --prompt      the prompt file
  --out         where to write the answer; the run's log goes next to it
  --dir         the folder the model may read (default: the current folder).
                Codex models read it in a read-only sandbox. Antigravity models
                read nothing: put everything they need in the prompt.
  --resume      continue an earlier session, to answer a follow-up in the same
                debate or to check fixes to that session's own findings
  --dry-run     print the commands and stop

Before any call, gitleaks scans --dir and the prompt, and --dir must hold no
symlink that leads outside it. Either finding stops the call.
After it, the CLI's own log must show the roster's model and effort (and, for
Codex, a read-only sandbox). If it doesn't, ask exits 3: INCOMPLETE.`;

export function buildCall({ model, dir, prompt, out, resume }) {
  if (model.cli === "codex") {
    const effort = ["-c", `model_reasoning_effort="${model.effort}"`];
    const args = resume
      ? ["exec", "resume", resume, "-m", model.id, ...effort, "-c", 'sandbox_mode="read-only"', "--skip-git-repo-check", "-o", out, "-"]
      : ["exec", "-m", model.id, ...effort, "-s", "read-only", "--skip-git-repo-check", "--color", "never", "-C", dir, "-o", out, "-"];
    return { command: "codex", args, cwd: dir, stdin: prompt };
  }
  if (model.cli === "agy") {
    const args = [
      "-p",
      prompt,
      "--model",
      model.id,
      "--effort",
      model.effort,
      "--output-format",
      "json",
      "--print-timeout",
      "1800s",
      "--sandbox",
      "--disable-slash-commands",
      "--log-file",
      `${out}.agy.log`,
    ];
    if (resume) args.push("--conversation", resume);
    return { command: "agy", args, cwd: dir, stdin: null };
  }
  throw new Error(`roster model "${model.key}" names cli "${model.cli}"; expected codex or agy`);
}

export function sessionOf(model, log) {
  if (model.cli === "codex") return /session id:\s*([0-9a-f-]{36})/i.exec(log)?.[1] ?? null;
  try {
    return JSON.parse(log).conversation_id ?? null;
  } catch {
    return null;
  }
}

// What the CLI itself recorded about the run, checked against what was asked.
// A model's word about itself doesn't count; neither does the command line,
// since a resumed Codex session once ran a different model than it was given.
export function checkEvidence(model, log, agyLog = "") {
  const problems = [];
  if (model.cli === "codex") {
    const ran = (field) => new RegExp(`^${field}:\\s*(\\S+)`, "m").exec(log)?.[1] ?? "unknown";
    if (ran("model") !== model.id) problems.push(`model ${ran("model")}, not ${model.id}`);
    if (ran("reasoning effort") !== model.effort) problems.push(`effort ${ran("reasoning effort")}, not ${model.effort}`);
    if (ran("sandbox") !== "read-only") problems.push(`sandbox ${ran("sandbox")}, not read-only`);
  } else {
    // Antigravity names the effort in the model id and in the label it logs,
    // e.g. `Resolving model gemini-4-argon-high` and `label="Gemini 4 Argon (High)"`.
    // Both must match exactly; a longer id that starts the same doesn't count.
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`Resolving model ${escape(model.id)}(?![\\w.-])`).test(agyLog))
      problems.push(`the Antigravity log doesn't show "Resolving model ${model.id}"`);
    const label = `label="${model.name} (${model.effort[0].toUpperCase()}${model.effort.slice(1)})"`;
    if (!agyLog.includes(label)) problems.push(`the Antigravity log doesn't show ${label}`);
  }
  return problems;
}

// Symlinks under the folder that lead out of it. gitleaks doesn't follow them,
// but a reviewer's file tools would, so a call never goes out while one exists.
export function outsideLinks(dir) {
  const root = realpathSync(dir);
  const found = [];
  const visit = (path) => {
    for (const name of readdirSync(path)) {
      const full = join(path, name);
      const stat = lstatSync(full);
      if (stat.isSymbolicLink()) {
        let real;
        try {
          real = realpathSync(full);
        } catch {
          continue; // dangling: nothing to read
        }
        if (real !== root && !real.startsWith(`${root}${sep}`)) found.push(`${relative(root, full)} -> ${real}`);
      } else if (stat.isDirectory()) visit(full);
    }
  };
  visit(root);
  return found;
}

function scan(paths) {
  for (const path of paths) {
    const run = spawnSync("gitleaks", ["detect", "--no-git", "--no-banner", "--redact", "--follow-symlinks", "--source", path], { encoding: "utf8" });
    if (run.error) throw new Error("gitleaks is not installed (brew install gitleaks). No call is made without the scan.");
    if (run.status !== 0) throw new Error(`gitleaks found a possible secret in ${path}. Remove it before asking.\n${run.stdout}${run.stderr}`);
  }
}

function safeRead(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2), ["dry-run", "help"]);
  if (flags.help || positional.length !== 1 || !flags.prompt || !flags.out) return console.log(USAGE);
  const { roster, path: rosterPath } = readRoster(process.cwd());
  const model = resolveModel(roster, positional[0]);
  const dir = resolve(flags.dir ?? ".");
  const promptFile = resolve(flags.prompt);
  const out = resolve(flags.out);
  const call = buildCall({ model, dir, prompt: readFileSync(promptFile, "utf8"), out, resume: flags.resume });

  console.log(`model: ${model.name} (${model.id}, ${model.effort} effort), from ${rosterPath}`);
  if (flags["dry-run"]) {
    console.log(`scan: gitleaks on ${dir} and ${promptFile}`);
    const shown = call.args.map((a, i) => (call.args[i - 1] === "-p" ? "<prompt>" : JSON.stringify(a)));
    console.log(`run: ${call.command} ${shown.join(" ")}${call.stdin ? " < <prompt>" : ""}`);
    return;
  }
  const links = outsideLinks(dir);
  if (links.length) throw new Error(`${dir} has symlinks that lead outside it, which the reviewer could read. Delete them first:\n${links.join("\n")}`);
  scan([dir, promptFile]);

  const logPath = `${out}.log`;
  const logFd = openSync(logPath, "w");
  const run = spawnSync(call.command, call.args, {
    cwd: call.cwd,
    input: call.stdin ?? undefined,
    stdio: [call.stdin ? "pipe" : "ignore", model.cli === "agy" ? "pipe" : logFd, logFd],
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  closeSync(logFd);
  if (run.error) throw new Error(`${call.command} could not start: ${run.error.message}`);
  let log = readFileSync(logPath, "utf8");
  if (model.cli === "agy") {
    log = run.stdout;
    writeFileSync(`${out}.json`, run.stdout);
    try {
      writeFileSync(out, JSON.parse(run.stdout).response ?? "");
    } catch {
      throw new Error(`agy did not return JSON; see ${out}.json and ${logPath}`);
    }
  }
  console.log(`session: ${sessionOf(model, log) ?? "unknown (see the log)"}`);
  console.log(`answer: ${out}`);
  console.log(`log: ${logPath}`);
  if (run.status !== 0) {
    console.error(`${call.command} exited with ${run.status}`);
    process.exit(run.status ?? 1);
  }
  const agyLog = model.cli === "agy" ? safeRead(`${out}.agy.log`) : "";
  const problems = checkEvidence(model, readFileSync(logPath, "utf8"), agyLog);
  if (problems.length) {
    console.error(`INCOMPLETE: the CLI's own log shows ${problems.join("; ")}. Don't count this answer.`);
    process.exit(3);
  }
  console.log(`verified: the CLI's log shows ${model.id} at ${model.effort} effort${model.cli === "codex" ? ", read-only" : ""}`);
}

if (isMain(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`ask: ${error.message}`);
    process.exit(1);
  }
}
