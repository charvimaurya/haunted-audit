import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Page } from '../layout/Page';
import { PossessionMode } from './PossessionMode';
import { RunControls } from './RunControls';
import { RunNotice } from './RunNotice';
import { SafariTabTip } from './SafariTabTip';
import { VoiceCommandsCard } from './VoiceCommandsCard';
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

/**
 * PossessionJourney: the run controls (Scenario, Variant, Agent mode, Agent: Keyboard or Voice, Run) and the panel below them.
 * Used by Possession Mode and by the Try page, so both offer the same Keyboard / Voice choice.
 * Test details (user-typed-test-details, 24 Nov 2026): the tester types a made-up Recipient, Amount and Reference;
 * nothing is filled in. Voice commands follow those details until the tester edits them.
 */
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
    liveEvents,
    isRunning,
    notice,
    setVariant,
    setMode,
    run,
  } = useRun();
  const [params, setParams] = useSearchParams();
  const paramScenario = params.get('scenario');

  useEffect(() => {
    if (isScenarioId(paramScenario)) {
      setScenario(paramScenario);
    }
  }, [paramScenario, setScenario]);

  const activeScenario = getScenarioDef(scenario);
  const voiceLead = `A voice-command run of one user journey (${activeScenario.submitLabel}) on ${activeScenario.name}. A ghost is an accessibility barrier.`;

  const [agent, setAgent] = useState<AgentKind>(params.get('agent') === 'voice' ? 'voice' : 'keyboard');
  const [autoOpenSandbox, setAutoOpenSandbox] = useState(true);
  // null until the tester edits the commands; until then they follow the typed details (REQ-TD-03).
  const [editedText, setEditedText] = useState<string | null>(null);
  const commandText = editedText ?? commandsFromDetails(details, activeScenario.submitLabel).join('\n');
  const setCommandText = (text: string) => setEditedText(text);
  const [source, setSource] = useState<VoiceInputSource>('typed');
  const [emptyNotice, setEmptyNotice] = useState<string | null>(null);
  const voice = useVoiceRun();
  // Text the voice agent typed into the bank fills the form; the tester's own edits win (REQ-TD-11).
  const onDetailsChange = useVoiceDetailsFill(voice.state, details, setDetails);
  const speech = useSpeechInput((text) => {
    // Listen, then act: what was heard replaces the commands and runs at once (voice-agent REQ-VA-12).
    setCommandText(text);
    setSource('speech');
    setEmptyNotice(null);
    void voice.start(variant, commandsFrom(text), 'speech', scenario);
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

  function handleScenarioChange(nextId: ScenarioId) {
    setScenario(nextId);
    setEditedText(null);
    setEmptyNotice(null);
    const nextParams = new URLSearchParams(params);
    nextParams.set('scenario', nextId);
    setParams(nextParams, { replace: true });
  }

  function runKeyboard() {
    setVoiceResult(null);
    const liveTab =
      autoOpenSandbox && typeof window !== 'undefined'
        ? window.open('', '_blank')
        : null;
    if (liveTab) {
      try {
        liveTab.document.open();
        liveTab.document.write(
          '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Launching Haunted Audit Sandbox…</title>' +
          '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#120b24;color:#f3efff;font:600 16px/1.5 ui-sans-serif,system-ui,sans-serif}' +
          '.box{max-width:420px;padding:24px;border:1px solid #4a3270;border-radius:16px;background:#1b1133;text-align:center}' +
          '.sub{margin-top:8px;font-size:13px;font-weight:400;color:#cbbbe0}</style></head>' +
          '<body><div class="box"><div>Starting Haunted Audit sandbox…</div>' +
          '<div class="sub">Connecting to the backend runner and loading the live walkthrough.</div></div></body></html>',
        );
        liveTab.document.close();
      } catch {
        /* ignore cross-origin or restricted popup document */
      }
    }
    return run({ liveTab });
  }

  function runVoice() {
    const commands = commandsFrom(commandText);
    if (commands.length === 0) {
      setEmptyNotice('There are no commands yet. Use Push to talk or Edit commands to add one, for example: type "<name>" in Recipient.');
      return;
    }
    setEmptyNotice(null);
    void voice.start(variant, commands, source, scenario);
  }

  return (
    <Page
      id={pageId}
      lead={isVoice ? voiceLead : undefined}
    >
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-base-line bg-base-panel px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-violet-600/20 px-2 py-0.5 text-xs font-semibold text-violet-neon">
              {activeScenario.category}
            </span>
            <strong className="text-sm font-bold text-white">{activeScenario.name}</strong>
          </div>
          <p className="m-0 mt-1 text-xs text-ink-muted">{activeScenario.summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 min-w-0 w-full sm:w-auto">
          <label htmlFor="scenario-picker" className="text-xs font-semibold text-ink-muted shrink-0">
            Sandbox scenario
          </label>
          <select
            id="scenario-picker"
            value={scenario}
            disabled={isRunning || voice.state.phase === 'running'}
            onChange={(e) => handleScenarioChange(e.target.value as ScenarioId)}
            className="h-9 w-full sm:w-auto min-w-0 max-w-full rounded-lg border border-base-line bg-base-surface px-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
          >
            {SCENARIOS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.category})
              </option>
            ))}
          </select>
          <Link
            to={to('app-journeys')}
            className="rounded-lg border border-base-line bg-base-surface px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
          >
            All scenarios
          </Link>
          {!isVoice && (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-base-line bg-base px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:text-white">
              <input
                type="checkbox"
                checked={autoOpenSandbox}
                onChange={(e) => setAutoOpenSandbox(e.target.checked)}
                className="h-3.5 w-3.5 accent-violet-500"
              />
              <span>Open live site tab</span>
            </label>
          )}
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
          <PossessionMode
            scenario={scenario}
            variant={variant}
            result={result}
            isRunning={isRunning}
            liveEvents={liveEvents}
            runDetails={runDetails}
          />
        )}
      </div>
    </Page>
  );
}
