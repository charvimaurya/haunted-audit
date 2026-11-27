"""Unit tests for mcp_server.regression (TASK-13)."""

from __future__ import annotations

import json
from pathlib import Path

from mcp_server.regression import list_regression_tests


def test_list_regression_tests_with_and_without_cache(tmp_path: Path) -> None:
    (tmp_path / "agent" / "tests").mkdir(parents=True)
    (tmp_path / "e2e").mkdir(parents=True)
    (tmp_path / "agent" / "tests" / "test_regression_guard.py").write_text("# regression test\n", encoding="utf-8")
    (tmp_path / "e2e" / "send-payment.spec.ts").write_text("// send-payment\n", encoding="utf-8")

    uncached = list_regression_tests(tmp_path)
    assert uncached.count == 2
    assert all(t.last_result is None for t in uncached.tests)

    cache_file = tmp_path / "data" / "regression_results.json"
    cache_file.parent.mkdir(parents=True)
    cache_file.write_text(
        json.dumps(
            {
                "agent/tests/test_regression_guard.py": {
                    "last_result": "PASSED",
                    "last_run_at": "2026-11-27T02:00:00Z",
                }
            }
        ),
        encoding="utf-8",
    )
    cached = list_regression_tests(tmp_path, cache_file)
    assert cached.count == 2
    by_path = {t.path: t for t in cached.tests}
    assert by_path["agent/tests/test_regression_guard.py"].last_result == "PASSED"
    assert by_path["e2e/send-payment.spec.ts"].last_result is None
