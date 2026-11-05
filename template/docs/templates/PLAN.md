# Plan: <the spec's or brief's name>

<!-- Written by the builder from a spec or brief (docs/PROCESS.md, Planning). No code is written while planning. The plan may not weaken anything the spec requires; where it can't meet a line, it says so under "Choices and why" and the owner decides. -->

## What this builds

<Two or three sentences: what the work adds for whom, and what it leaves for later.>

## Design

### Modules

| Module | What it is for | Uses |
| --- | --- | --- |
| `<path>` | ... | ... |

<Check the design against docs/CODE_STANDARDS.md before writing the slices. Name the existing code each new part mirrors, with file:line.>

### State machines

<For anything that moves through states, a table. The code that owns the state refuses every move not listed.>

| From | Operation (caller) | To | Refused when |
| --- | --- | --- | --- |
| ... | ... | ... | ... |

### Choices and why

- <Each choice that isn't obvious, the alternative turned down, and why. Each fork a prototype or probe settled, with what it showed and where it lives.>

## Slices

<!-- Each slice is one independently verifiable change, usually a thin path through every layer that a user could see working. Slices run in order, in one stream, unless the plan names the shared contracts that make two of them independent. Slice 1 runs in the real delivery environment: the packaged app, the real deploy target, or one real-model run under the stated budget. -->

### Slice 1: <a verb phrase, the thinnest end-to-end path>

**Depends on:** nothing.

<What it builds, and why it comes first.>

- [ ] <A criterion checkable from outside: a test that passes, a command and its output, an API call and its response, a page in the browser>
- [ ] Runs in the real delivery environment: <how, and what it may spend>
- [ ] The one check command passes

### Slice 2: <...>

**Depends on:** <the slices that must land first>.

- [ ] ...

<Slices for running it come where they belong, not last: noticing a failure, the diagnostic it leaves, restoring data, rolling back an update.>

## Review

<Which slices touch high-stakes behavior (review.config.yaml) and so get two reviewers. The final whole-branch review is always two.>
