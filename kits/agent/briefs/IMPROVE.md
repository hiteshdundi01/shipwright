# The agent improving itself, with a person's approval

From <who asks, by role>.

<!-- A brief from master's agent kit. It builds on EVALS.md. Copy it to docs/IMPROVE.md, put it in the owner's words and this product's names, then ask for a plan. -->

## Where we are

Evaluations score the agent against our own decisions. The agent's instructions and model are fixed in code.

## What we need

- The agent's instructions, model and reasoning effort make up one configuration, kept in versions. Each version records what changed from the one before, why, who proposed and approved it, and its held-out scores. Once its verdict is in, it also records what was seen for each change: helped, hurt, no observed effect, or confounded when its changes can't be told apart or a single run is all that supports it. A rolled-back version keeps its record.
- A second agent, the improver, works in rounds a person starts:
  1. The round makes sure the current version has one evaluation on the evaluation set and two on the held-out set.
  2. The improver reads the results, and the earlier versions' records and lessons that bear on them. It proposes a new version, or no change, then waits for a person to approve or reject it. Each change cites the evaluation <records> and the point in their runs that motivated it. A version tests one idea where it can, and says which of its changes are to the instructions and which to the model or effort. No change is a valid proposal, and it may say the fix needs a tool or graph change, which becomes a brief for the product, not a version. When runs that disagree could change its proposal, the improver may ask for one more evaluation of a fixed subset of five from the evaluation set, inside the round's spending limit. A rejection's reason goes back to the improver, which may propose again.
  3. An approved version is evaluated once on the evaluation set and twice on the held-out set.
  4. Our rule keeps the version or rolls it back. It must meet our objectives on the held-out set, improve at least one measure by more than its noise, and make none worse by more than its tolerance.
  5. The improver records what was seen for each change, and at most one lesson for later rounds: the kind of situation it applies to, what to change, and the evidence. Or none, when the round showed nothing that would carry over. A kept version alone doesn't show that each of its changes helped.
- Each round has a spending limit covering the improver, its evaluations and the judge. Once it's spent, no new run starts in the round.

## Rules

- The improver can't change the objectives, the noise and tolerance, the spending limit, the models allowed, the labeled sets or the judge.
- Nothing it proposes takes effect until a person approves it.
- It reads only what `EVALS.md`'s boundary allows: never our reasons, and never a held-out <record>.
- One round is open at a time, and a person can stop it. A round stopped before its verdict leaves the current version as it was.

## What people see

- The versions, each with its diff from the one before, and what was seen for each change.
- The lessons the improver has kept, each with the round it came from.
- Where a round has got to, and a proposal waiting, with its change as a diff.
- The verdict and why, and the round's cost.

## Not for now

- The improver changing the agent's tools or graph: it changes only the configuration.
- Rounds on a schedule.

## Notes for the plan

The improver is LangChain's `create_agent` with `HumanInTheLoopMiddleware` for the approval and `ModelCallLimitMiddleware` for its calls. The keep-or-roll-back rule is code in the backend, never the improver's call.
