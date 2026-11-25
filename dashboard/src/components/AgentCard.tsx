/**
 * AgentCard
 *
 * One agent card in the "Ghost Hunt — Agent Investigation" section (annotation C).
 * Shows the agent name, icon, and a list of outcomes (pass/fail rows).
 */

import { Check, X, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

export interface AgentOutcome {
  label: string;
  passed: boolean;
  detail?: string;
}

interface AgentCardProps {
  /** Agent name e.g. "Keyboard Agent" */
  name: string;
  /** Emoji or lucide icon node */
  icon: ReactNode;
  outcomes: AgentOutcome[];
  isRunning?: boolean;
  /** Overrides the card's accessible name (default: "<name> results"). */
  ariaLabel?: string;
}

export function AgentCard({ name, icon, outcomes, isRunning = false, ariaLabel }: AgentCardProps) {
  return (
    <article
      className="v9-card flex flex-col gap-3 p-4"
      aria-label={ariaLabel ?? `${name} results`}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="v9-agent-icon flex h-7 w-7 items-center justify-center" aria-hidden="true">
          {icon}
        </span>
        <h3 className="text-[1.0625rem] font-bold font-ui text-ink">{name}</h3>
        {isRunning && (
          <Loader2
            size={13}
            className="ml-auto text-violet-neon animate-spin"
            aria-label="running"
          />
        )}
      </div>

      {/* Outcomes */}
      {outcomes.length === 0 && (
        <p className="m-0 text-base font-ui text-ink-muted">
          <span aria-hidden="true">--</span> <span>not yet measured</span>
        </p>
      )}
      {outcomes.length > 0 && (
      <ul className="flex flex-col gap-3" aria-label={`${name} outcome list`}>
        {outcomes.map((o, i) => (
          <li key={i} className="flex items-start gap-2.5 text-base font-ui">
            {/* v9 status dots: filled green with a tick, filled red with a cross; the word is the label */}
            {o.passed ? (
              <span className="v9-dot v9-dot-ok"><Check size={14} strokeWidth={3} aria-label="passed" /></span>
            ) : (
              <span className="v9-dot v9-dot-bad"><X size={14} strokeWidth={3} aria-label="failed" /></span>
            )}
            <span className={o.passed ? 'text-ink' : 'text-ink'}>
              {o.label}
              {o.detail && (
                <span className="block text-base text-ink-faint mt-0.5">{o.detail}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      )}
    </article>
  );
}
