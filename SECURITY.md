# Security

Shipwright sends code to the model CLIs you configure, so its safeguards matter: the gitleaks scan before every call, the read-only sandbox, the symlink check, the verification of the CLI's log, and `exclude_paths`.

## Reporting a vulnerability

Report it privately through [GitHub's security advisories](https://github.com/hiteshdundi01/shipwright/security/advisories/new). Don't open a public issue. Include the command, what it sent or could reach, and a way to reproduce it.

You can expect a first reply within a week. Fixes go to `main`; there are no release branches.

## In scope

- `scripts/ask.mjs` sending something it should refuse: a secret-looking string, a path under `exclude_paths`, or a file reached through a symlink outside `--dir`.
- `ask.mjs` counting an answer whose CLI log shows another model, another effort, or a sandbox that isn't read-only.
- `scripts/install.mjs` or `scripts/new-product.mjs` writing outside the folders their `--help` names, or copying `.env` or ignored files into a product.

## Out of scope

- The model CLIs themselves (Codex, Antigravity, Claude Code), and what their providers do with a prompt. Report those to their vendors.
- Secrets gitleaks's rules don't detect. The scan is a best-effort layer, not a guarantee: keep secrets out of the folders you review.
