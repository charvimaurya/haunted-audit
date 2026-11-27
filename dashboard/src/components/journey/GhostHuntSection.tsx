import { Card, CardBody, Chip } from '@heroui/react';
import { Ban, Keyboard, Mic, Target } from 'lucide-react';
import { Link, useInRouterContext } from 'react-router-dom';
import { to } from '../../routes';
import { getScenarioDef } from '../../runs/scenarios';
import { ResultState } from '../results/ResultState';
import type { ApiStatus } from '../../runs/runContext';
import { AgentCard, type AgentOutcome } from './AgentCard';
import { GhostFigure } from '../ghost/GhostFigure';
import { findingText } from '../../lib/finding';
import type { JourneyResult, StepEvent } from '../../types/index';

interface GhostHuntSectionProps {
  result: JourneyResult | null;
  isRunning?: boolean;
  liveEvents?: StepEvent[];
  apiStatus?: ApiStatus;
  voiceResult?: JourneyResult | null;
}

function keyboardOutcomes(result: JourneyResult | null): AgentOutcome[] {
  if (!result || !result.verdict) return [];
  const label = getScenarioDef(result.scenario).submitLabel;
  const reached = (hint: string) => result.focus_trail.some((snap) => snap.selector_hint.includes(hint));
  const rows: AgentOutcome[] = [];
  if (reached('#recipient') || reached('#amount')) rows.push({ label: 'Navigated form', passed: true });
  if (result.verdict === 'PASSED') return [...rows, { label: `Reached ${label} by keyboard`, passed: true }];
  return [...rows, { label: `Could not reach ${label}`, passed: false, detail: result.reason_code ?? undefined }];
}

function voiceOutcomes(voice: JourneyResult | null): AgentOutcome[] {
  if (!voice) return [];
  return voice.step_events.map((e) => {
    const a = e.args as Record<string, unknown>;
    return { label: typeof a.message === 'string' ? a.message : e.tool, passed: a.outcome === 'done' };
  });
}

function hunterOutcomes(result: JourneyResult | null): AgentOutcome[] {
  const el = result?.verdict === 'BLOCKED' ? result.blocked_element : null;
  if (!el) return [];
  const custom =
    result?.reason_code === 'TARGET_NOT_FOCUSABLE' &&
    el.tag &&
    !['button', 'a', 'input'].includes(el.tag.toLowerCase());
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
  const targetLabel = getScenarioDef(result?.scenario).submitLabel;
  const displayEvents: StepEvent[] = result?.step_events?.length
    ? result.step_events.slice(-8)
    : liveEvents.slice(-8);

  return (
    <section id="scans" aria-labelledby="ghost-hunt-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="ghost-hunt-heading" className="m-0 text-lg sm:text-xl font-extrabold text-white">
          The Ghost Hunt — <span className="font-semibold text-ink-muted">Agent Investigation</span>
        </h2>
        <ResultState result={result} apiStatus={apiStatus} isRunning={isRunning} hint="Run a journey to see what each agent found." />
      </div>

      {/* Responsive Grid: 1 col Mobile, 2 cols Tablet, 3 cols Desktop */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        <AgentCard
          name="Keyboard Agent"
          icon={<Keyboard size={24} />}
          isRunning={isRunning}
          outcomes={keyboardOutcomes(result)}
        />

        <AgentCard
          name="Voice Agent"
          ariaLabel="Voice Agent"
          icon={<Mic size={24} />}
          outcomes={voiceOutcomes(voiceResult)}
          footer={
            <>
              Voice commands run from{' '}
              {inRouter ? (
                <Link
                  to={`${to('possession')}?agent=voice`}
                  className="text-violet-300 underline underline-offset-4 hover:text-white"
                >
                  Possession Mode
                </Link>
              ) : (
                'Possession Mode'
              )}
              .
            </>
          }
        />

        <div className="md:col-span-2 xl:col-span-1">
          <AgentCard
            name="Ghost Hunter"
            icon={<Target size={24} />}
            outcomes={hunterOutcomes(result)}
          />
        </div>
      </div>

      {/* Step Timeline with HeroUI Chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-ink-muted" aria-label="Live step timeline" aria-live="polite">
        <span className="font-semibold">Live timeline:</span>
        {displayEvents.length === 0 ? (
          <span className="text-ink-faint">{isRunning ? 'Waiting…' : 'No steps yet'}</span>
        ) : (
          displayEvents.map((ev) => {
            const failed = ev.tool === 'declare_done' && result?.verdict === 'BLOCKED';
            return (
              <Chip
                key={ev.step}
                size="sm"
                variant="flat"
                className={`border border-[#2b3254] bg-[#12162d] font-mono text-xs ${
                  failed ? 'text-[#ff7a7a]' : 'text-[#6ee7a0]'
                }`}
              >
                {ev.step}. {ev.tool}
              </Chip>
            );
          })
        )}
      </div>

      {/* Critical Ghost Detected HeroUI Card */}
      {finding && result?.blocked_element && (
        <Card className="v9-crit text-white shadow-none" role="alert" aria-live="assertive">
          <CardBody className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <GhostFigure tone="red" face="worried" size={76} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="m-0 mb-1 text-lg sm:text-xl font-extrabold text-[#ff6b6b]">
                Critical Ghost Detected
              </h3>
              <p className="m-0 my-0.5 text-sm sm:text-[15px] text-[#f1e6ee]">Barrier: {finding.barrier}</p>
              <p className="m-0 my-0.5 text-sm sm:text-[15px] text-[#f1e6ee]">Impact: {finding.impact}</p>
              <p className="m-0 my-0.5 font-mono text-xs sm:text-sm text-[#f1e6ee]">WCAG: {finding.wcag}</p>
              <p className="m-0 mt-1 text-xs text-ink-muted">
                From the checker · {result.agent_mode} mode · {result.variant} page
              </p>
            </div>

            <div className="w-full sm:w-52 shrink-0 rounded-xl border border-[#2e3558] bg-[#121631] p-3" aria-hidden="true">
              <div className="mb-2.5 h-6 rounded bg-[repeating-linear-gradient(180deg,#22c55e33_0_3px,transparent_3px_8px)] opacity-70" />
              <div className="flex items-center justify-between gap-2 rounded-lg border-2 border-[#ff5a5a] bg-[#2a1020] px-3 py-2 text-sm font-bold text-white shadow-[0_0_12px_#ef444466]">
                <span className="truncate">{targetLabel}</span>
                <Ban size={20} style={{ color: '#ff6b6b' }} className="shrink-0" />
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </section>
  );
}
