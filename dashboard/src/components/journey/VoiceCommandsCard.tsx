/**
 * VoiceCommandsCard: the voice agent's commands, Push to talk, Edit commands and live steps
 * (Possession Mode, agent = Voice). Runs on the real Haunted Bank through POST /voice-runs.
 * Only what the run measured is shown. Audio is never stored or played.
 */
import { useId, useState } from 'react';
import { CheckCircle2, Info, Loader2, Mic, MicOff, Pencil, XCircle } from 'lucide-react';
import { commandsFrom, type VoiceRunState } from '../../voice/useVoiceRun';
import type { VoiceInputSource } from '../../voice/interpretVoiceCommand';

interface VoiceCommandsCardProps {
  commandText: string;
  onCommandTextChange: (text: string, source: VoiceInputSource) => void;
  source: VoiceInputSource;
  run: VoiceRunState;
  /** A plain sentence shown when the run could not start (for example, no commands). */
  notice?: string | null;
  speech: { supported: boolean; listening: boolean; heard: string; error: string | null; start: () => void; stop: () => void };
}

const SOURCE_LABEL: Record<VoiceInputSource, string> = {
  typed: 'voice-command simulation',
  speech: 'browser speech recognition (Chrome)',
};

const BTN =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-4 text-base font-ui';

export function VoiceCommandsCard({ commandText, onCommandTextChange, source, run, speech, notice }: VoiceCommandsCardProps) {
  const [editing, setEditing] = useState(false);
  const areaId = useId();
  const commands = commandsFrom(commandText);
  return (
    <section aria-labelledby="voice-commands-heading" className="panel grid gap-4 p-5 md:grid-cols-[1fr_16rem]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-600/25 text-violet-neon" aria-hidden="true">
            <Mic size={18} />
          </span>
          <h2 id="voice-commands-heading" className="m-0 text-xl font-semibold font-ui text-ink">Voice commands</h2>
          <span className="rounded-full border border-base-line px-3 py-1 text-base font-ui text-ink">{SOURCE_LABEL[source]}</span>
        </div>
        <p className="m-0 text-base font-ui text-ink-muted">
          The voice agent finds each control by its accessible name only, like a voice-control user would.
        </p>
        {editing ? (
          <div className="flex flex-col gap-1">
            <label htmlFor={areaId} className="text-base font-ui text-ink">Commands, one per line</label>
            <textarea
              id={areaId}
              rows={4}
              placeholder={'type "<name>" in Recipient\ntype 50.00 in Amount\nclick Send Payment'}
              value={commandText}
              onChange={(e) => onCommandTextChange(e.target.value, 'typed')}
              className="w-full resize-y rounded-lg border border-base-line bg-base px-3 py-2 font-mono text-base text-ink"
            />
          </div>
        ) : (
          <ol className="m-0 list-none p-0 font-mono text-base text-ink">
            {commands.map((c, i) => (
              <li key={`${i}-${c}`} className="flex gap-3">
                <span className="text-ink-muted" aria-hidden="true">{i + 1}</span>
                <span>{c}</span>
              </li>
            ))}
            {commands.length === 0 && <li className="font-ui text-ink-muted">No commands yet. Use Push to talk or Edit commands, for example: send 100 dollars to, then a made-up name.</li>}
          </ol>
        )}
        {speech.listening && (
          <p className="m-0 text-base font-ui text-ink" role="status">Listening… {speech.heard || '(speak now)'}</p>
        )}
        {notice && <p className="m-0 text-base font-ui text-ghost-blocked" role="alert">{notice}</p>}
        {speech.error && <p className="m-0 text-base font-ui text-ghost-blocked" role="alert">{speech.error}</p>}
        <div aria-live="polite" className="flex flex-col gap-2">
          {run.phase === 'running' && run.steps.length === 0 && (
            <p className="m-0 flex items-center gap-2 text-base font-ui text-ink-muted">
              <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" /> Opening the bank…
            </p>
          )}
          {run.steps.length > 0 && (
            <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Voice agent steps">
              {run.steps.map((s) => {
                const Icon = s.outcome === 'done' ? CheckCircle2 : s.outcome === 'failed' ? XCircle : Info;
                const tone = s.outcome === 'done' ? 'text-ghost-verified' : s.outcome === 'failed' ? 'text-ghost-blocked' : 'text-ink-muted';
                const word = s.outcome === 'done' ? 'Done' : s.outcome === 'failed' ? 'Failed' : 'Not understood';
                return (
                  <li key={s.step} className="flex items-start gap-2 text-base font-ui text-ink">
                    <Icon size={16} className={`mt-1 shrink-0 ${tone}`} aria-hidden="true" />
                    <span><span className="sr-only">{word}: </span>{s.message}</span>
                  </li>
                );
              })}
            </ol>
          )}
          {run.phase === 'finished' && run.result && (
            <p className="m-0 text-base font-ui text-ink" role="status">
              Checker: {run.result.verdict}
              {run.result.reason_code ? ` (${run.result.reason_code})` : ''}. Voice agent, {run.result.agent_mode} mode,{' '}
              {run.result.variant} page.
            </p>
          )}
          {(run.phase === 'failed' || run.phase === 'refused' || run.phase === 'offline') && run.message && (
            <p className="m-0 text-base font-ui text-ghost-blocked" role="alert">{run.message}</p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {speech.supported ? (
          <button
            type="button"
            aria-pressed={speech.listening}
            onClick={() => (speech.listening ? speech.stop() : speech.start())}
            className={`${BTN} border-violet-neon/50 ${speech.listening ? 'bg-ghost-blocked/15' : 'bg-violet-600/25'} text-ink`}
          >
            {speech.listening ? <MicOff size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
            {speech.listening ? 'Stop listening' : 'Push to talk'}
          </button>
        ) : (
          <p className="m-0 text-base font-ui text-ink-muted" role="status">Mic unavailable in this browser. Use Edit commands.</p>
        )}
        <button
          type="button"
          aria-pressed={editing}
          onClick={() => setEditing((e) => !e)}
          className={`${BTN} border-base-line bg-base/40 text-ink`}
        >
          <Pencil size={16} aria-hidden="true" />
          {editing ? 'Done editing' : 'Edit commands'}
        </button>
        <p className="m-0 text-base font-ui text-ink-muted">
          Say, for example, "send 100 dollars to" and then a made-up name. It runs as soon as you stop talking. Chrome may send microphone audio to its speech service. Audio is never stored or played.
        </p>
      </div>
    </section>
  );
}
