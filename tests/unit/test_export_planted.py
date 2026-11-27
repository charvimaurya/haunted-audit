"""Tests for scripts/export_planted.py (ui-review UR-01, T01-T04)."""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from scripts.export_planted import OUT, SOURCE, planted_total

REPO = Path(__file__).resolve().parents[2]


def test_committed_json_matches_planted_md():
    assert OUT.is_file(), "Missing dashboard/src/generated/planted.json; run python scripts/export_planted.py"
    expected_total = planted_total(SOURCE.read_text(encoding="utf-8"))
    committed = json.loads(OUT.read_text(encoding="utf-8"))
    assert committed == {"total": expected_total, "source": "bank/PLANTED.md"}, (
        "planted.json is out of date; regenerate with: python scripts/export_planted.py"
    )


def test_total_counts_numbered_rows_only():
    sample = "\n".join([
        "# Planted",
        "| # | Issue |",
        "|---|---|",
        *[f"| {i} | Barrier {i} |" for i in range(1, 8)],
        "## What axe sees",
        "| `label` | `#amount` | 2 |",
        "## Not planted: the Reference field",
    ])
    assert planted_total(sample) == 7


@pytest.mark.parametrize("rows", [
    ["| 1 | A |", "| 2 | B |", "| 4 | D |"],
    ["| 1 | A |", "| 2 | B |", "| 2 | Dup |"],
    ["| `label` | `#amount` | 2 |"],
])
def test_gap_repeat_or_no_rows_fail_with_a_plain_message(rows):
    with pytest.raises(ValueError):
        planted_total("\n".join(rows))


def test_json_has_total_and_source_only():
    committed = json.loads(OUT.read_text(encoding="utf-8"))
    assert set(committed.keys()) == {"total", "source"}
    assert isinstance(committed["total"], int) and committed["total"] > 0
    assert committed["source"] == "bank/PLANTED.md"
