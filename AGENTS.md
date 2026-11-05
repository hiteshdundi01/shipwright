# master

This repo holds the owner's way of building products: `PLAYBOOK.md`, the product template in `template/`, the skills in `skills/`, and the scripts in `scripts/`. Skills here are linked into every coding tool, and every product's playbook is copied from `template/`. So a change here changes how future work is done. Make each change deliberately, and say what it changes for a product.

## Rules

- `npm run check` must pass before every commit. It runs `scripts/check.mjs` (this repo's own rules) and the scripts' tests.
- Skills and template docs name roles from `template/roster.json`, never models. `check` enforces it.
- Skills say what to do, never which tool call to make. They read the product's own docs for policy instead of keeping a second copy of it.
- Keep each rule in one place. The template's `docs/` are the source. A skill points to them.
- Scripts use Node built-ins only. Every script change comes with a test that runs against a temporary folder, never the real home folder.
- Never run `install.mjs --apply` or `--retire` without the owner's go-ahead. It changes every coding tool's skills.
- A change to the review contract (`template/docs/REVIEW_PROTOCOL.md`) or to the roster's roles is policy. Debate it first (`skills/debate`) and record the outcome in `docs/debates/`.
- Credit adapted ideas in `CREDITS.md` and in the skill's last line.

## Writing a skill or an agent doc

- Every step ends on a completion criterion an agent can check. "Understand X" is not one; "name the three callers" is.
- Say what to do, not what to avoid. A prohibition earns its place only as a hard guardrail, next to the behavior wanted instead.
- Delete a sentence the model already obeys by default. When unsure, run the skill without it and compare.
- Point to reference instead of inlining it. Inline only what every branch of the skill needs.

## Where things are

- How the process works: `PLAYBOOK.md`
- Why it's this way: the design principles in `README.md`, and `docs/debates/` for each policy decision since
- What each script does: its usage text (`node scripts/<name>.mjs --help`)
