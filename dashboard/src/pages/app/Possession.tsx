import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page } from '../../components/Page';
import { PossessionMode } from '../../components/PossessionMode';
import { RunControls } from '../../components/RunControls';
import { RunNotice } from '../../components/RunNotice';
import { VoiceCommandsCard } from '../../components/VoiceCommandsCard';
import type { AgentKind } from '../../components/AgentToggle';
import { useRun } from '../../runs/runContext';
import type { RunStatus } from '../../types';
import type { VoiceInputSource } from '../../voice/interpretVoiceCommand';
import { commandsFrom, useVoiceRun } from '../../voice/useVoiceRun';
import { useSpeechInput } from '../../voice/useSpeechInput';
import { commandsFromDetails } from '../../voice/commandsFromDetails';


/** Possession Mode: a keyboard-only or voice run of the Send Payment journey (v7 panel B). */
export default function Possession() {
  const { variant, mode, details, setDetails, runDetails, runStatus, result, isRunning, notice, setVariant, setMode, run } =
    useRun();
  const [params] = useSearchParams();
  const [agent, setAgent] = useState<AgentKind>(params.get('agent') === 'voice' ? 'voice' : 'keyboard');
  // Voice commands come from the test details until the tester edits them (user-typed-test-details REQ-TD-03).
  const [editedText, setEditedText] = useState<string | null>(null);
  const commandText = editedText ?? commandsFromDetails(details).join('\n');
  const setCommandText = (next: string | ((t: string) => string)) =>
    setEditedText((prev) => (typeof next === 'function' ? next(prev ?? commandText) : next));
  const [source, setSource] = useState<VoiceInputSource>('typed');
  const voice = useVoiceRun();
  const speech = useSpeechInput((text) => {
    setCommandText((t) => (t.trim() ? `${t.replace(/\s+$/, '')}\n${text}` : text));
    setSource('speech');
  });

  const voiceStatus: RunStatus | null =
    voice.state.phase === 'idle' ? null
    : voice.state.phase === 'running' ? 'running'
    : voice.state.phase === 'finished' && voice.state.result?.verdict === 'PASSED' ? 'complete'
    : 'error';
  const voiceLabel =
    voice.state.phase === 'finished' && voice.state.result
      ? voice.state.result.verdict === 'PASSED' ? 'Passed' : 'Blocked'
      : voice.state.phase === 'failed' || voice.state.phase === 'refused' || voice.state.phase === 'offline'
        ? 'Could not run'
        : undefined;
  const isVoice = agent === 'voice';

  function runVoice() {
    void voice.start(variant, commandsFrom(commandText), source);
  }

  return (
    <Page id="possession">
      <RunControls
        variant={variant}
        mode={mode}
        status={isVoice ? voiceStatus : runStatus}
        onVariantChange={setVariant}
        onModeChange={setMode}
        details={details}
        onDetailsChange={setDetails}
        requireDetails={!(isVoice && editedText !== null)}
        onRun={isVoice ? runVoice : run}
        agent={agent}
        onAgentChange={setAgent}
        statusLabel={isVoice ? voiceLabel : undefined}
      />
      {!isVoice && notice && <RunNotice {...notice} />}
      <div className="mt-6">
        {isVoice ? (
          <VoiceCommandsCard
            commandText={commandText}
            onCommandTextChange={(text, src) => { setCommandText(text); setSource(src); }}
            source={source}
            run={voice.state}
            speech={speech}
          />
        ) : (
          <PossessionMode result={result} isRunning={isRunning} runDetails={runDetails} />
        )}
      </div>
    </Page>
  );
}
