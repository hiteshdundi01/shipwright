# Process

How work moves from the owner's words to merged code in {{PRODUCT}}. `docs/REVIEW_PROTOCOL.md` has the review rules. `.process-version` names the version of the playbook this file came from.

## The one check command

`<command>` runs every check: lint, format, types, tests with the coverage floor, and the end-to-end tests. Write it here once and keep it the only entry point.

- The checks call no real model and reach no outside service. Stand-ins replace both. They never read `.env`.
- A pre-commit hook runs the checks for what changed. CI runs the whole command on every push.
- Never lower a threshold, turn off a rule, exclude a file or use `git commit --no-verify` to get a green run. If a rule looks wrong, stop and ask.

## What governs

`docs/SPEC.md` or the brief, then the approved plan, then `docs/CODE_STANDARDS.md`, then the code. A plan or a fix never weakens a spec line. When one can't be met, write `docs/templates/DECISION.md` and ask the owner.

## Three ways in

- **A small fix:** for a bug, follow Debugging below first. Then build it, run the check command, get the review `docs/REVIEW_PROTOCOL.md` §2 calls for, and commit. No plan. A fix that changes behavior a line of the spec, a plan or `docs/STATUS.md` describes updates that line in the same commit, or, where it contradicts a spec line, writes a decision page instead (What governs).
- **A capability:** the owner writes a brief in `docs/` (the `spec` skill helps), then "Please plan the work in `docs/<NAME>.md`", then "Please implement the plan for `<NAME>`".
- **The first build:** the same, from `docs/SPEC.md`, with its plan in `docs/PLAN.md`.
- **A big bet** (a capability that would change what the product is for, or one the owner calls a big bet): before the brief, a go/no-go debate (the `debate` skill), its case answering the eight questions in `~/.master/PLAYBOOK.md` §1.

## Before the spec is approved

A reader who didn't write the spec says back what it means, once, before the owner approves it. The same goes for a brief.

- Fill in `docs/templates/PARAPHRASE_PROMPT.md` with the spec and every definition it points to (its "Words", the `GLOSSARY.md` entries it uses), pasted in full. Nothing from the author: no notes, no summary, no conversation. Send it once to `reviewer_b` in a fresh session through `node ~/.master/scripts/ask.mjs`.
- Line the paraphrase up against the spec. For each difference that matters, write one of: a proposed clarification, an input the reader's packet lacked, or "no change" quoting the passage the reader had that settles it. A passage only the author knows doesn't settle it.
- Show the owner the paraphrase and each difference with its outcome as part of approval. The reader gives no verdict and isn't rerun after the edits.
- Record it on the "Spec approved" line of `docs/STATUS.md`: how many differences and how each ended. A call that failed is "paraphrase not run", never agreement.

## Planning

Write the plan to `docs/PLAN_<NAME>.md` (`docs/PLAN.md` for the spec) in the shape of `docs/templates/PLAN.md`, and write no code.

- The spec's "Open decisions" must be empty. If the plan depends on a product choice the spec doesn't settle, ask the owner before going on.
- Ground the design in the code: the modules, the existing code each part mirrors (file:line), and the real commands to check it.
- Settle each empirical fork with a probe or a throwaway prototype, and record what it showed.
- Write down, under "Choices and why", each engineering default that affects an acceptance criterion, a shared or external contract, stored data, security or recovery. A product choice goes to the owner. Other internal choices stay with the builder.
- Write state machines as tables.
- Split the work into slices that can each be verified on their own. Slice 1 is the thinnest end-to-end path, run in the real delivery environment.
- Give each slice criteria checkable from outside: tests, commands and their output, API responses, pages in the browser.
- Then the plan review (`docs/REVIEW_PROTOCOL.md` §2). The `critique-plan` skill runs only when the owner asks. The owner approves the plan.

## Building

On a branch, `build/<name>`, slice by slice, in order:

1. Read the files the slice changes and what calls them. Where the plan's assumptions are wrong, adapt and say so.
2. Build it with tests. Test changed behavior at the cheapest stable boundary that shows how it can fail: focused tests for complex logic, integration tests for important connections. While working, run only the tests for the code you're changing.
3. Check every criterion of the slice, then run the one check command. Fix what fails before going on.
4. Review it (`docs/REVIEW_PROTOCOL.md`). Fix what's confirmed. Rerun the tests the fixes touch.
5. Tick the slice's criteria in the plan, update `docs/STATUS.md`, and commit.

After the last slice, check the docs against the code. Compare what the spec, the plan and `docs/STATUS.md` say about the part this build covers, whether or not the build edited those lines, and the public contracts and invariants it changed, with what the code does. Write only the differences to `review/<branch>-docs.md`, each with the doc line, the code or probe that shows it, and one outcome: fix the code, correct a doc line that described the code wrongly, ask the owner, or unresolved. Never rewrite the spec or an approved plan to match the code. The builder acts on each before the whole-branch review: the fixes and corrections are committed, "ask the owner" becomes a decision page, and unresolved ones go to "Known gaps" in `docs/STATUS.md`. "None" is a valid record.

Then the whole-branch review, with that record in its prompt. Then report what was built, what the reviews found and what changed. The owner merges.

## Debugging

Before naming a cause or editing anything for a bug or a regression, build one command that runs the real path and fails on the reported symptom, and run it. Keep its failing output. For an intermittent bug, record a fixed number of trials and how often it fails. If no such command can be built, say what was tried, and get the missing evidence (an environment, a captured artifact, a log) before guessing. Then list the causes the evidence allows, each with what would prove it, and test them one at a time. After the fix, the same command passes, and it stays as a regression test at the boundary that showed the bug, where that's practical.

## Correcting

- **When the owner corrects a mistake,** fix it, and add a row to "Lessons" in `docs/CODE_STANDARDS.md` at once. A correction that matches a lesson nothing enforces yet is a repeat.
- **Run the `correct` skill** on a repeat, on one severe mistake, or when a review still has a blocker after round 2, before more work of that kind. The point is a durable fix for the class, not another patch.
- **A pointer or a written rule** names the situation that triggers it and the behavior it should change. Its "Observed result" in Lessons keeps two things apart: whether the instruction reached the agent (it opened the doc, the rule was in its context) and whether the behavior followed. Take that evidence from the next ordinary task where the situation comes up. Where the mistake is too severe to wait for that, replay it once before more work of that kind: a fresh session, the same starting files, the prevention in place. A replay that passes shows the instruction took effect that time, not that it lasts. One that fails reopens the cause; it doesn't by itself call for a heavier prevention. A new check still needs its failing run on the real past mistake.
- **Always-read text.** Detail goes in the doc the task already reads, the one `AGENTS.md`'s table routes to. A line goes in `AGENTS.md` itself only when those routes would miss what the agent needed, and `AGENTS.md` stays under 60 lines. Each correction says how many always-read lines it added and removed. Remove a line only when it's obsolete, shown to be unneeded, or replaced by something that covers the same duty. An agent following it while it's there doesn't show it's unneeded.
- **When the cause is master's own text** (a doc this product copied from the template, or a skill), fix it here as usual, and add it to "For master" in `docs/CODE_STANDARDS.md`: the kind of situation, this product's `.process-version`, the master file and passage, what went wrong, and the local fix. Link it from `docs/STATUS.md` when it needs the owner. Changing master is separate work, done in master: first compare the passage with current master, to tell a defect master still has from this product's own adaptation or a gap a later version already fixed. A correction here never edits a shared skill or upgrades another product.
- **At the end of each build,** before the report, look back over the build with `correct`'s evidence and causes, briefly. Record what to prevent, what needs the owner, or "none warranted". Mechanical rules belong in checks; judgment rules belong in the standards the reviewer reads. Then update "Observed result" on the Lessons rows this build gave evidence for, and only those: the behavior followed, a guard caught the mistake where it was meant to, or the mistake escaped, each with the run or commit. A catch is the prevention working. An escape is a repeat, so run `correct`.

## Rules

- Keep `docs/STATUS.md` current. It's the first file a session reads.
- Tests never call a real model. Only a slice's stated live run does, within its budget.
- Never push. Never touch what `AGENTS.md` puts off limits.

## Upgrading the process

This playbook is pinned. A newer playbook is adopted on purpose, like any other brief: "Please upgrade the process to master `<commit>`", which shows the differences and keeps this product's own adaptations. Never automatically.
