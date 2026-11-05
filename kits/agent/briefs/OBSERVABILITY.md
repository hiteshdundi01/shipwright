# Seeing what the agent did and what it cost

From <who asks, by role>.

<!-- A brief from master's agent kit. Copy it to docs/OBSERVABILITY.md, put it in the owner's words and this product's names, then ask for a plan. -->

## Where we are

Every step is recorded on its <record>, with each model reply's tokens, and its cost when the provider reports one.

## What we need

- Every run of the agent's graph traced in one place (Langfuse, a self-hosted equivalent, or an OpenTelemetry backend), in a session named after the <record> and its attempt.
- The cost of every model call, from the provider's report where there is one, or else from a price table kept in one module and dated.
- A page or a query that answers: what did runs cost this week, by model; which took longest; and which failed, and why.

## Rules

- Traces never hold a sign-in token, a key, or personal details such as an email address.
- Tracing is off in the checks, and the checks never reach the tracing service.
- The price table names the date its prices were checked, and the model ids it covers.

## Not for now

- Alerts and on-call.
- Dashboards beyond the one page or query above.
