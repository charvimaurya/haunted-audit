"""Shared paths for the keyboard-agent tests."""

from __future__ import annotations

from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def artifacts(tmp_path: Path) -> Path:
    path = tmp_path / "artifacts"
    path.mkdir()
    return path
