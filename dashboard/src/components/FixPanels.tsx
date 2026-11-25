/**
 * FixPanels: Proposed Fix, Verification and Regression with real data (.kiro/specs/exorcist/ REQ-X-15, 16).
 * Every state comes from GET /fixes/{id}. "Verified" and "caught" are shown only when the checker measured them
 * on a copy of the bank. Buttons are real <button>s; results are announced in a polite live region.
 */
import { CheckCircle2, CircleDashed, Loader2, Mic, XCircle } from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import { GhostMascot } from './GhostMascot';
import { ExorcismMoment } from './ExorcismMoment';
import { ResultState } from './ResultState';
import { VerifierEvidence, firstVoiceFailure } from './VerifierEvidence';
import { GhostGlyph } from './GhostGlyph';
import type { FixValue } from '../fixes/fixContext';
import type { ApiStatus } from '../runs/runContext';
import type { JourneyResult } from '../types';

const BTN =
  'inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-base font-ui font-semibold ' +
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-violet-neon disabled:opacity-50 disabled:cursor-not-allowed';

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 flex items-start gap-2 text-base font-ui text-ink-muted">
      <CircleDashed size={16} className="mt-1 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

function diffLines(diff: string) {
  return diff
    .split('\n')
    .filter((l) => l && !l.startsWith('---') && !l.startsWith('+++') && !l.startsWith('@@'))
    .map((l) => ({ type: (l[0] === '+' || l[0] === '-' ? l[0] : ' ') as '+' | '-' | ' ', text: l.slice(1) }));
}

interface Props {
  result: JourneyResult | null;
  apiStatus: ApiStatus;
  isRunning: boolean;
  flow: FixValue;
}

export function ProposedFixPanel({ result, apiStatus, isRunning, flow }: Props) {
  const { fix, busy } = flow;
  const blocked = result && !isRunning && result.verdict === 'BLOCKED' && (result.agent_kind ?? 'keyboard') === 'keyboard';
  return (
    <div className="panel p-4 flex flex-col gap-3">
      <p className="m-0 text-base font-ui text-ink">
        <span className="font-semibold">Proposed Fix</span> <span className="text-ink-muted">(by Exorcist Agent)</span>
      </p>
      {blocked && result?.blocked_element && (
        <p className="m-0 text-base font-ui text-ink-muted">
          Finding: <span className="font-mono text-ink">{result.blocked_element.selector}</span> ({result.reason_code}), from the
          checker, {result.agent_mode} mode.
        </p>
      )}
      {!result || isRunning ? (
        <ResultState result={result} apiStatus={apiStatus} isRunning={isRunning} hint="Start one in Possession Mode." />
      ) : !blocked ? (
        <Note>Nothing to fix: only a finished, BLOCKED keyboard run has a finding to fix.</Note>
      ) : !fix ? (
        <>
          <Note>No fix proposed yet for this run.</Note>
          <button type="button" onClick={() => void flow.propose()} disabled={busy}
            className={`${BTN} border-violet-neon/60 bg-violet-600 text-white hover:bg-violet-500`}>
            Propose a fix (scripted Exorcist)
          </button>
        </>
      ) : fix.status === 'exorcist_failed' ? (
        <p className="m-0 flex items-start gap-2 text-base font-ui text-ink">
          <XCircle size={16} className="mt-1 shrink-0 text-ghost-blocked" aria-hidden="true" />
          <span>The Exorcist could not propose a fix: {fix.error}</span>
        </p>
      ) : (
        <>
          <p className="m-0 text-base font-ui text-ink">{fix.reason}</p>
          {fix.diff && <CodeBlock lines={diffLines(fix.diff)} ariaLabel="Proposed fix, as a diff" />}
          <p className="m-0 text-base font-ui text-ink-muted">
            {fix.exorcist_mode} Exorcist · {fix.changed_lines ?? '--'} lines changed · tokens{' '}
            {fix.input_tokens ?? '--'} in, {fix.output_tokens ?? '--'} out · cost {fix.cost_usd ?? '--'} USD ·{' '}
            {Math.round(fix.latency_ms)} ms
          </p>
          {fix.status === 'proposed' ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void flow.approve()} disabled={busy}
                className={`${BTN} border-ghost-verified/60 bg-ghost-verified/15 text-ghost-verified hover:bg-ghost-verified/25`}>
                <CheckCircle2 size={16} aria-hidden="true" />
                Approve Fix
              </button>
              <button type="button" onClick={() => void flow.reject()} disabled={busy}
                className={`${BTN} border-base-line bg-base-surface text-ink hover:border-violet-neon`}>
                <XCircle size={16} aria-hidden="true" />
                Reject
              </button>
            </div>
          ) : (
            <>
              <p className="m-0 text-base font-ui text-ink" role="status">
                {fix.status === 'approved' ? 'Approved' : 'Rejected'} by {fix.decided_by} at{' '}
                {fix.decided_at ? new Date(fix.decided_at).toLocaleString() : '--'}. Diff{' '}
                <span className="font-mono break-all">{fix.diff_sha256?.slice(0, 12)}</span>. No file in the repo was changed.
              </p>
              {/* Between Approve and Verify only: after that the Verifier's own result speaks. */}
              {fix.status === 'approved' && !fix.verify && <ExorcismMoment />}
            </>
          )}
        </>
      )}
      {flow.error && (
        <p className="m-0 text-base font-ui text-ink" role="alert">
          {flow.error}
        </p>
      )}
    </div>
  );
}

type Mark = 'yes' | 'no' | 'pending' | 'busy';

function MarkRow({ mark, children }: { mark: Mark; children: React.ReactNode }) {
  const word = mark === 'yes' ? 'Done' : mark === 'no' ? 'Not done' : mark === 'busy' ? 'Running' : 'Not run yet';
  return (
    <li className="flex items-start gap-2 text-base font-ui text-ink">
      {mark === 'yes' && <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-ghost-verified" aria-hidden="true" />}
      {mark === 'no' && <XCircle size={18} className="mt-0.5 shrink-0 text-ghost-blocked" aria-hidden="true" />}
      {mark === 'busy' && <Loader2 size={18} className="mt-0.5 shrink-0 motion-safe:animate-spin" aria-hidden="true" />}
      {mark === 'pending' && <CircleDashed size={18} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />}
      <span className="sr-only">{word}: </span>
      {/* v9 also ticks a done row after its text; the tick is CSS with empty alt text, so it is not read out twice. */}
      <span className={mark === 'yes' ? 'row-tick' : undefined}>{children}</span>
    </li>
  );
}

/** The v7 checklist, each line read from the Verifier's run on the patched copy (or Not run yet). */
function voiceMark(fix: FixValue['fix'], run: FixValue['verifyResult'] | undefined): Mark {
  const v = fix?.verify_voice;
  if (v?.status === 'running') return 'busy';
  if (v?.status !== 'complete' || !run) return 'pending';
  const click = run.step_events.find((e) => e.args.name === 'Send Payment');
  return click?.args.outcome === 'done' ? 'yes' : 'no';
}

function verifyMarks(fix: FixValue['fix'], run: FixValue['verifyResult']): { label: string; mark: Mark }[] {
  const v = fix?.verify;
  const started = Boolean(v);
  const running = v?.status === 'running';
  const done = v?.status === 'complete' && run;
  const reached = done ? run.target_ever_focused || run.focus_trail.some((f) => f.selector_hint.includes('send-payment')) : false;
  const entered = done
    ? run.step_events.some((e) => e.tool === 'press_enter' && (e.focused_before?.selector_hint ?? '').includes('send-payment'))
    : false;
  const paid = done ? run.verdict === 'PASSED' : false;
  const m = (ok: boolean): Mark => (running ? 'busy' : done ? (ok ? 'yes' : 'no') : 'pending');
  return [
    { label: 'Replaying journey…', mark: running ? 'busy' : started && v?.status === 'complete' ? 'yes' : 'pending' },
    { label: 'Tab to Send Payment', mark: m(reached) },
    { label: 'Activate with Enter', mark: m(entered) },
    { label: 'Payment successful', mark: m(paid) },
  ];
}

export function VerificationPanel({ flow }: { flow: FixValue }) {
  const { fix, busy, verifyResult, voiceVerifyResult } = flow;
  const passed = fix?.verify?.verdict === 'PASSED';
  const voicePassed = fix?.verify_voice?.status === 'complete' && fix.verify_voice.verdict === 'PASSED';
  const marks = verifyMarks(fix, verifyResult);
  return (
    <div className={`panel p-4 flex flex-col gap-3 ${passed ? 'border-ghost-verified/70' : ''}`}>
      <p className="m-0 text-base font-ui text-ink">
        <span className="font-semibold">Verification</span> <span className="text-ink-muted">(by Verifier Agent)</span>
      </p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Verification steps" aria-live="polite">
        {marks.slice(0, 3).map((r) => (
          <MarkRow key={r.label} mark={r.mark}>{r.label}</MarkRow>
        ))}
        <MarkRow mark={voiceMark(fix, voiceVerifyResult)}>
          <span className="inline-flex items-center gap-1">
            <Mic size={16} className="shrink-0" aria-hidden="true" />
            Say &quot;click Send Payment&quot;
          </span>
        </MarkRow>
        {marks.slice(3).map((r) => (
          <MarkRow key={r.label} mark={r.mark}>{r.label}</MarkRow>
        ))}
      </ul>
      {!fix || fix.status === 'proposed' ? (
        <Note>Waiting for a person to approve a fix.</Note>
      ) : fix.status !== 'approved' ? (
        <Note>The fix was {fix.status === 'rejected' ? 'rejected' : 'not proposed'}, so there is nothing to verify.</Note>
      ) : !fix.verify ? (
        <button type="button" onClick={() => void flow.verify()} disabled={busy}
          className={`${BTN} border-violet-neon/60 bg-violet-600 text-white hover:bg-violet-500`}>
          Replay both journeys
        </button>
      ) : fix.verify.status === 'complete' && fix.verify.verdict ? (
        <div role="status" className="flex flex-col gap-2">
          {passed ? (
            <>
              <p className="m-0 flex flex-wrap items-center gap-2 text-xl font-ui font-bold text-ink">
                <XCircle size={22} className="shrink-0 text-ghost-blocked" aria-hidden="true" />
                <span>BLOCKED</span>
                <span aria-hidden="true">→</span>
                <span className="sr-only">then</span>
                <CheckCircle2 size={22} className="shrink-0 text-ghost-verified" aria-hidden="true" />
                <span>VERIFIED</span>
              </p>
              <p className="m-0 inline-flex w-fit items-center gap-2 rounded-lg border border-ghost-verified/60 bg-ghost-verified/15 px-4 py-2 text-base font-ui font-semibold text-ghost-verified">
                <CheckCircle2 size={18} aria-hidden="true" />
                Journey Verified
              </p>
              <p className="m-0 text-base font-ui text-ink-muted">{voicePassed ? 'Keyboard and voice' : 'Keyboard only'}</p>
            </>
          ) : (
            <p className="m-0 text-base font-ui text-ink">Not verified: the payment still could not be sent on the patched copy.</p>
          )}
          <p className="m-0 text-base font-ui text-ink-muted">
            Checker: {fix.verify.verdict}{fix.verify.reason_code ? ` (${fix.verify.reason_code})` : ''}, {fix.verify.agent_mode} mode, on a patched copy.
          </p>
        </div>
      ) : fix.verify.status === 'error' ? (
        <Note>The run failed, so no result is shown. {fix.verify.error}</Note>
      ) : null}
      {fix?.verify && <VerifierEvidence fix={fix} voiceResult={voiceVerifyResult} />}
    </div>
  );
}

/** The returning ghost, caught: white as in v9 (team-rules default, 24 Nov). Decorative; the words say it. */
function CaughtGhost() {
  return (
    <span className="inline-flex shrink-0 text-ghost-caught" data-ghost-caught="true" aria-hidden="true"
      style={{ filter: 'drop-shadow(0 0 6px currentColor)' }}>
      <GhostGlyph size={36} />
    </span>
  );
}

export function RegressionPanel({ flow }: { flow: FixValue }) {
  const { fix, busy, regressionVoiceResult } = flow;
  const verified = fix?.verify?.verdict === 'PASSED';
  const g = fix?.regression;
  const caught = g?.verdict === 'BLOCKED';
  const reintroduced: Mark = g ? (g.status === 'running' ? 'busy' : 'yes') : 'pending';
  const gv = fix?.regression_voice;
  const voiceVerified = fix?.verify_voice?.status === 'complete' && fix.verify_voice.verdict === 'PASSED';
  const ran = (r: typeof g): Mark => (r ? (r.status === 'running' ? 'busy' : 'yes') : 'pending');
  const voiceWhy = firstVoiceFailure(regressionVoiceResult);
  return (
    <div className={`panel p-4 flex flex-col gap-3 ${caught ? 'border-ghost-blocked/70' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="m-0 text-base font-ui text-ink">
          <span className="font-semibold text-ghost-blocked">Regression Guard</span>{' '}
          <span className="text-ink-muted">(The Returning Ghost)</span>
        </p>
        {caught && <GhostMascot state="blocked" size={56} animate={false} className="shrink-0" />}
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Regression steps" aria-live="polite">
        <MarkRow mark={reintroduced}>Bug reintroduced on purpose</MarkRow>
        {/* What ran on the copy with the bug put back. v9 shows test file names; these are the real journeys. */}
        <MarkRow mark={ran(g)}>Keyboard journey</MarkRow>
        {gv && <MarkRow mark={ran(gv)}>Voice-command simulation</MarkRow>}
        {g?.status === 'complete' && g.verdict && (
          <MarkRow mark={caught ? 'no' : 'yes'}>
            <span className={`font-mono ${caught ? 'text-ghost-blocked' : ''}`}>
              {caught ? `FAILED: Send Payment not focusable (${g.reason_code})` : 'PASSED: the bug was not caught'}
            </span>
          </MarkRow>
        )}
        {gv?.status === 'complete' && gv.verdict && voiceVerified && (
          <MarkRow mark={gv.verdict === 'BLOCKED' ? 'no' : 'yes'}>
            <span className={`font-mono ${gv.verdict === 'BLOCKED' ? 'text-ghost-blocked' : ''}`}>
              {gv.verdict === 'BLOCKED'
                ? // The run's own first failed step; until it has loaded, only the checker's code (no guessed control).
                  `FAILED (voice): ${voiceWhy ?? `the voice journey was blocked (${gv.reason_code})`}`
                : 'PASSED (voice): the bug was not caught'}
            </span>
          </MarkRow>
        )}
      </ul>
      {gv?.status === 'complete' && !voiceVerified && (
        <Note>Voice: not counted, the voice journey was not verified first.</Note>
      )}
      {!verified ? (
        <Note>Runs after the fix is verified.</Note>
      ) : !g ? (
        <button type="button" onClick={() => void flow.regression()} disabled={busy}
          className={`${BTN} border-ghost-blocked/60 bg-ghost-blocked/15 text-ink hover:bg-ghost-blocked/25`}>
          Put the bug back and run both tests
        </button>
      ) : g.status === 'error' ? (
        <Note>The run failed, so no result is shown. {g.error}</Note>
      ) : caught ? (
        <div role="status" className="flex items-center gap-3 rounded-lg border border-base-line p-3">
          <CaughtGhost />
          <p className="m-0 text-base font-ui font-bold text-ink">
            The ghost is back.
            <br />
            But this time, we caught it.
          </p>
        </div>
      ) : g.status === 'complete' ? (
        <p className="m-0 text-base font-ui text-ink" role="status">Not caught: with the bug put back, the checker did not block the journey.</p>
      ) : null}
    </div>
  );
}
