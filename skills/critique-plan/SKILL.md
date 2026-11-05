---
name: critique-plan
description: Audit a plan for scope creep, bloat, speculative generality and pattern drift, and write a CUT / CHANGE / ADD worklist. Use only when the owner asks to critique, audit or sanity-check a plan. One pass per request; never re-run it on its own output.
disable-model-invocation: true
---

# Critique a plan

Catch what would derail building the plan in one pass. Calibration matters more than finding fault: if the plan is mostly fine, say so. Reasoning models love finding things to complain about. Don't.

## 1. Load

- Read the plan (`docs/PLAN.md` or `docs/PLAN_<NAME>.md`), the brief or spec it answers, `GLOSSARY.md`, `docs/CODE_STANDARDS.md` and `docs/TECH_STACK.md`.
- Open 2 or 3 of the files the plan says to mirror or change, at the lines it cites. A citation that doesn't resolve is a blocking finding.

## 2. Anchor, then sketch the minimum

Write these down before reading the plan closely:

- **Goal:** one sentence, from the spec or brief, not from the plan's own framing.
- **Hard constraints:** every must and must-not from the spec, the brief and CODE_STANDARDS.
- **Minimum plan:** 3 to 8 bullets for the smallest set of changes that meets the constraints. No abstraction for future flexibility, no new file unless required, no test seam that no current test needs.

The plan is diffed against this minimum.

## 3. The three strongest things

Brief. It forces honest calibration before the review.

## 4. Seven axes

Each gets a verdict, `fine`, `minor` or `blocking`, with the phase, ticket or line it rests on. A `fine` axis gets one line.

1. **Scope.** Every phase and ticket traces to the spec, the brief or a hard constraint. Nothing belongs to other work.
2. **Necessity.** Diff against the minimum. Each extra needs a load-bearing reason: removing it breaks a criterion, a constraint or an established pattern. Ground each "for testability", "for flexibility", "for separation of concerns" or "for robustness" in a test, a second caller, a coupling or a failure that exists today. Flag tests that mostly check mocks.
3. **Pattern fidelity.** Each cited pattern is really followed, not replaced by a new one under its name.
4. **Sequencing.** Each phase or ticket is checkable on its own. Blocking edges are real. Nothing forces rework later.
5. **Criteria.** Each criterion is checkable from outside: a test, a command's output, an API response, a page. Spot missing, duplicate or unfalsifiable ones.
6. **Risks.** Each mitigation is a mechanism (a test, a code path, a check), not an intention. Add at most 2 missing risks.
7. **Speculative generality.** For each abstraction, option, wrapper, generic type or compatibility shim, ask what it's for today: a second user, a hard constraint, a required boundary (such as the one module that reaches a service), or an acceptance criterion. Cut it only when removing it keeps all of those. A second user is one reason, not the only one. A planned piece of work that adds a user goes under Sequencing.

## 5. Write

Save to `docs/reviews/plan/<plan-name>.md`, with: the anchors, the three strengths, the seven axes, the CUT / CHANGE / ADD worklist, and one verdict:

- "Sound, proceed"
- "Sound with minor changes: apply CHANGE, then proceed"
- "Needs revision: see CUT / CHANGE / ADD"

Then stop. The owner decides whether and how to revise. If a critique already exists at that path, ask before overwriting it.

## Rules

- Don't rewrite the plan or change its format.
- Empty CUT / CHANGE / ADD lists are valid.
- No invented findings, and no more than 2 invented risks.
