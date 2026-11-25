/**
 * FixProvider: the fix for the last finished run, kept across the four Fix pages (.kiro/specs/exorcist/).
 * Calls the real API only. While a Verifier or regression run is going, it re-reads GET /fixes/{id} each second.
 * A new run clears the fix.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { API_BASE } from '../runs/api';
import { useRun } from '../runs/runContext';
import { FixContext, type Fix, type FixValue } from './fixContext';
import type { JourneyResult } from '../types';

async function call(path: string, body?: unknown): Promise<{ ok: boolean; data: unknown }> {
  const res = await fetch(`${API_BASE}${path}`, body === undefined
    ? undefined
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, data };
}

function refusal(data: unknown): string {
  const d = (data as { detail?: unknown })?.detail;
  if (typeof d === 'string') return d;
  const m = (d as { message?: unknown })?.message;
  return typeof m === 'string' ? m : 'The audit service refused that.';
}

export function FixProvider({ children }: { children: ReactNode }) {
  const { result } = useRun();
  const [fix, setFix] = useState<Fix | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<JourneyResult | null>(null);
  const [voiceVerifyResult, setVoiceVerifyResult] = useState<JourneyResult | null>(null);
  const [regressionVoiceResult, setRegressionVoiceResult] = useState<JourneyResult | null>(null);
  const runId = result?.run_id ?? null;
  const fixRef = useRef<Fix | null>(null);
  useEffect(() => {
    fixRef.current = fix;
  }, [fix]);

  useEffect(() => {
    setFix(null);
    setError(null);
    setVerifyResult(null);
    setVoiceVerifyResult(null);
    setRegressionVoiceResult(null);
  }, [runId]);

  // When the Verifier's run is finished, read its steps once for the checklist.
  const verifyRunId = fix?.verify?.status === 'complete' ? fix.verify.run_id : null;
  useEffect(() => {
    if (!verifyRunId) return;
    let live = true;
    void call(`/runs/${verifyRunId}`).then((r) => {
      const rec = r.data as { result?: JourneyResult | null } | null;
      if (live && r.ok) setVerifyResult(rec?.result ?? null);
    }).catch(() => {});
    return () => {
      live = false;
    };
  }, [verifyRunId]);

  // The same for the voice run on the patched copy.
  const voiceRunId = fix?.verify_voice?.status === 'complete' ? fix.verify_voice.run_id : null;
  useEffect(() => {
    if (!voiceRunId) return;
    let live = true;
    void call(`/runs/${voiceRunId}`).then((r) => {
      const rec = r.data as { result?: JourneyResult | null } | null;
      if (live && r.ok) setVoiceVerifyResult(rec?.result ?? null);
    }).catch(() => {});
    return () => {
      live = false;
    };
  }, [voiceRunId]);

  // And for the voice run on the copy with the bug put back.
  const regressionVoiceRunId = fix?.regression_voice?.status === 'complete' ? fix.regression_voice.run_id : null;
  useEffect(() => {
    if (!regressionVoiceRunId) return;
    let live = true;
    void call(`/runs/${regressionVoiceRunId}`).then((r) => {
      const rec = r.data as { result?: JourneyResult | null } | null;
      if (live && r.ok) setRegressionVoiceResult(rec?.result ?? null);
    }).catch(() => {});
    return () => {
      live = false;
    };
  }, [regressionVoiceRunId]);

  const act = useCallback(async (path: string, body?: unknown, thenRead = false) => {
    setBusy(true);
    setError(null);
    try {
      const r = await call(path, body);
      if (!r.ok) {
        setError(refusal(r.data));
        return;
      }
      if (thenRead && fixRef.current) {
        const again = await call(`/fixes/${fixRef.current.fix_id}`);
        if (again.ok) setFix(again.data as Fix);
      } else {
        setFix(r.data as Fix);
      }
    } catch {
      setError('The audit service did not answer.');
    } finally {
      setBusy(false);
    }
  }, []);

  const propose = useCallback(async () => {
    if (runId) await act(`/runs/${runId}/fixes`, { exorcist_mode: 'scripted' });
  }, [act, runId]);
  const approve = useCallback(async () => {
    const f = fixRef.current;
    if (f?.diff_sha256) await act(`/fixes/${f.fix_id}/approve`, { diff_sha256: f.diff_sha256 });
  }, [act]);
  const reject = useCallback(async () => {
    const f = fixRef.current;
    if (f) await act(`/fixes/${f.fix_id}/reject`, {});
  }, [act]);
  const verify = useCallback(async () => {
    const f = fixRef.current;
    if (f) await act(`/fixes/${f.fix_id}/verify`, {}, true);
  }, [act]);
  const regression = useCallback(async () => {
    const f = fixRef.current;
    if (f) await act(`/fixes/${f.fix_id}/regression`, {}, true);
  }, [act]);

  // Re-read while a copy run is going.
  const running = [fix?.verify, fix?.regression, fix?.verify_voice, fix?.regression_voice].some((r) => r?.status === 'running');
  useEffect(() => {
    if (!fix || !running) return;
    const timer = setInterval(async () => {
      try {
        const r = await call(`/fixes/${fix.fix_id}`);
        if (r.ok) setFix(r.data as Fix);
      } catch {
        /* keep the last state; the next tick tries again */
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [fix, running]);

  const value = useMemo<FixValue>(
    () => ({ fix, verifyResult, voiceVerifyResult, regressionVoiceResult, busy, error, propose, approve, reject, verify, regression }),
    [fix, verifyResult, voiceVerifyResult, regressionVoiceResult, busy, error, propose, approve, reject, verify, regression],
  );
  return <FixContext.Provider value={value}>{children}</FixContext.Provider>;
}
