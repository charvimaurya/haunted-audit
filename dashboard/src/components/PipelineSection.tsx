/**
 * PipelineSection
 *
 * Find → Fix → Verify → Regression pipeline (annotation D in v7).
 *
 * Real data only (no-mock-results REQ-NM-04, 05):
 * - Find shows the keyboard checker's finding from the last run, with its agent_mode.
 * - With a fix flow (FixProvider, the Fix pages), Proposed Fix, Verification and Regression show the real
 *   fix from GET /fixes/{id} (components/FixPanels.tsx). Without one they show "Not available yet".
 * - The step tabs show position only. They never claim a step is "completed".
 *
 * Accessibility:
 * - tablist/tab/tabpanel pattern: each tab has id and aria-controls. Every tab
 *   is a tab stop (Tab, then Enter or Space) because choosing a step changes the page.
 * - tabpanel has id + aria-labelledby pointing to the active tab.
 * - Status is icon plus text, never colour alone.
 */
import { ArrowRight, CircleSlash, XCircle, CheckCircle2 } from 'lucide-react';
import { ResultState } from './ResultState';
import { ProposedFixPanel, RegressionPanel, VerificationPanel } from './FixPanels';
import type { FixValue } from '../fixes/fixContext';
import type { ApiStatus } from '../runs/runContext';
import type { JourneyResult } from '../types';

type PipelineStep = 1 | 2 | 3 | 4;

interface PipelineSectionProps {
  result: JourneyResult | null;
  apiStatus?: ApiStatus;
  isRunning?: boolean;
  activeStep?: PipelineStep;
  /** The fix flow (FixProvider). Without it the three fix panels say "Not available yet". */
  flow?: FixValue | null;
  /** Called when a step tab is chosen (click, Enter, Space). */
  onSelectStep?: (step: PipelineStep) => void;
}

const STEP_LABELS: Record<PipelineStep, string> = {
  1: 'Find',
  2: 'Fix',
  3: 'Verify',
  4: 'Regression',
};

function StepTab({
  step,
  active,
  onSelect,
}: {
  step: PipelineStep;
  active: boolean;
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
          : 'bg-base-surface text-ink-muted border border-base-line',
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
      <span className="sr-only">{active ? '— current step' : `— step ${step} of 4`}</span>
    </button>
  );
}

function NotAvailable({ what, why }: { what: string; why: string }) {
  return (
    <p className="m-0 flex items-start gap-2 text-base font-ui text-ink-muted" data-result-state="not-available">
      <CircleSlash size={16} className="mt-1 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-semibold text-ink">Not available yet.</span> {what} {why}
      </span>
    </p>
  );
}

function FindPanel({ result, apiStatus, isRunning }: { result: JourneyResult | null; apiStatus: ApiStatus; isRunning: boolean }) {
  return (
    <div className="panel p-4 flex flex-col gap-3">
      <p className="text-base font-ui text-ink-faint uppercase tracking-widest">Finding (keyboard checker)</p>
      <ResultState result={result} apiStatus={apiStatus} isRunning={isRunning} hint="Start one in Possession Mode." />
      {result && !isRunning && (
        result.verdict === 'BLOCKED' ? (
          <p className="m-0 flex items-start gap-2 text-base font-ui text-ink">
            <XCircle size={16} className="mt-1 shrink-0 text-ghost-blocked" aria-hidden="true" />
            <span>
              Blocked: {result.reason_code ?? 'no reason code'}
              {result.blocked_element && (
                <code className="block font-mono text-base text-ink-muted">{result.blocked_element.selector}</code>
              )}
            </span>
          </p>
        ) : (
          <p className="m-0 flex items-start gap-2 text-base font-ui text-ink">
            <CheckCircle2 size={16} className="mt-1 shrink-0 text-ghost-verified" aria-hidden="true" />
            Passed: the keyboard reached and used Send Payment on the {result.variant} page.
          </p>
        )
      )}
      {result && !isRunning && (
        <p className="m-0 text-base font-ui text-ink-faint">From the checker, {result.agent_mode} mode.</p>
      )}
    </div>
  );
}

export function PipelineSection({
  result,
  apiStatus = 'online',
  isRunning = false,
  activeStep = 1,
  onSelectStep,
  flow = null,
}: PipelineSectionProps) {
  return (
    <section id="fixes" aria-labelledby="pipeline-heading" className="flex flex-col gap-4">
      {/* Visible section heading at small size (not sr-only, helps orientation) */}
      <h2 id="pipeline-heading" className="text-base font-ui font-semibold text-ink-faint uppercase tracking-widest">
        Audit Pipeline
      </h2>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Audit pipeline steps">
        {([1, 2, 3, 4] as PipelineStep[]).map((s) => (
          <span key={s} className="flex items-center gap-2">
            {s > 1 && <ArrowRight size={18} className="text-ink-faint" aria-hidden="true" />}
            <StepTab step={s} active={s === activeStep} onSelect={onSelectStep} />
          </span>
        ))}
      </div>

      <div
        id="pipeline-tabpanel"
        role="tabpanel"
        aria-labelledby={`pipeline-tab-${activeStep}`}
        tabIndex={0}
        className={`grid grid-cols-1 lg:grid-cols-3 ${flow ? '' : 'xl:grid-cols-4'} gap-4
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon rounded-xl`}
      >
        {!flow && <FindPanel result={result} apiStatus={apiStatus} isRunning={isRunning} />}

        {flow ? (
          <>
            <ProposedFixPanel result={result} apiStatus={apiStatus} isRunning={isRunning} flow={flow} />
            <VerificationPanel flow={flow} />
            <RegressionPanel flow={flow} />
          </>
        ) : (
          <>
        <div className="panel p-4 flex flex-col gap-3">
          <p className="text-base font-ui text-ink-faint uppercase tracking-widest">Proposed Fix (by Exorcist Agent)</p>
          <NotAvailable
            what="The Exorcist agent is not built, so no fix has been proposed."
            why="Its requirements are in .kiro/specs/exorcist/. A person will approve or reject every fix."
          />
        </div>

        <div className="panel p-4 flex flex-col gap-3">
          <p className="text-base font-ui text-ink-faint uppercase tracking-widest">Verification (by Verifier Agent)</p>
          <NotAvailable
            what="The Verifier is not built, so no fix has been verified."
            why="It needs a fix to check first."
          />
        </div>

        <div className="panel p-4 flex flex-col gap-3">
          <p className="text-base font-ui text-ink-faint uppercase tracking-widest">Regression Guard (The Returning Ghost)</p>
          <NotAvailable
            what="No regression test exists yet."
            why="It will put the bug back on purpose and check that the test catches it."
          />
        </div>
          </>
        )}
      </div>
    </section>
  );
}
