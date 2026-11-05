# A copilot for the people who use it

From <who asks, by role>.

<!-- A brief from master's agent kit. Copy it to docs/COPILOT.md, put it in the owner's words and this product's names, then ask for a plan. -->

## Where we are

People use the product's pages to find <records>, start the agent and answer what waits for them.

## What we need

- A chat in a sidebar on every page. A person asks in plain English, and it answers and does the work for them.
- It works as the person who asked, with their own sign-in, so it can see and do exactly what they can. It never uses the agent's key, and it can't do anything the person couldn't.
- It looks things up in the records, starts the agent on a <record>, and answers what waits for the person.
- For anything with a side effect that matters, it shows a card with what will happen, from the records. Nothing happens until the person presses the card's button.
- Each step it takes shows as a card as it happens. Conversations are kept, each its person's alone.

## Rules

- What must always happen is code: the check of the sign-in, the pause before a side effect, and the answer after a Cancel.
- A confirmation is bound to the card that was shown. An answer from an old tab, or for a <record> that has changed since, counts as a Cancel.
- Tool calls run one at a time.

## Not for now

- Streaming answers word by word.
- Sharing, renaming or deleting conversations.

## Notes for the plan

The copilot is an agent of its own, beside the main agent. It shares only the modules both need, and `test_boundaries.py` checks that. It is a hand-written `StateGraph`: the model, a `ToolNode`, a node that checks the action in code, and a node of its own for the `interrupt()`.
