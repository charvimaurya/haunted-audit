"""Deterministic diff validation (exorcist REQ-X-05). Code decides whether a diff is acceptable, not a model.

A diff is accepted only when:
1. it is a unified diff for exactly one file, `fixtures/haunted_bank/index.html`, modified (no create, delete,
   rename, binary);
2. each hunk's context and removed lines are found exactly once in the file (the diff's line numbers are ignored),
   and the hunks apply in order;
3. at most MAX_CHANGED_LINES lines are added plus removed;
4. nothing is removed: every element id is still in the file, and every function an inline handler calls is still
   named in the file.
"""
from __future__ import annotations

import hashlib
import os
import re
from dataclasses import dataclass

TARGET = "fixtures/haunted_bank/index.html"
MAX_CHANGED_LINES = int(os.getenv("HAUNTED_AUDIT_MAX_DIFF_LINES", "10"))


class DiffError(ValueError):
    """One plain sentence saying why the diff was refused."""


@dataclass(frozen=True)
class Hunk:
    before: list[str]  # context and removed lines, in order
    after: list[str]  # context and added lines, in order
    removed: int
    added: int
    body: tuple[tuple[str, str], ...] = ()  # (tag, text) in the diff's order


@dataclass(frozen=True)
class CheckedDiff:
    diff: str  # canonical, with correct headers and line numbers
    sha256: str
    changed_lines: int
    patched: str  # the file after the patch (only ever written to a copy)


_HUNK = re.compile(r"^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@")


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _strip_prefix(path: str) -> str:
    path = path.strip().split("\t")[0]
    return path[2:] if path.startswith(("a/", "b/")) else path


def parse(diff: str) -> list[Hunk]:
    if not isinstance(diff, str) or not diff.strip():
        raise DiffError("The diff is empty.")
    if "\0" in diff or "GIT binary patch" in diff or "Binary files" in diff:
        raise DiffError("Binary diffs are not accepted.")
    lines = diff.splitlines()
    old = [l for l in lines if l.startswith("--- ")]
    new = [l for l in lines if l.startswith("+++ ")]
    if len(old) != 1 or len(new) != 1:
        raise DiffError("The diff must change exactly one file.")
    if any(l.startswith(("rename from", "rename to", "new file mode", "deleted file mode", "similarity index")) for l in lines):
        raise DiffError("Creating, deleting or renaming a file is not accepted.")
    a, b = _strip_prefix(old[0][4:]), _strip_prefix(new[0][4:])
    if a == "/dev/null" or b == "/dev/null":
        raise DiffError("Creating or deleting a file is not accepted.")
    for p in (a, b):
        if p.startswith("/") or ".." in p.split("/") or re.match(r"^[A-Za-z]:", p):
            raise DiffError("The diff path must be relative and stay inside the repo.")
    if a != TARGET or b != TARGET:
        raise DiffError(f"Only {TARGET} may be changed.")
    hunks: list[Hunk] = []
    cur: dict | None = None
    started = False
    for line in lines:
        if line.startswith(("--- ", "+++ ")) and not started:
            continue
        if _HUNK.match(line):
            started = True
            if cur:
                hunks.append(Hunk(**cur))
            cur = {"before": [], "after": [], "removed": 0, "added": 0, "body": []}
            continue
        if cur is None:
            if line.strip():
                if line.startswith(("diff ", "index ")):
                    continue
                raise DiffError("Text was found before the first hunk.")
            continue
        if line.startswith("\\"):
            continue  # "\ No newline at end of file"
        tag, body = (line[:1], line[1:]) if line else (" ", "")
        if tag == " ":
            cur["before"].append(body)
            cur["after"].append(body)
        elif tag == "-":
            cur["before"].append(body)
            cur["removed"] += 1
        elif tag == "+":
            cur["after"].append(body)
            cur["added"] += 1
        else:
            raise DiffError("A hunk line must start with a space, + or -.")
        cur["body"].append((tag, body))
    if cur:
        hunks.append(Hunk(**cur))
    hunks = [Hunk(h.before, h.after, h.removed, h.added, tuple(h.body)) for h in hunks]
    if not hunks:
        raise DiffError("The diff has no hunks.")
    if all(h.added == 0 and h.removed == 0 for h in hunks):
        raise DiffError("The diff changes nothing.")
    return hunks


def _find_once(lines: list[str], block: list[str], start: int) -> int:
    hits = [i for i in range(start, len(lines) - len(block) + 1) if lines[i:i + len(block)] == block]
    if not block:
        raise DiffError("A hunk has no context or removed lines to locate it.")
    if len(hits) == 0:
        raise DiffError("A hunk's context was not found in the file.")
    if len(hits) > 1:
        raise DiffError("A hunk's context matches more than one place in the file.")
    return hits[0]


def _apply(source: str, hunks: list[Hunk]) -> tuple[str, list[tuple[int, Hunk]]]:
    lines = source.split("\n")
    out: list[str] = []
    pos = 0
    placed = []
    for h in hunks:
        at = _find_once(lines, h.before, pos)
        out.extend(lines[pos:at])
        out.extend(h.after)
        placed.append((at, h))
        pos = at + len(h.before)
    out.extend(lines[pos:])
    return "\n".join(out), placed


def _ids(html: str) -> set[str]:
    return set(re.findall(r"""\bid=\\?["']([^"'\\]+)\\?["']""", html))


def _handler_functions(html: str) -> set[str]:
    names = set()
    for body in re.findall(r"""\bon[a-z]+=\\?["']([^"'\\]+)\\?["']""", html):
        names.update(m.split(".")[-1] for m in re.findall(r"([A-Za-z_$][\w$.]*)\s*\(", body))
    return names


def _canonical(placed: list[tuple[int, Hunk]]) -> str:
    """Correct headers and line numbers; hunk lines in the diff's own order."""
    out = [f"--- a/{TARGET}", f"+++ b/{TARGET}"]
    shift = 0
    for at, h in placed:
        out.append(f"@@ -{at + 1},{len(h.before)} +{at + 1 + shift},{len(h.after)} @@")
        out.extend(tag + text for tag, text in h.body)
        shift += len(h.after) - len(h.before)
    return "\n".join(out) + "\n"


def check(diff: str, source: str) -> CheckedDiff:
    """Validate the diff against the file's text. Raises DiffError with one plain sentence."""
    hunks = parse(diff)
    changed = sum(h.added + h.removed for h in hunks)
    if changed > MAX_CHANGED_LINES:
        raise DiffError(f"The diff changes {changed} lines; at most {MAX_CHANGED_LINES} are allowed.")
    patched, placed = _apply(source, hunks)
    lost_ids = _ids(source) - _ids(patched)
    if lost_ids:
        raise DiffError(f"The diff removes element ids: {', '.join(sorted(lost_ids))}.")
    # A handler's function must still exist outside inline handlers (defined or called by the page's script).
    outside = re.sub(r"""\bon[a-z]+=\\?["'][^"'\\]*\\?["']""", "", patched)
    lost_fns = {f for f in _handler_functions(source) if not re.search(rf"\b{re.escape(f)}\b", outside)}
    if lost_fns:
        raise DiffError(f"The diff removes functions that inline handlers call: {', '.join(sorted(lost_fns))}.")
    canon = _canonical(placed)
    return CheckedDiff(diff=canon, sha256=sha256(canon), changed_lines=changed, patched=patched)


def reverse(checked_diff: str) -> str:
    """The same diff the other way round (puts the bug back)."""
    out = []
    for line in checked_diff.splitlines():
        if line.startswith("@@"):
            m = re.match(r"^@@ -(\d+),(\d+) \+(\d+),(\d+) @@", line)
            out.append(f"@@ -{m[3]},{m[4]} +{m[1]},{m[2]} @@")
        elif line.startswith(("--- ", "+++ ")):
            out.append(line)
        elif line.startswith("-"):
            out.append("+" + line[1:])
        elif line.startswith("+"):
            out.append("-" + line[1:])
        else:
            out.append(line)
    return "\n".join(out) + "\n"


def apply_reverse(checked_diff: str, patched: str) -> str:
    """Reverse-apply a checked diff to the patched text. Only on copies."""
    hunks = parse(reverse(checked_diff))
    restored, _ = _apply(patched, hunks)
    return restored
