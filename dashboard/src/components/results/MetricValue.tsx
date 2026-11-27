/**
 * MetricValue
 *
 * Renders a measured number or "--" + "not yet measured" when null.
 * Always shows agent_mode next to results (product rule).
 * Never invents values.
 */

import { useEffect, useState } from 'react';
import { Chip } from '@heroui/react';
import type { AgentMode, MetricValue as TMetricValue } from '../../types/index';
import { useMotionAllowed } from '../../immersion/ImmersionContext';
import { shouldAnimateCounter } from '../../immersion/motion';

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
  const shown = useMeasuredCount(isUnmeasured ? null : value);

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
        {isUnmeasured || shown === null ? '--' : format(shown)}
      </span>

      {/* Label */}
      <span className="text-base text-ink-muted text-center leading-tight">{label}</span>

      {/* Agent mode badge (always shown) */}
      <Chip
        size="sm"
        variant="flat"
        color={agentMode === 'llm' ? 'secondary' : 'default'}
        className="font-mono font-medium"
        aria-label={`agent mode: ${agentMode}`}
      >
        {agentMode}
      </Chip>

      {/* Screen-reader note for unmeasured — also render visible hint text */}
      {isUnmeasured && (
        <span className="text-base font-ui text-ink-faint" aria-hidden="true">
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
      className="inline-flex items-center gap-1 font-mono text-base"
      aria-label={isUnmeasured ? 'not yet measured' : format(value as number)}
    >
      <span className={isUnmeasured ? 'text-ink-faint' : 'text-ink'}>
        {isUnmeasured ? '--' : format(value as number)}
      </span>
      <span
        className={`text-base px-1 py-0.5 rounded font-mono ${MODE_BADGE[agentMode]}`}
      >
        {agentMode}
      </span>
    </span>
  );
}

/** Ease toward a measured number. Unmeasured values stay null and never start a count. */
function useMeasuredCount(value: number | null): number | null {
  const motionAllowed = useMotionAllowed();
  const [shown, setShown] = useState<number | null>(value);

  useEffect(() => {
    if (!shouldAnimateCounter(value, motionAllowed) || value === null) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 600);
      const step =
        Number.isInteger(value) && value >= 1
          ? Math.max(1, Math.round(value * t))
          : Number.isInteger(value)
            ? Math.round(value * t)
            : value * t;
      setShown(t >= 1 ? value : step);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, motionAllowed]);

  return shown;
}
