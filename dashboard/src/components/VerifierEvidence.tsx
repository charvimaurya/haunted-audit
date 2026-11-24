/**
 * VerifierEvidence: the Verifier's two runs on the patched copy, keyboard and voice, each with its own run ID
 * (.kiro/specs/loop-evidence/ REQ-LE-04, 06). Words come only from the checker's verdict on that run:
 * VERIFIED needs PASSED. Status is icon plus text, never colour alone.
 */
import { CheckCircle2, CircleDashed, Loader2, XCircle } from 'lucide-react';
import type { CopyRun, Fix } from '../fixes/fixContext';
import type { JourneyResult } from '../types';

export interface VerifierEvidenceProps {
  fix: Fix | null;
  /** The finished voice run, to say why it was not verified. */
  voiceResult?: JourneyResult | null;
}

type Word = 'VERIFIED' | 'Not verified' | 'Running' | 'Not run yet' | 'The run failed, so no result is shown';

export function evidenceWord(run: CopyRun | null | undefined): Word {
  if (!run) return 'Not run yet';
  if (run.status === 'running') return 'Running';
  if (run.status === 'error' || !run.verdict) return 'The run failed, so no result is shown';
  return run.verdict === 'PASSED' ? 'VERIFIED' : 'Not verified';
}

/** The first voice step that did not work, in the voice agent's own words. */
export function firstVoiceFailure(result: JourneyResult | null | undefined): string | null {
  const step = result?.step_events.find((e) => e.args.outcome !== undefined && e.args.outcome !== 'done');
  const message = step?.args.message;
  return typeof message === 'string' ? message : null;
}

function Icon({ word }: { word: Word }) {
  if (word === 'VERIFIED') return <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-ghost-verified" aria-hidden="true" />;
  if (word === 'Not verified') return <XCircle size={18} className="mt-0.5 shrink-0 text-ghost-blocked" aria-hidden="true" />;
  if (word === 'Running') return <Loader2 size={18} className="mt-0.5 shrink-0 motion-safe:animate-spin" aria-hidden="true" />;
  return <CircleDashed size={18} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />;
}

function Row({ label, run, why }: { label: string; run: CopyRun | null | undefined; why?: string | null }) {
  const word = evidenceWord(run);
  return (
    <li className="flex items-start gap-2 text-base font-ui text-ink">
      <Icon word={word} />
      <span>
        <span className="font-semibold">{label}: {word}</span>
        {run && (
          <span className="block text-ink-muted">
            Run <span className="font-mono break-all">{run.run_id}</span>
            {run.agent_mode ? `, ${run.agent_mode} mode` : ''}
            {word === 'Not verified' && run.reason_code ? `, ${run.reason_code}` : ''}
          </span>
        )}
        {word === 'Not verified' && why && <span className="block text-ink-muted">{why}</span>}
      </span>
    </li>
  );
}

export function VerifierEvidence({ fix, voiceResult }: VerifierEvidenceProps) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0" aria-label="Verifier evidence">
      <Row label="Keyboard journey" run={fix?.verify} />
      <Row label="Voice-command simulation" run={fix?.verify_voice} why={firstVoiceFailure(voiceResult)} />
    </ul>
  );
}
