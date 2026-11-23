/**
 * RunProvider
 *
 * Holds the live run so it survives page changes (Back, Forward, links).
 *
 * Live run flow:
 *   1. POST /runs -> run_id
 *   2. GET /runs/{id}/events (SSE) -> StepEvents
 *   3. On "done" -> GET /runs/{id} -> final JourneyResult
 *
 * API status: GET /health on load and every 30 s. While it does not answer, result areas show an offline
 * state instead of "Not run yet" (no-mock-results REQ-NM-03).
 *
 * API base URL: VITE_API_URL, default http://127.0.0.1:8000
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { RunNoticeProps } from '../components/RunNotice';
import type { AgentMode, JourneyResult, RunStatus, StepEvent, Variant } from '../types';
import { RunContext, type ApiStatus, type RunValue } from './runContext';
import { shownRun, type RunRecordLike } from './record';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://127.0.0.1:8000';
const HEALTH_EVERY_MS = 30_000;
const HEALTH_TIMEOUT_MS = 3_000;

async function checkHealth(): Promise<ApiStatus> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: ctrl.signal });
    return res.ok ? 'online' : 'offline';
  } catch {
    return 'offline';
  } finally {
    clearTimeout(timer);
  }
}

export function RunProvider({ children }: { children: ReactNode }) {
  const [variant, setVariant]       = useState<Variant>('broken');
  const [mode, setMode]             = useState<AgentMode>('scripted');
  const [runStatus, setRunStatus]   = useState<RunStatus | null>(null);
  const [result, setResult]         = useState<JourneyResult | null>(null);
  const [liveEvents, setLiveEvents] = useState<StepEvent[]>([]);
  const [notice, setNotice]         = useState<RunNoticeProps | null>(null);
  const [apiStatus, setApiStatus]   = useState<ApiStatus>('checking');
  const [runError, setRunError]     = useState<string | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  // Close the stream only when the whole app goes away, not on page changes
  useEffect(() => () => sseRef.current?.close(), []);

  // Is the API there? Checked on load and every 30 seconds.
  useEffect(() => {
    let live = true;
    const probe = () => {
      void checkHealth().then((s) => {
        if (live) setApiStatus(s);
      });
    };
    probe();
    const timer = setInterval(probe, HEALTH_EVERY_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);

  const run = useCallback(async () => {
    // Reset state
    setResult(null);
    setRunError(null);
    setLiveEvents([]);
    setNotice(null);
    setRunStatus('running');
    sseRef.current?.close();

    try {
      // POST /runs
      const res = await fetch(`${API_BASE}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant, mode }),
      });
      if (!res.ok) {
        // 429 = rate limit or busy, 403 = LLM mode paused. The API sends the plain-English text.
        const detail = await res
          .json()
          .then((b: { detail?: unknown }) => (typeof b.detail === 'string' ? b.detail : null))
          .catch(() => null);
        if (res.status === 429 || res.status === 403) {
          setNotice({
            kind: res.status === 403 ? 'paused' : 'limit',
            message: detail ?? 'The demo is busy. Try again in a moment.',
          });
        }
        setRunStatus('error');
        return;
      }
      const { run_id } = (await res.json()) as { run_id: string };

      // SSE stream
      const sse = new EventSource(`${API_BASE}/runs/${run_id}/events`);
      sseRef.current = sse;

      sse.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as StepEvent;
          setLiveEvents((prev) => [...prev, event]);
        } catch {
          /* ignore parse errors for non-step frames */
        }
      };

      sse.addEventListener('done', async () => {
        sse.close();
        // Fetch final result
        try {
          const r = await fetch(`${API_BASE}/runs/${run_id}`);
          if (r.ok) {
            const shown = shownRun((await r.json()) as RunRecordLike);
            setResult(shown.result);
            setRunError(shown.error);
            setRunStatus(shown.error ? 'error' : 'complete');
          } else {
            setRunStatus('error');
          }
        } catch {
          setRunStatus('error');
        }
      });

      sse.addEventListener('error', () => {
        sse.close();
        setRunStatus('error');
      });
    } catch {
      setNotice({
        kind: 'offline',
        message: 'The audit service did not answer. No result is shown. Try again later.',
      });
      setApiStatus('offline');
      setRunStatus('error');
    }
  }, [variant, mode]);

  const isRunning = runStatus === 'running';
  const value = useMemo<RunValue>(
    () => ({ variant, mode, runStatus, result, liveEvents, notice, isRunning, apiStatus, runError, setVariant, setMode, run }),
    [variant, mode, runStatus, result, liveEvents, notice, isRunning, apiStatus, runError, run],
  );
  return <RunContext.Provider value={value}>{children}</RunContext.Provider>;
}
