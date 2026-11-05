# Running on AWS

From <who asks, by role>.

<!-- A brief from master's agent kit. It builds on POSTGRES.md and SECURE.md. Copy it to docs/AWS.md, put it in the owner's words and this product's names, then ask for a plan. -->

## Where we are

Everything runs on a laptop: the backend and the agent as two apps on two ports. The agent's app speaks Amazon Bedrock AgentCore Runtime's contract: `POST /invocations` and `GET /ping`.

## What we need

- **The backend on AWS Lambda** behind a function URL, with the built UI served beside the API.
- **The agent on AgentCore Runtime.** The app's wrapper becomes `BedrockAgentCoreApp`, and the harness, the tools and the graph are unchanged. The backend reaches the agent through `invoke_agent_runtime` when a runtime is named, and over HTTP otherwise, both in the one module that asks the agent.
- **Secrets in AgentCore Identity:** the agent's key, the provider's key and the database's address, fetched on the agent's first request and never kept in a file.
- **Optionally, the agent's tools through an AgentCore Gateway,** whose policy refuses any action over a limit even if everything else fails.
- **A teardown** that removes every resource the deployment made, and a note of what it costs while it runs.

## Rules

- Each deployable imports with only its own dependency group (the `check:server` and `check:agent` checks), and its package is built from that group for Linux.
- Nothing is created or deleted on AWS unless a person asks for it.
- The checks never reach AWS. They use stand-ins for the runtime, the gateway and Identity.

## Not for now

- More than one region.
- Autoscaling beyond what Lambda and AgentCore Runtime give.
- Infrastructure for anything other than the backend, the agent and their secrets.
