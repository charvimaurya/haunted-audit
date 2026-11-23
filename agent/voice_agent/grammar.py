"""Voice command grammar (voice-agent REQ-VA-01).

Three commands, matched by rules (a rule has one right answer, so no model is used):

    click <name>
    type <text> in <field>      <text> may be in single or double quotes
    go to <name>

Case-insensitive. Spaces at the ends and one final full stop, question mark or exclamation mark are ignored.
Anything else returns None, and None never leads to an action.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

MAX_COMMAND_CHARS = 200

Kind = Literal["click", "type", "go_to"]


@dataclass(frozen=True)
class Command:
    kind: Kind
    name: str  # the control's accessible name, or the field's label
    text: str | None = None  # only for "type"
    source: str = ""


_NAME = r"[^\s\"'](?:.*[^\s\"'])?"  # a name: no leading or trailing space or quote
_CLICK = re.compile(rf"^click\s+(?P<name>{_NAME})$", re.IGNORECASE)
_GO_TO = re.compile(rf"^go\s+to\s+(?P<name>{_NAME})$", re.IGNORECASE)
_TYPE_QUOTED = re.compile(rf"^type\s+(?P<q>[\"'])(?P<text>.*?)(?P=q)\s+in(?:to)?\s+(?P<field>{_NAME})$", re.IGNORECASE)
_TYPE_BARE = re.compile(rf"^type\s+(?P<text>\S+)\s+in(?:to)?\s+(?P<field>{_NAME})$", re.IGNORECASE)


def _clean(text: str) -> str:
    t = text.strip()
    if t and t[-1] in ".?!":
        t = t[:-1].rstrip()
    return t


def parse(text: str) -> Command | None:
    """Return the command, or None when the text is not one of the three forms."""
    if not isinstance(text, str) or len(text) > MAX_COMMAND_CHARS or "\n" in text.strip():
        return None
    t = _clean(text)
    if not t:
        return None
    if m := _CLICK.match(t):
        return Command("click", m["name"].strip(), source=text)
    if m := _GO_TO.match(t):
        return Command("go_to", m["name"].strip(), source=text)
    if m := _TYPE_QUOTED.match(t) or _TYPE_BARE.match(t):
        if m["text"] == "":
            return None
        return Command("type", m["field"].strip(), text=m["text"], source=text)
    return None


def describe(cmd: Command) -> str:
    """Plain English for the live timeline."""
    if cmd.kind == "click":
        return f"Click {cmd.name}"
    if cmd.kind == "go_to":
        return f"Go to {cmd.name}"
    return f'Type "{cmd.text}" in {cmd.name}'
