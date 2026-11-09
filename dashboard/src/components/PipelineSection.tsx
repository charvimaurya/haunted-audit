/**
 * PipelineSection
 *
 * Find → Fix → Verify → Regression pipeline (annotation D in v7).
 *
 * Accessibility:
 * - tablist/tab/tabpanel pattern: each tab has id, aria-controls, tabIndex.
 *   The active tab is tabIndex={0}; inactive tabs are tabIndex={-1} so only
 *   one tab stop exists in the group (roving tabindex pattern).
 * - tabpanel has id + aria-labelledby pointing to the active tab.
 * - Verification list: status conveyed by icon + sr-only text, not colour alone.
 * - Regression alert uses role="alert" for the FAILED message.
 */

import { CheckCircle2, XCircle } from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import { GhostMascot } from './GhostMascot';
import type { JourneyResult } from '../types';

type PipelineStep = 1 | 2 | 3 | 4;

interface PipelineSectionProps {
  result: JourneyResult | null;
  activeStep?: PipelineStep;
}

const STEP_LABELS: Record<PipelineStep, string> = {
  1: 'Find',
  2: 'Fix',
  3: 'Verify',
  4: 'Regression',
};

const BROKEN_CODE = [
  { type: '-' as const, text: '<div class="pay-btn">Send Payment</div>' },
];

const FIXED_CODE = [
  { type: '+' as const, text: '<button type="submit" class="btn-primary">' },
  { type: '+' as const, text: '  Send Payment' },
  { type: '+' as const, text: '</button>' },
];

function StepTab({
  step,
  active,
  completed,
}: {
  step: PipelineStep;
  active: boolean;
  completed: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`pipeline-tab-${step}`}
      aria-selected={active}
      aria-controls="pipeline-tabpanel"
      // Roving tabindex: only the active tab is in the tab order
      tabIndex={active ? 0 : -1}
      className={[
        'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-ui font-medium',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon',
        active
          ? 'bg-violet-600 text-white shadow-glow'
          : completed
          ? 'bg-ghost-verified/15 text-ghost-verified border border-ghost-verified/30'
          : 'bg-base-surface text-ink-muted border border-base-line',
        // Completed tabs still look interactive so users know they've been visited
        !active ? 'cursor-default' : '',
      ].join(' ')}
    >
      <span
        className={[
          'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
          active ? 'bg-white/20' : 'bg-base-line',
        ].join(' ')}
        aria-hidden="true"
      >
        {step}
      </span>
      {STEP_LABELS[step]}
      {/* Status text for AT — "active" / "completed" / "upcoming" */}
      <span className="sr-only">
        {active ? '— current step' : completed ? '— completed' : '— upcoming'}
      </span>
    </button>
  );
}

export function PipelineSection({ result, activeStep = 1 }: PipelineSectionProps) {
  const isPassed = result?.verdict === 'PASSED';

  return (
    <section
      id="fixes"
      aria-labelledby="pipeline-heading"
      className="flex flex-col gap-4"
    >
      {/* Visible section heading at small size (not sr-only — helps orientation) */}
      <h2
        id="pipeline-heading"
        className="text-xs font-ui font-semibold text-ink-faint uppercase tracking-widest"
      >
        Audit Pipeline
      </h2>

      {/* Step tabs — roving tabindex group */}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Audit pipeline steps"
      >
        {([1, 2, 3, 4] as PipelineStep[]).map((s) => (
          <StepTab
            key={s}
            step={s}
            active={s === activeStep}
            completed={s < activeStep}
          />
        ))}
      </div>

      {/* Tab panel — labelled by the active tab */}
      <div
        id="pipeline-tabpanel"
        role="tabpanel"
        aria-labelledby={`pipeline-tab-${activeStep}`}
        tabIndex={0}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon rounded-xl"
      >
        {/* ── Fix ──────────────────────────────────────────────────── */}
        <div className="panel p-4 flex flex-col gap-3">
          <p className="text-xs font-ui text-ink-faint uppercase tracking-widest">
            Proposed Fix (by Exorcist Agent)
          </p>
          <CodeBlock
            lines={[...BROKEN_CODE, ...FIXED_CODE]}
            language="html"
            ariaLabel="Fix: replace div.pay-btn with a proper button element"
          />
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-ui font-semibold
                         bg-ghost-verified/15 border border-ghost-verified/40 text-ghost-verified
                         hover:bg-ghost-verified/25 transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ghost-verified"
              aria-label="Approve the proposed fix"
            >
              <CheckCircle2 size={12} aria-hidden="true" />
              Approve Fix
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-ui font-semibold
                         bg-base-surface border border-base-line text-ink-muted
                         hover:text-ink hover:border-base-surface transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
              aria-label="Reject the proposed fix"
            >
              <XCircle size={12} aria-hidden="true" />
              Reject
            </button>
          </div>
        </div>

        {/* ── Verify ─────────────────────────────────────────────── */}
        <div className="panel p-4 flex flex-col gap-3">
          <p className="text-xs font-ui text-ink-faint uppercase tracking-widest">
            Verification (by Verifier Agent)
          </p>
          <ul className="flex flex-col gap-2 list-none p-0 m-0" aria-label="Verification steps">
            {[
              { label: 'Replaying journey…',  done: true  },
              { label: 'Tab to Send Payment', done: true  },
              { label: 'Activate with Enter', done: true  },
              { label: 'Payment successful',  done: isPassed },
            ].map(({ label, done }) => (
              <li key={label} className="flex items-center gap-2 text-xs font-ui">
                <CheckCircle2
                  size={13}
                  className={done ? 'text-ghost-verified' : 'text-ink-faint'}
                  aria-hidden="true"
                />
                <span className={done ? 'text-ink-muted' : 'text-ink-faint'}>{label}</span>
                {/* Status conveyed in text so colour is not the sole carrier */}
                <span className="sr-only">{done ? 'done' : 'not yet done'}</span>
              </li>
            ))}
          </ul>
          {isPassed && (
            <div
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg
                         bg-ghost-verified/15 border border-ghost-verified/40 mt-1"
              role="status"
              aria-live="polite"
            >
              <CheckCircle2 size={14} className="text-ghost-verified" aria-hidden="true" />
              <span className="text-xs font-semibold font-ui text-ghost-verified">
                Journey Verified
              </span>
            </div>
          )}
        </div>

        {/* ── Regression Guard ─────────────────────────────────────── */}
        <div className="panel p-4 flex flex-col gap-3">
          <p className="text-xs font-ui text-ink-faint uppercase tracking-widest">
            Regression Guard (The Returning Ghost)
          </p>
          <div className="flex flex-col gap-1.5 text-xs font-ui text-ink-muted">
            <p>Bug reintroduced on purpose</p>
            <code className="font-mono text-xs text-ink-faint block mt-1">
              send_payment.spec.ts
            </code>
          </div>
          {/* role="alert" so AT immediately announces the failure */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                       bg-ghost-blocked/10 border border-ghost-blocked/40"
            role="alert"
          >
            <XCircle size={13} className="text-ghost-blocked shrink-0" aria-hidden="true" />
            <span className="text-xs font-mono text-ghost-blocked">
              FAILED: button not focusable
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <GhostMascot state="blocked" size={24} animate={false} />
            <p className="text-xs font-ui text-ink-muted italic">
              The ghost is back. But this time, we caught it.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
