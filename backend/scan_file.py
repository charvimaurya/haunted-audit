"""Scan one saved HTML or TSX file for form fields that have no label.

Usage:
    python3 backend/scan_file.py <path>          print findings as JSON
    python3 backend/scan_file.py --hook          read the Kiro hook event from STDIN;
                                                 print nothing when out of scope or clean
    python3 backend/scan_file.py --strict <path> exit 1 when there is a finding (for CI)

Standard library only, so it runs the same on Windows and macOS.
Spec: .kiro/specs/scan-on-save/. Finding shape: .kiro/steering/data-contract.md ("File finding").

Rules (one right answer each, so this is code, not a model):
- input (except hidden, submit, reset, button, image), select and textarea need an accessible name:
  aria-label, aria-labelledby, title or placeholder (non-empty), a <label for>/htmlFor naming the id,
  or a wrapping <label>.
- When the answer depends on runtime values (spread props, computed attributes), no finding is raised.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SCOPES = ("bank/", "fixtures/haunted_bank/", "dashboard/src/")
CONTROLS = {"input", "select", "textarea"}
NO_LABEL_TYPES = {"hidden", "submit", "reset", "button", "image"}
NAME_ATTRS = ("aria-label", "aria-labelledby", "title", "placeholder")
WCAG = ["1.3.1", "3.3.2", "4.1.2"]


# ── shared ──────────────────────────────────────────────────────────────────

def _finding(rel: str, line: int, element: str, element_id: str | None) -> dict:
    digest = hashlib.sha256(f"{rel}|{line}|label|{element}".encode()).hexdigest()[:12]
    fix = (f'Add <label for="{element_id}">, aria-label or aria-labelledby.' if element_id
           else "Add a <label> around it, aria-label or aria-labelledby.")
    return {
        "finding_id": f"label-{digest}",
        "source": "scan_file",
        "rule": "label",
        "wcag": WCAG,
        "severity": "serious",
        "file": rel,
        "line": line,
        "element": element,
        "message": f"This {element.split('#')[0].split('[')[0]} has no accessible name. {fix}",
    }


def _describe(tag: str, attrs: dict) -> str:
    if attrs.get("id"):
        return f"{tag}#{attrs['id']}"
    if attrs.get("name"):
        return f"{tag}[name={attrs['name']}]"
    return tag


def _has_name(attrs: dict) -> bool:
    return any((attrs.get(a) or "").strip() for a in NAME_ATTRS)


def _needs_label(tag: str, attrs: dict) -> bool:
    if tag not in CONTROLS:
        return False
    if (attrs.get("role") or "").strip() in {"presentation", "none"}:
        return False
    return not (tag == "input" and (attrs.get("type") or "text").strip().lower() in NO_LABEL_TYPES)


# ── HTML ────────────────────────────────────────────────────────────────────

class _Collector(HTMLParser):
    """Collect controls (with line and label nesting), label `for` ids and script bodies."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.controls: list[tuple[str, dict, int, int, bool]] = []  # tag, attrs, line, col, in_label
        self.label_for: set[str] = set()
        self.scripts: list[tuple[str, int]] = []
        self._label_depth = 0
        self._in_script = False

    def handle_starttag(self, tag, attrs):
        a = {k: (v or "") for k, v in attrs}
        line, col = self.getpos()
        if tag == "label":
            self._label_depth += 1
            if a.get("for"):
                self.label_for.add(a["for"])
        elif tag == "script":
            self._in_script = True
        elif tag in CONTROLS:
            self.controls.append((tag, a, line, col, self._label_depth > 0))

    def handle_startendtag(self, tag, attrs):
        if tag == "label":  # <label/> labels nothing
            return
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag == "label" and self._label_depth:
            self._label_depth -= 1
        elif tag == "script":
            self._in_script = False

    def handle_data(self, data):
        if self._in_script:
            self.scripts.append((data, self.getpos()[0]))


_ASSIGN = re.compile(r"\.innerHTML\s*=")
_STRING = re.compile(r"""'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)\"""")


def _statement_end(js: str, start: int) -> int:
    """Index of the `;` that ends the statement starting at `start`, ignoring quoted text."""
    quote = None
    i = start
    while i < len(js):
        ch = js[i]
        if quote:
            if ch == "\\":
                i += 2
                continue
            if ch == quote:
                quote = None
        elif ch in "'\"`":
            quote = ch
        elif ch == ";":
            return i
        i += 1
    return len(js)


def _js_unescape(s: str) -> str:
    return re.sub(r"\\(.)", r"\1", s)


def _scan_controls(controls, label_for: set[str], rel: str, line_of) -> list[dict]:
    out = []
    for tag, attrs, line, col, in_label in controls:
        if not _needs_label(tag, attrs) or in_label or _has_name(attrs):
            continue
        if attrs.get("id") and attrs["id"] in label_for:
            continue
        out.append(_finding(rel, line_of(line, col), _describe(tag, attrs), attrs.get("id") or None))
    return out


def scan_html(text: str, rel: str) -> list[dict]:
    page = _Collector()
    page.feed(text)
    page.close()
    findings = _scan_controls(page.controls, page.label_for, rel, lambda line, col: line)

    # Markup built in scripts: each `.innerHTML = '...' + '...';` is its own fragment,
    # scanned together with the page's static labels.
    for js, js_line in page.scripts:
        for m in _ASSIGN.finditer(js):
            end = _statement_end(js, m.end())
            parts, starts = [], []
            pos = 0
            for s in _STRING.finditer(js, m.end(), end):
                literal = _js_unescape(s.group(1) if s.group(1) is not None else s.group(2))
                starts.append((pos, js_line + js.count("\n", 0, s.start())))
                parts.append(literal)
                pos += len(literal)
            if not parts:
                continue
            frag = _Collector()
            frag.feed("".join(parts))
            frag.close()

            def line_of(_line, col, starts=starts):
                # fragments are one line once joined; map the column back to its literal
                found = starts[0][1]
                for offset, line in starts:
                    if offset <= col:
                        found = line
                return found

            findings += _scan_controls(frag.controls, page.label_for | frag.label_for, rel, line_of)
    return findings


# ── TSX ─────────────────────────────────────────────────────────────────────

_JSX_TAG = re.compile(r"<(/?)(input|select|textarea|label)\b")


def _read_jsx_attrs(src: str, i: int) -> tuple[dict, bool, bool, int]:
    """Parse JSX attributes from index i. Returns (attrs, has_spread, self_closing, end_index).
    A value given as an expression is stored as None (unknown at scan time)."""
    attrs: dict = {}
    spread = False
    n = len(src)
    while i < n:
        while i < n and src[i].isspace():
            i += 1
        if src.startswith("/>", i):
            return attrs, spread, True, i + 2
        if i < n and src[i] == ">":
            return attrs, spread, False, i + 1
        if i < n and src[i] == "{":  # {...props}
            depth, j = 0, i
            while j < n:
                if src[j] == "{":
                    depth += 1
                elif src[j] == "}":
                    depth -= 1
                    if depth == 0:
                        break
                j += 1
            spread = spread or src[i:j].lstrip("{ ").startswith("...")
            i = j + 1
            continue
        m = re.match(r"[A-Za-z_][\w:.-]*", src[i:])
        if not m:
            i += 1
            continue
        name = m.group(0)
        i += len(name)
        while i < n and src[i].isspace():
            i += 1
        if i < n and src[i] == "=":
            i += 1
            while i < n and src[i].isspace():
                i += 1
            if i < n and src[i] in "\"'":
                q = src[i]
                j = src.find(q, i + 1)
                attrs[name] = src[i + 1:j]
                i = j + 1
            elif i < n and src[i] == "{":
                depth, j = 0, i
                while j < n:
                    if src[j] == "{":
                        depth += 1
                    elif src[j] == "}":
                        depth -= 1
                        if depth == 0:
                            break
                    j += 1
                inner = src[i + 1:j].strip()
                lit = re.fullmatch(r"""(['"`])([^'"`$]*)\1""", inner)
                attrs[name] = lit.group(2) if lit else None
                i = j + 1
        else:
            attrs[name] = ""  # bare boolean attribute
    return attrs, spread, False, n


_COMMENT = re.compile(r"/\*[\s\S]*?\*/|(?<![:\w'\"])//[^\n]*")


def _blank_comments(src: str) -> str:
    """Replace comments with spaces, keeping newlines so line numbers stay right."""
    return _COMMENT.sub(lambda m: re.sub(r"[^\n]", " ", m.group(0)), src)


def scan_tsx(text: str, rel: str) -> list[dict]:
    text = _blank_comments(text)
    events = []
    for m in _JSX_TAG.finditer(text):
        closing, tag = m.group(1) == "/", m.group(2)
        if closing:
            events.append(("close", tag, {}, False, False, m.start()))
            continue
        attrs, spread, self_closing, _ = _read_jsx_attrs(text, m.end())
        events.append(("open", tag, attrs, spread, self_closing, m.start()))

    literal_for = {e[2]["htmlFor"] for e in events if e[0] == "open" and e[1] == "label"
                   and isinstance(e[2].get("htmlFor"), str)}
    dynamic_for = any(e[0] == "open" and e[1] == "label" and "htmlFor" in e[2] and e[2]["htmlFor"] is None
                      for e in events)

    findings, depth = [], 0
    for kind, tag, attrs, spread, self_closing, pos in events:
        if tag == "label":
            if kind == "open" and not self_closing:
                depth += 1
            elif kind == "close" and depth:
                depth -= 1
            continue
        if kind != "open" or depth:
            continue
        # Unknown at scan time: spread props, or a computed value on any attribute that decides the answer.
        if spread or any(attrs.get(a, "") is None for a in (*NAME_ATTRS, "id", "type", "role")):
            continue
        html_attrs = {k: v for k, v in attrs.items() if isinstance(v, str)}
        if "aria-label" in html_attrs and "aria-label" not in attrs:
            continue
        if not _needs_label(tag, html_attrs) or _has_name(html_attrs):
            continue
        el_id = html_attrs.get("id")
        if el_id and (el_id in literal_for or dynamic_for):
            continue
        line = text.count("\n", 0, pos) + 1
        findings.append(_finding(rel, line, _describe(tag, html_attrs), el_id or None))
    return findings


# ── entry points ────────────────────────────────────────────────────────────

def in_scope(path: Path) -> str | None:
    """Repo-relative POSIX path when the file is one the hook should scan, else None."""
    try:
        rel = path.resolve().relative_to(REPO).as_posix()
    except ValueError:
        return None
    if path.suffix not in (".html", ".tsx"):
        return None
    if not rel.startswith(SCOPES) or "/test/" in rel or rel.endswith((".test.tsx", ".spec.tsx")):
        return None
    return rel


def scan_file(path: str | Path) -> list[dict]:
    p = Path(path)
    if not p.is_absolute():
        p = (REPO / p) if not p.exists() else p.resolve()
    try:
        rel = p.resolve().relative_to(REPO).as_posix()
    except ValueError:
        rel = p.name
    text = p.read_text(encoding="utf-8")
    if p.suffix == ".html":
        return scan_html(text, rel)
    if p.suffix == ".tsx":
        return scan_tsx(text, rel)
    raise ValueError(f"Only .html and .tsx files can be scanned, not {p.suffix or 'a file with no extension'}.")


def _path_from_event(raw: str) -> str | None:
    """Find the saved file in the hook event JSON without depending on one field name."""
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return raw.strip() or None
    stack = [data]
    while stack:
        item = stack.pop()
        if isinstance(item, dict):
            stack.extend(item.values())
        elif isinstance(item, list):
            stack.extend(item)
        elif isinstance(item, str) and item.endswith((".html", ".tsx")):
            return item
    return None


def main(argv: list[str]) -> int:
    hook = "--hook" in argv
    strict = "--strict" in argv
    args = [a for a in argv if not a.startswith("--")]
    if hook:
        raw = args[0] if args else (sys.stdin.read() if not sys.stdin.isatty() else "")
        target = _path_from_event(raw) if raw else None
        if not target:
            return 0
        p = Path(target)
        if not p.is_absolute():
            p = REPO / p
        rel = in_scope(p)
        if not rel or not p.exists():
            return 0
        findings = scan_file(p)
        if findings:  # quiet when clean: nothing reaches the agent's context
            print(json.dumps({"file": rel, "findings": findings}, separators=(",", ":")))
        return 0
    if not args:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    findings = scan_file(args[0])
    print(json.dumps({"file": args[0], "findings": findings}, indent=2))
    return 1 if strict and findings else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
