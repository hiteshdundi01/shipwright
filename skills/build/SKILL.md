---
name: build
description: Implement an approved plan slice by slice, with tests at the right boundary, the one check command, a bounded review per slice, STATUS kept current, and a whole-branch review at the end. Use when asked to implement, build or execute a plan, or a phase or slice of one.
---

# Build

Build the approved plan, one verified slice at a time. The product's `docs/PROCESS.md` (Building) holds the rules; this skill is how to run them.

## Start

- Read the plan, `docs/STATUS.md` and the spec lines the plan answers.
- In one or two sentences, say what the owner wants from this build and what you'll build first.
- Make or check out the branch, `build/<name>`. If the working tree has someone else's uncommitted changes, stop and ask.

## Each slice

1. **Check the plan against the code.** Read the files the slice changes, what they import and what calls them. Check that the functions, types, tables and endpoints the plan names exist and behave as it says. Where it's wrong, adapt and note the difference for the report.
2. **Build it with tests.** For a bug or a regression, follow `docs/PROCESS.md` (Debugging) first. Test changed behavior at the cheapest stable boundary that shows how it can fail: focused tests for complex logic, integration tests for important connections. Expected values come from the spec or a worked example. While working, run only the tests for what you're changing.
3. **Prove the criteria.** Check every criterion of the slice on the real thing: run the command, call the API, open the page in the browser and look. For slice 1, run it in the real delivery environment the plan names, within its budget. "It compiles" proves nothing. If the product has `docs/AGENT_STANDARDS.md`, its testing rules are part of every slice.
4. **Run the one check command.** Fix what fails before going on. Never lower a threshold or skip a hook.
5. **Review it** with the `cross-review` skill. Fix what's confirmed. Rerun the tests the fixes touch.
6. **Record it.** Tick the slice's criteria in the plan, update `docs/STATUS.md` (state, how to run, gaps, the review line), and commit.

A slice that fails the same way twice: stop and look at the premise the attempts share before a third fix.

## Delegating

One stream by default. Hand a slice to a subagent only with a full brief: the goal, the files, the data shape, the criteria and the commands. Review its diff yourself; never pass on its summary. Run slices in parallel only where the plan says they are independent, each in its own worktree, and check the combined result.

## End

After the last slice, the docs-against-code check, if `docs/PROCESS.md` (Building) asks for it. Then the whole-branch review (the `cross-review` skill, both reviewers), then the end-of-build look-back in `docs/PROCESS.md` (Correcting). Then report to the owner:

- what was built, for whom, and how to see it working;
- each deviation from the plan and why, and each difference the docs-against-code record left for the owner;
- what the reviews confirmed and fixed, and the notes kept;
- what's left in "Known gaps".

The owner merges. Never push.

Adapted from the owner's earlier `implement-feature`, with Matt Pocock's `diagnosing-bugs` behind PROCESS's Debugging (MIT), and the Elephant-Goldfish Model's drift report behind the docs-against-code check (Apache-2.0). See `CREDITS.md` in master.
