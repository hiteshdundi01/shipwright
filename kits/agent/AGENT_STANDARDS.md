# Agent standards for {{PRODUCT}}

<!-- From master's agent kit (kits/agent/). These rules are part of docs/CODE_STANDARDS.md: a rule marked HARD can block a review (docs/REVIEW_PROTOCOL.md §3). They come from building and recovering real agent products. Adapt them where docs/TECH_STACK.md chooses differently, and say why there. -->

An agent product has three parts that are kept apart: a **backend** that owns every record and every business rule, an **agent** that decides and acts only through the backend's API, and the **UI** people use. The agent may be wrong, replayed or late. The backend makes that safe.

## The backend owns the rules

1. **HARD. The backend enforces every rule in the spec,** whatever the agent or the UI does. A prompt is never the only guard on a rule.
2. **HARD. Every refusal is a status and one line of text,** `{"detail": "..."}`, validation errors included, without echoing what was sent. The agent hands a refusal to its model as it is, so the line says what is wrong.
3. **HARD. Anything that moves through states is a state machine in the backend,** written as a table in the plan. Each move is one conditional update on the record's id, its state and its attempt or revision, and it checks its row count. A move from the wrong state, or for an old attempt, is refused with a 409 that names the current state.
4. **Moves are idempotent.** The same move sent again for the same attempt and revision returns what it did the first time, with a 200, and changes nothing. A different move for that revision is a 409.
5. **HARD. Side effects that matter (money, messages, deletions) are written inside a backend transaction,** together with the decision that causes them. They are never a tool of their own, so there is no window where a decision is recorded and its effect isn't, or the reverse.

## The API the agent calls

6. **HARD. Every operation has an operation id and a one-line description,** and the operations the agent's tools call are tagged `agent`. `checks/api_rules.py` checks this against the API's own schema.
7. **HARD. An `agent` operation takes no optional input,** including fields inside the models its body holds. An optional field in a tool's schema invites the model to guess. Variants are a discriminated union instead.
8. **One module per outside service.** The agent reaches the backend only through one connection module and one API module, with one function per operation, named after it. Nothing else builds a URL or sends a request.

## The agent's parts

9. **HARD. The agent's modules are kept apart, each with one job:** the connection to the backend, the API functions, the models, the tools, the harness (the graph), the checkpoints, and the agent's app. `checks/test_boundaries.py` checks which module may import which. Only the connection makes an HTTP client, nothing imports the app, and the agent never imports the backend.
10. **HARD. Tools take their ids from the run's context, never from the model:** the record being worked, the customer, the attempt, the revision. A tool's schema has no id field.
11. **HARD. A refusal from the backend goes back to the model as the tool's result,** so it can read the reason and act on it. Each tool call is recorded as a step on the record.
12. **The instructions give the agent its goal, what it has to work from, and what done looks like.** They never script its steps: it plans those itself. Anything that must always happen, or happen in a fixed order (recording the decision, the pause for a person's approval, the check before an action), is code in the graph, not a sentence in a prompt.

## Asking the agent to work

13. **Asking the agent has three outcomes, and each is handled:**
    - **Accepted.**
    - **Definitely not started:** the connection was refused, or the agent answered with a refusal or an error status. The backend undoes the move and answers with a 502 or 503 that says why.
    - **Unknown:** a timeout after the request was sent. The move stays, and the person is told to reload. If the agent never got the work, the record stalls (rule 16), and starting it again takes it over.
14. **The backend commits its move first, then asks,** and undoes the move only when the agent definitely didn't start.
15. **The agent's app answers at once and works on a thread of its own.** It holds one lock per record, so a second ask for a record being worked is refused. An unhandled error ends in a recorded failure, with the reason.

## Runs that survive restarts

16. **Progress is checkpointed after every step,** with synchronous durability. Each attempt is a thread named `<generation>:<record id>:<attempt>`. Reseeding sets a new generation, so a graph from before it is never taken up. A record with no step for a set time (5 minutes to start with) reads as stalled, and a person can start it again.
17. **Starting again carries on:** a thread paused for a person resumes with the person's answer, a thread stopped mid-run carries on from its checkpoint, and a new thread starts from the beginning.
18. **A person's approval is a pause in the graph** (`interrupt()` in LangGraph), resumed with their answer, never a model's call. The model may propose; code holds the action until a person approves it.
19. **Retry only what is transient and safe:** transport errors on the way to the backend. Model providers' clients retry their own. A move the backend may already have made is retried only because the move is idempotent (rule 4).

## Models are a setting

20. **The model is a setting,** written `provider:model`, built in one module. Changing provider is a dependency and a setting, never a code change elsewhere.
21. **Read each reply's input and output tokens** from what the provider reports, and the cost only when the provider gives one. A price table, when needed, lives in one module with the date its prices were checked.
22. **Who is calling is never confused:** the agent identifies itself with its own key, compared in constant time. The key never stands in for a person, and a person's token never opens an agent route. With no key configured, every agent route refuses.

## Testing an agent product

23. **HARD. No check calls a real model or a real outside service.** A stub model (`checks/stub_model.py`) gives scripted replies and keeps every prompt it was sent, so a test can prove what the model saw, such as that private text never reached it.
24. **The browser tests use a stand-in for the agent,** a small app that answers like the agent and plays a scripted decision through the backend's API with the agent's key. They run on ports and databases of their own, so they never touch a running dev setup.
25. **Each deployable imports with only its own dependencies,** checked by importing it in an isolated environment with only its dependency group. That keeps what's deployed small and honest.
26. **Recovery is tested end to end,** with the real backend and the real agent app on the stub model: a lost response retried, a crash mid-run, a timeout while asking, the agent down when the backend asks, and a person's answer arriving after a restart. Each scenario ends with exactly one side effect.
27. **A live run is a criterion of a slice, not a test.** One run on the real model, within the budget the plan states, reporting the decision, the tokens, the time and the cost when given. Slice 1 includes it, so the real model is met early.

## Hard constraints and what enforces them

| Rule | Enforced by |
| --- | --- |
| 1, 3, 4, 5: the backend's rules and moves | a test per move and per refusal in the state machine table |
| 6, 7: operation ids, descriptions, no optional agent inputs | `api_rules.py`, run in a test against the app's schema |
| 9: the agent's parts kept apart | `test_boundaries.py` |
| 10: no ids from the model | a test that no tool's schema has an id field |
| 11: refusals reach the model | a stub-model test where the backend refuses |
| 23: no real model in the checks | the stub model, and a test that the checks run with no provider key set |

## Where the kit's other parts are

- **The checks to adopt in slice 1:** `~/.master/kits/agent/checks/`.
- **Briefs for capabilities most agent products need later:** `~/.master/kits/agent/briefs/`. These cover working a queue, evals, self-improvement with approval, security, a context layer, memory, a copilot, observability, Postgres and AWS. Copy one to `docs/<NAME>.md`, put it in the owner's words, then plan it.
- **A worked example of a spec and a plan for an agent product:** `~/.master/kits/agent/example/`.
