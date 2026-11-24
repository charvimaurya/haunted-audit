/**
 * The whole loop in one go, on the bundled Haunted Bank (Find, Experience, Fix, Verify).
 * Runs the broken page, reads the checker's finding, asks the Exorcist for a fix, then waits for one person to approve.
 * After approval it replays the keyboard and voice runs on the patched copy. Nothing here decides pass or fail:
 * every verdict is the checker's, read from the API. Approve changes no tracked file (data-contract.md, "Fix").
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '../runs/api';
import { shownRun, type RunRecordLike } from '../runs/record';
import type { Fix } from '../fixes/fixContext';
import type { JourneyResult } from '../types';

export type LoopPhase = 'idle' | 'finding' | 'proposing' | 'awaiting_approval' | 'verifying' | 'done' | 'nothing_to_fix' | 'failed';

export interface LoopState {
  phase: LoopPhase;
  found: JourneyResult | null;
  fix: Fix | null;
  /** Plain sentence for `failed`. */
  message: string | null;
}

const IDLE: LoopState = { phase: 'idle', found: null, fix: null, message: null };
const POLL_MS = 1000;
const GIVE_UP_MS = 120_000;

interface Reply { ok: boolean; status: number; data: unknown }

async function call(path: string, body?: unknown): Promise<Reply> {
  const res = await fetch(`${API_BASE}${path}`, body === undefined
    ? undefined
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
}

function refusal(data: unknown): string {
  const d = (data as { detail?: unknown } | null)?.detail;
  if (typeof d === 'string') return d;
  const m = (d as { message?: unknown } | null)?.message;
  return typeof m === 'string' ? m : 'The audit service refused that.';
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The copy runs are done when each one that started has a checker verdict. */
function copyRunsDone(fix: Fix): boolean {
  return [fix.verify, fix.verify_voice].every((r) => !r || r.verdict !== null || r.status === 'error');
}

export function useAutoLoop(recipient: string) {
  const [state, setState] = useState<LoopState>(IDLE);
  const live = useRef(true);
  useEffect(() => () => { live.current = false; }, []);
  const set = useCallback((s: Partial<LoopState>) => { if (live.current) setState((p) => ({ ...p, ...s })); }, []);
  const fail = useCallback((message: string) => set({ phase: 'failed', message }), [set]);

  const start = useCallback(async () => {
    setState({ ...IDLE, phase: 'finding' });
    try {
      const body = recipient.trim() ? { variant: 'broken', mode: 'scripted', recipient: recipient.trim() } : { variant: 'broken', mode: 'scripted' };
      const started = await call('/runs', body);
      if (!started.ok) return fail(refusal(started.data));
      const runId = (started.data as { run_id: string }).run_id;
      const deadline = Date.now() + GIVE_UP_MS;
      let rec: RunRecordLike & { status?: string } = {};
      while (Date.now() < deadline) {
        const r = await call(`/runs/${runId}`);
        rec = (r.data ?? {}) as RunRecordLike;
        if (r.ok && rec.status && rec.status !== 'running') break;
        await sleep(POLL_MS);
      }
      const shown = shownRun(rec);
      if (shown.error || !shown.result) return fail(shown.error ?? 'The run did not finish in time.');
      set({ found: shown.result });
      if (shown.result.verdict !== 'BLOCKED') return set({ phase: 'nothing_to_fix' });
      set({ phase: 'proposing' });
      const proposed = await call(`/runs/${runId}/fixes`, { exorcist_mode: 'scripted' });
      if (!proposed.ok) return fail(refusal(proposed.data));
      const fix = proposed.data as Fix;
      if (fix.status !== 'proposed' || !fix.diff_sha256) return fail(fix.error ?? 'The Exorcist could not propose a fix.');
      set({ fix, phase: 'awaiting_approval' });
    } catch {
      fail('The audit service did not answer.');
    }
  }, [recipient, set, fail]);

  const approve = useCallback(async (fix: Fix) => {
    if (!fix.diff_sha256) return;
    set({ phase: 'verifying', message: null });
    try {
      const ok = await call(`/fixes/${fix.fix_id}/approve`, { diff_sha256: fix.diff_sha256 });
      if (!ok.ok) return fail(refusal(ok.data));
      const v = await call(`/fixes/${fix.fix_id}/verify`, {});
      if (!v.ok) return fail(refusal(v.data));
      const deadline = Date.now() + GIVE_UP_MS;
      while (Date.now() < deadline) {
        const r = await call(`/fixes/${fix.fix_id}`);
        if (r.ok) {
          const latest = r.data as Fix;
          set({ fix: latest });
          if (latest.verify && copyRunsDone(latest)) return set({ phase: 'done' });
        }
        await sleep(POLL_MS);
      }
      fail('The verification did not finish in time.');
    } catch {
      fail('The audit service did not answer.');
    }
  }, [set, fail]);

  const reject = useCallback(async (fix: Fix) => {
    try { await call(`/fixes/${fix.fix_id}/reject`, {}); } catch { /* the reset below is enough */ }
    set({ phase: 'idle', fix: null, found: null, message: null });
  }, [set]);

  return { state, start, approve, reject };
}
