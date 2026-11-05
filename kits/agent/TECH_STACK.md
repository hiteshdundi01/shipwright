# {{PRODUCT}}: tech stack

<!-- From master's agent kit: the stack the reference agent template proved end to end, as a starting point. Keep what fits, change what doesn't, and say why for each change. Versions are pinned in the manifests (pyproject.toml, package.json), not here: this file says why, the manifests say what. -->

## The parts

- **The backend:** FastAPI with SQLAlchemy Core, on SQLite at the file a setting names.
  - Queries use SQLAlchemy Core and no SQLite-only features, so moving to Postgres is a change of connection (the kit's `POSTGRES.md` brief).
  - It owns every record and every rule, and moves each record through the plan's state machine by conditional updates (`docs/AGENT_STANDARDS.md`, rule 3).
  - Every route but health and sign-in has one gate, from one dependencies module: the agent's key, a signed-in person, a person with a role, or either the agent or a person for shared reads.
  - **Sign-in:** argon2 password hashes (`pwdlib`) and short-lived HS256 tokens (PyJWT), from one auth module. Moving to an OIDC provider changes that module's inside and nothing else.
  - **Asking the agent:** one module posts one JSON payload per operation to the agent's `/invocations`, with three outcomes (rule 13).
- **The agent:** a LangGraph agent, served by its own FastAPI app.
  - **The graph:** a hand-written `StateGraph` with the model, a `ToolNode` whose `wrap_tool_call` records each step and hands the backend's refusals back to the model, and a node that pauses with `interrupt()` for a person. Transport errors only are retried, by `RetryPolicy`.
  - **Checkpoints:** `SqliteSaver` with `durability="sync"`, threads named `<generation>:<record id>:<attempt>` (rule 16).
  - **Models:** LangChain's `init_chat_model` from a `provider:model` setting. Tokens come from each reply's `usage_metadata`.
  - **The app:** `POST /invocations` and `GET /ping`, payloads read as a Pydantic discriminated union, answering `{"accepted": true}` at once or `{"refused": "..."}`. This is the shape of Amazon Bedrock AgentCore Runtime's contract, so the kit's `AWS.md` brief can swap the wrapper and leave the harness alone.
- **The UI:** React, Vite and TypeScript, with React Router. In development, Vite sends `/api` to the backend. In production, the backend serves the built UI.
- **The browser tests:** Playwright, with their own backend on a database of their own, the UI, and a stand-in for the agent, all on ports of their own.

## Models

The provider is a setting. The agent's dependency group ships the provider packages the product uses, for example `langchain-anthropic` for `anthropic:<model>`, and `langchain-openai` for `openai:<model>` and any endpoint that speaks OpenAI's API (through `OPENAI_BASE_URL`). Adding a provider is adding its LangChain package to the agent's group, setting the model and key, and running `check:agent`.

## Python and Node

- **Python:** 3.13 with uv, all in one `pyproject.toml`. Each deployable has a dependency group (`server`, `agent`), plus `dev`. `check:server` and `check:agent` prove each imports with its group alone.
- **Node:** 22 or later, for the UI and the tools: Vite, Vitest, ESLint, Prettier, Playwright, pyright and lefthook.
- **The checks:** ruff, pyright and pytest (80% coverage) for Python; Prettier, ESLint, tsc and Vitest (80%) for TypeScript; Playwright for the browser. All of them run from one command, as `~/.master/kits/agent/checks/README.md` shows.

## Settings

`.env`, never in git, holds the model setting and the provider's key, the agent's key (shared by the backend and the agent), the secret that signs people's tokens, and the local addresses and database files. `.env.example` lists them all, with no values.

## Turned down

- **Postgres from day one.** SQLite needs nothing installed and keeps the checks fast. The queries stay portable for later.
- **An identity provider from day one.** Local sign-in has no outside dependency. The kit's `SECURE.md` brief swaps it before real users.
- **A cloud agent runtime from day one.** The local app already speaks AgentCore's contract, so the move is a wrapper.
- **A framework that hides the graph.** A hand-written `StateGraph` keeps every pause, retry and record in plain sight, where code, not the model, guarantees what must happen.
