"""What each part of the agent may import (docs/AGENT_STANDARDS.md, rule 9).

From master's agent kit. Copy it to the agent's tests folder (for example
`agent/tests/test_boundaries.py`), set PACKAGE and ALLOWED for the product's
modules, and keep ALLOWED current: a new module fails the first test until it
is listed. Standard library only, run with pytest.
"""

import ast
from pathlib import Path

# The agent's package, and the folder that holds its modules.
PACKAGE = "agent"
AGENT = Path(__file__).parent.parent

# Each module of the agent, and the agent's modules it may import. The shape
# below is the kit's default (rule 9); rename or add modules to match the plan.
ALLOWED = {
    "connection": set(),
    "api": {"connection"},
    "models": set(),
    "checkpoints": set(),
    "tools": {"api", "connection"},
    "harness": {"api", "checkpoints", "connection", "models", "tools"},
    "entrypoint": {"api", "connection", "harness", "models"},
}

# The one module that may make an HTTP client, the call that makes one, the
# agent's app (which nothing imports), and the packages the agent never imports.
CONNECTION = "connection"
HTTP_CLIENT = "httpx.Client("
APP = "entrypoint"
NEVER = ("backend",)


def tree_of(module: str) -> ast.Module:
    return ast.parse((AGENT / f"{module}.py").read_text(encoding="utf-8"))


def own_imports(module: str) -> set[str]:
    names: set[str] = set()
    for node in ast.walk(tree_of(module)):
        # A relative import (`from . import api`, `from .entrypoint import app`)
        # is one of the agent's own modules too.
        if isinstance(node, ast.ImportFrom) and node.level > 0:
            if node.module:
                names.add(node.module.split(".")[0])
            else:
                names |= {alias.name for alias in node.names}
        elif isinstance(node, ast.ImportFrom) and node.module:
            if node.module == PACKAGE:
                names |= {alias.name for alias in node.names}
            elif node.module.startswith(f"{PACKAGE}."):
                names.add(node.module.removeprefix(f"{PACKAGE}.").split(".")[0])
        elif isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name.startswith(f"{PACKAGE}."):
                    names.add(alias.name.removeprefix(f"{PACKAGE}.").split(".")[0])
    return names


def imported_packages(module: str) -> set[str]:
    found: set[str] = set()
    for node in ast.walk(tree_of(module)):
        if isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            found.add(node.module.split(".")[0])
        elif isinstance(node, ast.Import):
            found |= {alias.name.split(".")[0] for alias in node.names}
    return found


def test_every_module_is_listed():
    assert {path.stem for path in AGENT.glob("*.py")} - {"__init__"} == set(ALLOWED)


def test_each_module_imports_only_what_it_may():
    for module, allowed in ALLOWED.items():
        assert own_imports(module) <= allowed, module


def test_nothing_imports_the_app():
    for module in ALLOWED:
        assert APP not in own_imports(module), module


def test_only_the_connection_makes_an_http_client():
    for module in ALLOWED.keys() - {CONNECTION}:
        assert HTTP_CLIENT not in (AGENT / f"{module}.py").read_text(encoding="utf-8"), module


def test_the_agent_never_imports_what_it_must_not():
    for module in ALLOWED:
        assert not imported_packages(module) & set(NEVER), module
