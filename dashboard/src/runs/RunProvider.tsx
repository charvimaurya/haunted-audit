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
import type { RunNoticeProps } from '../components/journey/RunNotice';
import type { AgentMode, JourneyResult, RecordedDetails, RunStatus, StepEvent, TestDetails, Variant } from '../types';
import { RunContext, type ApiStatus, type RunValue } from './runContext';
import { recordedDetails, shownRun, type RunRecordLike } from './record';
import { formatAmount } from '../components/journey/TestDetailsForm';
import {
  clearPossessionHistory,
  readAuditDefaults,
  readLastSavedResult,
  readPossessionHistory,
  savePossessionRun,
  type SavedPossessionRun,
} from './possessionHistory';
import { normalizeScenarioId, type ScenarioId } from './scenarios';

import { API_BASE } from './api';
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
  const initialDefaults = useMemo(() => readAuditDefaults(), []);
  const [scenario, setScenarioState] = useState<ScenarioId>('haunted-bank');
  const [variant, setVariant]       = useState<Variant>(initialDefaults.variant);
  const [mode, setMode]             = useState<AgentMode>(initialDefaults.mode);
  const [details, setDetails]       = useState<TestDetails>({ recipient: '', amount: '', reference: '' });
  const [runDetails, setRunDetails] = useState<RecordedDetails | null>(null);
  const [runStatus, setRunStatus]   = useState<RunStatus | null>(null);
  const [result, setResult]         = useState<JourneyResult | null>(() => readLastSavedResult());
  const [history, setHistory]       = useState<SavedPossessionRun[]>(() => readPossessionHistory());
  const [liveEvents, setLiveEvents] = useState<StepEvent[]>([]);
  const [notice, setNotice]         = useState<RunNoticeProps | null>(null);
  const [apiStatus, setApiStatus]   = useState<ApiStatus>('checking');
  const [runError, setRunError]     = useState<string | null>(null);
  const [voiceResult, setVoiceResultState] = useState<JourneyResult | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  const setScenario = useCallback((next: ScenarioId) => {
    const normalized = normalizeScenarioId(next);
    setScenarioState((prev) => {
      if (prev !== normalized) {
        sseRef.current?.close();
        setDetails({ recipient: '', amount: '', reference: '' });
        setRunDetails(null);
        setResult(null);
        setLiveEvents([]);
        setNotice(null);
        setRunError(null);
        setRunStatus(null);
        setVoiceResultState(null);
      }
      return normalized;
    });
  }, []);

  const setVoiceResult = useCallback(
    (r: JourneyResult | null) => {
      setVoiceResultState(r);
      if (r && !r.error) {
        setHistory(savePossessionRun(r, normalizeScenarioId(r.scenario ?? scenario)));
      }
    },
    [scenario],
  );

  const clearHistory = useCallback(() => {
    clearPossessionHistory();
    setHistory([]);
    setResult(null);
    setRunDetails(null);
    setRunStatus(null);
    setVoiceResultState(null);
  }, []);

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

  const run = useCallback(async (options?: { liveTab?: Window | null }) => {
    // Reset state
    const liveTab = options?.liveTab ?? null;
    setResult(null);
    setRunDetails(null);
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
        // The form's current values: what the tester typed, or text a voice run typed into the bank
        // (only a voice_type step with outcome "done", user-typed-test-details REQ-TD-11). Nothing is made up.
        body: JSON.stringify({
          scenario,
          variant,
          mode,
          recipient: details.recipient.trim(),
          amount: formatAmount(details.amount) ?? details.amount.trim(),
          ...(details.reference.trim() ? { reference: details.reference.trim() } : {}),
        }),
      });
      if (!res.ok) {
        if (liveTab && !liveTab.closed) liveTab.close();
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
      if (liveTab && !liveTab.closed) {
        const returnTo =
          typeof window !== 'undefined' ? `${window.location.origin}/app/fixes/${encodeURIComponent(run_id)}` : `/app/fixes/${encodeURIComponent(run_id)}`;
        liveTab.location.href = `${API_BASE}/sandbox/${encodeURIComponent(scenario)}?variant=${encodeURIComponent(variant)}&run_id=${encodeURIComponent(run_id)}&return_to=${encodeURIComponent(returnTo)}`;
      }

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
            const record = (await r.json()) as RunRecordLike;
            const shown = shownRun(record);
            setResult(shown.result);
            if (shown.result && !shown.error) {
              setHistory(savePossessionRun(shown.result, normalizeScenarioId(shown.result.scenario ?? scenario)));
            }
            setRunDetails(recordedDetails(record));
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
  }, [scenario, variant, mode, details]);

  const isRunning = runStatus === 'running';
  const value = useMemo<RunValue>(
    () => ({ scenario, variant, mode, details, setDetails, runDetails, runStatus, result, liveEvents, notice, isRunning, apiStatus, runError, setScenario, setVariant, setMode, run, voiceResult, setVoiceResult, history, clearHistory }),
    [scenario, variant, mode, details, runDetails, runStatus, result, liveEvents, notice, isRunning, apiStatus, runError, setScenario, run, voiceResult, setVoiceResult, history, clearHistory],
  );
  return <RunContext.Provider value={value}>{children}</RunContext.Provider>;
}
