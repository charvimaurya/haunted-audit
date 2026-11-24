/**
 * GhostHuntSection
 *
 * "The Ghost Hunt — Agent Investigation" panel (annotation C in v7).
 * Three agent cards + "Critical Ghost Detected" alert + live step timeline.
 */

import { Keyboard, Ghost, Ban, Mic } from 'lucide-react';
import { Link, useInRouterContext } from 'react-router-dom';
import { to } from '../routes';
import { ResultState } from './ResultState';
import type { ApiStatus } from '../runs/runContext';
import { AgentCard, type AgentOutcome } from './AgentCard';
import { GhostMascot } from './GhostMascot';
import { findingText } from '../lib/finding';
import type { JourneyResult, StepEvent } from '../types';

interface GhostHuntSectionProps {
  result: JourneyResult | null;
  isRunning?: boolean;
  liveEvents?: StepEvent[];
  /** Result of the last GET /health check. */
  apiStatus?: ApiStatus;
  /** The last finished voice run, if any (shown on the Voice Agent card). */
  voiceResult?: JourneyResult | null;
}

const TOOL_COLOR: Record<string, string> = {
  read_page:    'text-violet-300',
  read_focus:   'text-violet-300',
  press_tab:    'text-sky-300',
  press_enter:  'text-sky-300',
  press_space:  'text-sky-300',
  press_arrow:  'text-sky-300',
  type_text:    'text-amber-300',
  declare_done: 'text-ghost-blocked',
};

function toolColor(tool: string) {
  return TOOL_COLOR[tool] ?? 'text-ink-muted';
}


/** Keyboard Agent rows, read only from the checker's result. Empty until a run finishes. */
function keyboardOutcomes(result: JourneyResult | null): AgentOutcome[] {
  if (!result || !result.verdict) return [];
  const reached = (hint: string) => result.focus_trail.some((snap) => snap.selector_hint.includes(hint));
  const rows: AgentOutcome[] = [];
  if (reached('#recipient') || reached('#amount')) rows.push({ label: 'Navigated form', passed: true });
  if (result.verdict === 'PASSED') return [...rows, { label: 'Reached Send Payment by keyboard', passed: true }];
  return [...rows, { label: 'Could not reach Send Payment', passed: false, detail: result.reason_code ?? undefined }];
}
/** Voice Agent rows: one per step of the last voice run, in the runner's own plain-English words. */
function voiceOutcomes(voice: JourneyResult | null): AgentOutcome[] {
  if (!voice) return [];
  return voice.step_events.map((e) => {
    const a = e.args as Record<string, unknown>;
    return { label: typeof a.message === 'string' ? a.message : e.tool, passed: a.outcome === 'done' };
  });
}

/** Ghost Hunter rows: the blocked element the checker measured. Empty when nothing was blocked. */
function hunterOutcomes(result: JourneyResult | null): AgentOutcome[] {
  const el = result?.verdict === 'BLOCKED' ? result.blocked_element : null;
  if (!el) return [];
  const custom = result?.reason_code === 'TARGET_NOT_FOCUSABLE' && el.tag && !['button', 'a', 'input'].includes(el.tag.toLowerCase());
  return [
    { label: 'Identified root cause', passed: true },
    ...(custom
      ? [{ label: `Custom element (${el.tag?.toLowerCase()}) not keyboard accessible`, passed: false, detail: el.selector }]
      : [{ label: 'Found the blocked control', passed: false, detail: el.selector }]),
  ];
}

export function GhostHuntSection({
  result,
  isRunning = false,
  liveEvents = [],
  apiStatus = 'online',
  voiceResult = null,
}: GhostHuntSectionProps) {
  const inRouter = useInRouterContext();
  const finding = result ? findingText(result) : null;
  const displayEvents: StepEvent[] = result?.step_events?.length
    ? result.step_events.slice(-8) // show last 8
    : liveEvents.slice(-8);

  return (
    <section
      id="scans"
      aria-labelledby="ghost-hunt-heading"
      className="panel overflow-hidden"
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-base-line">
        <h2
          id="ghost-hunt-heading"
          className="text-base font-semibold font-ui text-ink"
        >
          The Ghost Hunt —{' '}
          <span className="text-ink-muted font-normal">Agent Investigation</span>
        </h2>
        <div className="mt-1">
          <ResultState result={result} apiStatus={apiStatus} isRunning={isRunning} hint="Run a journey to see what each agent found." />
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_auto] gap-4">
        {/* ── Agent cards ─────────────────────────────────────────── */}
        <AgentCard
          name="Keyboard Agent"
          icon={<Keyboard size={14} />}
          isRunning={isRunning}
          outcomes={keyboardOutcomes(result)}
        />
        <div className="flex flex-col gap-2">
          <AgentCard name="Voice Agent" ariaLabel="Voice Agent" icon={<Mic size={14} />} outcomes={voiceOutcomes(voiceResult)} />
          <p className="m-0 px-1 text-base font-ui text-ink-muted">
            Commands are spoken or typed on{' '}
            {inRouter ? (
              <Link
                to={`${to('possession')}?agent=voice`}
                className="text-violet-300 underline underline-offset-4 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
              >
                Possession Mode
              </Link>
            ) : (
              'Possession Mode'
            )}
            .
          </p>
        </div>
        <AgentCard
          name="Ghost Hunter"
          icon={<Ghost size={14} />}
          outcomes={hunterOutcomes(result)}
        />

        {/* ── Live step timeline ───────────────────────────────────── */}
        <div
          className="panel p-3 min-w-[160px]"
          aria-label="Live step timeline"
          aria-live="polite"
          aria-atomic="false"
        >
          <p className="text-base font-ui text-ink-faint uppercase tracking-widest mb-2">
            Live steps
          </p>
          {displayEvents.length === 0 ? (
            <p className="text-base text-ink-faint font-ui">
              {isRunning ? 'Waiting…' : 'No steps yet'}
            </p>
          ) : (
            <ol className="flex flex-col gap-1">
              {displayEvents.map((ev) => (
                <li key={ev.step} className="flex items-center gap-1.5 text-base font-mono">
                  <span className="text-ink-faint tabular-nums w-5 text-right shrink-0">
                    {ev.step}
                  </span>
                  <span className={toolColor(ev.tool)}>{ev.tool}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* ── Critical Ghost Detected: only for a BLOCKED finding, every line from the run ── */}
      {finding && result?.blocked_element && (
        <div
          className="mx-4 mb-4 flex items-start gap-3 px-4 py-3 rounded-xl
                     bg-ghost-blocked/10 border border-ghost-blocked/50"
          role="alert"
          aria-live="assertive"
        >
          <GhostMascot state="blocked" size={36} animate className="mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold font-ui text-ghost-blocked mb-0.5">Critical Ghost Detected</p>
            <p className="text-base font-ui text-ink-muted">Barrier: {finding.barrier}</p>
            <p className="text-base font-ui text-ink-muted">Impact: {finding.impact}</p>
            <p className="text-base font-mono text-ink-muted mt-1">WCAG: {finding.wcag}</p>
            <p className="text-base font-ui text-ink-faint mt-1">
              From the checker, {result.agent_mode} mode, {result.variant} page.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="px-3 py-1 rounded-full text-base font-ui font-medium
                         bg-ghost-blocked/20 border border-ghost-blocked/50 text-ghost-blocked"
            >
              <span className="sr-only">Blocked element: </span>
              {finding.element}
            </span>
            <Ban size={20} className="text-ghost-blocked" aria-hidden="true" />
          </div>
        </div>
      )}
    </section>
  );
}
