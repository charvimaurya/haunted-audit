import { Alert, Button, Card, CardBody, Input, Tab, Tabs, Textarea } from '@heroui/react';
import {
  Ban,
  FileText,
  House,
  Keyboard,
  Landmark,
  List,
  Loader2,
  Mic,
  MicOff,
  Pencil,
  Play,
  Send,
  TriangleAlert,
} from 'lucide-react';
import { useId, useState } from 'react';
import { V9Dot } from '../ghost/V9Dot';
import { FocusTrailReplay } from './FocusTrailReplay';
import { PossessionGhost } from '../ghost/PossessionGhost';
import { getScenarioDef, type ScenarioId } from '../../runs/scenarios';
import { commandsFrom, type VoiceRunState } from '../../voice/useVoiceRun';
import type { VoiceInputSource } from '../../voice/interpretVoiceCommand';
import type { GhostState, JourneyResult, RecordedDetails, TestDetails } from '../../types/index';
import type { AgentKind } from './AgentToggle';

interface TabStep {
  label: string;
  status: 'pending' | 'pass' | 'fail';
  typed?: string;
}

interface PossessionModeProps {
  scenario?: ScenarioId;
  agent?: AgentKind;
  onAgentChange?: (agent: AgentKind) => void;
  details?: TestDetails;
  result: JourneyResult | null;
  isRunning?: boolean;
  liveSteps?: TabStep[];
  runDetails?: RecordedDetails | null;
  onRun?: () => void;
  voiceRun?: VoiceRunState;
  commandText?: string;
  onCommandTextChange?: (text: string, source: VoiceInputSource) => void;
  speech?: {
    supported: boolean;
    listening: boolean;
    heard: string;
    error: string | null;
    start: () => void;
    stop: () => void;
  };
  voiceNotice?: string | null;
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

function typedInto(result: JourneyResult, hint: string): string | undefined {
  const step = result.step_events.find(
    (e) => e.tool === 'type_text' && (e.focused_before?.selector_hint ?? '').includes(hint),
  );
  const text = step ? (step.args as { text?: unknown }).text : undefined;
  return typeof text === 'string' ? text : undefined;
}

function stepsFromResult(
  result: JourneyResult | null,
  runDetails: RecordedDetails | null = null,
  submitLabel = 'Send Payment',
): TabStep[] {
  if (result === null) {
    return [
      { label: 'Tab to Recipient', status: 'pending' },
      { label: 'Tab to Amount', status: 'pending' },
      { label: 'Tab to Reference', status: 'pending' },
      { label: `Tab to ${submitLabel}`, status: 'pending' },
    ];
  }
  const typed = (hint: string) => (runDetails ? typedInto(result, hint) : undefined);
  const reached = (hint: string) =>
    result.focus_trail.some((snap) => snap.selector_hint.includes(hint));
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

export function PossessionMode({
  scenario = 'haunted-bank',
  agent = 'keyboard',
  onAgentChange,
  details,
  result,
  isRunning = false,
  liveSteps,
  runDetails = null,
  onRun,
  voiceRun,
  commandText = '',
  onCommandTextChange,
  speech,
  voiceNotice,
}: PossessionModeProps) {
  const [editingVoice, setEditingVoice] = useState(false);
  const cmdId = useId();

  const isVoice = agent === 'voice';
  const shownResult = isVoice ? voiceRun?.result ?? null : result;
  const activeBusy = isVoice ? voiceRun?.phase === 'running' : isRunning;

  const activeScenario = getScenarioDef(shownResult?.scenario ?? scenario);
  const ghostState = ghostStateFromResult(shownResult, activeBusy);
  const steps = liveSteps ?? stepsFromResult(result, runDetails, activeScenario.submitLabel);
  const isBlocked = shownResult?.verdict === 'BLOCKED';
  const isPassed = shownResult?.verdict === 'PASSED';
  const isFixed = shownResult?.variant === 'fixed';

  const voiceCommands = commandsFrom(commandText);
  const displayRecipient = runDetails?.recipient ?? details?.recipient ?? '';
  const displayAmount = runDetails?.amount ?? details?.amount ?? '';
  const displayReference = runDetails?.reference ?? details?.reference ?? '';

  return (
    <section id="journeys" aria-labelledby="possession-heading">
      <h2 id="possession-heading" className="sr-only">
        Possession Mode — {isVoice ? 'Voice-command demonstration' : 'Keyboard-only demonstration'}
      </h2>

      {/* Responsive Split: stacked cleanly on mobile/tablet, 2-col side-by-side on desktop */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(310px,1fr)]">
        {/* Left: Target Sandbox Application */}
        <Card className="v9-card overflow-hidden text-white shadow-none">
          <CardBody className="flex flex-col p-0 md:flex-row">
            <aside
              className="flex flex-col gap-1 border-b border-[#2b3254] bg-[#0e1226]/90 p-3.5 md:w-48 md:shrink-0 md:border-r md:border-b-0"
              aria-label="Sandbox page links"
            >
              <div className="mb-2 flex items-center gap-2.5">
                <Landmark size={24} style={{ color: '#5ec8ff' }} aria-hidden="true" className="shrink-0" />
                <div className="min-w-0">
                  <b className="block truncate text-sm font-bold text-white">{activeScenario.name}</b>
                  <span className="text-xs text-ink-muted">Test site</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 md:flex-col">
                {NAV_ITEMS.map(({ label, Icon }) => {
                  const displayLabel = label === 'Send Payment' ? activeScenario.submitLabel : label;
                  const active = label === 'Send Payment';
                  return (
                    <a
                      key={label}
                      href="#journeys"
                      aria-current={active ? 'page' : undefined}
                      className={[
                        'flex min-h-9 items-center gap-2.5 rounded-xl px-3 text-sm no-underline transition-colors',
                        active
                          ? 'bg-[#1c2b4d] font-semibold text-[#7cc4ff] shadow-[inset_0_0_0_1px_#3b82f655]'
                          : 'text-[#d7dbef] hover:text-white',
                      ].join(' ')}
                    >
                      <Icon size={16} aria-hidden="true" className="shrink-0" />
                      <span className="truncate">{displayLabel}</span>
                    </a>
                  );
                })}
              </div>
            </aside>

            <div
              id="pm-replica-card"
              className="relative flex-1 p-5 sm:p-6"
              aria-label={`${activeScenario.submitLabel} form preview`}
            >
              <h3 className="m-0 mb-4 text-xl sm:text-2xl font-extrabold text-white">
                {activeScenario.submitLabel}
              </h3>

              <div className="flex max-w-lg flex-col gap-3">
                <div>
                  <label htmlFor="pm-recipient" className="mb-1 block text-xs sm:text-sm font-semibold text-white">
                    Recipient
                  </label>
                  <Input
                    id="pm-recipient"
                    aria-label="Recipient"
                    isReadOnly
                    value={displayRecipient}
                    classNames={{
                      inputWrapper: 'min-h-10 rounded-xl border border-[#2f3760] bg-[#121731] shadow-none',
                      input: 'text-sm text-white',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="pm-amount" className="mb-1 block text-xs sm:text-sm font-semibold text-white">
                    Amount
                  </label>
                  <Input
                    id="pm-amount"
                    aria-label="Amount"
                    isReadOnly
                    value={displayAmount ? `€${displayAmount}` : ''}
                    classNames={{
                      inputWrapper: 'min-h-10 rounded-xl border border-[#2f3760] bg-[#121731] shadow-none',
                      input: 'text-sm text-white',
                    }}
                  />
                  <div className="v9-amtbar" aria-hidden="true" />
                </div>

                {displayReference && (
                  <div>
                    <label htmlFor="pm-reference" className="mb-1 block text-xs sm:text-sm font-semibold text-white">
                      Reference
                    </label>
                    <Input
                      id="pm-reference"
                      aria-label="Reference"
                      isReadOnly
                      value={displayReference}
                      classNames={{
                        inputWrapper: 'min-h-10 rounded-xl border border-[#2f3760] bg-[#121731] shadow-none',
                        input: 'text-sm text-white',
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                {isFixed || isPassed ? (
                  <button
                    id="pm-send-payment"
                    type="button"
                    className="v9-paybtn ok"
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
                    aria-label={`${activeScenario.submitLabel} — blocked when element is a div without keyboard support`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
                    }}
                    className={`v9-paybtn ${isBlocked ? '' : 'idle'}`}
                  >
                    {activeScenario.submitLabel}
                  </div>
                )}

                {ghostState !== 'ready' && (
                  <div className="shrink-0">
                    <PossessionGhost size={86} state={ghostState === 'verified' ? 'verified' : 'blocked'} />
                  </div>
                )}
              </div>

              {isBlocked && (
                <div className="mt-3 max-w-sm">
                  <Alert
                    color="danger"
                    variant="faded"
                    icon={<Ban size={18} aria-hidden="true" />}
                    title="Journey Blocked"
                    description={
                      isVoice
                        ? `"${activeScenario.submitLabel}" is not a button, so a voice user cannot say its name to press it.`
                        : `The ${activeScenario.submitLabel} button cannot be reached using keyboard navigation.`
                    }
                    classNames={{
                      base: 'border-[#ff5a5a] bg-[#1a0c16f2]',
                      title: 'text-sm sm:text-base font-extrabold text-[#ff7a7a]',
                      description: 'text-xs sm:text-sm text-ink',
                    }}
                  />
                </div>
              )}

              {isPassed && (
                <div className="mt-3 max-w-sm">
                  <Alert
                    color="success"
                    variant="faded"
                    title="Journey Completed"
                    description={`The ${activeScenario.submitLabel} action completed on the test site.`}
                    classNames={{
                      base: 'border-[#22c55e] bg-[#0b1d14f2]',
                      title: 'text-sm sm:text-base font-extrabold text-[#6ee7a0]',
                      description: 'text-xs sm:text-sm text-ink',
                    }}
                  />
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Right: Possession Mode Control Rail */}
        <Card className="v9-card text-white shadow-none" aria-label="Possession Mode control and steps">
          <CardBody className="flex flex-col gap-3 p-4">
            <div className="flex items-start gap-3 border-b border-[#2b3254] pb-3">
              <span className="v9-neon shrink-0" aria-hidden="true">
                {isVoice ? <Mic size={32} /> : <Keyboard size={32} />}
              </span>
              <div>
                <h3 className="m-0 text-lg font-extrabold text-white">Possession Mode</h3>
                <p className="m-0 mt-0.5 text-sm text-ink-muted">
                  {isVoice ? 'Voice-command demonstration' : 'Keyboard-only demonstration'}
                </p>
              </div>
            </div>

            {onAgentChange && (
              <div className="v9-agentseg">
                <Tabs
                  fullWidth
                  size="sm"
                  aria-label="Agent switch"
                  selectedKey={agent}
                  isDisabled={activeBusy}
                  onSelectionChange={(k) => {
                    if (k === 'keyboard' || k === 'voice') onAgentChange(k);
                  }}
                  classNames={{
                    tabList: 'w-full rounded-xl border border-[#2b3254] bg-[#0d1022] p-1',
                    cursor: 'bg-gradient-to-b from-[#4b23a8] to-[#32178a] shadow-[0_0_12px_#8b5cf688]',
                    tab: 'h-9 text-sm font-semibold',
                    tabContent: 'text-ink-muted group-data-[selected=true]:text-white flex items-center gap-2',
                  }}
                >
                  <Tab
                    key="keyboard"
                    title={
                      <span className="flex items-center gap-1.5">
                        <Keyboard size={15} aria-hidden="true" />
                        <span>Keyboard</span>
                      </span>
                    }
                  />
                  <Tab
                    key="voice"
                    title={
                      <span className="flex items-center gap-1.5">
                        <Mic size={15} aria-hidden="true" />
                        <span>Voice</span>
                      </span>
                    }
                  />
                </Tabs>
              </div>
            )}

            {!isVoice ? (
              <ol
                className="m-0 flex list-none flex-col p-0"
                aria-label="Tab step results"
                aria-live="polite"
              >
                {steps.map((step, i) => {
                  const stuck = step.label.endsWith(' (stuck)');
                  const main = stuck ? step.label.slice(0, -' (stuck)'.length) : step.label;
                  return (
                    <li
                      key={i}
                      className="flex min-h-[44px] items-center gap-3 border-b border-[#262c4b] py-2 text-[15px] font-medium last:border-b-0"
                    >
                      <V9Dot
                        state={step.status === 'pass' ? 'ok' : step.status === 'fail' ? 'bad' : 'wait'}
                        size={22}
                      />
                      <span className="min-w-0 text-ink">
                        {main}
                        {stuck && <small className="block text-xs font-bold text-[#ff7373]">(stuck)</small>}
                        {step.typed !== undefined && (
                          <span className="block font-mono text-xs text-ink-muted">Typed: {step.typed}</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="flex flex-col gap-2">
                <ol className="m-0 flex list-none flex-col p-0" aria-label="Voice command steps" aria-live="polite">
                  {voiceCommands.length === 0 ? (
                    <li className="flex min-h-[44px] items-center gap-3 py-2 text-sm text-ink-muted">
                      <V9Dot state="wait" size={22} />
                      <span>Type details above or use Push to talk / Edit.</span>
                    </li>
                  ) : (
                    voiceCommands.map((cmd, idx) => {
                      const executed = voiceRun?.steps[idx];
                      const dotState = !executed ? 'wait' : executed.outcome === 'done' ? 'ok' : 'bad';
                      return (
                        <li
                          key={`${idx}-${cmd}`}
                          className="flex min-h-[44px] items-center gap-3 border-b border-[#262c4b] py-2 text-[14.5px] last:border-b-0"
                        >
                          <V9Dot state={dotState} size={22} />
                          <span className="min-w-0 break-words text-ink">
                            Say <code className="font-mono text-xs text-violet-200">&quot;{cmd}&quot;</code>
                            {executed && executed.outcome !== 'done' && (
                              <small className="block text-xs font-bold text-[#ff7373]">
                                {executed.message}
                              </small>
                            )}
                          </span>
                        </li>
                      );
                    })
                  )}
                </ol>

                {editingVoice && onCommandTextChange && (
                  <Textarea
                    id={cmdId}
                    aria-label="Voice commands, one per line"
                    minRows={3}
                    value={commandText}
                    onValueChange={(val) => onCommandTextChange(val, 'typed')}
                    classNames={{
                      inputWrapper: 'rounded-xl border border-[#2b3254] bg-[#0d1022]',
                      input: 'font-mono text-xs text-ink',
                    }}
                  />
                )}

                {speech?.listening && (
                  <p className="m-0 text-xs text-violet-200" role="status">
                    Listening… {speech.heard || '(speak now)'}
                  </p>
                )}
                {voiceNotice && (
                  <p className="m-0 text-xs text-[#ff7373]" role="alert">
                    {voiceNotice}
                  </p>
                )}
                {speech?.error && (
                  <p className="m-0 text-xs text-[#ff7373]" role="alert">
                    {speech.error}
                  </p>
                )}
                {(voiceRun?.phase === 'failed' || voiceRun?.phase === 'refused' || voiceRun?.phase === 'offline') &&
                  voiceRun.message && (
                    <p className="m-0 text-xs text-[#ff7373]" role="alert">
                      {voiceRun.message}
                    </p>
                  )}

                <div className="flex flex-col gap-2 pt-1">
                  {onRun && (
                    <Button
                      type="button"
                      isDisabled={activeBusy}
                      onPress={onRun}
                      startContent={activeBusy ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                      className="h-10 w-full rounded-xl border border-[#a78bfa] bg-gradient-to-b from-[#3b1f86] to-[#2a1466] text-sm font-bold text-white shadow-[0_0_16px_#8b5cf666]"
                    >
                      {activeBusy ? 'Running…' : 'Run voice journey'}
                    </Button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {speech?.supported && (
                      <Button
                        type="button"
                        size="sm"
                        aria-pressed={speech.listening}
                        onPress={() => (speech.listening ? speech.stop() : speech.start())}
                        startContent={speech.listening ? <MicOff size={14} /> : <Mic size={14} />}
                        className="h-9 rounded-xl border border-[#353c60] bg-[#1e2340] text-xs font-semibold text-[#dfe3ff]"
                      >
                        {speech.listening ? 'Stop' : 'Push to talk'}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      aria-expanded={editingVoice}
                      onPress={() => setEditingVoice((v) => !v)}
                      startContent={<Pencil size={14} />}
                      className={`h-9 rounded-xl border border-[#353c60] bg-[#1e2340] text-xs font-semibold text-[#dfe3ff] ${
                        speech?.supported ? '' : 'col-span-2'
                      }`}
                    >
                      {editingVoice ? 'Done editing' : 'Edit'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-auto pt-2">
              {activeBusy ? (
                <div
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-[#4b5375] text-sm font-semibold text-ink-muted"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span>Journey running…</span>
                </div>
              ) : isBlocked ? (
                <div
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#ff5a5a] bg-[#3a0f1a] text-base font-extrabold text-[#ffd0d0] shadow-[0_0_18px_#ef444466]"
                  role="status"
                  aria-live="polite"
                >
                  <TriangleAlert size={18} aria-hidden="true" />
                  <span>Barrier Detected!</span>
                </div>
              ) : isPassed ? (
                <div
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#22c55e] bg-[#0f2a1b] text-base font-extrabold text-[#c9f7da] shadow-[0_0_18px_#22c55e55]"
                  role="status"
                  aria-live="polite"
                >
                  <V9Dot state="ok" size={20} />
                  <span>No barrier found</span>
                </div>
              ) : (
                <div className="flex min-h-11 items-center justify-center rounded-xl border border-dashed border-[#4b5375] text-sm font-semibold text-ink-muted">
                  Run a journey to look for barriers
                </div>
              )}

              {!isVoice && <FocusTrailReplay result={result} isRunning={isRunning} />}
            </div>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
