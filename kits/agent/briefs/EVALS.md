# Checking the agent against our own decisions

From <who asks, by role>.

<!-- A brief from master's agent kit. Copy it to docs/EVALS.md, put it in the owner's words and this product's names, then ask for a plan. -->

## Where we are

The agent decides <records>, but nothing measures how often it decides as our best people would.

## What we need

- Two labeled sets of <records>, each with our people's decision and reason for every one: an evaluation set, to learn from, and a held-out set, which only scores changes.
- An evaluation works copies of one set through the same agent, whole or as a small subset of five. The copies never show in the product's own lists, nobody can act on them, and anything paused for a person counts as finished.
- Each evaluation is scored with our measures:
  - how often the decision matches ours;
  - how often the details match too (<amounts within a tolerance, fields exactly>);
  - the cost of each kind of mistake, in the owner's own units (<a wrongful no at X, a wrongful yes at Y, a needless escalation at Z>);
  - the share decided without a person;
  - the model cost and time for each <record>, and for the whole run.
- A judge model grades each explanation against our reason, A to F.
- A scoreboard lists the evaluations, newest first, each opening to its <records> beside our decisions, with the misses easy to spot.

## Rules

- The agent never sees the labeled decisions. Only the scoring reads them.
- Nothing a person or the agent can call returns the held-out set's decisions.
- Any model that reads evaluation results, such as an improver (`IMPROVE.md`), reads them inside one boundary. For the evaluation set: each <record>, the agent's run and decision, and each measure's score, but never our reasons. For the held-out set: totals per measure only, never a <record>. Histories and lessons a model reads later fall under the same boundary. A test builds each such model's input and checks it against this rule.
- The checks never call the judge. They use a stand-in.

## Not for now

- Evaluations on a schedule.
- Two models side by side in one run.

## Notes for the plan

Keep the answer keys in `data/evals/` and list that folder under `review.config.yaml → exclude_paths`, so no review prompt ever carries them. Add a line to `AGENTS.md`'s off-limits section: a coding agent doesn't open `data/evals/` unless asked to.
