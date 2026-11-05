# Code standards

<!-- Starter rules for {{PRODUCT}}. Keep the ones that fit, rewrite the rest for the stack, and add the product's own. A rule marked HARD can block a review (docs/REVIEW_PROTOCOL.md §3); every other rule is guidance a reviewer may note. -->

## General

1. Keep it simple. Don't build for a need the spec doesn't state.
2. Comments only when the code can't say it: why, not what.
3. Handle an error only where there is something useful to do with it. No defensive code for states that can't happen.
4. Code you add or change follows these standards. Don't clean up unrelated code in the same change, even in the same file: note it in the review log instead.

## Structure

5. **One way to do each thing.** Each outside service is reached through one module, which holds its address and settings. Nothing else reaches it.
6. **Each module has one job, and its name says what it is.** A helper two modules need goes in a module of its own. No circular imports.
7. **Name a shared literal once,** in the module that owns it.
8. **Use the framework's own way** before writing your own. Check the documentation for the installed version.
9. **Make illegal states unrepresentable.** Parse outside data at the boundary into types the rest of the code can trust.
10. **The code enforces every business rule** in the spec, whatever a model, a user or a client does. A prompt is never the only guard.

## Tests

11. Tests check what a user or caller can observe, so they fail when that behavior breaks and keep passing when only the internals change.
12. Expected values come from the spec, a worked example or a known-good literal, never recomputed the way the code does.
13. No real model, network or outside service in the checks. Use the stand-ins.

## Lessons

Every mistake the owner has corrected, so a repeat is visible. A lesson is guidance a reviewer may note. It becomes a hard constraint only when the owner marks it so, in the table below.

"When" names the kind of situation, so the lesson fires on a different case: not "the invoice export", but "any export another system imports". "Observed result" is what happened the last time that situation came up (`docs/PROCESS.md`, Correcting): "not yet observed" until it does.

| Lesson | When | From (the correction, with its date) | Prevention | Observed result |
| --- | --- | --- | --- | --- |
| <what to do instead> | <the kind of situation> | <the owner's correction> | <a check, a pointer, a written rule, or "nothing yet"> | <not yet observed / followed / caught by the guard / escaped, with the run or commit> |

## Hard constraints and what enforces them

The rules a review may block on. Mechanical ones get a check whose error names the fix; a rule that needs judgment says why it can't be checked. The `correct` skill adds rows. Drop a row once its mistake can't happen.

| Rule | HARD because | Enforced by | Added after |
| --- | --- | --- | --- |
| <e.g. the UI reaches the backend only through `src/api.ts`> | <what broke, or what it protects> | <lint rule, test, type, or "review only: needs judgment"> | <the mistake or review that caused it> |

## For master

Mistakes whose cause is master's own text: a doc this product copied from the template, or a skill (`docs/PROCESS.md`, Correcting). Each is fixed here first. Master decides separately whether it changes.

- <the kind of situation> · process `<.process-version commit>` · `<master file>`: "<the passage>" · <what went wrong> · local fix: <commit or doc line>
