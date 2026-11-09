/**
 * AgentCard
 *
 * One agent card in the "Ghost Hunt — Agent Investigation" section (annotation C).
 * Shows the agent name, icon, and a list of outcomes (pass/fail rows).
 */

import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
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
}

export function AgentCard({ name, icon, outcomes, isRunning = false }: AgentCardProps) {
  return (
    <article
      className="panel flex flex-col gap-3 p-4"
      aria-label={`${name} results`}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span
          className="w-7 h-7 flex items-center justify-center rounded-md
                     bg-violet-600/20 border border-violet-600/40 text-base"
          aria-hidden="true"
        >
          {icon}
        </span>
        <h3 className="text-sm font-semibold font-ui text-ink">{name}</h3>
        {isRunning && (
          <Loader2
            size={13}
            className="ml-auto text-violet-neon animate-spin"
            aria-label="running"
          />
        )}
      </div>

      {/* Outcomes */}
      <ul className="flex flex-col gap-1.5" aria-label={`${name} outcome list`}>
        {outcomes.map((o, i) => (
          <li key={i} className="flex items-start gap-2 text-xs font-ui">
            {o.passed ? (
              <CheckCircle2
                size={13}
                className="text-ghost-verified shrink-0 mt-0.5"
                aria-label="passed"
              />
            ) : (
              <XCircle
                size={13}
                className="text-ghost-blocked shrink-0 mt-0.5"
                aria-label="failed"
              />
            )}
            <span className={o.passed ? 'text-ink-muted' : 'text-ghost-blocked'}>
              {o.label}
              {o.detail && (
                <span className="block text-[10px] text-ink-faint mt-0.5">{o.detail}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
