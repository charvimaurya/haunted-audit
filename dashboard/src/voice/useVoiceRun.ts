/**
 * Run voice commands on the real Haunted Bank through the API (voice-agent REQ-VA-07, 08).
 * POST /voice-runs, then the same GET /runs/{id}/events stream as keyboard runs, then GET /runs/{id}.
 * Steps arrive live in plain English. A crashed run is never shown as a verdict (runs/record.ts).
 * Each start() gets a new runSeq. A reply that belongs to an earlier start (a late step, a late "done",
 * a late fetch) is dropped, so it can never write into the newer run's state.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '../runs/api';
import { shownRun, type RunRecordLike } from '../runs/record';
import type { JourneyResult, StepEvent, Variant } from '../types';
import type { VoiceInputSource } from './interpretVoiceCommand';

export type VoiceStepOutcome = 'done' | 'failed' | 'not_understood';

export interface VoiceStep {
  step: number;
  message: string;
  outcome: VoiceStepOutcome;
  element?: { tag?: string; text?: string } | null;
  /** The step's tool, for example "voice_type" (data-contract.md, voice run). */
  tool: string;
  /** args.name: the field or control as said. Absent on voice_not_understood and voice_error. */
  name?: string;
  /** args.text: on voice_type, the text asked for. It was typed into the bank only when outcome is "done". */
  text?: string;
}

export type VoiceRunPhase = 'idle' | 'running' | 'finished' | 'failed' | 'refused' | 'offline';

export interface VoiceRunState {
  phase: VoiceRunPhase;
  steps: VoiceStep[];
  result: JourneyResult | null;
  /** Plain sentence for failed, refused or offline. */
  message: string | null;
  /** 0 before the first run; one more for every start(). Set at once, before the API answers. */
  runSeq: number;
}

const IDLE: VoiceRunState = { phase: 'idle', steps: [], result: null, message: null, runSeq: 0 };

/** One StepEvent from the stream or the final record, as the panel and the form fill read it. */
export function toStep(e: StepEvent): VoiceStep {
  const a = e.args as Record<string, unknown>;
  const outcome = (a.outcome as VoiceStepOutcome) ?? 'failed';
  return {
    step: e.step,
    message: typeof a.message === 'string' ? a.message : e.tool,
    outcome: outcome === 'done' || outcome === 'not_understood' ? outcome : 'failed',
    element: (a.element as VoiceStep['element']) ?? null,
    tool: e.tool,
    name: typeof a.name === 'string' ? a.name : undefined,
    text: typeof a.text === 'string' ? a.text : undefined,
  };
}

/** One command per non-empty line. */
export function commandsFrom(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 10);
}

export function useVoiceRun() {
  const [state, setState] = useState<VoiceRunState>(IDLE);
  const sseRef = useRef<EventSource | null>(null);
  const seqRef = useRef(0);

  useEffect(() => () => sseRef.current?.close(), []);

  const start = useCallback(async (variant: Variant, commands: string[], source: VoiceInputSource) => {
    sseRef.current?.close();
    const seq = ++seqRef.current;
    const current = () => seqRef.current === seq;
    // Every write below goes through this: dropped if a newer start() has begun.
    const update = (fn: (s: VoiceRunState) => VoiceRunState) => setState((s) => (current() && s.runSeq === seq ? fn(s) : s));
    setState({ phase: 'running', steps: [], result: null, message: null, runSeq: seq });
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/voice-runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant, commands, input_source: source }),
      });
    } catch {
      update(() => ({ ...IDLE, phase: 'offline', message: 'The audit service did not answer.', runSeq: seq }));
      return;
    }
    if (!res.ok) {
      const detail = await res.json().then((b: { detail?: unknown }) => b.detail).catch(() => null);
      update(() => ({ ...IDLE, phase: 'refused', runSeq: seq,
        message: typeof detail === 'string' ? detail : `The audit service refused the run (HTTP ${res.status}).` }));
      return;
    }
    const { run_id } = (await res.json()) as { run_id: string };
    if (!current()) return; // a newer run started while this one was being created
    const sse = new EventSource(`${API_BASE}/runs/${run_id}/events`);
    sseRef.current = sse;
    sse.onmessage = (e) => {
      try {
        const step = toStep(JSON.parse(e.data) as StepEvent);
        update((s) => ({ ...s, steps: [...s.steps.filter((x) => x.step !== step.step), step] }));
      } catch {
        /* not a step frame */
      }
    };
    sse.addEventListener('done', async () => {
      sse.close();
      try {
        const r = await fetch(`${API_BASE}/runs/${run_id}`);
        const shown = shownRun((await r.json()) as RunRecordLike);
        update((s) => shown.error
          ? { ...s, phase: 'failed', result: null, message: shown.error }
          : { ...s, phase: 'finished', result: shown.result,
              steps: shown.result ? shown.result.step_events.map(toStep) : s.steps });
      } catch {
        update((s) => ({ ...s, phase: 'failed', message: 'Could not read the finished run.' }));
      }
    });
    sse.addEventListener('error', () => {
      sse.close();
      update((s) => (s.phase === 'running' ? { ...s, phase: 'failed', message: 'The live step stream stopped.' } : s));
    });
  }, []);

  return { state, start };
}
