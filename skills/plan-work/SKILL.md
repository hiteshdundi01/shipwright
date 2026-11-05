---
name: plan-work
description: Turn an approved spec or brief into a plan grounded in the real code, with the design, state machines, and verifiable slices, slice 1 in the real environment. Writes no code. Use when asked to plan the work in a spec or brief, plan a feature, or prepare an implementation plan.
---

# Plan the work

The plan is how the builder will meet the spec, in slices the owner can check. It writes no code. The product's `docs/PROCESS.md` (Planning) holds the rules; this skill is how to do them well.

## 1. Check it's ready to plan

- Read the spec or brief, and `docs/STATUS.md`.
- The spec's "Open decisions" must be empty. If the plan would depend on a product choice the spec doesn't settle, ask the owner now. Models review a plan's consistency, not the owner's intent.

## 2. Ground it in the code

Explore before designing. For a large codebase, send a subagent per area and keep only its findings in your context. Find, with `file:line`:

- similar features to mirror, and how they name things, handle errors and test;
- the types, schemas and boundaries the work touches;
- the real check command and the narrower test commands. Read them from the manifests and `docs/PROCESS.md`. Never guess them.

If the product has `docs/AGENT_STANDARDS.md`, the design follows it, and slice 1 adopts the checks it lists. `~/.master/kits/agent/example/PLAN.md` shows the shape of an agent product's design.

## 3. Settle forks by running them

For each question a document can't settle (which approach is fast enough, which layout works, whether a library does what it claims), build the cheapest probe or throwaway prototype that answers it, in a scratch folder. Say first what result would change the choice. Record what it showed under "Choices and why". Ask the owner only about product or taste choices no run can settle.

## 4. Write the plan

Copy `docs/templates/PLAN.md` to `docs/PLAN.md` (for the spec) or `docs/PLAN_<NAME>.md`, and fill it:

- **Design.** The modules, what each is for, what each uses, and the existing code each mirrors. Check it against `docs/CODE_STANDARDS.md` before writing slices.
- **State machines** as tables, with what each move refuses.
- **Slices.** Each is one change that can be verified on its own, usually a thin path through every layer that a user could see working. Slice 1 is the thinnest end-to-end path, in the real delivery environment. Slices for running the product (noticing a failure, the diagnostic, restore, rollback) come where they belong, not last.
- **Criteria** per slice, checkable from outside: a test, a command and its output, an API response, a page.
- **A wide change** (a rename or retype across many call sites) can't be one thin slice: expand (add the new form beside the old), migrate the callers in slices, then contract (delete the old form) in a last slice that depends on every migration.
- **One stream by default.** Name two slices as parallel only when the plan states the shared contracts (schema, API, state) that make them independent.
- **Every spec line covered.** Where a line can't be met, say so under "Choices and why". Never quietly drop or weaken it.

## 5. Hand it over

Run the plan review the protocol asks for (the `cross-review` skill, with a plan as the unit). Then show the owner the plan's path, its slices in one line each, what the probes settled, and the review's outcome. Stop. Building starts on the owner's word.

Adapted from the owner's earlier `plan-feature`, pstack's prototype playbook and Matt Pocock's `to-tickets` (MIT). See `CREDITS.md` in master.
