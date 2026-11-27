/**
 * PossessionMode
 *
 * "Possession Mode — Keyboard-only demonstration" sandbox panel.
 * Responsive across desktop, tablet, and mobile.
 * During a live run, streams real SSE StepEvents to highlight active sandbox fields,
 * fill typed values live, and update checklist rows in real time.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  Check,
  ChevronRight,
  ExternalLink,
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
import { FocusTrailReplay } from './FocusTrailReplay';
import { PossessionGhost } from '../ghost/PossessionGhost';
import { API_BASE } from '../../runs/api';
import { getScenarioDef, type ScenarioId } from '../../runs/scenarios';
import type { GhostState, JourneyResult, RecordedDetails, StepEvent, Variant } from '../../types/index';

interface TabStep {
  label: string;
  status: 'pending' | 'active' | 'pass' | 'fail';
  /** What the agent typed in this field, from the run record or live SSE events. */
  typed?: string;
}

interface PossessionModeProps {
  scenario?: ScenarioId;
  variant?: Variant;
  result: JourneyResult | null;
  isRunning?: boolean;
  liveEvents?: StepEvent[];
  liveSteps?: TabStep[];
  /** test_details of the run; null hides typed values (internal default or no run). */
  runDetails?: RecordedDetails | null;
}

function defaultStepsFor(submitLabel: string): TabStep[] {
  return [
    { label: 'Tab to Recipient', status: 'pending' },
    { label: 'Tab to Amount', status: 'pending' },
    { label: 'Tab to Reference', status: 'pending' },
    { label: `Tab to ${submitLabel}`, status: 'pending' },
  ];
}

const NAV_ITEMS = [
  { label: 'Dashboard', Icon: House },
  { label: 'Send Payment', Icon: Send },
  { label: 'Accounts', Icon: FileText },
  { label: 'Transactions', Icon: List },
] as const;

function ghostStateFromResult(result: JourneyResult | null, isRunning: boolean): GhostState {
  if (isRunning || result === null) return 'ready';
  if (result.verdict === 'PASSED') return 'verified';
  return 'blocked';
}

function typedIntoEvents(events: StepEvent[], hint: string): string | undefined {
  const step = [...events]
    .reverse()
    .find(
      (e) =>
        e.tool === 'type_text' &&
        ((e.focused_before?.selector_hint ?? '').includes(hint) ||
          (e.focused_after?.selector_hint ?? '').includes(hint)),
    );
  const text = step ? (step.args as { text?: unknown }).text : undefined;
  return typeof text === 'string' ? text : undefined;
}

function focusedFieldFromHint(hint: string | null | undefined): 'recipient' | 'amount' | 'reference' | 'send-payment' | null {
  if (!hint) return null;
  if (hint.includes('#recipient')) return 'recipient';
  if (hint.includes('#amount')) return 'amount';
  if (hint.includes('#reference')) return 'reference';
  if (hint.includes('#send-payment')) return 'send-payment';
  return null;
}

function stepsFromLive(liveEvents: StepEvent[], submitLabel: string): TabStep[] {
  const reached = (hint: string) =>
    liveEvents.some(
      (e) =>
        (e.focused_after?.selector_hint ?? '').includes(hint) ||
        (e.focused_before?.selector_hint ?? '').includes(hint),
    );
  const latestHint = liveEvents[liveEvents.length - 1]?.focused_after?.selector_hint ?? '';
  const activeField = focusedFieldFromHint(latestHint);

  const recPass = reached('#recipient');
  const amtPass = reached('#amount');
  const refPass = reached('#reference');
  const payPass = reached('#send-payment');

  const statusFor = (passed: boolean, id: 'recipient' | 'amount' | 'reference' | 'send-payment', prevDone: boolean): TabStep['status'] => {
    if (activeField === id) return 'active';
    if (passed) return 'pass';
    if (prevDone && activeField === null && liveEvents.length > 0) return 'active';
    return 'pending';
  };

  return [
    {
      label: 'Tab to Recipient',
      status: statusFor(recPass, 'recipient', true),
      typed: typedIntoEvents(liveEvents, '#recipient'),
    },
    {
      label: 'Tab to Amount',
      status: statusFor(amtPass, 'amount', recPass),
      typed: typedIntoEvents(liveEvents, '#amount'),
    },
    {
      label: 'Tab to Reference',
      status: statusFor(refPass, 'reference', amtPass),
      typed: typedIntoEvents(liveEvents, '#reference'),
    },
    {
      label: `Tab to ${submitLabel}`,
      status: statusFor(payPass, 'send-payment', refPass),
    },
  ];
}

function stepsFromResult(
  result: JourneyResult | null,
  runDetails: RecordedDetails | null = null,
  submitLabel = 'Send Payment',
): TabStep[] {
  if (result === null) return defaultStepsFor(submitLabel);
  const typed = (hint: string) => (runDetails ? typedIntoEvents(result.step_events, hint) : undefined);
  const reached = (hint: string) => result.focus_trail.some((snap) => snap.selector_hint.includes(hint));
  const stuck = result.verdict === 'BLOCKED' && result.reason_code === 'TARGET_NOT_FOCUSABLE';
  const last: TabStep = stuck
    ? { label: `Tab to ${submitLabel} (stuck)`, status: 'fail' }
    : {
        label: `Tab to ${submitLabel}`,
        status: result.verdict === 'PASSED' && reached('#send-payment') ? 'pass' : 'pending',
      };
  return [
    { label: 'Tab to Recipient', status: reached('#recipient') ? 'pass' : 'pending', typed: typed('#recipient') },
    { label: 'Tab to Amount', status: reached('#amount') ? 'pass' : 'pending', typed: typed('#amount') },
    { label: 'Tab to Reference', status: reached('#reference') ? 'pass' : 'pending', typed: typed('#reference') },
    last,
  ];
}

function StepRow({ label, status, typed }: TabStep) {
  const statusText =
    status === 'pass' ? 'Passed' : status === 'fail' ? 'Failed' : status === 'active' ? 'In progress' : 'Pending';
  const stuck = label.endsWith(' (stuck)');
  const main = stuck ? label.slice(0, -' (stuck)'.length) : label;
  return (
    <li className="flex items-start gap-3 border-b border-bank-line py-3 text-base font-ui last:border-b-0">
      {status === 'pass' && (
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ghost-verified text-[color:var(--color-base)]" aria-hidden="true">
          <Check size={16} strokeWidth={3.5} />
        </span>
      )}
      {status === 'fail' && (
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ghost-blocked text-ink" aria-hidden="true">
          <X size={16} strokeWidth={3.5} />
        </span>
      )}
      {status === 'active' && (
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-amber-400 bg-amber-500/20 text-amber-300" aria-hidden="true">
          <Loader2 size={13} className="motion-safe:animate-spin" />
        </span>
      )}
      {status === 'pending' && (
        <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 border-base-line" aria-hidden="true" />
      )}
      <span className="min-w-0 flex-1 text-ink">
        {main}
        {stuck && (
          <>
            <br />
            <span className="text-ghost-blocked">(stuck)</span>
          </>
        )}
        {typed !== undefined && (
          <span className="mt-0.5 block break-words text-sm text-ink-muted">
            Typed: <span className="font-mono text-ink">{typed}</span>
          </span>
        )}
      </span>
      <span className="sr-only">{statusText}</span>
    </li>
  );
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon';
const AGENT_ACTIVE_RING =
  'border-amber-400 ring-[3px] ring-amber-400/80 shadow-[0_0_16px_rgba(251,191,36,0.4)]';

export function PossessionMode({
  scenario = 'haunted-bank',
  variant = 'broken',
  result,
  isRunning = false,
  liveEvents = [],
  liveSteps,
  runDetails = null,
}: PossessionModeProps) {
  const activeScenario = getScenarioDef(result?.scenario ?? scenario);
  const ghostState = ghostStateFromResult(result, isRunning);
  const steps =
    liveSteps ??
    (isRunning ? stepsFromLive(liveEvents, activeScenario.submitLabel) : stepsFromResult(result, runDetails, activeScenario.submitLabel));
  const isBlocked = !isRunning && result?.verdict === 'BLOCKED';
  const effectiveVariant = isRunning ? variant : (result?.variant ?? variant);
  const isFixed = effectiveVariant === 'fixed';

  // Local manual edits only override agent live/result display if tester interacts with sandbox inputs directly
  const [manualValues, setManualValues] = useState({ recipient: '', amount: '', reference: '' });
  const [dirty, setDirty] = useState({ recipient: false, amount: false, reference: false });

  useEffect(() => {
    if (isRunning || result === null) {
      setManualValues({ recipient: '', amount: '', reference: '' });
      setDirty({ recipient: false, amount: false, reference: false });
    }
  }, [isRunning, scenario, result]);

  const latestEvent = liveEvents[liveEvents.length - 1] ?? null;
  const activeField = isRunning ? focusedFieldFromHint(latestEvent?.focused_after?.selector_hint) : null;

  const sourceEvents = isRunning ? liveEvents : result?.step_events ?? [];
  const agentRecipient = isRunning
    ? typedIntoEvents(liveEvents, '#recipient') ?? ''
    : runDetails
      ? typedIntoEvents(sourceEvents, '#recipient') ?? ''
      : '';
  const agentAmount = isRunning
    ? typedIntoEvents(liveEvents, '#amount') ?? ''
    : runDetails
      ? typedIntoEvents(sourceEvents, '#amount') ?? ''
      : '';
  const agentReference = isRunning
    ? typedIntoEvents(liveEvents, '#reference') ?? ''
    : runDetails
      ? typedIntoEvents(sourceEvents, '#reference') ?? ''
      : '';

  const recentFeed = useMemo(() => sourceEvents.slice(-4), [sourceEvents]);

  return (
    <section id="journeys" aria-labelledby="possession-heading" className="panel-glow overflow-hidden">
      <h2 id="possession-heading" className="sr-only">
        Possession Mode — Keyboard-only demonstration
      </h2>

      {/* Top breadcrumb bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-base-line bg-bank-bar px-4 py-3 sm:px-5">
        <nav aria-label="Journey breadcrumb" className="min-w-0">
          <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-sm sm:text-base font-ui text-ink-muted">
            <li className="flex items-center gap-1.5">
              <Ghost size={17} aria-hidden="true" />
              <span>Kiro</span>
            </li>
            <li aria-hidden="true">
              <ChevronRight size={15} />
            </li>
            <li>
              Journey: <span className="font-bold text-ink">{activeScenario.submitLabel}</span>
            </li>
            <li aria-hidden="true">
              <ChevronRight size={15} />
            </li>
            <li aria-current="page" className="text-glow-violet font-bold text-ink">
              Possession Mode
            </li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`${API_BASE}/sandbox/${encodeURIComponent(activeScenario.id)}?variant=${encodeURIComponent(effectiveVariant)}${result?.run_id ? `&run_id=${encodeURIComponent(result.run_id)}${typeof window !== 'undefined' ? `&return_to=${encodeURIComponent(`${window.location.origin}/app/fixes/${result.run_id}`)}` : ''}` : ''}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-base-line bg-base-surface/80 px-2.5 py-1 text-xs font-semibold text-violet-300 hover:border-violet-neon hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
          >
            <span>Open Live Site</span>
            <ExternalLink size={12} aria-hidden="true" />
          </a>
          {isRunning ? (
            <span
              className="flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/15 px-3 py-1 text-xs sm:text-sm font-ui font-semibold text-amber-300"
              role="status"
              aria-live="polite"
            >
              <Loader2 size={14} className="motion-safe:animate-spin" aria-hidden="true" />
              Live Agent Working ({liveEvents.length} steps)
            </span>
          ) : (
            <span
              className="flex items-center gap-2 rounded-full border border-base-line px-3 py-1 text-xs sm:text-sm font-ui text-ink-muted"
              role="status"
              aria-live="polite"
            >
              {result ? `Last run: ${result.verdict}` : 'Not run yet'}
            </span>
          )}
        </div>
      </div>

      {/* Responsive Sandbox + Step Checklist grid */}
      <div className="grid grid-cols-1 gap-4 p-3 sm:p-4 xl:grid-cols-[minmax(0,72fr)_minmax(0,28fr)]">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,28fr)_minmax(0,72fr)]">
          {/* Sandbox sidebar card tailored to the active scenario */}
          <aside
            className="rounded-xl border border-bank-line bg-bank-sidebar p-4"
            style={{ borderTopColor: activeScenario.accentHex, borderTopWidth: '3px' }}
            aria-label={`${activeScenario.name} navigation`}
          >
            <div className="mb-3 flex items-start gap-3">
              <Landmark size={24} className="mt-0.5 shrink-0" style={{ color: activeScenario.accentHex }} aria-hidden="true" />
              <div className="min-w-0">
                <p className="m-0 text-base sm:text-lg font-bold leading-tight text-ink font-ui">
                  {activeScenario.name}
                </p>
                <p className="m-0 text-xs sm:text-sm text-ink-muted font-ui">{activeScenario.category} sandbox</p>
              </div>
            </div>
            <nav aria-label="Sandbox page links">
              <ul className="m-0 grid list-none grid-cols-2 gap-1.5 p-0 sm:flex sm:flex-wrap lg:flex-col">
                {NAV_ITEMS.map(({ Icon }, index) => {
                  const displayLabel = activeScenario.navItems[index] ?? activeScenario.submitLabel;
                  const active = index === 1;
                  return (
                    <li key={displayLabel} className="min-w-0">
                      <a
                        href="#journeys"
                        className={[
                          'flex min-h-10 items-center gap-2.5 rounded-lg border px-2.5 text-sm sm:text-base font-ui truncate',
                          FOCUS,
                          active
                            ? 'border-bank-nav-line bg-bank-nav text-ink'
                            : 'border-transparent text-ink-muted hover:text-ink',
                        ].join(' ')}
                        aria-current={active ? 'page' : undefined}
                      >
                        <Icon size={17} className="shrink-0" aria-hidden="true" />
                        <span className="truncate">{displayLabel}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* Sandbox Form Card with Real-Time Agent Activity Simulation */}
          <div
            id="pm-replica-card"
            className="relative min-w-0 rounded-xl border border-bank-line bg-bank-card p-4 sm:p-6"
            aria-label={`${activeScenario.submitLabel} form demonstration`}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="m-0 text-xl sm:text-2xl font-bold text-ink font-ui">{activeScenario.submitLabel}</h3>
              <span className="rounded-md border border-bank-line bg-bank-input px-2.5 py-0.5 text-xs font-mono text-ink-muted">
                {effectiveVariant}
              </span>
            </div>

            {/* Live Sandbox Agent Feed: shows real steps happening inside the browser during & after runs */}
            {(isRunning || recentFeed.length > 0) && (
              <div
                className={`mb-4 rounded-xl border px-3 py-2.5 text-xs sm:text-sm ${
                  isRunning
                    ? 'border-amber-400/50 bg-amber-500/10 text-amber-200'
                    : isBlocked
                      ? 'border-ghost-blocked/40 bg-ghost-blocked/10 text-ink'
                      : 'border-ghost-verified/40 bg-ghost-verified/10 text-ink'
                }`}
                aria-live="polite"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                  <span className="flex items-center gap-2">
                    {isRunning && <Loader2 size={14} className="motion-safe:animate-spin text-amber-300" aria-hidden="true" />}
                    <span>
                      {isRunning
                        ? latestEvent
                          ? `Agent running · Step ${latestEvent.step}: ${latestEvent.tool}${
                              latestEvent.focused_after?.selector_hint
                                ? ` → ${latestEvent.focused_after.selector_hint}`
                                : ''
                            }`
                          : 'Launching sandbox browser…'
                        : isBlocked
                          ? `Agent stopped: ${result?.reason_code ?? 'BLOCKED'} at ${result?.blocked_element?.selector ?? 'target'}`
                          : `Agent completed ${activeScenario.submitLabel} in ${result?.step_events.length ?? 0} steps`}
                    </span>
                  </span>
                </div>
                {recentFeed.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {recentFeed.map((ev) => (
                      <span
                        key={ev.step}
                        className="rounded border border-white/10 bg-base/70 px-2 py-0.5 font-mono text-[11px] text-ink-muted"
                      >
                        #{ev.step} {ev.tool}
                        {ev.focused_after?.selector_hint ? `→${ev.focused_after.selector_hint}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex w-full max-w-xl flex-col gap-4">
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-sm sm:text-base font-ui text-ink" htmlFor="pm-recipient">
                    {activeScenario.recipientLabel}
                  </label>
                  {activeField === 'recipient' && (
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-mono font-semibold text-amber-300">
                      Agent cursor active
                    </span>
                  )}
                </div>
                <input
                  id="pm-recipient"
                  type="text"
                  autoComplete="off"
                  value={dirty.recipient ? manualValues.recipient : agentRecipient || manualValues.recipient}
                  onChange={(e) => {
                    setDirty((d) => ({ ...d, recipient: true }));
                    setManualValues((v) => ({ ...v, recipient: e.target.value }));
                  }}
                  className={`h-11 w-full rounded-lg border bg-bank-input px-3 text-base font-ui text-ink ${FOCUS} ${
                    activeField === 'recipient' ? AGENT_ACTIVE_RING : 'border-bank-line'
                  }`}
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-sm sm:text-base font-ui text-ink" htmlFor="pm-amount">
                    {activeScenario.amountLabel}
                  </label>
                  {activeField === 'amount' && (
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-mono font-semibold text-amber-300">
                      Agent cursor active
                    </span>
                  )}
                </div>
                <input
                  id="pm-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={dirty.amount ? manualValues.amount : agentAmount || manualValues.amount}
                  onChange={(e) => {
                    setDirty((d) => ({ ...d, amount: true }));
                    setManualValues((v) => ({ ...v, amount: e.target.value }));
                  }}
                  className={`h-11 w-full rounded-lg border bg-bank-input px-3 text-base font-ui text-ink ${FOCUS} ${
                    activeField === 'amount' ? AGENT_ACTIVE_RING : 'border-bank-line'
                  }`}
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-sm sm:text-base font-ui text-ink" htmlFor="pm-reference">
                    {activeScenario.referenceLabel}
                  </label>
                  {activeField === 'reference' && (
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-mono font-semibold text-amber-300">
                      Agent cursor active
                    </span>
                  )}
                </div>
                <input
                  id="pm-reference"
                  type="text"
                  autoComplete="off"
                  maxLength={60}
                  value={dirty.reference ? manualValues.reference : agentReference || manualValues.reference}
                  onChange={(e) => {
                    setDirty((d) => ({ ...d, reference: true }));
                    setManualValues((v) => ({ ...v, reference: e.target.value }));
                  }}
                  className={`h-11 w-full rounded-lg border bg-bank-input px-3 text-base font-ui text-ink ${FOCUS} ${
                    activeField === 'reference' ? AGENT_ACTIVE_RING : 'border-bank-line'
                  }`}
                />
              </div>
            </div>

            {/* Send Payment demo element + ghost companion */}
            <div className="relative mt-6 flex flex-col gap-4 sm:mt-8 sm:flex-row sm:items-center">
              {isFixed ? (
                <button
                  id="pm-send-payment"
                  type="button"
                  className={`min-h-11 w-full sm:w-auto sm:min-w-[14rem] rounded-lg border border-violet-neon/50 bg-violet-600 px-6 text-base font-bold font-ui text-white ${FOCUS} ${
                    activeField === 'send-payment' ? AGENT_ACTIVE_RING : ''
                  }`}
                  aria-label={activeScenario.submitLabel}
                >
                  {activeScenario.submitLabel}
                </button>
              ) : (
                <div
                  id="pm-send-payment"
                  role="button"
                  tabIndex={0}
                  aria-disabled="true"
                  aria-label={`${activeScenario.submitLabel} — blocked: this element is not keyboard accessible in the test fixture`}
                  className={[
                    'grid min-h-11 w-full sm:w-auto sm:min-w-[14rem] cursor-not-allowed place-items-center rounded-lg',
                    'border-2 border-dashed border-bank-dash bg-bank-dash-fill px-6',
                    'text-base font-semibold font-ui text-ink',
                    FOCUS,
                  ].join(' ')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
                  }}
                >
                  {activeScenario.submitLabel}
                </div>
              )}

              {ghostState === 'blocked' && (
                <span className="shrink-0 self-start sm:self-center">
                  <PossessionGhost size={88} />
                </span>
              )}
              {ghostState === 'verified' && (
                <span className="shrink-0 self-start sm:self-center">
                  <PossessionGhost size={88} state="verified" />
                </span>
              )}
            </div>

            {isBlocked && (
              <div
                className="mt-4 flex items-start gap-3 rounded-lg border border-bank-tip-line bg-bank-tip p-3.5"
                role="alert"
                aria-live="assertive"
              >
                <Ban size={20} className="mt-0.5 shrink-0 text-ghost-blocked" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="m-0 text-base font-bold font-ui text-ghost-blocked">Journey Blocked</p>
                  <p className="m-0 mt-0.5 text-sm sm:text-base font-ui text-ink">
                    {activeScenario.submitLabel} cannot be reached using keyboard navigation ({result?.reason_code ?? 'TARGET_NOT_FOCUSABLE'}).
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Possession Mode checklist rail */}
        <aside className="rounded-xl border border-bank-line bg-bank-rail p-4 sm:p-5" aria-label="Possession Mode tab step results">
          <div className="mb-3 flex items-start gap-3">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-violet-neon text-violet-neon"
              aria-hidden="true"
            >
              <Keyboard size={22} />
            </span>
            <div className="min-w-0">
              <p className="m-0 text-lg sm:text-xl font-bold leading-tight text-ink font-ui" aria-hidden="true">
                Possession Mode
              </p>
              <p className="m-0 mt-1 text-sm sm:text-base text-ink-muted font-ui">Keyboard-only demonstration</p>
            </div>
          </div>

          <ol className="m-0 flex list-none flex-col p-0" aria-label="Tab step results" aria-live="polite" aria-atomic="false">
            {steps.map((step, i) => (
              <StepRow key={i} {...step} />
            ))}
          </ol>

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
          <FocusTrailReplay result={result} isRunning={isRunning} />
        </aside>
      </div>
    </section>
  );
}
