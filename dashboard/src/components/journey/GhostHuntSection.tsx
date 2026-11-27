/**
 * GhostHuntSection
 *
 * "The Ghost Hunt — Agent Investigation" panel matching design/v9/index.html#agents:
 * Three telemetry-backed agent cards + Live timeline strip + Crimson "Critical Ghost Detected" alert.
 * Every field, count, selector, latency, and step comes strictly from real runs / saved history / live SSE events.
 */
import { Ban, Keyboard, Mic, Target } from 'lucide-react';
import { AgentCard, type AgentCardStatus, type AgentOutcome } from './AgentCard';
import { GhostFigure } from '../ghost/GhostFigure';
import { ResultState } from '../results/ResultState';
import { findingText } from '../../lib/finding';
import { scenarioDisplayName, type SavedPossessionRun } from '../../runs/possessionHistory';
import { getScenarioDef } from '../../runs/scenarios';
import type { ApiStatus } from '../../runs/runContext';
import type { JourneyResult, StepEvent } from '../../types/index';

interface GhostHuntSectionProps {
  result: JourneyResult | null;
  isRunning?: boolean;
  liveEvents?: StepEvent[];
  apiStatus?: ApiStatus;
  voiceResult?: JourneyResult | null;
  history?: SavedPossessionRun[];
}

function summarizeFocusedControls(result: JourneyResult): string[] {
  const seen: string[] = [];
  for (const snap of result.focus_trail) {
    const label = snap.accessible_name?.trim() || snap.selector_hint?.trim();
    if (label && !seen.includes(label)) seen.push(label);
  }
  return seen;
}

function keyboardData(
  result: JourneyResult | null,
  liveEvents: StepEvent[],
  isRunning: boolean,
  savedKb: SavedPossessionRun | null,
): { outcomes: AgentOutcome[]; status: AgentCardStatus; meta: string | null } {
  if (isRunning) {
    const latest = liveEvents[liveEvents.length - 1];
    const reachedSet = new Set(
      liveEvents
        .map((e) => e.focused_after?.accessible_name?.trim() || e.focused_after?.selector_hint?.trim())
        .filter((v): v is string => Boolean(v)),
    );
    const outcomes: AgentOutcome[] = [];
    if (reachedSet.size > 0) {
      outcomes.push({
        label: `Reached ${reachedSet.size} control${reachedSet.size === 1 ? '' : 's'} so far`,
        passed: true,
        detail: Array.from(reachedSet).slice(-3).join(' → '),
      });
    }
    if (latest) {
      outcomes.push({
        label: `Step ${latest.step}: ${latest.tool}`,
        passed: true,
        detail: latest.focused_after?.selector_hint ?? latest.focused_before?.selector_hint ?? undefined,
      });
    }
    return {
      outcomes,
      status: 'running',
      meta: `${liveEvents.length} live step${liveEvents.length === 1 ? '' : 's'} streamed`,
    };
  }

  const kbResult = result && (result.agent_kind ?? 'keyboard') !== 'voice' ? result : null;
  if (kbResult) {
    const scen = getScenarioDef(kbResult.scenario);
    const targetLabel = kbResult.blocked_element?.text?.trim() || scen.submitLabel;
    const focusedControls = summarizeFocusedControls(kbResult);
    const tabCount = kbResult.step_events.filter((e) => e.tool === 'press_tab').length;
    const typeCount = kbResult.step_events.filter((e) => e.tool === 'type_text').length;

    const outcomes: AgentOutcome[] = [];
    if (focusedControls.length > 0) {
      outcomes.push({
        label: `Traversed ${focusedControls.length} control${focusedControls.length === 1 ? '' : 's'}`,
        passed: true,
        detail: focusedControls.slice(0, 4).join(' → '),
      });
    }
    outcomes.push({
      label: `Executed ${kbResult.step_events.length} actions`,
      passed: true,
      detail: `${tabCount} Tab · ${typeCount} Type`,
    });

    if (kbResult.verdict === 'PASSED') {
      outcomes.push({ label: `Activated ${targetLabel} by keyboard`, passed: true });
    } else {
      outcomes.push({
        label: 'Could not reach',
        highlight: targetLabel,
        passed: false,
        detail: [kbResult.reason_code, kbResult.blocked_element?.selector].filter(Boolean).join(' · ') || undefined,
      });
    }

    return {
      outcomes,
      status: kbResult.verdict === 'PASSED' ? 'passed' : 'blocked',
      meta: `Run ${kbResult.run_id.slice(0, 8)} · ${scen.name} (${kbResult.variant}) · ${Math.round(kbResult.latency_ms)} ms`,
    };
  }

  if (savedKb) {
    const scen = getScenarioDef(savedKb.scenario);
    const outcomes: AgentOutcome[] = [
      {
        label: `Executed ${savedKb.steps_count} keyboard steps`,
        passed: true,
        detail: `${scen.name} · ${savedKb.variant} (${savedKb.agent_mode})`,
      },
      savedKb.verdict === 'PASSED'
        ? { label: `Activated ${scen.submitLabel} cleanly`, passed: true }
        : {
            label: `Blocked at ${scen.submitLabel}`,
            highlight: savedKb.reason_code ?? undefined,
            passed: false,
            detail: savedKb.blocked_selector ?? undefined,
          },
    ];
    return {
      outcomes,
      status: savedKb.verdict === 'PASSED' ? 'passed' : 'blocked',
      meta: `Saved run ${savedKb.run_id.slice(0, 8)} · ${Math.round(savedKb.latency_ms)} ms`,
    };
  }

  return { outcomes: [], status: 'idle', meta: null };
}

function voiceData(
  voiceResult: JourneyResult | null,
  savedVoice: SavedPossessionRun | null,
): { outcomes: AgentOutcome[]; status: AgentCardStatus; meta: string | null } {
  if (voiceResult) {
    const scen = getScenarioDef(voiceResult.scenario);
    const outcomes: AgentOutcome[] = voiceResult.step_events.map((e) => {
      const a = e.args as Record<string, unknown>;
      return {
        label: typeof a.message === 'string' ? a.message : e.tool,
        passed: a.outcome === 'done',
      };
    });
    return {
      outcomes,
      status: voiceResult.verdict === 'PASSED' ? 'passed' : 'blocked',
      meta: `Run ${voiceResult.run_id.slice(0, 8)} · ${scen.name} (${voiceResult.variant}) · ${Math.round(voiceResult.latency_ms)} ms`,
    };
  }

  if (savedVoice) {
    const scen = getScenarioDef(savedVoice.scenario);
    return {
      outcomes: [
        {
          label: `Ran ${savedVoice.steps_count} voice command steps`,
          passed: true,
          detail: `${scen.name} · ${savedVoice.variant} (${savedVoice.agent_mode})`,
        },
        savedVoice.verdict === 'PASSED'
          ? { label: `Voice activated ${scen.submitLabel}`, passed: true }
          : {
              label: 'Could not activate control by name',
              highlight: savedVoice.reason_code ?? undefined,
              passed: false,
              detail: savedVoice.blocked_selector ?? undefined,
            },
      ],
      status: savedVoice.verdict === 'PASSED' ? 'passed' : 'blocked',
      meta: `Saved run ${savedVoice.run_id.slice(0, 8)} · ${Math.round(savedVoice.latency_ms)} ms`,
    };
  }

  return { outcomes: [], status: 'idle', meta: null };
}

function hunterData(
  result: JourneyResult | null,
  voiceResult: JourneyResult | null,
  savedBlocked: SavedPossessionRun | null,
): { outcomes: AgentOutcome[]; status: AgentCardStatus; meta: string | null } {
  const blockedRun =
    result?.verdict === 'BLOCKED' ? result : voiceResult?.verdict === 'BLOCKED' ? voiceResult : null;

  if (blockedRun) {
    const scen = getScenarioDef(blockedRun.scenario);
    const el = blockedRun.blocked_element;
    const finding = findingText(blockedRun);
    const custom =
      blockedRun.reason_code === 'TARGET_NOT_FOCUSABLE' &&
      el?.tag &&
      !['button', 'a', 'input'].includes(el.tag.toLowerCase());

    const outcomes: AgentOutcome[] = [
      {
        label: 'Identified root cause',
        passed: true,
        detail: finding?.wcag ?? blockedRun.reason_code ?? undefined,
      },
      el
        ? custom
          ? {
              label: `Custom <${el.tag?.toLowerCase()}> not keyboard accessible`,
              highlight: el.text?.trim() || scen.submitLabel,
              passed: false,
              detail: el.selector,
            }
          : {
              label: 'Found blocked target control',
              passed: false,
              detail: el.selector,
            }
        : {
            label: 'Target control unreachable',
            passed: false,
            detail: blockedRun.reason_code ?? undefined,
          },
    ];

    return {
      outcomes,
      status: 'blocked',
      meta:
        blockedRun.agent_kind === 'voice'
          ? `${scen.name} · ${blockedRun.variant} (voice) · ${blockedRun.step_events.length} voice steps`
          : `${scen.name} · ${blockedRun.variant} (${blockedRun.agent_mode}) · ${blockedRun.focus_trail.length} focus snapshots`,
    };
  }

  const passedRun = result?.verdict === 'PASSED' ? result : voiceResult?.verdict === 'PASSED' ? voiceResult : null;
  if (passedRun) {
    const scen = getScenarioDef(passedRun.scenario);
    return {
      outcomes: [
        {
          label: `Verified ${scen.submitLabel} focus & activation`,
          passed: true,
          detail: `${passedRun.focus_trail.length} focus snapshots · ${passedRun.variant} page`,
        },
      ],
      status: 'passed',
      meta: `${scen.name} · ${passedRun.variant} (${passedRun.agent_mode})`,
    };
  }

  if (savedBlocked) {
    const scen = getScenarioDef(savedBlocked.scenario);
    return {
      outcomes: [
        { label: 'Captured barrier in saved run', passed: true, detail: `${scen.name} · ${savedBlocked.variant}` },
        {
          label: savedBlocked.reason_code ?? 'TARGET_NOT_FOCUSABLE',
          passed: false,
          detail: savedBlocked.blocked_selector ?? undefined,
        },
      ],
      status: 'blocked',
      meta: `Saved run ${savedBlocked.run_id.slice(0, 8)} · ${Math.round(savedBlocked.latency_ms)} ms`,
    };
  }

  return { outcomes: [], status: 'idle', meta: null };
}

interface TimelinePill {
  id: string;
  kind: 'keyboard' | 'voice';
  text: string;
  ok: boolean;
}

function buildTimeline(
  result: JourneyResult | null,
  voice: JourneyResult | null,
  liveEvents: StepEvent[],
): TimelinePill[] {
  const pills: TimelinePill[] = [];
  const resultIsVoice = result?.agent_kind === 'voice';
  const kbEvents = resultIsVoice ? [] : (result?.step_events?.length ? result.step_events : liveEvents);
  const voiceRun = voice ?? (resultIsVoice ? result : null);

  let consecutiveTabs = 0;
  let tabStartStep = 1;
  const flushTabs = () => {
    if (consecutiveTabs === 0) return;
    pills.push({
      id: `kb-tab-${tabStartStep}`,
      kind: 'keyboard',
      text: consecutiveTabs > 1 ? `press_tab ×${consecutiveTabs}` : 'press_tab',
      ok: true,
    });
    consecutiveTabs = 0;
  };

  for (const ev of kbEvents) {
    const a = ev.args as Record<string, unknown>;
    if (ev.tool === 'press_tab') {
      if (consecutiveTabs === 0) tabStartStep = ev.step;
      consecutiveTabs += 1;
      continue;
    }
    flushTabs();
    if (ev.tool === 'declare_done') {
      const blocked = result?.verdict === 'BLOCKED' || a.outcome === 'blocked';
      pills.push({ id: `kb-${ev.step}`, kind: 'keyboard', text: blocked ? 'stuck' : 'done', ok: !blocked });
    } else if (ev.tool === 'type_text') {
      const hint = ev.focused_before?.selector_hint ?? '';
      const label = hint.includes('recipient')
        ? 'type Recipient'
        : hint.includes('amount')
          ? 'type Amount'
          : hint.includes('reference')
            ? 'type Reference'
            : 'type_text';
      pills.push({ id: `kb-${ev.step}`, kind: 'keyboard', text: label, ok: true });
    } else {
      pills.push({ id: `kb-${ev.step}`, kind: 'keyboard', text: ev.tool, ok: true });
    }
  }
  flushTabs();

  if (voiceRun?.step_events?.length) {
    for (const ev of voiceRun.step_events) {
      const a = ev.args as Record<string, unknown>;
      const msg = typeof a.message === 'string' ? a.message : ev.tool;
      pills.push({
        id: `vo-${ev.step}`,
        kind: 'voice',
        text: msg,
        ok: a.outcome === 'done',
      });
    }
  }

  return pills;
}

export function GhostHuntSection({
  result,
  isRunning = false,
  liveEvents = [],
  apiStatus = 'online',
  voiceResult = null,
  history = [],
}: GhostHuntSectionProps) {
  const savedKb = history.find((h) => h.agent_kind !== 'voice') ?? null;
  const savedVoice = history.find((h) => h.agent_kind === 'voice') ?? null;
  const savedBlocked = history.find((h) => h.verdict === 'BLOCKED') ?? null;

  const kb = keyboardData(result, liveEvents, isRunning, savedKb);
  const vo = voiceData(voiceResult, savedVoice);
  const hu = hunterData(result, voiceResult, savedBlocked);

  const finding = result ? findingText(result) : voiceResult ? findingText(voiceResult) : null;
  const blockedRun = result?.blocked_element ? result : voiceResult?.blocked_element ? voiceResult : null;
  const pills = buildTimeline(result, voiceResult, liveEvents);

  return (
    <section id="agents-investigation" aria-labelledby="ghost-hunt-heading" className="flex flex-col">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 id="ghost-hunt-heading" className="m-0 text-[22px] sm:text-[24px] font-extrabold text-white">
          The Ghost Hunt — Agent Investigation
        </h2>
        <div className="text-sm text-[#9aa3c7]">
          <ResultState
            result={result ?? voiceResult}
            apiStatus={apiStatus}
            isRunning={isRunning}
            hint={history.length > 0 ? `Showing latest session & saved runs (${history.length} recorded).` : 'Run a journey to inspect what each agent measured.'}
          />
        </div>
      </div>

      {/* 3 Equal Real-Telemetry Cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <AgentCard
          name="Keyboard Agent"
          roleLabel="Tab & Enter traversal"
          icon={<Keyboard size={20} />}
          status={kb.status}
          isRunning={isRunning}
          outcomes={kb.outcomes}
          meta={kb.meta}
        />
        <AgentCard
          name="Voice Agent"
          roleLabel="Accessible-name commands"
          ariaLabel="Voice Agent"
          icon={<Mic size={20} />}
          status={vo.status}
          outcomes={vo.outcomes}
          meta={vo.meta}
          emptyText="Run Voice mode in Possession Mode"
        />
        <AgentCard
          name="Ghost Hunter"
          roleLabel="DOM & WCAG root cause"
          icon={<Target size={20} />}
          status={hu.status}
          outcomes={hu.outcomes}
          meta={hu.meta}
          emptyText="Waiting for a run"
        />
      </div>

      {/* Horizontal Real Step Timeline */}
      {pills.length > 0 && (
        <div
          className="mt-5 flex flex-wrap items-center gap-2 text-sm text-[#9aa3c7]"
          aria-label="Live timeline"
          aria-live="polite"
        >
          <span className="font-medium">Live timeline:</span>
          {pills.map((pill) => (
            <span
              key={pill.id}
              className={`inline-flex items-center gap-1.5 rounded-full border border-[#2c2a52] bg-[#12162d] px-3 py-1 font-mono text-[12.5px] ${
                pill.ok ? 'text-[#6ee7a0]' : 'text-[#ff7a7a]'
              }`}
            >
              {pill.kind === 'keyboard' ? (
                <Keyboard size={13} aria-hidden="true" />
              ) : (
                <Mic size={13} aria-hidden="true" />
              )}
              <span>{pill.text}</span>
            </span>
          ))}
        </div>
      )}

      {/* Crimson Critical Ghost Detected Callout (real BLOCKED run only) */}
      {finding && blockedRun?.blocked_element && (
        <div className="v9-agent-crit" role="alert" aria-live="assertive">
          <div className="shrink-0" aria-hidden="true">
            <GhostFigure tone="red" face="worried" size={92} />
          </div>

          <div className="min-w-[220px] flex-1">
            <h3 className="m-0 mb-2 text-[22px] font-extrabold text-[#ff6b6b] drop-shadow-[0_0_12px_rgba(239,68,68,0.47)]">
              Critical Ghost Detected
            </h3>
            <p className="m-0 my-0.5 text-[15px] text-[#f1e6ee]">Barrier: {finding.barrier}</p>
            <p className="m-0 my-0.5 text-[15px] text-[#f1e6ee]">Impact: {finding.impact}</p>
            <p className="m-0 my-0.5 text-[15px] text-[#f1e6ee]">WCAG: {finding.wcag}</p>
            <p className="m-0 mt-1.5 text-xs text-[#cbb8c8]">
              Measured on {scenarioDisplayName(blockedRun.scenario)} · {blockedRun.agent_mode} mode · {blockedRun.variant} page
            </p>
          </div>

          <div className="v9-agent-thumb w-full sm:w-auto" aria-hidden="true">
            <div className="v9-agent-thumb-lines" />
            <div className="v9-agent-thumb-mini">
              <span className="truncate">{finding.element}</span>
              <Ban size={20} className="shrink-0 text-[#ff6b6b]" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
