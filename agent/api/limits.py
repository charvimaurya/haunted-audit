"""In-memory limits for the public staging API.

The service runs exactly one task, so process memory is the right place for
these counters. They reset when the task restarts.
"""

from __future__ import annotations

import os
import threading
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timezone

from fastapi import Request


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        value = int(raw)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be a whole number, got {raw!r}") from exc
    if value < 0:
        raise RuntimeError(f"{name} must not be negative")
    return value


@dataclass(frozen=True)
class LimitSettings:
    per_minute: int = 5
    per_hour: int = 30
    max_concurrent: int = 2
    llm_enabled: bool = False
    llm_daily_cap: int = 20

    @classmethod
    def from_env(cls) -> "LimitSettings":
        return cls(
            per_minute=_int_env("RATE_PER_MINUTE", 5),
            per_hour=_int_env("RATE_PER_HOUR", 30),
            max_concurrent=_int_env("MAX_CONCURRENT_RUNS", 2),
            llm_enabled=os.getenv("LLM_ENABLED", "false").strip().lower() == "true",
            llm_daily_cap=_int_env("LLM_DAILY_RUN_CAP", 20),
        )


class SlidingWindow:
    """Count hits per key inside a time window. Thread-safe."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def peek(self, key: str, *, limit: int, window_s: float, now: float) -> float | None:
        """Seconds to wait if `key` is at its limit, else None. Does not record."""
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] >= window_s:
                hits.popleft()
            if len(hits) >= limit:
                return max(1.0, window_s - (now - hits[0]))
            return None

    def record(self, key: str, *, now: float) -> None:
        with self._lock:
            self._hits[key].append(now)

    def forget_idle(self, *, window_s: float, now: float) -> None:
        with self._lock:
            for key in [k for k, h in self._hits.items() if not h or now - h[-1] >= window_s]:
                del self._hits[key]


class RunGate:
    """At most `limit` runs execute at once for the whole service."""

    def __init__(self, limit: int) -> None:
        self._limit = limit
        self._active = 0
        self._lock = threading.Lock()

    def try_acquire(self) -> bool:
        with self._lock:
            if self._active >= self._limit:
                return False
            self._active += 1
            return True

    def release(self) -> None:
        with self._lock:
            self._active = max(0, self._active - 1)

    @property
    def active(self) -> int:
        return self._active


class DailyCap:
    """Counts LLM runs per UTC day."""

    def __init__(self, cap: int) -> None:
        self._cap = cap
        self._day: str | None = None
        self._count = 0
        self._lock = threading.Lock()

    def try_take(self, now: datetime | None = None) -> bool:
        now = now or datetime.now(timezone.utc)
        day = now.astimezone(timezone.utc).date().isoformat()
        with self._lock:
            if day != self._day:
                self._day, self._count = day, 0
            if self._count >= self._cap:
                return False
            self._count += 1
            return True

    def give_back(self) -> None:
        with self._lock:
            self._count = max(0, self._count - 1)


def client_ip(request: Request) -> str:
    """The address the load balancer saw.

    The ALB appends the connecting address to the END of X-Forwarded-For. Earlier
    entries are written by the client and can be faked, so they are ignored.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        last = forwarded.split(",")[-1].strip()
        if last:
            return last
    return request.client.host if request.client else "unknown"


class Refusal(Exception):
    def __init__(self, status: int, message: str, retry_after: int | None = None) -> None:
        super().__init__(message)
        self.status = status
        self.message = message
        self.retry_after = retry_after


class RunLimiter:
    """Decides whether a POST /runs may start. Call `admit`, then `release` after the run."""

    def __init__(self, settings: LimitSettings, clock) -> None:
        self.settings = settings
        self._clock = clock
        self._minute = SlidingWindow()
        self._hour = SlidingWindow()
        self.gate = RunGate(settings.max_concurrent)
        self.llm_cap = DailyCap(settings.llm_daily_cap)

    def admit(self, ip: str, mode: str) -> None:
        s = self.settings
        if mode == "llm" and not s.llm_enabled:
            raise Refusal(
                403,
                "LLM mode is paused on this public demo to keep AWS costs low. "
                "Scripted mode still works.",
            )
        now = self._clock()
        wait = self._minute.peek(ip, limit=s.per_minute, window_s=60, now=now)
        if wait is None:
            wait = self._hour.peek(ip, limit=s.per_hour, window_s=3600, now=now)
        if wait is not None:
            raise Refusal(
                429,
                f"Too many runs from your address. Try again in {int(wait)} seconds.",
                retry_after=int(wait),
            )
        if not self.gate.try_acquire():
            raise Refusal(
                429,
                "The agent is busy with other runs. Try again in a few seconds.",
                retry_after=10,
            )
        if mode == "llm" and not self.llm_cap.try_take():
            self.gate.release()
            raise Refusal(
                429,
                "LLM mode has reached its daily limit on this public demo. "
                "Scripted mode still works.",
                retry_after=3600,
            )
        self._minute.record(ip, now=now)
        self._hour.record(ip, now=now)

    def release(self) -> None:
        self.gate.release()
