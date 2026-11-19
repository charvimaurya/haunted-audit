"""The Docker base image and the pinned Playwright must be the same version."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_image_tag_matches_pinned_playwright() -> None:
    docker = (ROOT / "Dockerfile").read_text()
    tag = re.search(r"mcr\.microsoft\.com/playwright/python:v(\d+\.\d+\.\d+)", docker)
    pin = re.search(r"^playwright==(\d+\.\d+\.\d+)\s*$", (ROOT / "requirements.txt").read_text(), re.M)
    assert tag and pin, "Dockerfile tag or requirements.txt pin missing"
    assert tag.group(1) == pin.group(1)


def test_dockerignore_keeps_secrets_and_data_out() -> None:
    lines = {l.strip() for l in (ROOT / ".dockerignore").read_text().splitlines()}
    for must in (".env", ".env.*", ".git", ".venv", "data", "artifacts", "node_modules"):
        assert must in lines, f"{must} missing from .dockerignore"


def test_dockerfile_runs_non_root_under_init_with_container_flag() -> None:
    docker = (ROOT / "Dockerfile").read_text()
    assert "USER pwuser" in docker
    assert "tini" in docker
    assert "HAUNTED_AUDIT_CONTAINER=1" in docker
    assert "COPY .env" not in docker and "COPY . " not in docker
