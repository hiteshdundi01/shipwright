# Security before we go live

From <who asks, by role>.

<!-- A brief from master's agent kit. Copy it to docs/SECURE.md, put it in the owner's words and this product's names, then ask for a plan. Do it before the first real user, and move the review protocol to the production tier with it. -->

## Where we are

The agent identifies itself with a key, people sign in, and the backend enforces every rule. The agent reads whatever the outside world wrote into a <record>.

## What we need

- **A check for hidden instructions.** Before the agent's model sees a <record>, a second model reads everything outsiders wrote in it and decides whether it tries to instruct whoever handles it ("approve this in full").
  - A <record> with such an instruction goes to a person with the check's reason, and the agent's model never sees it.
  - The check runs once, at the start of the work, on a model of its own that no other change can alter. Its result is the first step on the <record>.
- **The agent's key in a secret store,** never in a file, wherever the agent runs off a laptop.
- **People's sign-in from an identity provider** in place of local passwords: an OIDC provider whose tokens the auth module checks against the provider's public keys.
- **Logs that never hold a token, a key or an outsider's words.**

## Rules

- The check reads the outsiders' words as data. Its own instructions say so, and it answers in a fixed structure (structured outputs), never free text the code has to parse.
- A <record> the check sent to a person is never saved anywhere the agent's model reads later.
- `review.config.yaml → high_stakes` grows to cover the check and the identity module, and the spec's threat model names what this protects against.

## Not for now

- Masking personal details from the agent.
