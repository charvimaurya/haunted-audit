/**
 * PossessionMode
 *
 * "Possession Mode — Keyboard-only demonstration" panel.
 *
 * Accessibility:
 * - Sidebar nav items are <nav> + <ul>/<li> with anchor elements (no bare divs).
 * - Payment form fields are real <input> elements bound to <label htmlFor>.
 * - The demo "Send Payment" element: blocked variant uses <div role="button">
 *   with tabIndex={0} and Enter/Space handlers to prove the barrier visually
 *   while remaining keyboard-operable within the dashboard itself. The fixed
 *   variant renders a real <button>.
 * - StepRow conveys status with icon + visible text label, not colour alone.
 * - Checklist <ol> has aria-live="polite" so AT hears updates as they stream.
 * - Blocked card uses role="alert" (assertive); "Barrier Detected" badge
 *   uses aria-live="polite" (non-urgent).
 *
 * Layout and colours follow v7 panel 2 (tokens under `bank` in tailwind.config.js).
 * All text is 16px or larger. The checklist reads real data: a row turns green
 * only when the run's focus trail reached that control, and red only when the
 * checker returned BLOCKED / TARGET_NOT_FOCUSABLE.
 *
 * Typed values (user-typed-test-details REQ-TD-05): after a run, a field's row says what the agent typed
 * there, read from the run's type_text steps, and only when the run record has test_details (the tester
 * typed them). The bank drawing's own fields always start empty, for a judge to type into.
 */

import {
  Ban,
  Check,
  ChevronRight,
  FileText,
  Ghost,
  House,
  Keyboard,
  Landmark,
  List,
  Loader2,
  Send,
  TriangleAlert,
  X,
} from 'lucide-react';
import { GhostMascot } from './GhostMascot';
import { PossessionGhost } from './PossessionGhost';
import type { GhostState, JourneyResult, RecordedDetails } from '../types';

interface TabStep {
  label: string;
  status: 'pending' | 'pass' | 'fail';
  /** What the agent typed in this field, from the run record. */
  typed?: string;
}

interface PossessionModeProps {
  result: JourneyResult | null;
  isRunning?: boolean;
  liveSteps?: TabStep[];
  /** test_details of the run; null hides typed values (internal default or no run). */
  runDetails?: RecordedDetails | null;
}

const DEFAULT_STEPS: TabStep[] = [
  { label: 'Tab to Recipient',    status: 'pending' },
  { label: 'Tab to Amount',       status: 'pending' },
  { label: 'Tab to Send Payment', status: 'pending' },
];

const NAV_ITEMS = [
  { label: 'Dashboard',    Icon: House },
  { label: 'Send Payment', Icon: Send },
  { label: 'Accounts',     Icon: FileText },
  { label: 'Transactions', Icon: List },
] as const;

function ghostStateFromResult(result: JourneyResult | null, isRunning: boolean): GhostState {
  if (isRunning || result === null) return 'ready';
  if (result.verdict === 'PASSED') return 'verified';
  return 'blocked';
}

/** Build the checklist from the run's real focus trail and checker verdict. */
/** What the agent typed into the field whose selector hint has `hint`, from the type_text steps. */
function typedInto(result: JourneyResult, hint: string): string | undefined {
  const step = result.step_events.find(
    (e) => e.tool === 'type_text' && (e.focused_before?.selector_hint ?? '').includes(hint),
  );
  const text = step ? (step.args as { text?: unknown }).text : undefined;
  return typeof text === 'string' ? text : undefined;
}
function stepsFromResult(result: JourneyResult | null, runDetails: RecordedDetails | null = null): TabStep[] {
  if (result === null) return DEFAULT_STEPS;
  // Typed values are shown only for a run whose details the tester typed (REQ-TD-05, 06).
  const typed = (hint: string) => (runDetails ? typedInto(result, hint) : undefined);
  const reached = (hint: string) =>
    result.focus_trail.some((snap) => snap.selector_hint.includes(hint));
  const stuck =
    result.verdict === 'BLOCKED' && result.reason_code === 'TARGET_NOT_FOCUSABLE';
  const last: TabStep = stuck
    ? { label: 'Tab to Send Payment (stuck)', status: 'fail' }
    : {
        label: 'Tab to Send Payment',
        status: result.verdict === 'PASSED' && reached('#send-payment') ? 'pass' : 'pending',
      };
  return [
    { label: 'Tab to Recipient', status: reached('#recipient') ? 'pass' : 'pending', typed: typed('#recipient') },
    { label: 'Tab to Amount',    status: reached('#amount') ? 'pass' : 'pending', typed: typed('#amount') },
    ...(runDetails?.reference
      ? [{ label: 'Tab to Reference', status: reached('#reference') ? 'pass' : 'pending', typed: typed('#reference') } as TabStep]
      : []),
    last,
  ];
}

/** One row of the checklist. Status is icon + visible text, never colour alone. */
function StepRow({ label, status, typed }: TabStep) {
  const statusText = status === 'pass' ? 'Passed' : status === 'fail' ? 'Failed' : 'Pending';
  const stuck = label.endsWith(' (stuck)');
  const main = stuck ? label.slice(0, -' (stuck)'.length) : label;
  return (
    <li className="flex items-center gap-3 border-b border-bank-line py-3 text-base font-ui last:border-b-0">
      {status === 'pass' && (
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ghost-verified text-[color:var(--color-base)]" aria-hidden="true">
          <Check size={16} strokeWidth={3.5} />
        </span>
      )}
      {status === 'fail' && (
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ghost-blocked text-ink" aria-hidden="true">
          <X size={16} strokeWidth={3.5} />
        </span>
      )}
      {status === 'pending' && (
        <span className="h-6 w-6 shrink-0 rounded-full border-2 border-base-line" aria-hidden="true" />
      )}
      <span className="text-ink">
        {main}
        {stuck && (
          <>
            <br />
            <span className="text-ghost-blocked">(stuck)</span>
          </>
        )}
        {typed !== undefined && (
          <span className="block text-ink-muted">
            Typed: <span className="font-mono text-ink">{typed}</span>
          </span>
        )}
      </span>
      {/* sr-only status label: colour is never the sole carrier */}
      <span className="sr-only">{statusText}</span>
    </li>
  );
}

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon';

export function PossessionMode({
  result,
  isRunning = false,
  liveSteps,
  runDetails = null,
}: PossessionModeProps) {
  const ghostState = ghostStateFromResult(result, isRunning);
  const steps = liveSteps ?? stepsFromResult(result, runDetails);
  const isBlocked = result?.verdict === 'BLOCKED';
  // In fixed variant the demo button is a real <button>
  const isFixed = result?.variant === 'fixed';

  return (
    <section
      id="journeys"
      aria-labelledby="possession-heading"
      className="panel-glow overflow-hidden"
    >
      {/* ── Visually hidden heading ──────────────────────────────────────── */}
      <h2 id="possession-heading" className="sr-only">
        Possession Mode — Keyboard-only demonstration
      </h2>

      {/* ── Breadcrumb bar ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-base-line bg-bank-bar px-5 py-3">
        <nav aria-label="Journey breadcrumb">
          <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 text-base font-ui text-ink-muted">
            <li className="flex items-center gap-2">
              <Ghost size={18} aria-hidden="true" />
              <span>Kiro</span>
            </li>
            <li aria-hidden="true"><ChevronRight size={16} /></li>
            <li>
              Journey: <span className="font-bold text-ink">Send Payment</span>
            </li>
            <li aria-hidden="true"><ChevronRight size={16} /></li>
            <li aria-current="page" className="text-glow-violet font-bold text-ink">
              Possession Mode
            </li>
          </ol>
        </nav>
        {/* Live badge: only while a run is going; otherwise say plainly that nothing is running */}
        {isRunning ? (
          <span
            className="flex items-center gap-2 rounded-full border border-ghost-blocked/50 bg-ghost-blocked/15 px-3 py-1 text-base font-ui text-ghost-blocked"
            role="status"
            aria-live="polite"
          >
            <Loader2 size={14} className="motion-safe:animate-spin" aria-hidden="true" />
            Live Test
          </span>
        ) : (
          <span
            className="flex items-center gap-2 rounded-full border border-base-line px-3 py-1 text-base font-ui text-ink-muted"
            role="status"
            aria-live="polite"
          >
            {result ? 'Last run finished' : 'Not run yet'}
          </span>
        )}
      </div>

      {/* ── Body: bank (sidebar + form) on the left, checklist on the right ─ */}
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,72fr)_minmax(0,28fr)]">
        <div className="grid gap-4 md:grid-cols-[minmax(0,28fr)_minmax(0,72fr)]">
          {/* Haunted Bank sidebar card */}
          <aside
            className="rounded-xl border border-bank-line bg-bank-sidebar p-4"
            aria-label="Haunted Bank navigation"
          >
            <div className="mb-4 flex items-start gap-3">
              <Landmark size={26} className="mt-0.5 shrink-0 text-ink" aria-hidden="true" />
              <div>
                <p className="m-0 text-lg font-bold leading-tight text-ink font-ui">Haunted Bank</p>
                <p className="m-0 text-base text-ink-muted font-ui">Test site</p>
              </div>
            </div>
            <nav aria-label="Haunted Bank page links">
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {NAV_ITEMS.map(({ label, Icon }) => {
                  const active = label === 'Send Payment';
                  return (
                    <li key={label}>
                      <a
                        href="#journeys"
                        className={[
                          'flex min-h-11 items-center gap-3 rounded-lg border px-3 text-base font-ui',
                          FOCUS,
                          active
                            ? 'border-bank-nav-line bg-bank-nav text-ink'
                            : 'border-transparent text-ink-muted hover:text-ink',
                        ].join(' ')}
                        aria-current={active ? 'page' : undefined}
                      >
                        <Icon size={20} aria-hidden="true" />
                        {label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* Send Payment form card */}
          <div
            className="relative rounded-xl border border-bank-line bg-bank-card p-6"
            aria-label="Send Payment form demonstration"
          >
            <h3 className="m-0 mb-5 text-2xl font-bold text-ink font-ui">Send Payment</h3>
            {/* Empty fields you fill in yourself. They are not sent to the agent run. */}
            <div className="flex w-[86%] flex-col gap-4">
              <div>
                <label className="mb-1 block text-base font-ui text-ink" htmlFor="pm-recipient">
                  Recipient
                </label>
                <input
                  id="pm-recipient"
                  type="text"
                  autoComplete="off"
                  className={`h-11 w-full rounded-lg border border-bank-line bg-bank-input px-3 text-base font-ui text-ink ${FOCUS}`}
                />
              </div>
              <div>
                <label className="mb-1 block text-base font-ui text-ink" htmlFor="pm-amount">
                  Amount
                </label>
                <input
                  id="pm-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className={`h-11 w-full rounded-lg border border-bank-line bg-bank-input px-3 text-base font-ui text-ink ${FOCUS}`}
                />
              </div>
              <div>
                <label className="mb-1 block text-base font-ui text-ink" htmlFor="pm-reference">
                  Reference (optional)
                </label>
                <input
                  id="pm-reference"
                  type="text"
                  autoComplete="off"
                  maxLength={40}
                  className={`h-11 w-full rounded-lg border border-bank-line bg-bank-input px-3 text-base font-ui text-ink ${FOCUS}`}
                />
              </div>
            </div>

            {/* Send Payment demo element. The ghost sits BESIDE it, never on it (note A in v7). */}
            <div className="relative mt-10 flex items-end">
              {isFixed ? (
                /* Fixed variant: proper <button> demonstrates the correct pattern */
                <button
                  type="button"
                  className={`min-h-11 w-[56%] min-w-[10rem] rounded-lg border border-violet-neon/50 bg-violet-600 px-6 text-base font-bold font-ui text-white ${FOCUS}`}
                  aria-label="Send Payment"
                >
                  Send Payment
                </button>
              ) : (
                /* Broken variant: intentionally inaccessible div, but given tabIndex and
                   key handlers so the dashboard itself is still keyboard-operable. */
                <div
                  role="button"
                  tabIndex={0}
                  aria-disabled="true"
                  aria-label="Send Payment — blocked: this element is not keyboard accessible in the test fixture"
                  className={[
                    'grid min-h-11 w-[56%] min-w-[10rem] cursor-not-allowed place-items-center rounded-lg',
                    'border-2 border-dashed border-bank-dash bg-bank-dash-fill px-6',
                    'text-base font-semibold font-ui text-ink',
                    FOCUS,
                  ].join(' ')}
                  onKeyDown={(e) => {
                    // Inform the user without activating anything
                    if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
                  }}
                >
                  Send Payment
                </div>
              )}
              {ghostState === 'blocked' && (
                <span className="-mt-10 ml-4 shrink-0">
                  <PossessionGhost size={72} />
                </span>
              )}
              {ghostState !== 'ready' && ghostState !== 'blocked' && (
                <span className="ml-4 shrink-0">
                  <GhostMascot state={ghostState} size={48} animate={false} />
                </span>
              )}
            </div>

            {/* Journey Blocked card: assertive because it announces a critical error */}
            {isBlocked && (
              <div
                className="mt-3 flex items-start gap-3 rounded-lg border border-bank-tip-line bg-bank-tip p-3 md:ml-[calc(56%+1rem)]"
                role="alert"
                aria-live="assertive"
              >
                <Ban size={20} className="mt-0.5 shrink-0 text-ghost-blocked" aria-hidden="true" />
                <div>
                  <p className="m-0 text-base font-bold font-ui text-ghost-blocked">Journey Blocked</p>
                  <p className="m-0 mt-0.5 text-base font-ui text-ink">
                    The payment button cannot be reached using keyboard navigation.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Possession Mode checklist card */}
        <aside
          className="rounded-xl border border-bank-line bg-bank-rail p-5"
          aria-label="Possession Mode tab step results"
        >
          <div className="mb-3 flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-violet-neon text-violet-neon" aria-hidden="true">
              <Keyboard size={22} />
            </span>
            <div>
              <p className="m-0 text-xl font-bold leading-tight text-ink font-ui" aria-hidden="true">
                Possession Mode
              </p>
              <p className="m-0 mt-1 text-base text-ink-muted font-ui">Keyboard-only demonstration</p>
            </div>
          </div>
          {/* aria-live so AT announces step updates as the journey streams */}
          <ol
            className="m-0 flex list-none flex-col p-0"
            aria-label="Tab step results"
            aria-live="polite"
            aria-atomic="false"
          >
            {steps.map((step, i) => (
              <StepRow key={i} {...step} />
            ))}
          </ol>
          {/* Barrier Detected badge: polite because it summarises after the alert */}
          {isBlocked && (
            <div
              className="mt-4 flex items-center justify-center gap-2 rounded-lg border-2 border-bank-barrier-line bg-bank-barrier px-3 py-2"
              role="status"
              aria-live="polite"
            >
              <TriangleAlert size={20} className="shrink-0 text-ghost-blocked" aria-hidden="true" />
              <span className="text-base font-bold font-ui text-ink">Barrier Detected!</span>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
