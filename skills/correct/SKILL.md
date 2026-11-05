---
name: correct
description: Find the mistakes agents keep making in a product, group them by cause, and add the cheapest durable prevention for each, proven against a real past mistake. Use when a review stalls at round 2, when the owner corrects the same kind of mistake twice, after a long or messy session, or when asked for a retro or to stop a mistake happening again.
---

# Correct

The owner shouldn't have to correct the same thing twice. Change the product's environment so the next agent doesn't make the mistake, or finds it before the owner does.

Assume the next contributor is an agent that sees only the files it opened, copies the nearest example, and takes the shortest path that compiles.

## 1. Gather the evidence

Read what happened, not what was summarized: the review answers and docs-against-code records in `review/`, the log in `docs/STATUS.md`, decision pages in `docs/decisions/`, the owner's corrections in the session transcript, reverts and fix commits (`git log`), and the existing checks (the one check command, hooks, CI, `docs/CODE_STANDARDS.md`'s table).

## 2. Group by cause

A class is a cause that produced more than one mistake, or one severe mistake. Name each class's cause, which is often not the code:

- **Unclear requirement.** The spec or plan allowed two readings.
- **Missing context.** The agent couldn't find what it needed, or found it too late.
- **No check.** Nothing failed when the mistake was made.
- **A broken or bypassed check.** A check existed but wasn't wired in, was silently skipped, or tested the wrong thing.
- **An implementation pattern.** The code makes the wrong way easy: two ways to do one thing, a hidden internal, a hand-synced list, dead code to copy.
- **An unbounded review.** Findings kept coming from outside the spec or threat model.
- **Steering that does nothing.** An instruction the agent already follows by default, or a long always-read file that buries what matters.
- **A slow or costly step.** An expensive tool call or loop that a script or a pointer would cut.

## 3. Pick the cheapest durable prevention

For each class, choose the least costly fix that will hold, in proportion to how often it recurs and what it costs when it does:

- **Remove the wrong state** when that also simplifies the design: one owner per piece of state, one supported way, the old way deleted.
- **A type** that makes the bad value impossible to write.
- **A check** (lint rule, test, CI step, hook) whose failure message names the fix. If the pattern is already common, fail only on new occurrences.
- **A sharper requirement**: a spec line, a threat-model ruling worded for the whole class, or an acceptance criterion.
- **A pointer**: one line in `AGENTS.md` or the right doc that routes the agent to what it missed. Where `docs/PROCESS.md` (Correcting) says where a pointer goes and how to count always-read lines, follow it.
- **A written rule**, last, only for judgment calls no check can make.

## 4. Prove it

For each new check: show it fails on the real past mistake (or a faithful counterexample), passes on correct code, and runs in the one check command and in CI. A check that has never failed is a draft.

For a pointer or a written rule, where `docs/PROCESS.md` (Correcting) asks for it: name its trigger and the behavior it should change, and get the evidence it asks for.

## 5. Record

Update `docs/CODE_STANDARDS.md`: each lesson the class covers gets its prevention in "Lessons", filling every column the product's table has. A rule goes in "Hard constraints and what enforces them" only when it's explicitly HARD (the owner's call). Significance alone doesn't make a rule blocking. Don't list every lint rule. Drop rows whose mistake can no longer happen. One commit per class.

## Reply

Each class, with its evidence, the cause, the fix chosen and why a cheaper or stronger one wasn't, and its proof. Where `docs/PROCESS.md` (Correcting) asks for evidence on a pointer or a written rule: for a check, that it fails on the past mistake; for a pointer or a written rule, that evidence, or that it's still to come. Elsewhere, the proof it fails on the past mistake. Then anything that needs the owner, such as a threat-model ruling or a spec change, and each item added to "For master", where `docs/PROCESS.md` (Correcting) asks for one.

Adapted from pstack's `correct` and Matt Pocock's `retro` (MIT), with evidence from the Elephant-Goldfish Model's drift report and Harness²'s edit verdicts (both Apache-2.0). See `CREDITS.md` in master.
