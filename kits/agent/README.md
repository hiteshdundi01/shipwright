# The agent kit

What master knows about building agent products: a backend that owns the rules, an agent that acts only through it, and a UI for people. It was distilled from the reference agent template and the products built from it. It holds the know-how and the checks, not an app: the products that started from the template kept its wiring patterns and deleted its example code, so the patterns are what's kept here.

Use it for any product where a model decides or acts.

## Start a product with it

```bash
npm run new-product -- ~/projects/<name> --name "<Name>" --kit agent
```

On top of the playbook, the product gets:

- `docs/AGENT_STANDARDS.md`: the agent rules. The product's `docs/CODE_STANDARDS.md` points to it, so its HARD rules can block a review like any hard rule.
- `docs/TECH_STACK.md`: the stack the reference template proved, as a starting point, unless the product already has its own.
- A line in `AGENTS.md` routing agent work to the standards, and `kit: agent` in `.process-version`.

## What stays here, to use when needed

| Path | What it is | When |
| --- | --- | --- |
| [`checks/`](checks/README.md) | The API-schema rules, the import-boundary test, the stub model, the commit hook, the CI workflow, and the one check command | Slice 1 adopts them |
| [`briefs/`](briefs/SWARM.md) | Ten capability briefs: working a queue, evals, self-improvement with approval, security, a context layer, memory, a copilot, observability, Postgres, AWS | When the product needs one: copy it to `docs/<NAME>.md` and put it in the owner's words |
| [`example/`](example/SPEC.md) | The refund desk's spec and plan: the worked example of an agent product's spec, state machine, agent execution and instructions as goals | While writing a spec or a plan |

## The briefs, and what each adds

| Brief | Adds |
| --- | --- |
| [`SWARM.md`](briefs/SWARM.md) | Many records worked at once by a dispatcher with no model |
| [`EVALS.md`](briefs/EVALS.md) | Labeled sets, a held-out set, scoring in the owner's units, and a judge |
| [`IMPROVE.md`](briefs/IMPROVE.md) | Versioned configuration and an improver a person approves, kept or rolled back by a rule |
| [`SECURE.md`](briefs/SECURE.md) | A check for hidden instructions, secrets in a store, an identity provider, clean logs |
| [`CONTEXT.md`](briefs/CONTEXT.md) | A read-only MCP context layer, with every answer traced to its file |
| [`MEMORY.md`](briefs/MEMORY.md) | The agent's notes per subject, saved by code after a decision |
| [`COPILOT.md`](briefs/COPILOT.md) | A chat that works as the signed-in person, with a card before every side effect |
| [`OBSERVABILITY.md`](briefs/OBSERVABILITY.md) | Tracing and cost per run |
| [`POSTGRES.md`](briefs/POSTGRES.md) | Postgres in place of SQLite |
| [`AWS.md`](briefs/AWS.md) | The backend on Lambda and the agent on AgentCore Runtime |

## Starting from existing code

`new-product --base <repo>` starts a product from an existing agent repo's code: the repo keeps its own stack, and the playbook is laid over it (`PLAYBOOK.md` §2).
