# The agent kit's checks

Slice 1 of an agent product adopts these, so every later slice is checked from the start. Each file says where it goes. Copy it, then adjust names to the product's parts. After that, the product owns its copy.

| File | What it enforces | Where it goes |
| --- | --- | --- |
| `api_rules.py` | Every operation has an id and a one-line description; no `agent` operation takes an optional input (rules 6, 7) | the repo root, called from a backend test |
| `test_boundaries.py` | The agent's modules import only what they may; only the connection makes an HTTP client; nothing imports the app; the agent never imports the backend (rule 9) | the agent's tests |
| `stub_model.py` | No check calls a real model, and a test can see every prompt (rule 23) | the agent's tests |
| `lefthook.yml` | Formats the staged files and checks the part that changed, before each commit | the repo root |
| `check.yml` | The one check command on Ubuntu, macOS and Windows, with no secrets | `.github/workflows/` |

## The one check command

`package.json` scripts, for a Python backend and agent with a TypeScript UI. Rename the parts to match the product.

```json
{
  "prepare": "lefthook install && playwright install chromium",
  "check": "concurrently -g \"npm:check:*\" && npm run e2e",
  "check:python": "uv run ruff format --check && uv run ruff check && pyright --threads && uv run pytest -q -n auto --dist worksteal",
  "check:server": "uv run --isolated --only-group server python -c \"import backend.main\"",
  "check:agent": "uv run --isolated --only-group agent python -c \"import agent.entrypoint\"",
  "check:ts": "prettier --check -u app e2e scripts *.config.* && eslint app e2e scripts *.config.js *.config.ts && tsc && vitest run --root app --coverage",
  "e2e": "playwright test"
}
```

- `check` runs every check at once, each one's output shown in one piece, then the browser tests on their own.
- `check:server` and `check:agent` import each deployable with only its own dependency group installed (rule 25).
- Coverage floors are set in the tools' own config (`pyproject.toml`, `vitest.config.ts`), not on the command line, so one place holds them.

## The stand-in agent

The browser tests need an agent that behaves like the real one without a model (rule 24). Write it in the product, since it plays the product's own decisions: a small HTTP app that answers the agent's contract (for example `POST /invocations` with `{"accepted": true}`), then calls the backend's API with the agent's key to play a scripted decision. Start it from the browser tests' setup, on a port of its own, next to a backend on a database of its own.
