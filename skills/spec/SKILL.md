---
name: spec
description: Find out what the owner wants and write it down as docs/SPEC.md or a brief, in the owner's words, with an outcome, checkable needs, rules and a not-doing list. Use at the start of a product or capability, when the owner says grill me, spec this or write the brief, and before any plan.
---

# Spec

The spec is the owner's intent, written so every later step can be checked against it. Models can check a plan against a spec. Only the owner can say what the spec should be, so the owner's product decisions come first, before any model is asked to approve a plan.

## 1. Say it back

In your own words: who this is for, the problem it solves for them, what success looks like, and the smallest thing that would show it. The owner corrects it.

When the ask is broad ("everything X does"), make it deeper rather than bigger before going on: say what a top professional in the field would do here that wasn't asked for, the rawest material they'd start from, the methods they'd use, and what, other than you or the owner, would show the result is right. Offer that as a rewritten ask, leaving the owner's choices open.

## 2. Ask only what the next step needs

Ask in rounds. Each round asks the questions whose answers the next useful step (a prototype, the plan, the first slice) depends on, and no others.

```
**Q1. <title>.** <the question, the real options, and what each costs>
My recommendation: <the option, and why in one line>
```

- A question whose answer depends on another one still open waits for a later round.
- Keep the recommendation apart from the question, so the owner chooses rather than nods. "Take your recommendations on Q2 to Q5" is a fine answer.
- For a reversible implementation choice, state the default you'll use instead of asking.
- Facts are yours to find: read the code, the docs, the market, or ask the `researcher` role (`node ~/.master/scripts/ask.mjs researcher ...`). Keep asking the other questions while it runs.
- When a question is empirical (how a layout feels, how fast something runs, whether an approach works), don't ask it. Build the cheapest probe that settles it, as below, and say what result would change the decision.
- Stop when the next step is specified well enough to start. Product choices come back when evidence changes them.

The ground a first spec usually covers: the person, the outcome, the core loop, the first five minutes, the rules (data, money, permissions, safety, and who we protect against), where data lives and what costs money per use, and what is not being built.

## 3. Settle a fork by building it

For a question no document settles, a throwaway prototype is the answer. Name the decision it exists to make first: no decision, no prototype.

- A UI question: several variants of the screen behind one switcher, in plain HTML or the lightest stack that shows the idea, in a scratch folder or a clearly named prototype folder.
- A logic or timing question: the smallest script that shows the behavior, printing the state after each step.
- No tests, no polish, no persistence unless persistence is the question.
- Show the owner each variant (screenshots, or a link they can click) with your recommendation. The owner picks. A working demo is not proof users prefer it.

Keep the chosen prototype and the verdict: link both from the spec.

## 4. Name things

When a word is vague or used two ways, propose one name for each concept and ask the owner to pick. Use the owner's names everywhere after.

- Before settling a term, read the existing definitions and the code that touches it. Test an unclear relationship with a concrete edge case, show any contradiction between the definitions, the intended behavior and the code, and resolve it with the owner. Record each agreed definition at once. A meaning still unsettled goes under "Open decisions".

- Put a product's terms in the spec's "Words" section first.
- Once terms are reused across several documents, move them to `GLOSSARY.md` at the repo root, one entry each: `**Term**:` what it is in one or two sentences, then `_Avoid_:` the other words for it. Only this product's concepts, never implementation detail.
- When the owner turns down an option for a reason a future reader would need, offer an ADR (`docs/templates/ADR.md`), so nobody proposes it again.

## 5. Write it

Write `docs/SPEC.md` for the first build, or `docs/<NAME>.md` for a later piece of work, in the shape of `docs/templates/BRIEF.md`:

- **Outcome.** Whose task gets better, how it goes today (the baseline), the target, and the evidence that would mean continue, change direction, or stop.
- **What we need.** One checkable statement per bullet: something a test, a command's output or a page could show.
- **Rules.** What must hold whatever happens, including the threat model: who and what the product protects against, and what is out of scope.
- **What people see**, including the first five minutes.
- **Running it.** What must be true in real use: how it is installed or deployed, how a failure is noticed and diagnosed, and how data is restored or an update rolled back. Scale this to the product.
- **Not for now**, with reasons.
- **Words**, until there is a glossary.
- **Open decisions.** It must be empty before planning starts.

Use the owner's phrasing. No file paths, modules or libraries: they belong to the plan. No number without a source.

For an agent product, `~/.master/kits/agent/example/SPEC.md` shows how such a spec states its rules, and `~/.master/kits/agent/briefs/` holds briefs for the capabilities most of them need later.

## Done

Every "What we need" line is checkable and "Open decisions" is empty. Then, if the product's `docs/PROCESS.md` has "Before the spec is approved", run it and bring the owner the paraphrase and each difference with its outcome. Done when the owner has read the spec and said it says what they mean. Next: the `plan-work` skill.

Adapted from Matt Pocock's `grilling` and `domain-modeling` skills and pstack's prototype playbook and `sharpen` (MIT), the Elephant-Goldfish Model's comprehension reviewer (Apache-2.0), and the owner's earlier `idea-refine`. See `CREDITS.md` in master.
