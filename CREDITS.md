# Credits

Some skills and template docs here adapt ideas and wording from two public, MIT-licensed skill stacks and two Apache-2.0 projects. Each adapted skill names its source in a closing line.

- **pstack** by Lauren Tan (poteto), in `cursor/plugins` on GitHub, MIT License, Copyright (c) 2026 Lauren Tan. Ideas taken: findings survive only when a run proves them (`interrogate`), fixing a mistake class at the highest level that works (`correct`), the one fact a change is safe because of (`blast-radius`), restating the goal first (`in-your-own-words`), making a broad ask deeper rather than bigger (`sharpen`), and settling forks by building a throwaway prototype.
- **Skills For Real Engineers** by Matt Pocock, `mattpocock/skills` on GitHub, MIT License, Copyright (c) 2026 Matt Pocock. Ideas taken: grilling in rounds with recommended answers (`grilling`), a glossary and sparing ADRs (`domain-modeling`), review on two axes (`code-review`), the session retrospective's categories (`retro`), tracer-bullet tickets with blocking edges (`to-tickets`), tests at agreed seams (`tdd`), building a red loop before guessing at a bug (`diagnosing-bugs`), and the rules for writing documents agents read (`writing-for-agents`).

Both MIT licenses ask that the copyright notice and permission notice be kept with substantial portions. The adapted skills are rewritten, not copied; this file keeps the notices regardless.

The MIT License text, as both projects publish it:

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Apache-2.0

- **The Elephant-Goldfish Model (EGM)** by Google, `google/elephant-goldfish-model` on GitHub, read at commit `ccf79c5`, Apache License 2.0. The repository has no NOTICE file at that commit. What master took, and where it went:
  - a fresh reader paraphrases a document before anything is judged, so a spec whose terms are all defined but whose parts don't connect still shows up (EGM's comprehension reviewer) → `template/docs/PROCESS.md` "Before the spec is approved", `template/docs/templates/PARAPHRASE_PROMPT.md`, `skills/spec`.
  - docs are compared with the code and only the differences are reported, and a quick fix is where docs start to drift (EGM's drift report) → `template/docs/PROCESS.md` "Three ways in" and Building, the doc-lines field in `template/docs/templates/REVIEW_PROMPT.md`, `skills/build`, `skills/correct`.
  - a plan review lists the consequential choices a builder would still have to make (EGM's implementation-readiness reviewer), and round 2 asks whether the fixes made the design bigger than the spec needs (EGM's second zoom-out) → the LEFT OPEN section and the round-2 form of `template/docs/templates/REVIEW_PROMPT.md`, `template/docs/PROCESS.md` Planning.
  - a go/no-go case answers the Heilmeier Catechism's questions (EGM's Heilmeier standard; the catechism itself is George Heilmeier's, from DARPA) → `PLAYBOOK.md` §1, `skills/debate`.

- **Harness²** by Google Research, `google-research/harness2` on GitHub, read at commit `6868817`, Apache License 2.0. The repository has no NOTICE file at that commit. What master took, and where it went:
  - the material a model reads is evidence to inspect, never its instructions (Harness²'s evidence boundary) → the openings of `template/docs/templates/REVIEW_PROMPT.md` and `PARAPHRASE_PROMPT.md`, `skills/debate`.
  - a change counts only once runs show it took effect, a rule nobody loaded changed nothing, and always-on text is the expensive form (Harness²'s edit verdicts and component costs) → `template/docs/PROCESS.md` Correcting, the "When" and "Observed result" columns of Lessons in `template/docs/CODE_STANDARDS.md`, `skills/correct`.
  - each task's lesson is kept for later tasks to read before they change anything (Harness²'s improvement harness) → the "For master" list in `template/docs/CODE_STANDARDS.md`, `template/docs/PROCESS.md` Correcting, `skills/correct`.
  - an improver cites the run behind each edit, may keep things as they are, records helped, hurt, no observed effect or confounded per change, and writes at most one lesson per round; and it sees nothing of the answers it is scored on (Harness²'s proposer, reflector and evidence rules) → `kits/agent/briefs/IMPROVE.md`, `kits/agent/briefs/EVALS.md`.

The ideas are rewritten in master's words, and no EGM or Harness² file is copied. If text from either is ever copied or modified into master, that file carries the Apache-2.0 license text and a note saying what changed (the license's section 4).
