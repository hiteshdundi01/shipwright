// Reads a product's own records and prints its process measures: milestones,
// the owner's messages and the commit mix.
// It reads git, docs/STATUS.md and the coding tool's local session transcripts.
// It writes nothing and sends nothing anywhere.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { isMain, parseArgs } from "./lib.mjs";

// A diagnostic only: subjects that look like review records or process edits.
export const PROCESS_SUBJECT = /review|round|protocol|record|status|\bPASS\b|finding/i;

export function commitStats(subjects) {
  const process = subjects.filter((s) => PROCESS_SUBJECT.test(s)).length;
  return { total: subjects.length, process, share: subjects.length ? Math.round((100 * process) / subjects.length) : 0 };
}

// The milestone lines in docs/STATUS.md: "- Spec approved: 2026-11-05".
export function milestones(status) {
  const found = {};
  for (const match of status.matchAll(/^- (Spec approved|First usable[^:]*|First release[^:]*): (\d{4}-\d{2}-\d{2})/gm)) found[match[1]] = match[2];
  return found;
}

// Review and rework time per unit, from the Opened and Closed columns of the
// review log in docs/STATUS.md (docs/REVIEW_PROTOCOL.md §7).
export function reviewTimes(status) {
  const section = /^## Review log\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(status)?.[1] ?? "";
  const rows = section.split("\n").filter((l) => l.trim().startsWith("|")).map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
  const header = rows[0] ?? [];
  const opened = header.indexOf("Opened");
  const closed = header.indexOf("Closed");
  const when = (cell) => (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/.test(cell ?? "") ? new Date(cell.replace(" ", "T")) : null);
  const hours = [];
  let units = 0;
  for (const row of rows.slice(2)) {
    if (opened < 0 || !when(row[opened])) continue;
    units++;
    const end = when(row[closed]);
    if (end) hours.push((end - when(row[opened])) / 3_600_000);
  }
  hours.sort((a, b) => a - b);
  const mid = Math.floor(hours.length / 2);
  const median = !hours.length ? null : hours.length % 2 ? hours[mid] : (hours[mid - 1] + hours[mid]) / 2;
  return { units, closed: hours.length, medianHours: median === null ? null : Math.round(median * 10) / 10 };
}

// Claude Code keeps each folder's sessions under ~/.claude/projects/<the path
// with every / and . turned into ->. The owner's own messages are the user
// turns a human typed: plain text, not tool results, system notes, summaries,
// or prompts another session or the app sent.
// An owner message spent on the review process itself: running, ruling on or
// approving rounds. The attention the review contract should give back.
export const REVIEW_MESSAGE = /\bround\b|\breview|\brule\b|\bruling|\bapprove|\bblocker|\bprotocol/i;

export function ownerMessages(lines) {
  const counts = { total: 0, review: 0 };
  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.type !== "user" || entry.isSidechain || entry.isMeta) continue;
    // Compaction summaries and other sessions' or the app's injected turns
    // aren't the owner. Newer transcripts label the turn's origin; trust it.
    if (entry.isCompactSummary || entry.isVisibleInTranscriptOnly) continue;
    const origin = entry.origin?.kind ?? entry.turnOrigin;
    if (origin && origin !== "human") continue;
    const content = entry.message?.content;
    const text = typeof content === "string" ? content : Array.isArray(content) ? content.filter((c) => c.type === "text").map((c) => c.text).join(" ") : "";
    if (!text.trim() || text.trimStart().startsWith("<")) continue;
    counts.total++;
    if (REVIEW_MESSAGE.test(text.slice(0, 300))) counts.review++;
  }
  return counts;
}

function transcriptDir(repo, home) {
  return join(home, ".claude", "projects", repo.replace(/[/.]/g, "-"));
}

// Everything measure prints, as data, for one product repo.
export function measureRepo(repo, home) {
  let subjects = [];
  try {
    subjects = execFileSync("git", ["-C", repo, "log", "--format=%s"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n").filter(Boolean);
  } catch {
    // No commits yet, or not a git repo: the other measures still apply.
  }
  const status = existsSync(join(repo, "docs/STATUS.md")) ? readFileSync(join(repo, "docs/STATUS.md"), "utf8") : "";
  const dir = transcriptDir(repo, home);
  const sessions = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".jsonl")) : [];
  const owner = { total: 0, review: 0 };
  for (const f of sessions) {
    const counts = ownerMessages(readFileSync(join(dir, f), "utf8").split("\n"));
    owner.total += counts.total;
    owner.review += counts.review;
  }
  return { stats: commitStats(subjects), dates: milestones(status), review: reviewTimes(status), owner, sessions: sessions.length };
}

function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2), ["help"]);
  if (flags.help || positional.length !== 1) return console.log("Usage: node scripts/measure.mjs <product repo> [--home <dir>]");
  const repo = resolve(positional[0]);
  const { stats, dates, review, owner, sessions } = measureRepo(repo, flags.home ? resolve(flags.home) : homedir());
  console.log(`${repo}\n`);
  for (const [name, date] of Object.entries(dates)) console.log(`${name}: ${date}`);
  if (!Object.keys(dates).length) console.log("Milestones: none recorded in docs/STATUS.md yet");
  console.log(review.units ? `Review: ${review.units} unit(s) with times, ${review.closed} closed, median ${review.medianHours ?? "n/a"} hours from first review call to close` : "Review: no Opened and Closed times in the review log yet");
  console.log(`Owner messages: ${owner.total}, across ${sessions} session(s) in this folder (worktrees are counted separately); ${owner.review} of them about reviews or rulings`);
  console.log(`Commits: ${stats.total}; ${stats.process} (${stats.share}%) have review or process words in the subject. A diagnostic, not a measure.`);
}

if (isMain(import.meta.url)) main();
