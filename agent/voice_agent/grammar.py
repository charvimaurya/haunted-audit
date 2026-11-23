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


# ── Natural phrases (voice-agent REQ-VA-11) ─────────────────────────────────
# A fixed list of rewrite rules. Each phrase becomes one of the three commands above, and parse() still decides.
# No model is used. Anything not on the list returns None, as before.
PAYMENT_BUTTON = "Send Payment"  # the accessible name of the bank's payment button
_POLITE = re.compile(r"^(?:please\s+|(?:can|could|would)\s+you\s+(?:please\s+)?|i(?:'d|\s+would)?\s+(?:want|like)\s+to\s+)+", re.IGNORECASE)
_ARTICLE = r"(?:(?:the|a|an|my)\s+)?"
_PAYMENT = re.compile(rf"^(?:(?:send|make|submit|do|pay)\s+{_ARTICLE}(?:payment|it)|pay(?:\s+now)?)$", re.IGNORECASE)
_CLICK_WORDS = re.compile(rf"^(?:press|tap|hit|push|select|choose|activate|submit)\s+(?:on\s+)?{_ARTICLE}(?P<name>.+)$", re.IGNORECASE)
_CLICK_ON = re.compile(rf"^click\s+on\s+{_ARTICLE}(?P<name>.+)$", re.IGNORECASE)
_GO_WORDS = re.compile(rf"^(?:open|visit|navigate\s+to|take\s+me\s+to|show\s+me)\s+{_ARTICLE}(?P<name>.+)$", re.IGNORECASE)
_VALUE = r"(?P<text>\"[^\"]*\"|'[^']*'|\S+)"
_TYPE_WORDS = re.compile(rf"^(?:enter|write|put|fill\s+in)\s+{_VALUE}\s+(?:in|into)\s+(?:the\s+)?(?P<field>.+)$", re.IGNORECASE)
_SET_WORDS = re.compile(rf"^(?:set|fill)\s+(?:the\s+)?(?P<field>.+?)\s+(?:to|with)\s+{_VALUE}$", re.IGNORECASE)


_SUFFIX = re.compile(r"\s+(?:button|link|field|box)$", re.IGNORECASE)


def _name(raw: str) -> str:
    return _SUFFIX.sub("", raw.strip())


def _rewrite(text: str) -> str | None:
    t = _POLITE.sub("", _clean(text)).strip()
    if _PAYMENT.match(t):
        return f"click {PAYMENT_BUTTON}"
    if m := _CLICK_WORDS.match(t) or _CLICK_ON.match(t):
        return f"click {_name(m['name'])}"
    if m := _GO_WORDS.match(t):
        return f"go to {_name(m['name'])}"
    if m := _TYPE_WORDS.match(t) or _SET_WORDS.match(t):
        return f"type {m['text']} in {_name(m['field'])}"
    return None


def parse_natural(text: str) -> Command | None:
    """The three strict commands first, then the fixed natural phrases. Returns None for anything else."""
    if not isinstance(text, str) or len(text) > MAX_COMMAND_CHARS or "\n" in text.strip():
        return None
    if (cmd := parse(text)) is not None:
        return cmd
    rewritten = _rewrite(text)
    if rewritten is None:
        return None
    cmd = parse(rewritten)
    return None if cmd is None else Command(cmd.kind, cmd.name, cmd.text, text)
