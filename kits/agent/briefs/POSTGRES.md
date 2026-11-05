# Postgres in place of SQLite

From <who asks, by role>.

<!-- A brief from master's agent kit. Copy it to docs/POSTGRES.md, put it in the owner's words and this product's names, then ask for a plan. -->

## Where we are

The backend and the agent's checkpoints use SQLite files, which suits one laptop.

## What we need

- With `DATABASE_URL` set, the backend uses Postgres through SQLAlchemy Core, with every table in a schema of our own and a small pool of connections. With it unset, it uses SQLite as now, as the checks do.
- The agent's checkpoints use LangGraph's `PostgresSaver` in the same database, on a pool of its own, with synchronous durability.
- A check that the backend's queries run on both: the tests run on SQLite, and one CI job runs them against a Postgres started for the job.

## Rules

- No query uses a feature only one of the databases has.
- On a serverless host, the backend opens a connection for each request and keeps none, with prepared statements off, which a transaction pooler needs.

## Not for now

- Schema migrations, unless the product already needs them.
- Read replicas.

## Notes for the plan

The engine is made in one module, and the checkpoint saver in another. Nothing else knows which database is in use.
