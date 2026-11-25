import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page } from './Page';
import { PossessionMode } from './PossessionMode';
import { RunControls } from './RunControls';
import { RunNotice } from './RunNotice';
import { SafariTabTip } from './SafariTabTip';
import { VoiceCommandsCard } from './VoiceCommandsCard';
import type { AgentKind } from './AgentToggle';
import { useRun } from '../runs/runContext';
import type { RunStatus } from '../types';
import type { VoiceInputSource } from '../voice/interpretVoiceCommand';
import { commandsFrom, useVoiceRun } from '../voice/useVoiceRun';
import { useSpeechInput } from '../voice/useSpeechInput';
import { commandsFromDetails } from '../voice/commandsFromDetails';
import { detailsFromSteps, withoutHandTypedFields } from '../voice/detailsFromSteps';

const VOICE_LEAD =
  'A voice-command run of one user journey (sending a payment) on the Haunted Bank test site. A ghost is an accessibility barrier.';

/**
 * PossessionJourney: the run controls (Variant, Agent mode, Agent: Keyboard or Voice, Run) and the panel below them.
 * Used by Possession Mode and by the Try page, so both offer the same Keyboard / Voice choice.
 * Test details (user-typed-test-details, 24 Nov 2026): the tester types a made-up Recipient, Amount and Reference;
 * nothing is filled in. Voice commands follow those details until the tester edits them.
 */
export function PossessionJourney({ pageId }: { pageId: 'possession' | 'try' }) {
  const { variant, mode, details, setDetails, runDetails, setVoiceResult, runStatus, result, isRunning, notice, setVariant, setMode, run } =
    useRun();
  const [params] = useSearchParams();
  const [agent, setAgent] = useState<AgentKind>(params.get('agent') === 'voice' ? 'voice' : 'keyboard');
  // null until the tester edits the commands; until then they follow the typed details (REQ-TD-03).
  const [editedText, setEditedText] = useState<string | null>(null);
  const commandText = editedText ?? commandsFromDetails(details).join('\n');
  const setCommandText = (text: string) => setEditedText(text);
  const [source, setSource] = useState<VoiceInputSource>('typed');
  const [emptyNotice, setEmptyNotice] = useState<string | null>(null);
  const voice = useVoiceRun();
  const speech = useSpeechInput((text) => {
    // Listen, then act: what was heard replaces the commands and runs at once (voice-agent REQ-VA-12).
    setCommandText(text);
    setSource('speech');
    setEmptyNotice(null);
    void voice.start(variant, commandsFrom(text), 'speech');
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

  // Which fields the tester has typed by hand. A voice-filled field never overwrites one of these
  // (owner decision, 25 Nov 2026: manual edits are never overwritten by streamed events or final records).
  const touchedByHandRef = useRef<Set<keyof typeof details>>(new Set());
  const handleDetailsChange = (next: typeof details) => {
    for (const field of Object.keys(next) as (keyof typeof details)[]) {
      if (next[field] !== details[field]) touchedByHandRef.current.add(field);
    }
    setDetails(next);
  };

  // What the voice agent typed, and completed, fills the Test details form as its steps arrive
  // (owner request, 24 Nov 2026), but only for a field the tester has not already typed by hand,
  // and only from a voice_type step whose outcome was "done" (detailsFromSteps.ts).
  const spoken = detailsFromSteps(voice.state.steps);
  const spokenKey = JSON.stringify(spoken);
  useEffect(() => {
    const fill = JSON.parse(spokenKey) as Partial<typeof details>;
    const untouched = withoutHandTypedFields(fill, touchedByHandRef.current);
    if (Object.keys(untouched).length === 0) return;
    setDetails({ ...details, ...untouched });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only when the spoken values change
  }, [spokenKey]);
  // A finished voice run feeds the status badge in the app bar.
  useEffect(() => {
    if (voice.state.phase === 'finished' && voice.state.result) setVoiceResult(voice.state.result);
  }, [voice.state.phase, voice.state.result, setVoiceResult]);

  function runKeyboard() {
    setVoiceResult(null);
    return run();
  }

  function runVoice() {
    const commands = commandsFrom(commandText);
    if (commands.length === 0) {
      setEmptyNotice('There are no commands yet. Use Push to talk or Edit commands to add one, for example: type "<name>" in Recipient.');
      return;
    }
    setEmptyNotice(null);
    void voice.start(variant, commands, source);
  }

  return (
    <Page
      id={pageId}
      lead={isVoice ? VOICE_LEAD : undefined}
    >
      <RunControls
        variant={variant}
        mode={mode}
        status={isVoice ? voiceStatus : runStatus}
        onVariantChange={setVariant}
        onModeChange={setMode}
        details={details}
        onDetailsChange={handleDetailsChange}
        requireDetails={!(isVoice && editedText !== null)}
        onRun={isVoice ? runVoice : runKeyboard}
        agent={agent}
        onAgentChange={setAgent}
        statusLabel={isVoice ? voiceLabel : undefined}
      />
      {!isVoice && <SafariTabTip />}
      {!isVoice && notice && <RunNotice {...notice} />}
      <div className="mt-6">
        {isVoice ? (
          <VoiceCommandsCard
            commandText={commandText}
            onCommandTextChange={(text, src) => { setCommandText(text); setSource(src); }}
            source={source}
            run={voice.state}
            speech={speech}
            notice={emptyNotice}
          />
        ) : (
          <PossessionMode result={result} isRunning={isRunning} runDetails={runDetails} />
        )}
      </div>
    </Page>
  );
}
