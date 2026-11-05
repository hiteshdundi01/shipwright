"""A stub chat model, so that no check calls a real model (docs/AGENT_STANDARDS.md,
rule 23), with helpers to script its replies.

From master's agent kit. Copy it to the agent's tests (for example
`agent/tests/stub_model.py`) and add the product's own reply helpers beside
`says` and `call`, such as one per decision tool. Needs langchain-core.

    model = stub(call("read_order"), call("record_decision", decision="decline"), says("Done."))
    ...run the graph with `model`...
    assert "private words" not in str(model.prompts)  # what the model was sent
"""

import itertools

from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage

# What a provider reports for each reply, so usage and cost code is exercised.
USAGE = {"input_tokens": 1200, "output_tokens": 300, "total_tokens": 1500}
CALL_IDS = itertools.count()


class StubModel(GenericFakeChatModel):
    """A chat model that gives scripted replies, or raises a scripted error, and
    keeps every prompt it was sent."""

    prompts: list[list] = []

    def bind_tools(self, tools, **kwargs):
        return self

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        self.prompts.append(messages)
        return super()._generate(messages, stop, run_manager, **kwargs)


class Failing(Exception):
    """A scripted failure, as a model or a process might fail."""


def stub(*replies) -> StubModel:
    """A stub model giving these replies in turn. An exception among them is
    raised in its place, to script a provider error or a crash."""

    def given():
        for reply in replies:
            if isinstance(reply, BaseException):
                raise reply
            yield reply

    return StubModel(messages=given(), prompts=[])


def says(text: str) -> AIMessage:
    """A reply in words, with no tool call."""
    return AIMessage(content=text, usage_metadata=USAGE)


def call(name: str, **args) -> AIMessage:
    """A reply that calls one tool, with an id of its own as a real model gives."""
    tool_call = {"name": name, "args": args, "id": f"call-{next(CALL_IDS)}"}
    return AIMessage(content="", tool_calls=[tool_call], usage_metadata=USAGE)
