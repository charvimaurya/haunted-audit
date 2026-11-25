/**
 * RunStateBadge: the mascot in its Ready, Blocked or Verified state, with the same state in text
 * (status is never colour alone). Read from the last finished run, keyboard or voice (docs/ui-fidelity.md D8).
 */
import { useContext } from 'react';
import { GhostMascot } from './GhostMascot';
import { RunContext } from '../runs/runContext';
import type { GhostState } from '../types';

export function RunStateBadge() {
  const run = useContext(RunContext);
  const result = run?.isRunning ? null : run?.voiceResult ?? run?.result ?? null;
  const state: GhostState = !result ? 'ready' : result.verdict === 'PASSED' ? 'verified' : 'blocked';
  const text = !result
    ? run?.isRunning ? 'Ready: a run is going' : 'Ready: no run yet'
    : result.verdict === 'PASSED'
      ? `Verified: last run passed (${result.agent_mode})`
      : `Blocked: last run found a barrier (${result.agent_mode})`;
  return (
    // v9 head-bar chip. "Live Test" only while a run is going (design/v9/README.md); else the last run's state.
    <p
      className={`relative z-[1] m-0 ml-auto v9-chip ${run?.isRunning ? 'v9-chip-live' : state === 'verified' ? 'v9-chip-pass' : state === 'blocked' ? 'v9-chip-bad' : 'v9-chip-idle'}`}
      data-run-state={state}
    >
      <GhostMascot state={state} size={22} animate={false} />
      <span>{run?.isRunning ? `Live Test · ${text}` : text}</span>
    </p>
  );
}
