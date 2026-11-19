"""No scan route may exist without the URL guard (REQ-SAFE-06)."""
from __future__ import annotations

import re
from pathlib import Path

API = Path(__file__).resolve().parents[1] / "api"


def test_any_scan_route_module_imports_the_guard() -> None:
    offenders = []
    for path in API.glob("*.py"):
        if path.name == "url_guard.py":
            continue
        text = path.read_text()
        has_scan_route = re.search(r'@\w+\.(get|post|put|patch|delete|api_route)\(\s*["\'][^"\']*scan', text)
        if has_scan_route and "check_url" not in text:
            offenders.append(path.name)
    assert not offenders, f"scan route without url_guard.check_url: {offenders}"


def test_the_checker_catches_a_scan_route_without_the_guard(tmp_path) -> None:
    sample = '@app.post("/scans")\ndef scan(): ...'
    assert re.search(r'@\w+\.(get|post|put|patch|delete|api_route)\(\s*["\'][^"\']*scan', sample)
