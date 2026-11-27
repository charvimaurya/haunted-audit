"""Regression test discovery without executing tests (TASK-13, design §9)."""

from __future__ import annotations

import json
import os
from pathlib import Path

from mcp_server.schemas import ListRegressionTestsOutput, RegressionTestEntry


def _find_test_files(workspace_root: Path) -> list[Path]:
    found: list[Path] = []
    seen: set[Path] = set()

    agent_tests = workspace_root / "agent" / "tests"
    if agent_tests.is_dir():
        for path in sorted(agent_tests.glob("test_*.py")):
            text = path.read_text(encoding="utf-8", errors="ignore")
            if "regression" in path.name or "send_payment" in path.name or "@pytest.mark.regression" in text or "regression" in text.lower():
                if path not in seen:
                    seen.add(path)
                    found.append(path)

    for rel_dir in ("e2e", "tests/journeys", "dashboard/e2e"):
        e2e_dir = workspace_root / rel_dir
        if e2e_dir.is_dir():
            for path in sorted(e2e_dir.glob("*.spec.ts")) + sorted(e2e_dir.glob("*.e2e.ts")):
                text = path.read_text(encoding="utf-8", errors="ignore")
                if "send-payment" in path.name or "haunted-audit" in text or "send-payment" in text:
                    if path not in seen:
                        seen.add(path)
                        found.append(path)

    return found


def list_regression_tests(
    workspace_root: Path | None = None,
    cache_path: Path | None = None,
) -> ListRegressionTestsOutput:
    root = (workspace_root or Path(os.environ.get("HAUNTED_AUDIT_WORKSPACE", "."))).resolve()
    cache_file = cache_path if cache_path is not None else (root / "data" / "regression_results.json")
    cache: dict[str, dict[str, str]] = {}
    if cache_file.is_file():
        try:
            loaded = json.loads(cache_file.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                cache = loaded
        except (OSError, ValueError):
            cache = {}

    entries: list[RegressionTestEntry] = []
    for path in _find_test_files(root):
        rel = path.relative_to(root).as_posix()
        cached = cache.get(rel) or cache.get(path.name) or {}
        last_result = cached.get("last_result") if isinstance(cached, dict) else None
        if last_result not in {"PASSED", "BLOCKED"}:
            last_result = None
        last_run_at = cached.get("last_run_at") if isinstance(cached, dict) else None
        entries.append(
            RegressionTestEntry(
                name=path.stem,
                path=rel,
                journey_id="send-payment",
                variant="broken",
                last_result=last_result,  # type: ignore[arg-type]
                last_run_at=last_run_at,
            )
        )

    return ListRegressionTestsOutput(tests=entries, count=len(entries))
