import { useEffect, useState } from 'react';
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

/** Starts empty: the tester types the recipient's name themselves (recipient-input REQ-RI-03). */
const DEFAULT_COMMANDS = '';
const VOICE_LEAD =
  'A voice-command run of one user journey (sending a payment) on the Haunted Bank test site. A ghost is an accessibility barrier.';

/** Possession Mode: a keyboard-only or voice run of the Send Payment journey (v7 panel B). */
export default function Possession() {
  const { variant, mode, recipient, setRecipient, setVoiceResult, runStatus, result, isRunning, notice, setVariant, setMode, run } =
    useRun();
  const [params] = useSearchParams();
  const [agent, setAgent] = useState<AgentKind>(params.get('agent') === 'voice' ? 'voice' : 'keyboard');
  const [commandText, setCommandText] = useState(DEFAULT_COMMANDS);
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

  // A finished voice run feeds the status badge in the app bar.
  useEffect(() => {
    if (voice.state.phase === 'finished' && voice.state.result) setVoiceResult(voice.state.result);
  }, [voice.state.phase, voice.state.result, setVoiceResult]);

  function runKeyboard() {
    setVoiceResult(null);
    return run();
  }

  function runVoice() {
    void voice.start(variant, commandsFrom(commandText), source);
  }

  return (
    <Page
      id="possession"
      lead={isVoice ? VOICE_LEAD : undefined}
    >
      <RunControls
        variant={variant}
        mode={mode}
        status={isVoice ? voiceStatus : runStatus}
        onVariantChange={setVariant}
        onModeChange={setMode}
        recipient={recipient}
        onRecipientChange={setRecipient}
        onRun={isVoice ? runVoice : runKeyboard}
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
          <PossessionMode result={result} isRunning={isRunning} />
        )}
      </div>
    </Page>
  );
}
