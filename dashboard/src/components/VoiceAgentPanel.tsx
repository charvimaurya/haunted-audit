/**
 * Voice Agent — typed command + optional browser speech recognition.
 * Local simulation against JourneyResult; no server voice endpoint in this codebase.
 * Never stores audio; never constructs Audio that autoplays.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, CircleDashed, Info, Mic, MicOff, XCircle } from 'lucide-react';
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
    status === 'ran' ? 'Ran' : status === 'simulated' ? 'Simulated' : 'Not run yet';
  const Icon = status === 'not-run' ? CircleDashed : status === 'simulated' ? Info : CheckCircle2;
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

function OutcomeIcon({ status }: { status: VoiceOutcomeRow['status'] }) {
  if (status === 'ok') {
    return (
      <CheckCircle2
        size={16}
        className="mt-0.5 shrink-0 text-ghost-verified"
        aria-label="ok"
      />
    );
  }
  if (status === 'fail') {
    return (
      <XCircle size={16} className="mt-0.5 shrink-0 text-ghost-blocked" aria-label="failed" />
    );
  }
  return (
    <Info size={16} className="mt-0.5 shrink-0 text-ink-muted" aria-label="info" />
  );
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

  function runCommand() {
    if (listening) stopListening();
    const source = sourceRef.current;
    const interpreted = interpretVoiceCommand(transcript, result, source);
    setRunStatus(interpreted.status);
    setSourceLabel(interpreted.sourceLabel);
    setOutcomes(interpreted.outcomes);
  }

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
        <StatusChip status={runStatus} />
      </div>

      <p className="m-0 text-base font-ui text-ink-muted">
        Local simulation against the current journey run. There is no server voice agent
        endpoint in this dashboard yet.
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor={transcriptId} className="text-base font-ui text-ink">
          Command
        </label>
        <textarea
          id={transcriptId}
          rows={2}
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          placeholder='e.g. click Send Payment'
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

      {runStatus === 'not-run' ? (
        <p className="m-0 text-base font-ui text-ink-muted" role="status">
          Not run yet. Outcomes stay <span className="font-mono">--</span> until you run a
          command
          {result === null ? ' (and a journey has been measured).' : '.'}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Voice Agent outcomes">
          {outcomes.map((o, i) => (
            <li key={i} className="flex items-start gap-2 text-base font-ui">
              <OutcomeIcon status={o.status} />
              <span className={o.status === 'fail' ? 'text-ghost-blocked' : 'text-ink-muted'}>
                {o.label}
                {o.detail && (
                  <span className="mt-0.5 block text-base text-ink-faint">{o.detail}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
