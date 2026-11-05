# Contributing

Thanks for wanting to improve Shipwright. It's one person's process, opened up, so the bar for a change is real use: a mistake it prevents, or time it saves, in a product someone actually built.

## Before you start

- Read [`AGENTS.md`](AGENTS.md). It holds the rules for changing this repo, for people and coding agents alike.
- For anything bigger than a fix, open a [proposal](.github/ISSUE_TEMPLATE/proposal.md) first. Say what went wrong in real use and what a product would do differently afterwards.

## Making a change

1. Fork, and branch from `main`.
2. Make the change. Skills here are linked into every coding tool, and every product's playbook is copied from `template/`, so a change here changes how future work is done.
3. Run the one check, and fix what it reports:

   ```bash
   npm run check
   ```

   It needs Node 22+ and [gitleaks](https://github.com/gitleaks/gitleaks). There are no dependencies to install.
4. Open a pull request, and fill in what changes for a product.

## The rules `check` can't enforce

- **Skills say what to do, never which tool call to make.** They read the product's own docs for policy, instead of keeping a second copy of it.
- **One rule, one place.** The template's `docs/` are the source. A skill points to them.
- **Every step in a skill ends on a criterion an agent can check.** "Understand X" isn't one. "Name the three callers" is.
- **Scripts use Node built-ins only.** Every script change comes with a test that runs against a temporary folder, never your real home folder.
- **Credit adapted ideas** in [`CREDITS.md`](CREDITS.md) and in the skill's last line. Rewrite them in this repo's words, and copy no file.

## Policy changes

A change to the review contract ([`template/docs/REVIEW_PROTOCOL.md`](template/docs/REVIEW_PROTOCOL.md)) or to the roster's roles is policy. It's debated first with the `debate` skill, and the outcome is recorded in [`docs/debates/`](docs/debates/README.md). If you can't run a debate yourself, open the proposal and the maintainer will run one.

Swapping the model behind a role is not policy: it's an edit to [`template/roster.json`](template/roster.json), plus one review run showing that `ask.mjs` verifies the new model and effort.

## Testing the installer

`scripts/install.mjs` changes the skill folders of every coding tool you have. Try it with `--home` pointed at a temporary folder, or as a dry run (no `--apply`), before running it for real.

## Conduct

Be kind, be specific, and back claims with evidence: the same rules a review follows. See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
