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
    <p className="relative z-[1] m-0 ml-auto flex items-center gap-2 text-base font-ui text-ink" data-run-state={state}>
      <GhostMascot state={state} size={28} animate={false} />
      <span>{text}</span>
    </p>
  );
}
