"""Public staging behaviour: /ping, CORS allow-list, request logs, limits, bundled-only agents."""
from __future__ import annotations

import json
import logging

import pytest
from fastapi.testclient import TestClient

from agent.api.limits import LimitSettings
from agent.api.main import allowed_origins, create_app

VERCEL = "https://haunted-audit.vercel.app"


def make(tmp_path, monkeypatch, *, settings=None, clock=None, origins=VERCEL):
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", origins)
    kwargs = {"settings": settings or LimitSettings(), "seed_path": None, "artifacts_root": None}
    if clock is not None:
        kwargs["clock"] = clock
    return TestClient(create_app(tmp_path / "runs.db", **kwargs))


def test_ping_is_200_and_needs_nothing_else(tmp_path, monkeypatch) -> None:
    client = make(tmp_path, monkeypatch)
    response = client.get("/ping")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert client.get("/health").status_code == 200


def test_star_origin_is_refused_at_startup(monkeypatch) -> None:
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "*")
    with pytest.raises(RuntimeError):
        allowed_origins()


def test_default_origins_are_local_only(monkeypatch) -> None:
    monkeypatch.delenv("CORS_ALLOWED_ORIGINS", raising=False)
    assert allowed_origins() == ["http://localhost:5173", "http://127.0.0.1:5173"]


def test_only_the_configured_origin_gets_cors_headers(tmp_path, monkeypatch) -> None:
    client = make(tmp_path, monkeypatch)
    ok = client.get("/ping", headers={"Origin": VERCEL})
    assert ok.headers["access-control-allow-origin"] == VERCEL
    assert "access-control-allow-credentials" not in ok.headers
    evil = client.get("/ping", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in evil.headers


def test_preflight_allows_only_listed_methods(tmp_path, monkeypatch) -> None:
    client = make(tmp_path, monkeypatch)
    headers = {
        "Origin": VERCEL,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    }
    assert client.options("/runs", headers=headers).status_code == 200
    bad = client.options("/runs", headers={**headers, "Access-Control-Request-Method": "DELETE"})
    assert bad.status_code == 400


def test_request_log_is_one_json_line_without_body(tmp_path, monkeypatch, caplog) -> None:
    client = make(tmp_path, monkeypatch)
    logger = logging.getLogger("haunted_audit")
    logger.addHandler(caplog.handler)
    try:
        with caplog.at_level(logging.INFO, logger="haunted_audit"):
            client.get("/runs/missing", headers={"X-Amzn-Trace-Id": "Root=1-abc"})
            client.post("/runs", json={"variant": "broken", "secret_field": "hunter2"})
    finally:
        logger.removeHandler(caplog.handler)
    lines = [json.loads(r.getMessage()) for r in caplog.records if r.name == "haunted_audit"]
    assert lines and all(line["msg"] == "request" for line in lines)
    assert lines[0]["status"] == 404 and lines[0]["request_id"] == "Root=1-abc"
    assert "hunter2" not in caplog.text


def test_ping_is_not_logged(tmp_path, monkeypatch, caplog) -> None:
    client = make(tmp_path, monkeypatch)
    logger = logging.getLogger("haunted_audit")
    logger.addHandler(caplog.handler)
    try:
        with caplog.at_level(logging.INFO, logger="haunted_audit"):
            client.get("/ping")
    finally:
        logger.removeHandler(caplog.handler)
    assert not [r for r in caplog.records if r.name == "haunted_audit"]


def test_run_body_rejects_urls_and_unknown_fields(tmp_path, monkeypatch) -> None:
    client = make(tmp_path, monkeypatch)
    for extra in ({"url": "http://example.com"}, {"selector": "#x"}, {"path": "/etc/passwd"}):
        response = client.post("/runs", json={"variant": "broken", "mode": "scripted", **extra})
        assert response.status_code == 422


class FakeClock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def _start_blocked_runs(client, n, **headers):
    return [client.post("/runs", json={"variant": "broken", "mode": "scripted"}, headers=headers) for _ in range(n)]


def test_sixth_run_in_a_minute_is_429_with_retry_after(tmp_path, monkeypatch) -> None:
    clock = FakeClock()
    s = LimitSettings(per_minute=5, per_hour=30, max_concurrent=99)
    client = make(tmp_path, monkeypatch, settings=s, clock=clock)
    responses = _start_blocked_runs(client, 6, **{"X-Forwarded-For": "203.0.113.9"})
    assert [r.status_code for r in responses[:5]] == [202] * 5
    assert responses[5].status_code == 429
    assert int(responses[5].headers["retry-after"]) >= 1
    assert "Try again" in responses[5].json()["detail"]
    clock.now += 61
    assert client.post(
        "/runs", json={"variant": "broken", "mode": "scripted"}, headers={"X-Forwarded-For": "203.0.113.9"}
    ).status_code == 202


def test_spoofed_leftmost_forwarded_for_does_not_dodge_the_limit(tmp_path, monkeypatch) -> None:
    clock = FakeClock()
    client = make(tmp_path, monkeypatch, settings=LimitSettings(per_minute=2, max_concurrent=99), clock=clock)
    codes = []
    for fake in ("1.1.1.1", "2.2.2.2", "3.3.3.3"):
        r = client.post(
            "/runs",
            json={"variant": "broken", "mode": "scripted"},
            headers={"X-Forwarded-For": f"{fake}, 198.51.100.7"},  # last entry is the ALB's
        )
        codes.append(r.status_code)
    assert codes == [202, 202, 429]


def test_concurrent_run_cap_is_global_and_frees_up(tmp_path, monkeypatch) -> None:
    import agent.api.main as main

    gate_open = {}

    def slow_execute(store, run_id, body, limiter=None, artifacts_root=None):
        import threading
        ev = gate_open.setdefault(run_id, threading.Event())
        ev.wait(5)
        store.complete(run_id, {"verdict": "BLOCKED"}, status="complete")
        limiter.release()

    monkeypatch.setattr(main, "_execute_run", slow_execute)
    client = make(tmp_path, monkeypatch, settings=LimitSettings(per_minute=99, per_hour=99, max_concurrent=2))
    a = client.post("/runs", json={}, headers={"X-Forwarded-For": "9.9.9.1"})
    b = client.post("/runs", json={}, headers={"X-Forwarded-For": "9.9.9.2"})
    c = client.post("/runs", json={}, headers={"X-Forwarded-For": "9.9.9.3"})
    assert (a.status_code, b.status_code, c.status_code) == (202, 202, 429)
    assert c.headers["retry-after"]
    for ev in gate_open.values():
        ev.set()
    import time
    time.sleep(0.2)
    d = client.post("/runs", json={}, headers={"X-Forwarded-For": "9.9.9.4"})
    assert d.status_code == 202
    for ev in gate_open.values():
        ev.set()


def test_gate_is_released_when_a_run_raises(tmp_path, monkeypatch) -> None:
    import agent.api.main as main
    import time

    def boom(*a, **k):
        raise RuntimeError("chromium missing")

    monkeypatch.setattr(main, "build_journey_config", boom)
    client = make(tmp_path, monkeypatch, settings=LimitSettings(per_minute=99, per_hour=99, max_concurrent=1))
    first = client.post("/runs", json={})
    assert first.status_code == 202
    time.sleep(0.3)
    assert client.get(f"/runs/{first.json()['run_id']}").json()["status"] == "error"
    assert client.post("/runs", json={}).status_code == 202


def test_llm_is_paused_unless_enabled(tmp_path, monkeypatch) -> None:
    client = make(tmp_path, monkeypatch, settings=LimitSettings(llm_enabled=False))
    r = client.post("/runs", json={"mode": "llm"})
    assert r.status_code == 403
    assert "paused" in r.json()["detail"]


def test_llm_daily_cap(tmp_path, monkeypatch) -> None:
    import agent.api.main as main

    monkeypatch.setattr(main, "_execute_run", lambda store, run_id, body, limiter=None, artifacts_root=None: (
        store.complete(run_id, {"verdict": "BLOCKED"}, status="complete"), limiter.release()))
    client = make(
        tmp_path, monkeypatch,
        settings=LimitSettings(per_minute=99, per_hour=99, max_concurrent=9, llm_enabled=True, llm_daily_cap=2),
    )
    codes = [client.post("/runs", json={"mode": "llm"}).status_code for _ in range(3)]
    assert codes == [202, 202, 429]
    assert client.post("/runs", json={"mode": "scripted"}).status_code == 202
