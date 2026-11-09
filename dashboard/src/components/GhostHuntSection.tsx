/**
 * GhostHuntSection
 *
 * "The Ghost Hunt — Agent Investigation" panel (annotation C in v7).
 * Three agent cards + "Critical Ghost Detected" alert + live step timeline.
 */

import { Keyboard, Mic, Ghost } from 'lucide-react';
import { AgentCard } from './AgentCard';
import { GhostMascot } from './GhostMascot';
import type { JourneyResult, StepEvent } from '../types';

interface GhostHuntSectionProps {
  result: JourneyResult | null;
  isRunning?: boolean;
  liveEvents?: StepEvent[];
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

export function GhostHuntSection({
  result,
  isRunning = false,
  liveEvents = [],
}: GhostHuntSectionProps) {
  const isBlocked = result?.verdict === 'BLOCKED';
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
          className="text-sm font-semibold font-ui text-ink"
        >
          The Ghost Hunt —{' '}
          <span className="text-ink-muted font-normal">Agent Investigation</span>
        </h2>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_auto] gap-4">
        {/* ── Agent cards ─────────────────────────────────────────── */}
        <AgentCard
          name="Keyboard Agent"
          icon={<Keyboard size={14} />}
          isRunning={isRunning}
          outcomes={[
            {
              label: 'Navigated form',
              passed: true,
            },
            {
              label: 'Could not reach Send Payment',
              passed: false,
              detail: result?.reason_code ?? undefined,
            },
          ]}
        />
        <AgentCard
          name="Voice Agent"
          icon={<Mic size={14} />}
          outcomes={[
            { label: 'Found by name "Send Payment"', passed: true },
            { label: 'Could not activate button', passed: false },
          ]}
        />
        <AgentCard
          name="Ghost Hunter"
          icon={<Ghost size={14} />}
          outcomes={[
            { label: 'Identified root cause', passed: true },
            {
              label: 'Custom element not keyboard accessible',
              passed: false,
              detail: result?.blocked_element?.selector ?? 'div.pay-btn',
            },
          ]}
        />

        {/* ── Live step timeline ───────────────────────────────────── */}
        <div
          className="panel p-3 min-w-[160px]"
          aria-label="Live step timeline"
          aria-live="polite"
          aria-atomic="false"
        >
          <p className="text-[10px] font-ui text-ink-faint uppercase tracking-widest mb-2">
            Live steps
          </p>
          {displayEvents.length === 0 ? (
            <p className="text-xs text-ink-faint font-ui">
              {isRunning ? 'Waiting…' : 'No steps yet'}
            </p>
          ) : (
            <ol className="flex flex-col gap-1">
              {displayEvents.map((ev) => (
                <li key={ev.step} className="flex items-center gap-1.5 text-[11px] font-mono">
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

      {/* ── Critical Ghost Detected alert ───────────────────────────── */}
      {isBlocked && result?.blocked_element && (
        <div
          className="mx-4 mb-4 flex items-start gap-3 px-4 py-3 rounded-xl
                     bg-ghost-blocked/10 border border-ghost-blocked/50"
          role="alert"
          aria-live="assertive"
        >
          <GhostMascot state="blocked" size={28} animate className="mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold font-ui text-ghost-blocked mb-0.5">
              Critical Ghost Detected
            </p>
            <p className="text-xs font-ui text-ink-muted">
              Barrier: Payment button inaccessible to keyboard navigation
            </p>
            <p className="text-xs font-ui text-ink-muted">
              Impact: Customer cannot complete payment
            </p>
            <p className="text-[11px] font-mono text-ink-faint mt-1">
              WCAG: 2.1.1 Keyboard, 4.1.2 Name, Role, Value
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* The blocked element name — shown as a chip, never a real button */}
            <span
              className="px-3 py-1 rounded-full text-xs font-ui font-medium
                         bg-ghost-blocked/20 border border-ghost-blocked/50 text-ghost-blocked"
              aria-label={`Blocked element: ${result.blocked_element.text ?? result.blocked_element.selector}`}
            >
              {result.blocked_element.text ?? 'Send Payment'}
            </span>
            <span className="text-ghost-blocked text-base" aria-hidden="true">🚫</span>
          </div>
        </div>
      )}
    </section>
  );
}
