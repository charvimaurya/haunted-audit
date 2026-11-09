/**
 * PossessionMode
 *
 * "Possession Mode — Keyboard-only demonstration" panel.
 *
 * Accessibility:
 * - Sidebar nav items are <nav> + <ul>/<li> with anchor elements (no bare divs).
 * - Payment form fields use real <input readOnly> bound to <label htmlFor>.
 * - The demo "Send Payment" element: blocked variant uses <div role="button">
 *   with tabIndex={0} and Enter/Space handlers to prove the barrier visually
 *   while remaining keyboard-operable within the dashboard itself. The fixed
 *   variant renders a real <button>.
 * - StepRow conveys status with icon + visible text label, not colour alone.
 * - Checklist <ol> has aria-live="polite" so AT hears updates as they stream.
 * - Blocked banner uses role="alert" (assertive); "Barrier Detected" badge
 *   uses aria-live="polite" (non-urgent).
 */

import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { GhostMascot } from './GhostMascot';
import type { GhostState, JourneyResult } from '../types';

interface TabStep {
  label: string;
  status: 'pending' | 'pass' | 'fail';
}

interface PossessionModeProps {
  result: JourneyResult | null;
  isRunning?: boolean;
  liveSteps?: TabStep[];
}

const DEFAULT_STEPS: TabStep[] = [
  { label: 'Tab to Recipient',                status: 'pending' },
  { label: 'Tab to Amount',                   status: 'pending' },
  { label: 'Tab to Send Payment (stuck)',      status: 'pending' },
];

function ghostStateFromResult(result: JourneyResult | null, isRunning: boolean): GhostState {
  if (isRunning || result === null) return 'ready';
  if (result.verdict === 'PASSED') return 'verified';
  return 'blocked';
}

/** One step in the checklist.
 *  Status is communicated by icon + visible text label — never colour alone. */
function StepRow({ label, status }: TabStep) {
  // Text label alongside icon satisfies WCAG 1.4.1 (Use of Color)
  const statusText = status === 'pass' ? 'Passed' : status === 'fail' ? 'Failed' : 'Pending';

  return (
    <li className="flex items-center gap-2 text-sm font-ui">
      {status === 'pass' && (
        <CheckCircle2 size={15} className="text-ghost-verified shrink-0" aria-hidden="true" />
      )}
      {status === 'fail' && (
        <XCircle size={15} className="text-ghost-blocked shrink-0" aria-hidden="true" />
      )}
      {status === 'pending' && (
        <span
          className="w-[15px] h-[15px] shrink-0 rounded-full border-2 border-base-line"
          aria-hidden="true"
        />
      )}
      <span
        className={
          status === 'fail'
            ? 'text-ghost-blocked'
            : status === 'pass'
            ? 'text-ghost-verified'
            : 'text-ink-muted'
        }
      >
        {label}
      </span>
      {/* sr-only status label — ensures colour is never the sole carrier */}
      <span className="sr-only">{statusText}</span>
    </li>
  );
}

export function PossessionMode({
  result,
  isRunning = false,
  liveSteps,
}: PossessionModeProps) {
  const ghostState = ghostStateFromResult(result, isRunning);
  const steps = liveSteps ?? DEFAULT_STEPS;
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

      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-base-line flex-wrap gap-2">
        {/* Breadcrumb */}
        <nav
          aria-label="Journey breadcrumb"
          className="flex items-center gap-1.5 text-xs font-ui text-ink-muted"
        >
          <span aria-hidden="true">🦇</span>
          <span>Kiro</span>
          <span aria-hidden="true" className="select-none">›</span>
          <span>Journey: Send Payment</span>
          <span aria-hidden="true" className="select-none">›</span>
          <span className="text-ink">Possession Mode</span>
        </nav>

        {/* Live badge */}
        <span
          className="flex items-center gap-1.5 text-xs font-ui px-2 py-0.5 rounded-full
                     bg-ghost-blocked/15 border border-ghost-blocked/40 text-ghost-blocked"
          role="status"
          aria-live="polite"
          aria-label={isRunning ? 'Live test running' : 'Live test ready'}
        >
          {isRunning && (
            <Loader2 size={10} className="animate-spin" aria-hidden="true" />
          )}
          {/* Pulsing dot — aria-hidden; status conveyed in aria-label above */}
          <span
            className="w-1.5 h-1.5 rounded-full bg-ghost-blocked animate-pulse"
            aria-hidden="true"
          />
          Live Test
        </span>
      </div>

      {/* ── Body — stack on mobile, three columns on desktop ────────────── */}
      <div className="flex flex-col md:flex-row md:divide-x md:divide-base-line">

        {/* Left: Haunted Bank sidebar */}
        <aside
          className="w-full md:w-44 shrink-0 p-4 flex flex-col gap-1"
          aria-label="Haunted Bank navigation"
        >
          <p className="text-[10px] font-ui text-ink-faint uppercase tracking-widest mb-1">
            <span aria-hidden="true">🏦 </span>Haunted Bank
          </p>
          <p className="text-[10px] text-ink-faint mb-2 font-ui">Test site</p>
          {/* Using <nav> + real <a> anchors — no bare <div>s in nav landmarks */}
          <nav aria-label="Haunted Bank page links">
            <ul className="flex flex-col gap-0.5 list-none p-0 m-0">
              {['Dashboard', 'Send Payment', 'Accounts', 'Transactions'].map((item) => (
                <li key={item}>
                  <a
                    href="#journeys"
                    className={[
                      'block px-2 py-1.5 rounded text-xs font-ui',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon',
                      item === 'Send Payment'
                        ? 'bg-violet-600/25 text-violet-300 border border-violet-600/40'
                        : 'text-ink-muted hover:text-ink hover:bg-base-surface/50',
                    ].join(' ')}
                    aria-current={item === 'Send Payment' ? 'page' : undefined}
                  >
                    {item === 'Send Payment' && <span aria-hidden="true">💸 </span>}
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Centre: Payment form display */}
        <div className="flex-1 p-5 min-w-0" aria-label="Send Payment form demonstration">
          <h3 className="text-base font-semibold font-ui text-ink mb-4">Send Payment</h3>

          {/* Read-only form fields — real inputs for correct AT announcements */}
          <div className="flex flex-col gap-3 mb-4">
            <div>
              <label
                className="block text-xs font-ui text-ink-muted mb-1"
                htmlFor="pm-recipient"
              >
                Recipient
              </label>
              <input
                id="pm-recipient"
                type="text"
                readOnly
                value="Alex Carter"
                className="w-full px-3 py-2 rounded-lg bg-base border border-base-line
                           text-sm font-ui text-ink cursor-default
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
              />
            </div>
            <div>
              <label
                className="block text-xs font-ui text-ink-muted mb-1"
                htmlFor="pm-amount"
              >
                Amount (EUR)
              </label>
              <input
                id="pm-amount"
                type="text"
                readOnly
                value="€50.00"
                className="w-full px-3 py-2 rounded-lg bg-base border border-base-line
                           text-sm font-ui text-ink cursor-default
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
              />
            </div>
          </div>

          {/* Send Payment demo element + ghost */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {isFixed ? (
              /* Fixed variant: proper <button> demonstrates the correct pattern */
              <button
                type="button"
                className="px-5 py-2.5 rounded-full text-sm font-bold font-ui
                           bg-violet-600 text-white border border-violet-neon/50
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
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
                  'px-5 py-2.5 rounded-full text-sm font-bold font-ui cursor-not-allowed',
                  'bg-ghost-blocked/20 border border-ghost-blocked/50 text-ghost-blocked',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ghost-blocked',
                ].join(' ')}
                onKeyDown={(e) => {
                  // Inform the user without activating anything
                  if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
                }}
              >
                Send Payment
              </div>
            )}

            {/* Ghost sits BESIDE the button, never on it (annotation A in v7) */}
            {ghostState !== 'ready' && (
              <GhostMascot state={ghostState} size={32} animate={ghostState === 'blocked'} />
            )}
          </div>

          {/* Blocked banner — assertive because it announces a critical error */}
          {isBlocked && (
            <div
              className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg
                         bg-ghost-blocked/10 border border-ghost-blocked/40"
              role="alert"
              aria-live="assertive"
            >
              <span className="text-ghost-blocked text-sm shrink-0" aria-hidden="true">⚠</span>
              <div>
                <p className="text-xs font-semibold font-ui text-ghost-blocked">
                  Journey Blocked
                </p>
                <p className="text-xs font-ui text-ink-muted mt-0.5">
                  The payment button cannot be reached using keyboard navigation.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Tab-step checklist */}
        <aside
          className="w-full md:w-52 shrink-0 p-4 border-t border-base-line md:border-t-0"
          aria-label="Possession Mode tab step results"
        >
          {/* Section label visible to all users */}
          <p
            className="text-xs font-semibold font-ui text-ink-muted uppercase tracking-widest mb-0.5"
            aria-hidden="true"
          >
            Possession Mode
          </p>
          <p className="text-xs text-ink-faint mb-3 font-ui">
            Keyboard-only demonstration
          </p>

          {/* aria-live so AT announces step updates as the journey streams */}
          <ol
            className="flex flex-col gap-2.5 list-none p-0 m-0"
            aria-label="Tab step results"
            aria-live="polite"
            aria-atomic="false"
          >
            {steps.map((step, i) => (
              <StepRow key={i} {...step} />
            ))}
          </ol>

          {/* Barrier Detected badge — polite because it summarises after the alert */}
          {isBlocked && (
            <div
              className="mt-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                         bg-ghost-blocked/15 border border-ghost-blocked/50"
              role="status"
              aria-live="polite"
            >
              <span className="text-ghost-blocked text-xs" aria-hidden="true">🚨</span>
              <span className="text-xs font-semibold font-ui text-ghost-blocked">
                Barrier Detected!
              </span>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
