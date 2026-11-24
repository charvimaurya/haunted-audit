"""journey-guard JG-02: regression guard logic, and real Playwright runs when the journey test packages are installed."""
from __future__ import annotations

import hashlib
from pathlib import Path

import pytest

from agent.fixes import regression_guard as rg

FIXTURE = rg.REPO / "fixtures" / "haunted_bank" / "index.html"
INSTALLED = (rg.JOURNEYS / "node_modules" / "@playwright" / "test").is_dir()
needs_node = pytest.mark.skipif(not INSTALLED, reason="tests/journeys is not installed (cd tests/journeys && npm install)")


def _r(*results: str, msg: str | None = rg.FOCUS_MESSAGE + ": 30 presses") -> list[rg.StepResult]:
    return [rg.StepResult(s, r, msg if r == "FAIL" else None) for s, r in zip(rg.STEPS, results)]


def test_judge_pass_fail_pass_with_focus_message_works():
    assert rg.judge(_r("PASS", "FAIL", "PASS")) == "GUARD_WORKS"


@pytest.mark.parametrize("seq", [("PASS", "PASS", "PASS"), ("FAIL", "FAIL", "FAIL"), ("PASS", "FAIL", "FAIL"),
                                 ("FAIL", "FAIL", "PASS"), ("PASS", "FAIL")])
def test_judge_other_sequences_are_broken(seq):
    assert rg.judge(_r(*seq)) == "GUARD_BROKEN"


def test_judge_fail_for_another_reason_is_broken():
    assert rg.judge(_r("PASS", "FAIL", "PASS", msg="Error: page.goto: net::ERR_FILE_NOT_FOUND")) == "GUARD_BROKEN"


def test_copies_differ_only_by_the_patch(tmp_path: Path):
    applied, removed, restored = rg.build_copies(tmp_path)
    source = FIXTURE.read_text(encoding="utf-8")
    assert removed.read_text(encoding="utf-8") == source
    assert applied.read_text(encoding="utf-8") == restored.read_text(encoding="utf-8")
    assert '<button type="submit" class="btn-primary" id="send-payment">' in applied.read_text(encoding="utf-8")


def test_missing_packages_is_not_a_result(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(rg, "JOURNEYS", tmp_path)
    with pytest.raises(rg.SetupError):
        rg._npx()


@needs_node
def test_real_guard_works_and_fixture_unchanged(tmp_path: Path):
    before = hashlib.sha256(FIXTURE.read_bytes()).hexdigest()
    guard_result, results = rg.run_once(tmp_path)
    assert [r.result for r in results] == ["PASS", "FAIL", "PASS"]
    assert rg.FOCUS_MESSAGE in (results[1].message or "")
    assert guard_result == "GUARD_WORKS"
    assert hashlib.sha256(FIXTURE.read_bytes()).hexdigest() == before


@needs_node
def test_always_pass_test_gives_guard_broken(tmp_path: Path):
    fake = rg.JOURNEYS / "always-pass.tmp.spec.ts"
    fake.write_text('import { test } from "@playwright/test";\ntest("always passes", async () => {});\n')
    try:
        guard_result, results = rg.run_once(tmp_path / "pages", fake)
    finally:
        fake.unlink()
    assert [r.result for r in results] == ["PASS", "PASS", "PASS"]
    assert guard_result == "GUARD_BROKEN"
