/**
 * FixProvider: manages the Exorcist fix -> human approval -> Verifier -> Regression loop (.kiro/specs/exorcist/).
 * Supports both the latest live run and switching between tracked Possession runs saved in localStorage.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { API_BASE } from '../runs/api';
import {
  readTrackedFixRounds,
  saveTrackedFixRound,
  type TrackedFixRound,
} from '../runs/possessionHistory';
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
  const { result, history } = useRun();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(result?.run_id ?? null);
  const [loadedRunResult, setLoadedRunResult] = useState<JourneyResult | null>(null);
  const [trackedFixes, setTrackedFixes] = useState<Record<string, TrackedFixRound>>(() => readTrackedFixRounds());

  const [fix, setFix] = useState<Fix | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<JourneyResult | null>(null);
  const [voiceVerifyResult, setVoiceVerifyResult] = useState<JourneyResult | null>(null);
  const [regressionVoiceResult, setRegressionVoiceResult] = useState<JourneyResult | null>(null);

  const fixRef = useRef<Fix | null>(null);
  useEffect(() => {
    fixRef.current = fix;
  }, [fix]);

  // Follow the latest live run whenever a new run finishes or clears
  useEffect(() => {
    setSelectedRunId(result?.run_id ?? null);
  }, [result?.run_id]);

  // Keep trackedFixes synced if storage was cleared in Settings/Reports
  useEffect(() => {
    if (history.length === 0) {
      setTrackedFixes(readTrackedFixRounds());
    }
  }, [history.length]);

  const effectiveRunId = selectedRunId ?? result?.run_id ?? null;

  // Resolve full JourneyResult for whichever run is active
  useEffect(() => {
    setFix(null);
    setError(null);
    setVerifyResult(null);
    setVoiceVerifyResult(null);
    setRegressionVoiceResult(null);

    if (!effectiveRunId) {
      setLoadedRunResult(null);
      return;
    }

    if (result && result.run_id === effectiveRunId) {
      setLoadedRunResult(result);
    } else {
      let live = true;
      void call(`/runs/${effectiveRunId}`).then((r) => {
        const rec = r.data as { result?: JourneyResult | null } | null;
        if (live && r.ok) setLoadedRunResult(rec?.result ?? null);
      }).catch(() => {});
      return () => {
        live = false;
      };
    }
  }, [effectiveRunId, result]);

  // Auto-load tracked fix round when selecting a Possession run that already has a fix_id
  useEffect(() => {
    if (!effectiveRunId) return;
    const saved = trackedFixes[effectiveRunId];
    if (!saved?.fix_id) return;
    if (fixRef.current?.fix_id === saved.fix_id) return;
    let live = true;
    void call(`/fixes/${saved.fix_id}`).then((r) => {
      if (live && r.ok && r.data) {
        setFix(r.data as Fix);
      }
    }).catch(() => {});
    return () => {
      live = false;
    };
  }, [effectiveRunId, trackedFixes]);

  // Persist fix round status transitions cleanly into localStorage
  useEffect(() => {
    if (!fix) return;
    const round: TrackedFixRound = {
      run_id: fix.run_id,
      fix_id: fix.fix_id,
      status: fix.status,
      verify_verdict: fix.verify?.status === 'complete' ? fix.verify.verdict : null,
      verify_voice_verdict: fix.verify_voice?.status === 'complete' ? fix.verify_voice.verdict : null,
      regression_verdict: fix.regression?.status === 'complete' ? fix.regression.verdict : null,
      diff_sha_prefix: fix.diff_sha256 ? fix.diff_sha256.slice(0, 12) : null,
      updated_at: new Date().toISOString(),
    };
    setTrackedFixes((prev) => {
      const cur = prev[round.run_id];
      if (
        cur &&
        cur.fix_id === round.fix_id &&
        cur.status === round.status &&
        cur.verify_verdict === round.verify_verdict &&
        cur.verify_voice_verdict === round.verify_voice_verdict &&
        cur.regression_verdict === round.regression_verdict
      ) {
        return prev;
      }
      return saveTrackedFixRound(round);
    });
  }, [fix]);

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

  const selectRun = useCallback((runId: string) => {
    setSelectedRunId(runId);
  }, []);

  const propose = useCallback(async () => {
    if (effectiveRunId) await act(`/runs/${effectiveRunId}/fixes`, { exorcist_mode: 'scripted' });
  }, [act, effectiveRunId]);
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

  const running = [fix?.verify, fix?.regression, fix?.verify_voice, fix?.regression_voice].some((r) => r?.status === 'running');
  useEffect(() => {
    if (!fix || !running) return;
    const timer = setInterval(async () => {
      try {
        const r = await call(`/fixes/${fix.fix_id}`);
        if (r.ok) setFix(r.data as Fix);
      } catch {
        /* retry next tick */
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [fix, running]);

  const selectedResult = loadedRunResult ?? (result?.run_id === effectiveRunId ? result : null);

  const value = useMemo<FixValue>(
    () => ({
      fix,
      selectedRunId: effectiveRunId,
      selectedResult,
      selectRun,
      trackedFixes,
      verifyResult,
      voiceVerifyResult,
      regressionVoiceResult,
      busy,
      error,
      propose,
      approve,
      reject,
      verify,
      regression,
    }),
    [
      fix,
      effectiveRunId,
      selectedResult,
      selectRun,
      trackedFixes,
      verifyResult,
      voiceVerifyResult,
      regressionVoiceResult,
      busy,
      error,
      propose,
      approve,
      reject,
      verify,
      regression,
    ],
  );
  return <FixContext.Provider value={value}>{children}</FixContext.Provider>;
}
