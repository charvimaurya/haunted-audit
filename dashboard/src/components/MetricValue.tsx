/**
 * MetricValue
 *
 * Renders a measured number or "--" + "not yet measured" when null.
 * Always shows agent_mode next to results (product rule).
 * Never invents values.
 */

import type { AgentMode, MetricValue as TMetricValue } from '../types';

interface MetricValueProps {
  /** null = not yet measured */
  value: TMetricValue;
  /** Optional formatting function */
  format?: (n: number) => string;
  /** Displayed beside the value */
  label: string;
  /** Required: always shown next to a metric */
  agentMode: AgentMode;
  className?: string;
}

const MODE_BADGE: Record<AgentMode, string> = {
  llm:      'bg-violet-600/30 text-violet-300 border border-violet-600/50',
  scripted: 'bg-base-surface/60 text-ink-muted border border-base-line',
};

export function MetricValueDisplay({
  value,
  format = (n) => String(n),
  label,
  agentMode,
  className = '',
}: MetricValueProps) {
  const isUnmeasured = value === null || value === undefined;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {/* Value or placeholder */}
      <span
        className={`font-ui font-bold tabular-nums leading-none ${
          isUnmeasured
            ? 'text-2xl text-ink-faint'
            : 'text-2xl text-ink'
        }`}
        aria-label={isUnmeasured ? 'not yet measured' : format(value as number)}
      >
        {isUnmeasured ? '--' : format(value as number)}
      </span>

      {/* Label */}
      <span className="text-xs text-ink-muted text-center leading-tight">{label}</span>

      {/* Agent mode badge (always shown) */}
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium ${MODE_BADGE[agentMode]}`}
        aria-label={`agent mode: ${agentMode}`}
      >
        {agentMode}
      </span>

      {/* Screen-reader note for unmeasured — also render visible hint text */}
      {isUnmeasured && (
        <span className="text-[10px] font-ui text-ink-faint" aria-hidden="true">
          not yet measured
        </span>
      )}
    </div>
  );
}

/** Inline metric chip — used inside tables and cards */
export function MetricChip({
  value,
  format = (n) => String(n),
  agentMode,
}: {
  value: TMetricValue;
  format?: (n: number) => string;
  agentMode: AgentMode;
}) {
  const isUnmeasured = value === null || value === undefined;
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-sm"
      aria-label={isUnmeasured ? 'not yet measured' : format(value as number)}
    >
      <span className={isUnmeasured ? 'text-ink-faint' : 'text-ink'}>
        {isUnmeasured ? '--' : format(value as number)}
      </span>
      <span
        className={`text-[9px] px-1 py-0.5 rounded font-mono ${MODE_BADGE[agentMode]}`}
      >
        {agentMode}
      </span>
    </span>
  );
}
