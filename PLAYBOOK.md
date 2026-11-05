# Playbook

How a product goes from an idea to something people use, and back again. Each stage names who decides, what it leaves behind, and the skill that runs it. Enter at the stage the work needs: a small fix starts at Build.

The builder is the `builder` role in `template/roster.json`. Reviewers and debaters are its other roles. The owner decides what to build and owns every call a run can't settle.

## The route

| Stage | Who decides | Leaves behind | Run it with |
| --- | --- | --- | --- |
| 1. Decide it's worth building | Owner | A go or no-go, with what would change it | `debate` (optional) |
| 2. Start the repo | Owner | A repo with the playbook, pinned | `npm run new-product` |
| 3. Spec | Owner | `docs/SPEC.md`: outcome, checkable needs, rules, threat model, not-doing | `spec` |
| 4. Plan | Builder drafts, owner approves | `docs/PLAN.md`: design, state machines, slices | `plan-work`, then `cross-review` on the plan |
| 5. Build | Builder | Merged slices, each verified and reviewed | `build`, which calls `cross-review` |
| 6. Correct | Builder proposes, owner accepts | Checks that stop a class of mistake | `correct` |
| 7. Ship and learn | Owner | Real use, measured against the spec's outcome | the spec's outcome and "Running it" |

`critique-plan` runs between 4 and 5 only when the owner asks. `debate` can run at any stage, for a position worth challenging before it's approved.

## 1. Decide it's worth building

For a new product or a big bet, write the case as claims with evidence and debate it in two rounds. The owner decides. A no-go is a good outcome: it's the cheapest one.

The case answers eight questions, at the scale of the decision. Each answer is evidence, a labelled estimate, or "unknown" with the cheapest test that would settle it.

1. What are we trying to do, in plain words?
2. How is it done today, and what limits that?
3. What's new here, and why isn't reusing, buying or doing it by hand enough?
4. Who cares, and what changes for them if it works?
5. What are the risks, and what's the payoff?
6. What will it cost: money per use, compute, the owner's time?
7. How long will it take?
8. What would show, midway and at the end, that it's working?

A go can be for a bounded experiment instead of the whole build. The questions are the Heilmeier Catechism, as the Elephant-Goldfish Model uses it (`CREDITS.md`).

## 2. Start the repo

```bash
npm run new-product -- ~/projects/<name> --name "<Name>"
```

For a product where a model decides or acts, add `--kit agent`. The product gets the agent standards and a proven stack, and points to the kit's checks, add-on briefs and worked example (`kits/agent/README.md`). To start from an existing repo's code instead, add `--base <repo>`: the playbook is laid over it. The base keeps its own stack, standards and brand, and, if it already follows the playbook, its adapted `AGENTS.md`, `PROCESS.md` and `review.config.yaml`. Its example spec, status and plans move to `docs/base/` to read. `.process-version` pins the playbook. Upgrading it later is a deliberate brief, never automatic.

## 3. Spec

The owner's intent comes before any model approves anything. The `spec` skill asks in rounds only what the next step needs, each question with a separate recommendation, and settles empirical questions with a throwaway prototype instead of asking. The spec is done when every need is checkable and "Open decisions" is empty.

## 4. Plan

Grounded in the real code. Forks settled by probes. Slices that can each be verified on their own, slice 1 the thinnest end-to-end path in the real delivery environment. The plan gets the same bounded review as code: one reviewer, or two for high-stakes behavior, two rounds at most.

## 5. Build

One verified slice at a time. Tests at the cheapest stable boundary, criteria proven on the real thing, the one check command, a bounded review, then `STATUS.md` and a commit. The whole branch gets two reviewers at the end. The owner merges.

## The review contract

The full text is in `template/docs/REVIEW_PROTOCOL.md`. In short:

- A blocker is a current defect, an unmet acceptance criterion, or a breach of a hard constraint, and it carries evidence: a probe, or a code path from an entry point the spec or threat model covers.
- The builder runs the probe. The reviewer judges the raw output.
- A finding is confirmed, disproved or unconfirmed. A dangerous unconfirmed finding goes to the owner, never silently down.
- Two rounds. Then one diagnosis. Then one targeted check, or a one-page decision for the owner.
- The same rules for plans, documents and the review tooling itself.

## 6. Correct

When a review stalls at round 2, or the owner corrects the same thing twice, find the cause (often a requirement or missing context, not code) and add the cheapest prevention that will hold. Prove each new check fails on a real past mistake.

## 7. Ship and learn

Release in the real environment as early as slice 1 allows. Use it as the spec's outcome says: whose task is better, compared with the baseline. Then continue, change direction, or stop. What real use breaks comes back as a brief (stage 3) or a correction (stage 6).

## What each tool does

- **Claude Code** runs the builder, the skills and the scripts.
- **Codex CLI** and **Antigravity CLI** run the reviewer and debater roles, always through `scripts/ask.mjs`: read-only, after a secret scan, with the model and effort checked against the CLI's own log.
- **gitleaks** scans everything a reviewer sees.
- **The model-council plugin** stays useful for quick questions to the models it reaches. Reviews and debates go through `ask.mjs`, so a roster change is one edit.
