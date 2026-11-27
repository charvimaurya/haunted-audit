/**
 * AgentCard
 *
 * One agent card in the "The Ghost Hunt — Agent Investigation" section.
 * Uses real telemetry rows, explicit status badge, and real run metadata footer.
 */
import { Chip } from '@heroui/react';
import { Check, Loader2, X } from 'lucide-react';
import type { ReactNode } from 'react';

export interface AgentOutcome {
  label: string;
  passed: boolean;
  highlight?: string;
  detail?: string;
}

export type AgentCardStatus = 'idle' | 'running' | 'passed' | 'blocked';

interface AgentCardProps {
  /** Agent name e.g. "Keyboard Agent" */
  name: string;
  /** Subtitle e.g. "Tab & Enter traversal" */
  roleLabel?: string;
  /** Lucide icon node */
  icon: ReactNode;
  outcomes: AgentOutcome[];
  status?: AgentCardStatus;
  isRunning?: boolean;
  emptyText?: string;
  /** Real measured metadata shown in card footer (run ID, latency, scenario, mode) */
  meta?: string | null;
  /** Overrides the card's accessible name (default: "<name> results"). */
  ariaLabel?: string;
}

const STATUS_BADGE: Record<AgentCardStatus, { label: string; color: 'default' | 'warning' | 'success' | 'danger' }> = {
  idle: { label: 'Idle', color: 'default' },
  running: { label: 'Running', color: 'warning' },
  passed: { label: 'Passed', color: 'success' },
  blocked: { label: 'Blocked', color: 'danger' },
};

export function AgentCard({
  name,
  roleLabel,
  icon,
  outcomes,
  status = 'idle',
  isRunning = false,
  emptyText = 'Not run yet',
  meta = null,
  ariaLabel,
}: AgentCardProps) {
  const effectiveStatus: AgentCardStatus = isRunning ? 'running' : status;
  const badge = STATUS_BADGE[effectiveStatus];

  return (
    <article
      className="v9-agent-card h-full"
      aria-label={ariaLabel ?? `${name} results`}
    >
      <div>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="v9-agent-neon" aria-hidden="true">
              {icon}
            </span>
            <div className="min-w-0">
              <h3 className="m-0 truncate text-[18px] font-extrabold text-white">{name}</h3>
              {roleLabel && <p className="m-0 text-xs text-[#9aa3c7]">{roleLabel}</p>}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {effectiveStatus === 'running' && (
              <Loader2 size={14} className="text-amber-300 motion-safe:animate-spin" aria-label="running" />
            )}
            <Chip size="sm" variant="flat" color={badge.color} className="text-[11px] font-semibold">
              {badge.label}
            </Chip>
          </div>
        </div>

        {outcomes.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-[#23284a] bg-[#0e1227] px-3.5 py-3 text-sm text-[#9aa3c7]">
            <span className="v9-fix-dot v9-fix-dot-wait" aria-hidden="true" />
            <span>{isRunning ? 'Listening for agent steps…' : emptyText}</span>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0" aria-label={`${name} outcome list`}>
            {outcomes.map((o, i) => (
              <li key={i} className="flex items-start gap-3 text-[15px] leading-snug">
                {o.passed ? (
                  <span className="v9-fix-dot v9-fix-dot-ok mt-0.5" aria-label="passed">
                    <Check size={13} strokeWidth={3} aria-hidden="true" />
                  </span>
                ) : (
                  <span className="v9-fix-dot v9-fix-dot-bad mt-0.5" aria-label="failed">
                    <X size={13} strokeWidth={3} aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0 flex-1 text-[#eef0ff]">
                  <p className="m-0">
                    {o.label}
                    {o.highlight && (
                      <span className="block font-semibold text-[#ff6b6b]">{o.highlight}</span>
                    )}
                  </p>
                  {o.detail && (
                    <p className="m-0 mt-0.5 truncate font-mono text-xs text-[#9aa3c7]" title={o.detail}>
                      {o.detail}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-[#23284a] pt-3 text-xs font-mono text-[#9aa3c7]">
        {meta ?? '-- · not yet measured'}
      </div>
    </article>
  );
}
