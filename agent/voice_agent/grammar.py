"""Voice command grammar (voice-agent REQ-VA-01).

Three commands, matched by rules (a rule has one right answer, so no model is used):

    click <name>
    type <text> in <field>      <text> may be in single or double quotes
    go to <name>

Case-insensitive. Spaces at the ends and one final full stop, question mark or exclamation mark are ignored.
Anything else returns None, and None never leads to an action.
"""
from __future__ import annotations

import difflib
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
_PAYMENT = re.compile(rf"^(?:(?:send|make|submit|do|pay)\s+{_ARTICLE}(?:payments?|it)|pay(?:\s+now)?)$", re.IGNORECASE)
_CLICK_WORDS = re.compile(rf"^(?:press|tap|hit|push|select|choose|activate|submit)\s+(?:on\s+)?{_ARTICLE}(?P<name>.+)$", re.IGNORECASE)
_CLICK_ON = re.compile(rf"^click\s+(?:on\s+)?{_ARTICLE}(?P<name>.+)$", re.IGNORECASE)
_GO_WORDS = re.compile(rf"^(?:open|visit|navigate\s+to|take\s+me\s+to|show\s+me)\s+{_ARTICLE}(?P<name>.+)$", re.IGNORECASE)
_VALUE = r"(?P<text>\"[^\"]*\"|'[^']*'|\S+)"
_TYPE_WORDS = re.compile(rf"^(?:enter|write|put|fill\s+in)\s+{_VALUE}\s+(?:in|into)\s+(?:the\s+)?(?P<field>.+)$", re.IGNORECASE)
_SET_WORDS = re.compile(rf"^(?:set|fill)\s+(?:the\s+)?(?P<field>.+?)\s+(?:to|with)\s+{_VALUE}$", re.IGNORECASE)


_SUFFIX = re.compile(r"\s+(?:button|link|field|box|input)$", re.IGNORECASE)

# Smart field & problem-word canonicalizer (plural, synonym, phonetic/ASR error, fuzzy match)
_FIELD_SYNONYMS: dict[str, str] = {
    "recipient": "Recipient",
    "recipients": "Recipient",
    "recepient": "Recipient",
    "reciepient": "Recipient",
    "resipient": "Recipient",
    "recipent": "Recipient",
    "recipient name": "Recipient",
    "payee": "Recipient",
    "payees": "Recipient",
    "receiver": "Recipient",
    "beneficiary": "Recipient",
    "person": "Recipient",
    "name": "Recipient",
    "user": "Recipient",
    "customer": "Recipient",
    "patient": "Recipient",
    "employee": "Recipient",
    "student": "Recipient",
    "teammate": "Recipient",
    "amount": "Amount",
    "amounts": "Amount",
    "a mount": "Amount",
    "amout": "Amount",
    "amunt": "Amount",
    "amoutn": "Amount",
    "amnt": "Amount",
    "money": "Amount",
    "total": "Amount",
    "totals": "Amount",
    "price": "Amount",
    "cost": "Amount",
    "fee": "Amount",
    "fees": "Amount",
    "sum": "Amount",
    "euros": "Amount",
    "euro": "Amount",
    "dollars": "Amount",
    "dollar": "Amount",
    "reference": "Reference",
    "references": "Reference",
    "refernce": "Reference",
    "refrence": "Reference",
    "ref": "Reference",
    "refs": "Reference",
    "note": "Reference",
    "notes": "Reference",
    "memo": "Reference",
    "memos": "Reference",
    "reason": "Reference",
    "reasons": "Reference",
    "description": "Reference",
    "comment": "Reference",
    "comments": "Reference",
    "message": "Reference",
}
_CANONICAL_FIELDS = ("recipient", "amount", "reference")


def canonical_field(raw: str) -> str:
    """Resolve plurals, synonyms, and common ASR problem words (e.g. 'amounts' -> 'Amount').
    Preserves caller's casing when the word is already exact ('recipient' stays 'recipient').
    """
    cleaned = _SUFFIX.sub("", raw.strip()).strip()
    low = cleaned.lower()
    if low in _CANONICAL_FIELDS:
        return cleaned
    if low in _FIELD_SYNONYMS:
        return _FIELD_SYNONYMS[low]
    if low.endswith("s") and low[:-1] in _FIELD_SYNONYMS:
        return _FIELD_SYNONYMS[low[:-1]]
    close = difflib.get_close_matches(low, _CANONICAL_FIELDS, n=1, cutoff=0.72)
    if close:
        return close[0].capitalize()
    return cleaned


def _name(raw: str) -> str:
    return _SUFFIX.sub("", raw.strip())


def _rewrite(text: str) -> str | None:
    t = _POLITE.sub("", _clean(text)).strip()
    if _PAYMENT.match(t):
        return f"click {PAYMENT_BUTTON}"
    if m := _CLICK_WORDS.match(t) or _CLICK_ON.match(t):
        target = _name(m["name"])
        if target.lower() in {"send payments", "payment", "payments", "pay button", "pay"}:
            target = PAYMENT_BUTTON
        return f"click {target}"
    if m := _GO_WORDS.match(t):
        return f"go to {_name(m['name'])}"
    if m := _TYPE_WORDS.match(t) or _SET_WORDS.match(t):
        return f"type {m['text']} in {canonical_field(m['field'])}"
    # Also support "type <value> in <problem-word field>" cleanly
    if m := re.match(rf"^type\s+{_VALUE}\s+in(?:to)?\s+(?:the\s+)?(?P<field>.+)$", t, re.IGNORECASE):
        resolved = canonical_field(m["field"])
        if resolved != m["field"].strip():
            return f"type {m['text']} in {resolved}"
    return None


def parse_natural(text: str) -> Command | None:
    """The three strict commands first, then the fixed natural phrases. Returns None for anything else."""
    if not isinstance(text, str) or len(text) > MAX_COMMAND_CHARS or "\n" in text.strip():
        return None
    rewritten = _rewrite(text)
    if (cmd := parse(text)) is not None:
        # Normalize plural/problem field names like 'amounts' -> 'Amount' or 'send payments' -> 'Send Payment'
        if cmd.kind == "type":
            norm_name = canonical_field(cmd.name)
            if norm_name != cmd.name:
                return Command("type", norm_name, cmd.text, text)
        elif cmd.kind == "click" and rewritten:
            rcmd = parse(rewritten)
            if rcmd and rcmd.name != cmd.name:
                return Command("click", rcmd.name, None, text)
        return cmd
    if rewritten is None:
        return None
    cmd = parse(rewritten)
    return None if cmd is None else Command(cmd.kind, cmd.name, cmd.text, text)


# ── One phrase, several steps (voice-agent REQ-VA-12) ───────────────────────
# "send 100 dollars to Sam Lee" becomes three ordinary commands. A fixed pattern decides, never a model.
RECIPIENT_FIELD = "Recipient"
AMOUNT_FIELD = "Amount"
_MONEY_WORD = r"(?:dollars?|euros?|bucks|usd|eur)"
_AMOUNT = rf"(?:[$\u20ac]\s*)?(?P<{{n}}>\d[\d,]*(?:\.\d{{{{1,2}}}})?)(?:\s*{_MONEY_WORD}|\s*[$\u20ac])?"
_NAME_CHARS = r"[A-Za-z][A-Za-z .'\-]*?"
_TAIL = r"(?:\s+(?:please|now))?"
_SEND = re.compile(
    rf"^(?:send|pay|transfer|wire)\s+(?:(?:some\s+)?money\s+)?(?:{_AMOUNT.format(n='lead')}\s+)?(?:to\s+)?"
    rf"(?P<name>{_NAME_CHARS})"
    rf"(?:\s*,?\s*(?:and\s+|with\s+|for\s+|of\s+|amount\s+(?:of\s+)?)*(?:(?:ex|eg|e\.g\.)\s+)?{_AMOUNT.format(n='tail')})?{_TAIL}$",
    re.IGNORECASE,
)

def _normal_amount(raw: str) -> str | None:
    """'1,000' -> '1000.00', '5.5' -> '5.50'. The bank wants two decimals. Zero is refused."""
    t = raw.replace(",", "")
    whole, _, frac = t.partition(".")
    if not whole.isdigit() or len(frac) > 2:
        return None
    value = f"{int(whole)}.{frac.ljust(2, '0')}"
    return None if int(whole) == 0 and int(frac or 0) == 0 else value

_ONES = {w: i for i, w in enumerate(
    "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen "
    "seventeen eighteen nineteen".split())}
_TENS = {w: 10 * i for i, w in enumerate("_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()) if w != "_"}
_SCALES = {"hundred": 100, "thousand": 1000}


def _words_value(words: list[str]) -> int | None:
    """'one hundred and fifty' -> 150, 'a hundred' -> 100, 'twenty five' -> 25. None when it is not a number."""
    total, current, seen = 0, 0, False
    for i, w in enumerate(words):
        if w in ("a", "an") and i + 1 < len(words) and words[i + 1] in _SCALES and not seen:
            current = 1
        elif w == "and" and seen:
            continue
        elif w in _ONES:
            current += _ONES[w]
            seen = True
        elif w in _TENS:
            current += _TENS[w]
            seen = True
        elif w == "hundred":
            current = (current or 1) * 100
            seen = True
        elif w == "thousand":
            total += (current or 1) * 1000
            current = 0
            seen = True
        else:
            return None
    return total + current if seen else None


def _number_words_to_digits(text: str) -> str:
    """Rewrite each run of spoken number words as digits: 'Sam Lee hundred dollars' -> 'Sam Lee 100 dollars'.
    A run must hold at least one number word; 'a', 'an' and 'and' only count inside a run."""
    # Chrome sometimes writes "hundred.00" or "fifty.50": keep the cents, read the words.
    tokens = re.sub(r"\b([A-Za-z]+(?:-[A-Za-z]+)*)\.(\d{1,2})\b", r"\1 .\2", text).split()
    out: list[str] = []
    i = 0
    number = set(_ONES) | set(_TENS) | set(_SCALES)
    while i < len(tokens):
        j = i
        run: list[str] = []
        while j < len(tokens):
            parts = tokens[j].lower().split("-")
            if all(p in number for p in parts) or (tokens[j].lower() in ("a", "an", "and") and run is not None):
                run.extend(parts)
                j += 1
            else:
                break
        while run and run[-1] in ("a", "an", "and"):  # never end a run on a filler word
            run.pop()
            j -= 1
        value = _words_value(run) if run else None
        if value is not None and any(w in number for w in run):
            cents = tokens[j] if j < len(tokens) and re.fullmatch(r"\.\d{1,2}", tokens[j]) else ""
            out.append(f"{value}{cents}")
            i = j + (1 if cents else 0)
        else:
            out.append(tokens[i])
            i += 1
    return " ".join(out)


def expand_payment(text: str) -> list[str]:
    """Return the ordinary commands for a send-money phrase, or [text] when it is not one.
    With a recipient and an amount: type both, then click Send Payment. With a recipient only: type it and stop."""
    if not isinstance(text, str) or len(text) > MAX_COMMAND_CHARS or "\n" in text.strip():
        return [text]
    t = _number_words_to_digits(_POLITE.sub("", _clean(text)).strip())
    m = _SEND.match(t)
    if not m:
        return [text]
    name = re.sub(r"\s+(?:and|with|for|of|to)$", "", m["name"].strip(), flags=re.IGNORECASE).strip(" ,.-")
    if not name or len(name) > 60 or name.lower() in {"money", "payment", "it", "now"}:
        return [text]
    raw = m["lead"] or m["tail"]
    if m["lead"] and m["tail"]:
        return [text]
    steps = [f'type "{name}" in {RECIPIENT_FIELD}']
    if raw:
        amount = _normal_amount(raw)
        if amount is None:
            return [text]
        steps += [f"type {amount} in {AMOUNT_FIELD}", f"click {PAYMENT_BUTTON}"]
    return steps


# ── Several commands in one breath (voice-agent REQ-VA-21) ──────────────────
# Speech recognition often returns "type X in recipient type 100 and click send payment" as one sentence.
# Split it at command words, but only when every part is understood; otherwise keep it as said.
MAX_PARTS = 10
_STARTS = (r"type|enter|write|put|fill\s+in|set|click|press|tap|hit|push|select|choose|activate|submit|"
           r"go\s+to|open|visit|navigate\s+to|take\s+me\s+to|show\s+me|send|pay|transfer|make")
_START_RE = re.compile(rf"(?<![\w'\"-])(?:{_STARTS})\b", re.IGNORECASE)
_QUOTED_RE = re.compile(r"\"[^\"]*\"|(?<!\w)'[^']*'(?!\w)")
_JOINERS = re.compile(r"(?:[\s,;.]|\b(?:and\s+then|and|then|after\s+that)\b)+$", re.IGNORECASE)
_BARE_TYPE = re.compile(r"^(?:type|enter|write|put)\s+(?P<value>.+)$", re.IGNORECASE)
_AMOUNT_ONLY = re.compile(r"^[$\u20ac]?\s*(?P<n>\d[\d,]*(?:\.\d{1,2})?)\s*(?:dollars?|euros?|usd|eur|[$\u20ac])?$", re.IGNORECASE)


def _understood(text: str) -> bool:
    return parse_natural(text) is not None or expand_payment(text) != [text]


def _repair(part: str) -> str | None:
    """The part as a command, or None. 'type 100' (no field) becomes 'type 100.00 in Amount'; a name is never guessed."""
    part = _JOINERS.sub("", part).strip()
    if not part:
        return None
    if _understood(part):
        return part
    if (fixed := _fix_type(part)) is not None:
        return fixed
    if m := _BARE_TYPE.match(_clean(part)):
        if a := _AMOUNT_ONLY.match(_number_words_to_digits(m["value"]).strip()):
            if (amount := _normal_amount(a["n"])) is not None:
                return f"type {amount} in {AMOUNT_FIELD}"
    return None


def split_chained(text: str) -> list[str]:
    """The commands in one spoken sentence. [text] when it is one command or cannot be split into understood parts."""
    if not isinstance(text, str) or len(text) > MAX_COMMAND_CHARS or "\n" in text.strip():
        return [text]
    t = _POLITE.sub("", text.strip()).strip()
    quoted = [m.span() for m in _QUOTED_RE.finditer(t)]
    starts = [m.start() for m in _START_RE.finditer(t) if not any(a < m.start() < b for a, b in quoted)]
    if len(starts) < 2 or starts[0] != 0:
        return [text]
    starts = starts[: MAX_PARTS + 1]
    inner = starts[1:]
    # Try choices of cut points (at most 2^10), most cuts first; the first whose parts are all understood wins.
    for mask in sorted(range(1, 1 << len(inner)), key=lambda m: (-bin(m).count("1"), m)):
        cuts = [0] + [p for i, p in enumerate(inner) if mask >> i & 1] + [len(t)]
        parts = [_repair(t[a:b]) for a, b in zip(cuts, cuts[1:])]
        if all(parts):
            return parts  # type: ignore[return-value]
    return [text]


# ── What Chrome writes down (voice-agent REQ-VA-22) ────────────────────────
_FIELD_WORDS = "|".join(sorted({k for k in _FIELD_SYNONYMS if " " not in k}, key=len, reverse=True))
_FIELD_NAMES = rf"{_FIELD_WORDS}"  # domain fields + plurals + problem words
_GLUED_AND = re.compile(rf"\b(recipient|recipients|amount|amounts|reference|references)and\b", re.IGNORECASE)
_FIX_TYPE = re.compile(
    rf"^(?P<verb>type|enter|write|put|fill)\s+(?P<value>.+?)(?:\s+(?P<in>in|into)(?:\s+the)?)?\s+"
    rf"(?P<field>{_FIELD_NAMES})(?:\s+(?:field|box|input))?$", re.IGNORECASE)


def _unglue(text: str) -> str:
    """'amountAnd click' -> 'amount And click'."""
    return _GLUED_AND.sub(lambda m: m[1] + " " + m[0][len(m[1]):], text) if isinstance(text, str) else text


def _fix_type(part: str) -> str | None:
    """A spoken type command, made one the grammar reads (handles plurals & problem words like 'amounts')."""
    m = _FIX_TYPE.match(_clean(part))
    if not m:
        return None
    value, field = m["value"].strip(), canonical_field(m["field"])
    if value.lower() in {"in", "into", "the", "in the", "into the"}:  # "type in recipient": no value was said
        return None
    if field.lower() == "amount":
        a = _AMOUNT_ONLY.match(_number_words_to_digits(value).strip())
        amount = _normal_amount(a["n"]) if a else None
        if amount is not None:
            return f"type {amount} in {field}"
    quoted = len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'"
    if " " in value and not quoted:
        if '"' in value:
            return None
        value = f'"{value}"'
    fixed = f"type {value} in {field}"
    return fixed if parse(fixed) is not None else None


def _amount_text(step: str) -> str:
    """'type hundred in amount' -> 'type 100.00 in amount'. A value that is not an amount is left as said."""
    cmd = parse(step)
    if cmd is None or cmd.kind != "type" or canonical_field(cmd.name).lower() != "amount":
        return step
    a = _AMOUNT_ONLY.match(_number_words_to_digits(cmd.text or "").strip())
    amount = _normal_amount(a["n"]) if a else None
    return step if amount is None or amount == cmd.text else f"type {amount} in {canonical_field(cmd.name)}"


def _as_command(part: str) -> str:
    """One part as a command the grammar understands, or the part as said."""
    if _understood(part):
        return part
    return _repair(part) or part


def plan_commands(commands: list[str], max_in: int = 10, max_out: int = 30) -> list[str]:
    """What the runner runs: split each sentence, expand payment phrases, read amounts, drop an immediate repeat."""
    out: list[str] = []
    for text in list(commands)[:max_in]:
        for part in split_chained(_unglue(text)):
            for step in expand_payment(_as_command(part)):
                step = _amount_text(step)
                if out and step.strip().lower() == out[-1].strip().lower():
                    continue
                out.append(step)
    return out[:max_out]
