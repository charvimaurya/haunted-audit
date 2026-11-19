/**
 * RunNotice: a plain-English message when a run could not start or finish.
 * Used for rate limits, "LLM paused", an unreachable backend and recorded runs.
 * Text comes from the API (`detail`); this component never invents a result.
 */

export interface RunNoticeProps {
  kind: 'limit' | 'paused' | 'offline' | 'recorded';
  message: string;
}

const LABELS: Record<RunNoticeProps['kind'], string> = {
  limit: 'Slow down',
  paused: 'LLM mode paused',
  offline: 'Backend not reachable',
  recorded: 'Recorded run, not live',
};

export function RunNotice({ kind, message }: RunNoticeProps) {
  return (
    <div
      role={kind === 'recorded' ? 'status' : 'alert'}
      className="mt-4 rounded-lg border border-ghost-blocked/40 bg-ghost-blocked/15 px-4 py-3 text-base text-ghost-blocked"
    >
      <p className="font-semibold">{LABELS[kind]}</p>
      <p>{message}</p>
    </div>
  );
}
