"""Generate dashboard/src/generated/planted.json from bank/PLANTED.md (ui-review UR-01)."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SOURCE = REPO / "bank" / "PLANTED.md"
OUT = REPO / "dashboard" / "src" / "generated" / "planted.json"
_ROW_RE = re.compile(r"^\|\s*(\d+)\s*\|")


def planted_total(text: str) -> int:
    """Count numbered barrier rows (1, 2, 3...) in PLANTED.md and reject gaps or repeats."""
    numbers: list[int] = []
    for line in text.splitlines():
        match = _ROW_RE.match(line)
        if match:
            numbers.append(int(match.group(1)))
    if not numbers:
        raise ValueError("No numbered barrier rows found in bank/PLANTED.md.")
    expected = list(range(1, len(numbers) + 1))
    if numbers != expected:
        raise ValueError(
            f"Planted barrier numbers must be sequential 1..{len(numbers)} without gaps or repeats; got {numbers}."
        )
    return len(numbers)


def main() -> int:
    try:
        text = SOURCE.read_text(encoding="utf-8")
        total = planted_total(text)
    except Exception as exc:
        print(f"export_planted.py error: {exc}", file=sys.stderr)
        return 1
    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {"total": total, "source": "bank/PLANTED.md"}
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
