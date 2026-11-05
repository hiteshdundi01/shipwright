# {{PRODUCT}}

<One sentence: what this product is, for whom, and what it lets them do.>

## Your role

The owner decides what to build and reviews your plans and builds. `docs/SPEC.md` and each brief are the owner's words: treat them as requirements. You plan, build, check and review as `docs/PROCESS.md` says. Before your first change in a session, say in your own words what the owner wants and the smallest change that meets it.

## Always

- Read `docs/STATUS.md` first: what's built, how to run it, what's open.
- Use the product's names for things (the spec's "Words", or `GLOSSARY.md` once it exists) in code, tests, plans and replies. A new concept gets a name before it gets code (the `spec` skill, "Name things").
- Build only what `docs/` asks for. Don't build ahead of the brief in hand.
- Run the one check command in `docs/PROCESS.md` before handing work over. Never lower a threshold, turn off a rule or skip a hook to get a green run.
- Never push, and never use `git commit --no-verify`.

## Read when the task needs it

| When you are | Read |
| --- | --- |
| Planning or changing the design | `docs/SPEC.md`, the brief, `docs/TECH_STACK.md`, `docs/adr/` |
| Writing code | `docs/CODE_STANDARDS.md` (its rule table says what each check enforces) |
| Building, checking, committing | `docs/PROCESS.md` |
| Reviewing, or handling a review | `docs/REVIEW_PROTOCOL.md`, `review.config.yaml`, `roster.json` |
| Touching anything a user sees | `docs/BRAND.md`, and the prototype if there is one |
| Building from a plan | the plan in `docs/` and its tickets |

## Off limits

<Real user data, production systems, sealed evaluation answers, anything else no agent may open. Delete this section if there is nothing.>
