import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Chip, Select, SelectItem } from '@heroui/react';
import { Page } from '../layout/Page';
import { PossessionMode } from './PossessionMode';
import { RunControls } from './RunControls';
import { RunNotice } from './RunNotice';
import { SafariTabTip } from './SafariTabTip';
import type { AgentKind } from './AgentToggle';
import { to } from '../../routes';
import { useRun } from '../../runs/runContext';
import { getScenarioDef, isScenarioId, SCENARIOS, type ScenarioId } from '../../runs/scenarios';
import type { RunStatus } from '../../types/index';
import type { VoiceInputSource } from '../../voice/interpretVoiceCommand';
import { commandsFrom, useVoiceRun } from '../../voice/useVoiceRun';
import { useSpeechInput } from '../../voice/useSpeechInput';
import { commandsFromDetails } from '../../voice/commandsFromDetails';
import { useVoiceDetailsFill } from '../../voice/useVoiceDetailsFill';

export function PossessionJourney({ pageId = 'possession' }: { pageId?: 'possession' }) {
  const {
    scenario,
    setScenario,
    variant,
    mode,
    details,
    setDetails,
    runDetails,
    setVoiceResult,
    runStatus,
    result,
    isRunning,
    notice,
    setVariant,
    setMode,
    run,
  } = useRun();
  const [params, setParams] = useSearchParams();
  const paramScenario = params.get('scenario');

  useEffect(() => {
    if (isScenarioId(paramScenario) && paramScenario !== scenario) {
      setScenario(paramScenario);
    }
  }, [paramScenario, scenario, setScenario]);

  const activeScenario = getScenarioDef(scenario);
  const voiceLead = `A voice-command run of one user journey (${activeScenario.submitLabel}) on ${activeScenario.name}. A ghost is an accessibility barrier.`;

  const [agent, setAgent] = useState<AgentKind>(params.get('agent') === 'voice' ? 'voice' : 'keyboard');
  const [editedText, setEditedText] = useState<string | null>(null);
  const commandText = editedText ?? commandsFromDetails(details, activeScenario.submitLabel).join('\n');
  const setCommandText = (text: string) => setEditedText(text);
  const [source, setSource] = useState<VoiceInputSource>('typed');
  const [emptyNotice, setEmptyNotice] = useState<string | null>(null);
  const voice = useVoiceRun();
  const onDetailsChange = useVoiceDetailsFill(voice.state, details, setDetails);
  const speech = useSpeechInput((text) => {
    setCommandText(text);
    setSource('speech');
    setEmptyNotice(null);
    void voice.start(variant, commandsFrom(text), 'speech', scenario);
  });

  const voiceStatus: RunStatus | null =
    voice.state.phase === 'idle'
      ? null
      : voice.state.phase === 'running'
        ? 'running'
        : voice.state.phase === 'finished' && voice.state.result?.verdict === 'PASSED'
          ? 'complete'
          : 'error';
  const voiceLabel =
    voice.state.phase === 'finished' && voice.state.result
      ? voice.state.result.verdict === 'PASSED'
        ? 'Passed'
        : 'Blocked'
      : voice.state.phase === 'failed' || voice.state.phase === 'refused' || voice.state.phase === 'offline'
        ? 'Could not run'
        : undefined;
  const isVoice = agent === 'voice';

  useEffect(() => {
    if (voice.state.phase === 'finished' && voice.state.result) setVoiceResult(voice.state.result);
  }, [voice.state.phase, voice.state.result, setVoiceResult]);

  function handleScenarioChange(nextId: ScenarioId) {
    setScenario(nextId);
    const nextParams = new URLSearchParams(params);
    nextParams.set('scenario', nextId);
    setParams(nextParams, { replace: true });
  }

  function runKeyboard() {
    setVoiceResult(null);
    return run();
  }

  function runVoice() {
    const commands = commandsFrom(commandText);
    if (commands.length === 0) {
      setEmptyNotice('There are no commands yet. Use Push to talk or Edit to add one, for example: type "<name>" in Recipient.');
      return;
    }
    setEmptyNotice(null);
    void voice.start(variant, commands, source, scenario);
  }

  return (
    <Page id={pageId} lead={isVoice ? voiceLead : undefined} srOnlyTitle>
      {/* Compact single-line scenario strip above RunControls so Haunted Bank fits cleanly above the fold */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Chip size="sm" variant="flat" className="border border-[#2b3254] bg-[#1d2140] text-xs font-semibold text-violet-200">
            {activeScenario.category}
          </Chip>
          <strong className="text-sm font-bold text-white">{activeScenario.name}</strong>
          <span className="hidden text-xs text-ink-muted xl:inline">· {activeScenario.summary}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            id="scenario-picker"
            aria-label="Sandbox scenario"
            size="sm"
            disallowEmptySelection
            selectedKeys={[scenario]}
            isDisabled={isRunning || voice.state.phase === 'running'}
            onSelectionChange={(keys) => {
              const next = Array.from(keys)[0];
              if (typeof next === 'string' && isScenarioId(next)) handleScenarioChange(next);
            }}
            className="w-56"
            classNames={{
              trigger: 'h-8 min-h-8 rounded-lg border border-[#2f3760] bg-[#121731] text-white',
              value: 'text-xs font-semibold text-white',
              popoverContent: 'border border-[#2b3254] bg-[#151a33] text-white',
            }}
          >
            {SCENARIOS.map((item) => (
              <SelectItem key={item.id} textValue={`${item.name} (${item.category})`}>
                {item.name} ({item.category})
              </SelectItem>
            ))}
          </Select>
          <Button
            as={Link}
            to={to('app-journeys')}
            role="link"
            size="sm"
            variant="flat"
            className="h-8 rounded-lg border border-[#353c60] bg-[#1e2340] px-3 text-xs font-semibold text-[#dfe3ff]"
          >
            All 9
          </Button>
        </div>
      </div>

      <RunControls
        variant={variant}
        mode={mode}
        status={isVoice ? voiceStatus : runStatus}
        onVariantChange={setVariant}
        onModeChange={setMode}
        details={details}
        onDetailsChange={onDetailsChange}
        requireDetails={!(isVoice && editedText !== null)}
        onRun={isVoice ? runVoice : runKeyboard}
        agent={agent}
        onAgentChange={setAgent}
        statusLabel={isVoice ? voiceLabel : undefined}
      />

      {!isVoice && <SafariTabTip />}
      {!isVoice && notice && <RunNotice {...notice} />}

      <PossessionMode
        scenario={scenario}
        agent={agent}
        onAgentChange={setAgent}
        details={details}
        result={result}
        isRunning={isRunning}
        runDetails={runDetails}
        onRun={isVoice ? runVoice : runKeyboard}
        voiceRun={voice.state}
        commandText={commandText}
        onCommandTextChange={(text, src) => {
          setCommandText(text);
          setSource(src);
        }}
        speech={speech}
        voiceNotice={emptyNotice}
      />
    </Page>
  );
}
