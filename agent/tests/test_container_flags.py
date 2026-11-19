"""Container-only Chromium flags and the bundled-site-only network guard."""
from __future__ import annotations

from agent.keyboard_agent import runner


def test_default_launch_keeps_the_sandbox(monkeypatch) -> None:
    monkeypatch.delenv("HAUNTED_AUDIT_CONTAINER", raising=False)
    assert runner._launch_args() == []


def test_container_launch_adds_no_sandbox_and_disables_dev_shm(monkeypatch) -> None:
    monkeypatch.setenv("HAUNTED_AUDIT_CONTAINER", "1")
    args = runner._launch_args()
    assert "--no-sandbox" in args and "--disable-dev-shm-usage" in args


def test_only_the_bundled_fixture_is_allowed() -> None:
    base = runner.FIXTURE_PATH.parent.as_uri()
    assert runner._is_bundled_url(f"{base}/index.html?variant=broken")
    assert runner._is_bundled_url("about:blank")
    for bad in (
        "http://example.com/x.png", "https://example.com/", "http://169.254.170.2/v2/credentials",
        "file:///etc/passwd", f"{base}-evil/index.html", "ftp://example.com/",
    ):
        assert not runner._is_bundled_url(bad), bad
