# The agent remembering each <subject>

From <who asks, by role>.

<!-- A brief from master's agent kit. Copy it to docs/MEMORY.md, put it in the owner's words and this product's names, then ask for a plan. -->

## Where we are

The agent reads a <subject>'s history from the backend, but keeps no notes of its own.

## What we need

- When the agent's work on a <record> ends with a decision it recorded, the <record> and the decision are saved to that <subject>'s memory. Outsiders' own words and evidence are never saved.
- On a later <record>, the agent can search what it remembers about that <subject>.
- Each <subject>'s memories are used only for that <subject>'s <records>.

## Rules

- The backend's records still count for anything the rules depend on. Memory is the agent's notes, not the system of record.
- Nothing is saved for a <record> the security check sent to a person (SECURE.md), and evaluations use no memory.
- The memory is reached through one module, the one place with its settings and its namespaces (`("<subjects>", <subject id>)`).

## Not for now

- People reading or editing what the agent remembers.
- Memory of anything but <subjects>.

## Notes for the plan

A LangGraph store passed at compile gives the graph its memory: an in-memory store in the checks, and a hosted one in production. A `remember` node, run in code after a decision, saves it. The model doesn't decide whether to.
