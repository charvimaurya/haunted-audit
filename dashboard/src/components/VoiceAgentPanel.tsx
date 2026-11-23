/**
 * Voice Agent: typed commands and optional browser speech recognition (voice-agent REQ-VA-08).
 * With the API online, the commands run on the real Haunted Bank (POST /voice-runs) and the steps
 * arrive live over the same events stream. With the API offline, or outside the app, the panel falls
 * back to a local simulation against the last keyboard run, labelled "Example only, not a real run".
 * Never stores audio; never constructs Audio that autoplays.
 */

import { useContext, useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, CircleDashed, Info, Loader2, Mic, MicOff, XCircle } from 'lucide-react';
import { ExampleLabel } from './ExampleLabel';
import { RunContext } from '../runs/runContext';
import { commandsFrom, useVoiceRun, type VoiceStep } from '../voice/useVoiceRun';
import type { JourneyResult } from '../types';
import {
  interpretVoiceCommand,
  type VoiceInputSource,
  type VoiceOutcomeRow,
  type VoiceRunStatus,
} from '../voice/interpretVoiceCommand';
import {
  getSpeechRecognitionCtor,
  speechRecognitionSupported,
  type SpeechRecognitionLike,
} from '../voice/speechRecognition';

interface VoiceAgentPanelProps {
  result: JourneyResult | null;
}

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon';

function StatusChip({ status }: { status: VoiceRunStatus }) {
  const text =
    status === 'ran' ? 'Heard (simulation)' : status === 'simulated' ? 'Simulated' : 'Not run yet';
  const Icon = status === 'not-run' ? CircleDashed : Info;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border border-base-line bg-base/40 px-2 py-1 text-base font-ui text-ink"
      role="status"
    >
      <Icon size={16} className="shrink-0 text-ink-muted" aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}

const SOURCE_LABEL: Record<VoiceInputSource, string> = {
  typed: 'voice-command simulation',
  speech: 'browser speech recognition (Chrome)',
};

/** A real step from the voice runner: icon plus text. */
function StepRow({ step }: { step: VoiceStep }) {
  const Icon = step.outcome === 'done' ? CheckCircle2 : step.outcome === 'failed' ? XCircle : Info;
  const tone = step.outcome === 'done' ? 'text-ghost-verified' : step.outcome === 'failed' ? 'text-ghost-blocked' : 'text-ink-muted';
  const word = step.outcome === 'done' ? 'Done' : step.outcome === 'failed' ? 'Failed' : 'Not understood';
  return (
    <li className="flex items-start gap-2 text-base font-ui">
      <Icon size={16} className={`mt-1 shrink-0 ${tone}`} aria-hidden="true" />
      <span className="text-ink">
        <span className="sr-only">{word}: </span>
        {step.message}
        {step.element?.tag && step.outcome === 'failed' && (
          <span className="block font-mono text-ink-muted">
            Element: {step.element.tag}
            {step.element.text ? ` "${step.element.text}"` : ''}
          </span>
        )}
      </span>
    </li>
  );
}

/**
 * Simulated outcomes (API offline) are compared with the keyboard run, so they get a neutral icon only:
 * never a tick or a cross (no-mock-results REQ-NM-07).
 */
function OutcomeIcon() {
  return <Info size={16} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />;
}

export function VoiceAgentPanel({ result }: VoiceAgentPanelProps) {
  const formId = useId();
  const transcriptId = `${formId}-transcript`;
  const liveId = `${formId}-live`;
  const micSupported = speechRecognitionSupported();

  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [runStatus, setRunStatus] = useState<VoiceRunStatus>('not-run');
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<VoiceOutcomeRow[]>([]);
  const [micError, setMicError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const sourceRef = useRef<VoiceInputSource>('typed');
  const ctx = useContext(RunContext);
  const online = ctx?.apiStatus === 'online';
  const voice = useVoiceRun();
  const live = voice.state.phase !== 'idle' && voice.state.phase !== 'offline';

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function startListening() {
    setMicError(null);
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setMicError('Speech recognition is not supported in this browser. Use the typed command box.');
      return;
    }
    recognitionRef.current?.abort();
    const rec = new Ctor();
    recognitionRef.current = rec;
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (event) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0]?.transcript ?? '';
      }
      setTranscript(text.trim());
      sourceRef.current = 'speech';
    };
    rec.onerror = (event) => {
      setListening(false);
      if (event.error === 'not-allowed') {
        setMicError('Microphone permission denied. You can still type a command.');
      } else if (event.error !== 'aborted') {
        setMicError(`Speech recognition error: ${event.error}. You can still type a command.`);
      }
    };
    rec.onend = () => {
      setListening(false);
    };
    try {
      rec.start();
      setListening(true);
      sourceRef.current = 'speech';
    } catch {
      setListening(false);
      setMicError('Could not start speech recognition. You can still type a command.');
    }
  }

  function onTranscriptChange(value: string) {
    setTranscript(value);
    // Manual edits (including after speech) are labelled typed simulation on Run
    sourceRef.current = 'typed';
  }

  function simulate(source: VoiceInputSource) {
    const interpreted = interpretVoiceCommand(transcript, result, source);
    setRunStatus(interpreted.status);
    setSourceLabel(interpreted.sourceLabel);
    setOutcomes(interpreted.outcomes);
  }

  function runCommand() {
    if (listening) stopListening();
    const source = sourceRef.current;
    const commands = commandsFrom(transcript);
    if (online && ctx && commands.length > 0) {
      setSourceLabel(SOURCE_LABEL[source]);
      setRunStatus('not-run');
      void voice.start(ctx.variant, commands, source);
      return;
    }
    simulate(source);
  }

  // The API went away between the health check and the run: fall back to the labelled simulation.
  useEffect(() => {
    if (voice.state.phase === 'offline') simulate(sourceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.state.phase]);

  return (
    <article
      className="panel flex flex-col gap-3 p-4"
      aria-label="Voice Agent"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md
                     border border-violet-600/40 bg-violet-600/20 text-base"
          aria-hidden="true"
        >
          <Mic size={14} />
        </span>
        <h3 className="m-0 text-base font-semibold font-ui text-ink">Voice Agent</h3>
        {live ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-md border border-base-line bg-base/40 px-2 py-1 text-base font-ui text-ink"
            role="status"
          >
            {voice.state.phase === 'running' && <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" />}
            {voice.state.phase === 'running' ? 'Running on the bank' : voice.state.phase === 'finished' ? 'Finished' : 'Did not finish'}
          </span>
        ) : (
          <StatusChip status={runStatus} />
        )}
      </div>

      {online && ctx ? (
        <p className="m-0 text-base font-ui text-ink-muted">
          Runs your commands on the Haunted Bank test site ({ctx.variant} page) in a browser, finding each
          control by its accessible name only. Change the page in Possession Mode. One command per line:{' '}
          <span className="font-mono">click &lt;name&gt;</span>, <span className="font-mono">type &lt;text&gt; in &lt;field&gt;</span>,{' '}
          <span className="font-mono">go to &lt;name&gt;</span>.
        </p>
      ) : (
        <p className="m-0 text-base font-ui text-ink-muted">
          The audit service is not answering, so the bank cannot be driven. A command is compared with the
          last keyboard run instead, as a simulation.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor={transcriptId} className="text-base font-ui text-ink">
          Command
        </label>
        <textarea
          id={transcriptId}
          rows={3}
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          placeholder={'e.g. type "<recipient>" in Recipient\ntype 50.00 in Amount\nclick Send Payment'}
          className={`w-full resize-y rounded-lg border border-base-line bg-base px-3 py-2
                      text-base font-ui text-ink placeholder:text-ink-faint ${FOCUS}`}
          aria-describedby={liveId}
        />
        <div
          id={liveId}
          className="min-h-[1.5rem] text-base font-ui text-ink-muted"
          aria-live="polite"
          aria-atomic="true"
        >
          {listening
            ? `Listening… ${transcript || '(speak now)'}`
            : transcript
              ? `Transcript: ${transcript}`
              : 'Transcript empty. Type a command or use the microphone.'}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={runCommand}
          className={`inline-flex min-h-11 items-center rounded-lg border border-violet-600/50
                      bg-violet-600/25 px-4 text-base font-ui font-medium text-ink
                      hover:border-violet-neon ${FOCUS}`}
        >
          Run command
        </button>
        {micSupported ? (
          <button
            type="button"
            onClick={() => (listening ? stopListening() : startListening())}
            aria-pressed={listening}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-base-line
                        px-4 text-base font-ui text-ink hover:border-violet-neon ${FOCUS}
                        ${listening ? 'bg-ghost-blocked/15 border-ghost-blocked/50' : 'bg-base/40'}`}
          >
            {listening ? (
              <>
                <MicOff size={16} aria-hidden="true" />
                Stop listening
              </>
            ) : (
              <>
                <Mic size={16} aria-hidden="true" />
                Push to talk
              </>
            )}
          </button>
        ) : (
          <p className="m-0 self-center text-base font-ui text-ink-muted" role="status">
            Mic unavailable — typed input only in this browser.
          </p>
        )}
      </div>

      {micSupported && (
        <p className="m-0 text-base font-ui text-ink-faint">
          Chrome may send microphone audio to its speech recognition service. This app never
          stores audio and never plays sound automatically.
        </p>
      )}

      {micError && (
        <p className="m-0 text-base font-ui text-ghost-blocked" role="alert">
          {micError}
        </p>
      )}

      {sourceLabel && (
        <p className="m-0 text-base font-ui text-ink-muted">
          Source: <span className="text-ink">{sourceLabel}</span>
        </p>
      )}

      {live ? (
        <section aria-label="Voice steps" className="flex flex-col gap-2">
          <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-live="polite" aria-label="Voice Agent steps">
            {voice.state.steps.map((s) => (
              <StepRow key={s.step} step={s} />
            ))}
          </ol>
          {voice.state.phase === 'running' && voice.state.steps.length === 0 && (
            <p className="m-0 text-base font-ui text-ink-muted">Opening the bank…</p>
          )}
          {voice.state.phase === 'finished' && voice.state.result && (
            <p className="m-0 text-base font-ui text-ink" role="status">
              Checker: {voice.state.result.verdict}
              {voice.state.result.reason_code ? ` (${voice.state.result.reason_code})` : ''}. Voice agent,{' '}
              {voice.state.result.agent_mode} mode, {voice.state.result.variant} page.
            </p>
          )}
          {(voice.state.phase === 'failed' || voice.state.phase === 'refused') && (
            <p className="m-0 text-base font-ui text-ink-muted" role="status">
              The run did not finish, so no result is shown. {voice.state.message}
            </p>
          )}
        </section>
      ) : runStatus === 'not-run' ? (
        <p className="m-0 text-base font-ui text-ink-muted" role="status">
          Not run yet. Outcomes stay <span className="font-mono">--</span> until you run a
          command
          {result === null ? ' (and a journey has been measured).' : '.'}
        </p>
      ) : (
        <ExampleLabel>
        <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Voice Agent outcomes">
          {outcomes.map((o, i) => (
            <li key={i} className="flex items-start gap-2 text-base font-ui">
              <OutcomeIcon />
              <span className="text-ink-muted">
                {o.label}
                {o.detail && (
                  <span className="mt-0.5 block text-base text-ink-faint">{o.detail}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <p className="m-0 text-base font-ui text-ink-faint">
          No voice agent ran. These lines compare your command with the last keyboard run.
        </p>
        </ExampleLabel>
      )}
    </article>
  );
}
