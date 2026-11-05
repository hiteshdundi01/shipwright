# Review protocol

The checks show the code works. A review asks whether the change is fit to merge: does it do what the spec and plan say, and does it break anything. Reviews are bounded. They end in a merge, a fix, or a decision for the owner, never in another open round.

Roles come from `roster.json`. This file never names a model. The builder never reviews its own work.

## 1. What governs

Owner-approved intent governs, in this order: `docs/SPEC.md` (or the brief), then the approved plan, then `docs/CODE_STANDARDS.md`, then the code. A plan or a fix never weakens a spec line to get a pass. When a spec line can't be met, that is a decision for the owner.

## 2. How deep

Depth follows impact, reachability and reversibility. Paths are the conservative default, not the whole test.

- **Routine change:** one reviewer, `reviewer_a`. If `reviewer_a` authored any part of the change (delegated code, fixtures), `reviewer_b` reviews instead.
- **High-stakes change:** `reviewer_a` and `reviewer_b`, independently. Neither sees the other's report until both are in. A change is high-stakes when it touches a path under `review.config.yaml → high_stakes`, or when it alters that behavior from elsewhere: a shared dependency, a config value, a test, a fixture or a threshold of it. A small diff is not a reason to downgrade. A downgrade needs evidence, checked by a reviewer, that the high-stakes behavior is unaffected.
- **Whole branch, before merge:** both reviewers, always. It looks at how the slices compose: shared invariants, migrations, release and install behavior.
- **A plan:** one reviewer, or both when the plan covers high-stakes behavior. Only once the owner has settled the product decisions the plan depends on. A plan blocker can be a demonstrated contradiction with the spec, or a spec requirement the plan doesn't cover.

A blast-radius probe (what else could this break, proven by a script) informs a review. It never replaces one.

## 3. What blocks

A blocker is exactly one of:

1. **A current defect.** The trigger, the expected behavior, the actual behavior or the reachable failure path, and the consequence.
2. **An unmet acceptance criterion.** The spec or plan line, quoted, and what the change does instead.
3. **A breach of a hard constraint.** A rule marked hard in `docs/CODE_STANDARDS.md` that applies to this change.

Every blocker carries evidence. The strongest is a probe: a command the builder can run on the reviewed tree, with the output the spec requires. A code-path argument counts when it starts from an entry point the spec or the threat model covers and names the input that reaches the failure. For security and privacy, the spec's threat model sets the boundary. A dangerous finding outside it neither blocks nor is dropped: it goes to the owner as a decision on whether to widen the threat model, and a ruling covers the whole class of finding, not one case.

Everything else is a note: preferences, naming, structure, possible future needs, and risks that would take a future change to matter. Notes are recorded. Acting on them is optional, and a note never needs unrelated cleanup to land.

## 4. Confirming findings

The reviewer proposes the probe. The builder runs it on the reviewed tree and returns the command, the environment and the raw output to the same reviewer in round 2. The reviewer judges the result, not the builder.

Each finding ends in one of three states:

- **Confirmed:** the probe shows the failure, or the contradiction is shown.
- **Disproved:** the probe passes and the reviewer agrees it exercises the claim.
- **Unconfirmed:** the probe couldn't run, or the result doesn't settle it. An unconfirmed finding that could lose data, leak private data, break a security rule inside the threat model, or move money gets one bounded attempt to build a probe, then goes to the owner. Any other unconfirmed finding becomes a note. Neither is dropped silently.

## 5. Rounds

- **Round 1** reviews the agreed scope in full, in a fresh session.
- **Round 2** resumes the same session. It checks round 1's blockers, the probe results, and what the fixes changed. A closed finding reopens only with new evidence. A new defect can still be reported, at the blocker bar.
- **After round 2**, if a blocker is still open, diagnose it once: an implementation defect, an ambiguous requirement, inadequate evidence, or a reviewer error. If a fix is agreed, one targeted check of that blocker alone. Otherwise write `docs/templates/DECISION.md` for the owner and stop.
- Two reviewers asking for things that can't both be done is a decision for the owner, not a third round.
- Finding ids stay the same across rounds. The round budget does not reset when a unit is renamed or split, or after a correction step.

The same rounds apply to plans, documents and the review tooling itself. There is no "until both pass".

## 6. What a reviewer gets

Built from `docs/templates/REVIEW_PROMPT.md` and sent through `node ~/.master/scripts/ask.mjs`, which runs the reviewer read-only and scans for secrets first:

- the spec lines and the plan slice the change answers;
- the standards that apply: the hard constraints, and the advisory rules and lessons, for a separate standards pass whose findings are notes;
- the threat model;
- the diff and the full touched files, or a read-only copy of the tree;
- the check output.

Never anything under `review.config.yaml → exclude_paths`: secrets, real personal data, sealed evaluation answers. Excluded changes appear by path only.

## 7. Record

One line per unit in the review log in `docs/STATUS.md`: the unit, when it was opened (the first review call) and closed (pass, or the decision page), each reviewer's role, model and session, the verdict per round, each confirmed blocker and the commit that fixed it, and the notes kept. Opened and closed are date and time, `YYYY-MM-DD HH:MM`, so review and rework time can be measured. Raw prompts and answers go in `review/`, which git ignores.

## 8. Production tier

Switch to it before real users, other people's data, or an environment others can reach (`review.config.yaml → tier`). It adds enforced isolation of the reviewer, the CLI's own evidence of the model and effort, records bound to the reviewed tree, and a commit hook that checks them. The tooling that does this is proven with negative tests and one bounded review through a route already trusted (a hand-run review through `ask.mjs`). It never has to pass its own review to become usable. The owner accepts what it can't guard against, in writing.

## 9. Changing reviewers

Swapping a model or its effort is a change to `roster.json`, plus one run that shows the CLI's log records the new model and effort. Changing how many reviewers there are, who must pass, or what they may block is a change to this file, decided by the owner.
