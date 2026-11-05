# A context layer the agent looks things up in

From <who asks, by role>.

<!-- A brief from master's agent kit. Copy it to docs/CONTEXT.md, put it in the owner's words and this product's names, then ask for a plan. -->

## Where we are

The agent reads what it needs from the backend, one record or section at a time, and knows nothing else about the business.

## What we need

- The business's reference files become a context layer of their own: an MCP server, separate from the backend, that the agent reads and never writes. It holds:
  - <the policies the agent applies>;
  - a glossary of the terms they define;
  - what each field of a <record> means;
  - the rules applied to every <record>;
  - facts from outside the business that bear on decisions.
- Every answer names the file it came from, with that file's owner and review date, and the <record>'s page lists everything the agent looked up, once each, grouped by file.
- The agent's lookups and its calls to the backend take one route, chosen when its run is built: straight to each service on a laptop, or through a gateway in production.

## Rules

- The context layer is read-only, and only its owners change its files.
- MCP tools are called only through one module, and each route is one module.
- The checks use the real context layer on a local port.

## Not for now

- Search by meaning (embeddings).

## Notes for the plan

FastMCP from the `mcp` package serves the tools, stateless with JSON responses. `MultiServerMCPClient` from `langchain-mcp-adapters` calls them.
