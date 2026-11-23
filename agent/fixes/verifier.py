"""Verifier and regression check: apply an approved diff to a COPY of the bank and let the checker decide.

Nothing here writes to fixtures/ or any tracked file (exorcist REQ-X-08). Copies live in artifacts/verify/<fix_id>/
(git-ignored). The browser route guard allows that folder: it holds only our own copies of the bundled bank.
"""
from __future__ import annotations

from pathlib import Path

from agent.fixes.diffcheck import apply_reverse, check
from agent.fixes.exorcist import page_source

REPO = Path(__file__).resolve().parents[2]
VERIFY_ROOT = REPO / "artifacts" / "verify"


def _write(fix_id: str, name: str, text: str) -> Path:
    if not fix_id.replace("-", "").isalnum():
        raise ValueError("bad fix id")
    folder = VERIFY_ROOT / fix_id
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / name
    path.write_text(text, encoding="utf-8")
    return path


def patched_copy(fix_id: str, diff: str) -> Path:
    """The bank with the approved diff applied. The diff is re-checked against today's file first."""
    checked = check(diff, page_source())
    return _write(fix_id, "patched.html", checked.patched)


def reintroduced_copy(fix_id: str, diff: str) -> Path:
    """The patched copy with the same diff reversed: the bug put back on purpose."""
    checked = check(diff, page_source())
    return _write(fix_id, "reintroduced.html", apply_reverse(checked.diff, checked.patched))


def start_url(path: Path) -> str:
    return f"{path.resolve().as_uri()}?variant=broken"
