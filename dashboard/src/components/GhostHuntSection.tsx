/**
 * GhostHuntSection
 *
 * "The Ghost Hunt — Agent Investigation" panel (annotation C in v7).
 * Three agent cards + "Critical Ghost Detected" alert + live step timeline.
 */

import { Keyboard, Crosshair, Ban, Mic } from 'lucide-react';
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

/** Voice steps for the timeline chips, from the voice run's own args: "type Recipient", "click Send Payment". */
function voiceEvents(voice: JourneyResult | null): { step: number; text: string; ok: boolean }[] {
  if (!voice) return [];
  return voice.step_events.slice(-3).map((e) => {
    const a = e.args as Record<string, unknown>;
    const verb = e.tool === 'voice_type' ? 'type' : e.tool === 'voice_click' ? 'click' : e.tool === 'voice_go_to' ? 'go to' : 'say';
    const name = typeof a.name === 'string' ? a.name : typeof a.command === 'string' ? a.command : '';
    return { step: e.step, text: `${verb} ${name}`.trim(), ok: a.outcome === 'done' };
  });
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
    >
      {/* ── Header (v9 panel title) ─────────────────────────────────── */}
      <div className="pb-3">
        <h2
          id="ghost-hunt-heading"
          className="text-[1.3rem] font-extrabold font-ui text-ink"
        >
          The Ghost Hunt — Agent Investigation
        </h2>
        <div className="mt-1">
          <ResultState result={result} apiStatus={apiStatus} isRunning={isRunning} hint="Run a journey to see what each agent found." />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Agent cards ─────────────────────────────────────────── */}
        <AgentCard
          name="Keyboard Agent"
          icon={<Keyboard size={26} className="v9-icon-violet" />}
          isRunning={isRunning}
          outcomes={keyboardOutcomes(result)}
        />
        <div className="flex flex-col gap-2">
          <AgentCard name="Voice Agent" ariaLabel="Voice Agent" icon={<Mic size={26} className="v9-icon-violet" />} outcomes={voiceOutcomes(voiceResult)} />
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
          icon={<Crosshair size={26} className="v9-icon-violet" />}
          outcomes={hunterOutcomes(result)}
        />

      </div>

      {/* ── Live timeline (v9: one row of chips under the cards; keyboard steps, then voice steps) ── */}
      <div
        className="mt-3 flex flex-wrap items-center gap-2"
        aria-label="Live step timeline"
        aria-live="polite"
        aria-atomic="false"
      >
        <span className="text-base font-ui text-v9-mute">Live timeline:</span>
        {displayEvents.length === 0 && voiceEvents(voiceResult).length === 0 ? (
          <span className="text-base text-ink-faint font-ui">{isRunning ? 'Waiting…' : 'No steps yet'}</span>
        ) : (
          <ol className="m-0 flex list-none flex-wrap gap-2 p-0">
            {displayEvents.slice(-4).map((ev) => (
              <li key={`k${ev.step}`} className="v9-tl-chip flex items-center gap-1.5 font-mono">
                <Keyboard size={14} aria-hidden="true" />
                <span className="sr-only">Keyboard step {ev.step}: </span>
                <span className={toolColor(ev.tool)}>{ev.tool}</span>
              </li>
            ))}
            {voiceEvents(voiceResult).map((v) => (
              <li key={`v${v.step}`} className={`v9-tl-chip flex items-center gap-1.5 font-mono ${v.ok ? 'v9-tl-ok' : 'v9-tl-bad'}`}>
                <Mic size={14} aria-hidden="true" />
                <span className="sr-only">Voice step {v.step}{v.ok ? '' : ', did not work'}: </span>
                <span>{v.text}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* ── Critical Ghost Detected: only for a BLOCKED finding, every line from the run ── */}
      {finding && result?.blocked_element && (
        <div
          className="v9-crit mt-4 flex items-center gap-5 px-5 py-4 rounded-2xl"
          role="alert"
          aria-live="assertive"
        >
          <GhostMascot state="blocked" size={84} animate className="shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xl font-extrabold font-ui text-v9-bad-hi mb-1">Critical Ghost Detected</p>
            <p className="text-base font-ui text-ink">Barrier: {finding.barrier}</p>
            <p className="text-base font-ui text-ink">Impact: {finding.impact}</p>
            <p className="text-base font-ui text-ink">WCAG: {finding.wcag}</p>
            <p className="text-base font-ui text-ink-faint mt-1">
              From the checker, {result.agent_mode} mode, {result.variant} page.
            </p>
          </div>
          {/* v9: a small picture of the blocked control */}
          <div className="v9-thumb hidden shrink-0 flex-col justify-end gap-2 rounded-xl p-3 sm:flex">
            <span className="v9-thumb-line" aria-hidden="true" />
            <span className="v9-thumb-line w-3/4" aria-hidden="true" />
            <span className="v9-thumb-btn flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-base font-ui font-bold">
              <span><span className="sr-only">Blocked element: </span>{finding.element}</span>
              <Ban size={20} aria-hidden="true" />
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
