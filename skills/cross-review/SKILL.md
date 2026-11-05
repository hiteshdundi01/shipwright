---
name: cross-review
description: Run a bounded cross-model review of a change, a slice, a whole branch or a plan, under the product's review protocol, with evidence-backed blockers, two rounds, and a decision page for the owner when it can't settle. Use before committing a slice, before merging a branch, for a plan review, or when asked to review or get a second model's verdict on work.
---

# Cross-review

A review ends in a merge, a fix, or a decision for the owner. Never in another open round.

## 0. Which rules

Use the product's `docs/REVIEW_PROTOCOL.md`. If the product has none, or its protocol predates this playbook (no `.process-version` file), say so and ask the owner which to use: the product's own, or `~/.master/template/docs/REVIEW_PROTOCOL.md`. Don't mix the two in one review.

The sections below follow the template's protocol. Where the product's protocol differs, it wins.

## 1. Scope and depth

- Name the unit (a slice, a fix, the branch, a plan), its base commit and the reviewed commit or tree. Commit or stash first, so the reviewed tree is fixed.
- Decide the depth by protocol §2. Check `review.config.yaml → high_stakes` against the changed paths, then ask whether the change alters any of that behavior from elsewhere. Say the depth and why in one line. Downgrading a high-stakes path needs evidence: a blast-radius probe (below) is that evidence.
- For a plan, first check that protocol §2's condition for a plan review holds. If it doesn't, ask the owner.

## 2. Build what the reviewer reads

- Make a read-only copy of the reviewed tree outside the repo: `mkdir -p <scratch>/review-<unit> && git archive <commit> | tar -x -C <scratch>/review-<unit>`. Then delete everything matching `review.config.yaml → exclude_paths` from the copy, and any symlink that leads outside it (`ask.mjs` refuses the call while one is there).
- Fill in `docs/templates/REVIEW_PROMPT.md`: the spec lines and plan slice quoted, the standards that apply (hard and advisory, per the prompt), the threat model, the base and reviewed commit, and the check output. Save it as `review/<unit>-r1.prompt.md` (git ignores `review/`).

## 3. Round 1

```bash
node ~/.master/scripts/ask.mjs reviewer_a --dir <copy> --prompt review/<unit>-r1.prompt.md --out review/<unit>-r1.md
```

For two reviewers, start both in the background at once, `reviewer_a` and `reviewer_b`, each with its own `--out`. Neither sees the other's answer. `ask.mjs` scans for secrets, runs read-only, and checks that the CLI really ran the roster's model and effort. If it reports INCOMPLETE, retry once, then tell the owner.

## 4. Sort the findings

For each finding:

- **Not a blocker by protocol §3** (style, naming, structure, a future need): record it as a note. Done.
- **A blocker with a probe:** run the probe on the reviewed tree. Keep the command, environment and raw output.
- **A blocker with a code-path argument:** check it against protocol §3's bar. If it meets it, write the smallest probe you can and run it. If it doesn't, protocol §3 and §4 say where it goes.
- **Confirmed:** fix it, with a test that fails before the fix where a cheap one exists.
- **You disagree:** keep the reason, with evidence, for round 2. Never drop a finding quietly.

## 5. Round 2

Rebuild the read-only copy at the same path from the fixed commit, then resume the same session:

```bash
node ~/.master/scripts/ask.mjs reviewer_a --resume <session> --dir <copy> --prompt review/<unit>-r2.prompt.md --out review/<unit>-r2.md
```

Fill in the round-2 form of `docs/templates/REVIEW_PROMPT.md`: for each round-1 blocker, the probe's raw output and what the fix changed, plus your reasons for any you dispute. Protocol §5 says what round 2 may do.

## 6. Stop

- No blocker open: the unit passes.
- Otherwise follow protocol §5, "After round 2". Where it sends the unit to the owner, copy `docs/templates/DECISION.md` into `docs/decisions/`, fill it in, link it from `docs/STATUS.md`, and stop this unit.

## 7. Record

Add the unit's line to the review log in `docs/STATUS.md`, with what protocol §7 asks for. Then check `docs/PROCESS.md` (Correcting): if it says to correct, run the `correct` skill.

## A blast-radius probe

For a small diff you don't trust, before or alongside the review: find the one fact the change is safe because of (for example, "this call only drops entries that are already dead"), then prove it with a script that runs the real code and fails loudly if you're wrong. Look past the callers: wire formats, stored data, flags, what runs at teardown. The proof goes into the review prompt. It informs the review and never replaces it.

Adapted from pstack's `interrogate` and `blast-radius` and Matt Pocock's `code-review` (MIT). See `CREDITS.md` in master.
