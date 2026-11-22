/**
 * PipelineSection
 *
 * Find → Fix → Verify → Regression pipeline (annotation D in v7).
 *
 * Accessibility:
 * - tablist/tab/tabpanel pattern: each tab has id and aria-controls. Every tab
 *   is a tab stop (Tab, then Enter or Space) because choosing a step changes the page.
 * - tabpanel has id + aria-labelledby pointing to the active tab.
 * - Verification list: status conveyed by icon + sr-only text, not colour alone.
 * - Regression alert uses role="alert" for the FAILED message.
 */

import { CheckCircle2, XCircle } from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import type { JourneyResult } from '../types';

type PipelineStep = 1 | 2 | 3 | 4;

interface PipelineSectionProps {
  result: JourneyResult | null;
  activeStep?: PipelineStep;
  /** Called when a step tab is chosen (click, Enter, Space, arrow keys). */
  onSelectStep?: (step: PipelineStep) => void;
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
  onSelect,
}: {
  step: PipelineStep;
  active: boolean;
  completed: boolean;
  onSelect?: (step: PipelineStep) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`pipeline-tab-${step}`}
      aria-selected={active}
      aria-controls="pipeline-tabpanel"
      // Every step is a tab stop, because choosing a step changes the page
      tabIndex={0}
      onClick={() => onSelect?.(step)}
      className={[
        'flex items-center gap-2 px-4 py-2 rounded-full text-base font-ui font-medium',
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
          'w-5 h-5 rounded-full flex items-center justify-center text-base font-bold shrink-0',
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

export function PipelineSection({ result, activeStep = 1, onSelectStep }: PipelineSectionProps) {
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
        className="text-base font-ui font-semibold text-ink-faint uppercase tracking-widest"
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
            onSelect={onSelectStep}
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
          <p className="text-base font-ui text-ink-faint uppercase tracking-widest">
            Proposed Fix (by Exorcist Agent)
          </p>
          <p className="m-0 text-base font-ui text-ink-muted">
            Example fix. The Exorcist agent is not built yet, so no fix has been proposed.
          </p>
          <CodeBlock
            lines={[...BROKEN_CODE, ...FIXED_CODE]}
            language="html"
            ariaLabel="Fix: replace div.pay-btn with a proper button element"
          />
          <p className="m-0 text-base font-ui text-ink-muted">
            Approve and Reject appear when a fix exists. A person approves every change.
          </p>
        </div>
        {/* ── Verify ─────────────────────────────────────────────── */}
        <div className="panel p-4 flex flex-col gap-3">
          <p className="text-base font-ui text-ink-faint uppercase tracking-widest">
            Verification (by Verifier Agent)
          </p>
          {result?.verdict ? (
            <ul className="flex flex-col gap-2 list-none p-0 m-0" aria-label="Verification steps">
              {[
                { label: 'Reached Send Payment by keyboard', done: result.target_ever_focused },
                { label: 'Payment journey completed', done: isPassed },
              ].map(({ label, done }) => (
                <li key={label} className="flex items-center gap-2 text-base font-ui">
                  {done ? (
                    <CheckCircle2 size={16} className="text-ghost-verified" aria-hidden="true" />
                  ) : (
                    <XCircle size={16} className="text-ghost-blocked" aria-hidden="true" />
                  )}
                  <span className="text-ink-muted">{label}</span>
                  {/* Status in text so colour is not the only carrier */}
                  <span className="sr-only">{done ? 'yes' : 'no'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-base font-ui text-ink-muted">
              <span aria-hidden="true">--</span> not yet measured. Run a journey first.
            </p>
          )}
          <p className="m-0 text-base font-ui text-ink-faint">
            From the checker ({result?.agent_mode ?? '--'} mode). A Verifier agent is not built yet.
          </p>
          {isPassed && (
            <div
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg
                         bg-ghost-verified/15 border border-ghost-verified/40 mt-1"
              role="status"
              aria-live="polite"
            >
              <CheckCircle2 size={14} className="text-ghost-verified" aria-hidden="true" />
              <span className="text-base font-semibold font-ui text-ghost-verified">
                Journey Verified
              </span>
            </div>
          )}
        </div>

        {/* ── Regression Guard ─────────────────────────────────────── */}
        <div className="panel p-4 flex flex-col gap-3">
          <p className="text-base font-ui text-ink-faint uppercase tracking-widest">
            Regression Guard (The Returning Ghost)
          </p>
          <p className="m-0 text-base font-ui text-ink-muted">
            <span aria-hidden="true">--</span> not yet measured. No regression test exists yet, so
            nothing has been reintroduced or caught.
          </p>
        </div>
      </div>
    </section>
  );
}
