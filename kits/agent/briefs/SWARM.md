# Working the queue on its own

From <who asks, by role>.

<!-- A brief from master's agent kit. Copy it to docs/SWARM.md, put it in the owner's words and this product's names, then ask for a plan. -->

## Where we are

A person starts the agent on one <record> at a time. Each <record> is a graph of its own with its progress saved, and the backend owns every <record>'s state.

## What we need

- A person starts a dispatch, choosing how many <records> are worked at once (1 to <N>). A dispatch works every waiting, failed and stalled <record>, oldest first.
- Code chooses the <records> and keeps track of the dispatch, with no model. Each <record> gets an agent of its own, from a clean start, which reports back in one line: what it decided, or what went wrong.
- The backend keeps one dispatch going at a time. Asking for a second says what is going.
- One bad <record> never stops a dispatch. A rate limit or a timeout waits and carries on as the same attempt. Any other error is tried once more from the start. A <record> that fails twice is left for a person.
- While a dispatch works, it tells the backend every minute that it is still going. A dispatch not heard from for five minutes counts as stopped, and the next one can start.
- The summary at the end is built from the backend's records, with no model writing it: how many ended in each state, and which were left for a person.
- The tokens, cost and time of every <record> are recorded with the dispatch.

## Rules

- No <record> is ever decided, or its side effect made, twice, even when a dispatch is stopped and started again.
- Everything in the plan's state machine still holds for each <record> in a dispatch.

## What people see

- Start a dispatch, with how many at once, and the latest dispatch with each <record>, where it stands, and its cost and time.
- The summary when it ends.

## Not for now

- Scheduled dispatches.
- Priorities among <records>.

## Notes for the plan

LangGraph's `Send` with `max_concurrency` fans the <records> out, and a `RetryPolicy` on the node that works one handles rate limits and timeouts. A one-row `locks` table, updated as a start's first write, keeps one dispatch going at a time.
