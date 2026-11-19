"""The event stream sends a comment every 15 seconds so the load balancer keeps it open."""
from __future__ import annotations

import asyncio
import json

from fastapi.testclient import TestClient

from agent.api.limits import LimitSettings
from agent.api.main import KEEPALIVE_SECONDS, RunStore, _event_stream, create_app


class Ticker:
    """A fake clock that moves forward each time the stream sleeps."""

    def __init__(self, step: float) -> None:
        self.now = 0.0
        self.step = step

    def __call__(self) -> float:
        return self.now

    async def sleep(self, _seconds: float) -> None:
        self.now += self.step


async def collect(gen, limit=50):
    out = []
    async for chunk in gen:
        out.append(chunk)
        if len(out) >= limit:
            break
    return out


def _store(tmp_path):
    store = RunStore(tmp_path / "s.db")
    store.insert_running("r1", "broken", "scripted")
    return store


def test_interval_is_fifteen_seconds() -> None:
    assert KEEPALIVE_SECONDS == 15


def test_comment_appears_after_the_interval_and_not_before(tmp_path, monkeypatch) -> None:
    store = _store(tmp_path)
    ticker = Ticker(step=5.0)
    monkeypatch.setattr(asyncio, "sleep", ticker.sleep)
    chunks = asyncio.run(collect(_event_stream(store, "r1", 0, keepalive=15, clock=ticker), limit=2))
    assert chunks == [": keep-alive\n\n", ": keep-alive\n\n"]
    assert ticker.now == 30.0  # first comment at 15 s, second at 30 s


def test_comments_do_not_change_ids_or_the_done_event(tmp_path, monkeypatch) -> None:
    store = _store(tmp_path)
    ticker = Ticker(step=10.0)
    monkeypatch.setattr(asyncio, "sleep", ticker.sleep)

    async def run():
        out = []
        gen = _event_stream(store, "r1", 0, keepalive=15, clock=ticker)
        async for chunk in gen:
            out.append(chunk)
            if chunk.startswith(": keep-alive") and len(out) == 1:
                store.append_event("r1", {"tool": "press_tab"})
                store.append_event("r1", {"tool": "read_focus"})
                store.complete("r1", {"verdict": "BLOCKED"}, status="complete")
        return out

    out = asyncio.run(run())
    assert out[0] == ": keep-alive\n\n"
    ids = [c.split("\n")[0] for c in out if c.startswith("id: ")]
    assert ids == ["id: 1", "id: 2"]
    assert out[-1].startswith("event: done\n")
    assert json.loads(out[-1].split("data: ")[1])["status"] == "complete"


def test_no_comment_while_events_keep_flowing(tmp_path, monkeypatch) -> None:
    store = _store(tmp_path)
    ticker = Ticker(step=10.0)
    monkeypatch.setattr(asyncio, "sleep", ticker.sleep)
    store.append_event("r1", {"n": 0})  # the stream is never idle for 15 s

    async def run():
        out = []
        n = 0
        async for chunk in _event_stream(store, "r1", 0, keepalive=15, clock=ticker):
            out.append(chunk)
            n += 1
            if n < 4:
                store.append_event("r1", {"n": n})  # a fresh event every loop
            else:
                store.complete("r1", {"verdict": "PASSED"}, status="complete")
        return out

    assert not [c for c in asyncio.run(run()) if c.startswith(":")]


def test_last_event_id_skips_events_already_seen(tmp_path) -> None:
    store = _store(tmp_path)
    for i in range(1, 6):
        store.append_event("r1", {"i": i})
    store.complete("r1", {"verdict": "BLOCKED"}, status="complete")
    chunks = asyncio.run(collect(_event_stream(store, "r1", 3)))
    ids = [c.split("\n")[0] for c in chunks if c.startswith("id: ")]
    assert ids == ["id: 4", "id: 5"]


def test_http_resume_header_and_stream_headers(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://x.example")
    app = create_app(tmp_path / "a.db", settings=LimitSettings(), seed_path=None, artifacts_root=None)
    store = app.state.store
    store.insert_running("r9", "broken", "scripted")
    for i in range(1, 4):
        store.append_event("r9", {"i": i})
    store.complete("r9", {"verdict": "BLOCKED"}, status="complete")
    client = TestClient(app)
    with client.stream("GET", "/runs/r9/events", headers={"Last-Event-ID": "2"}) as r:
        body = "".join(r.iter_text())
        assert r.headers["cache-control"] == "no-cache"
        assert r.headers["x-accel-buffering"] == "no"
    assert "id: 3" in body and "id: 1\n" not in body and "id: 2\n" not in body
    with client.stream("GET", "/runs/r9/events", headers={"Last-Event-ID": "not-a-number"}) as r:
        assert "id: 1" in "".join(r.iter_text())
