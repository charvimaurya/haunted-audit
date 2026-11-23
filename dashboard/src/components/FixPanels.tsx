/**
 * FixPanels: Proposed Fix, Verification and Regression with real data (.kiro/specs/exorcist/ REQ-X-15, 16).
 * Every state comes from GET /fixes/{id}. "Verified" and "caught" are shown only when the checker measured them
 * on a copy of the bank. Buttons are real <button>s; results are announced in a polite live region.
 */
import { CheckCircle2, CircleDashed, Loader2, XCircle } from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import { GhostMascot } from './GhostMascot';
import { ResultState } from './ResultState';
import type { FixValue } from '../fixes/fixContext';
import type { ApiStatus } from '../runs/runContext';
import type { JourneyResult } from '../types';

const BTN =
  'inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-base font-ui font-semibold ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon disabled:opacity-50 disabled:cursor-not-allowed';

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
      <p className="text-base font-ui text-ink-faint uppercase tracking-widest">Proposed Fix (by Exorcist Agent)</p>
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
            {fix.exorcist_mode} Exorcist · {fix.changed_lines} lines changed · tokens{' '}
            {fix.input_tokens ?? '--'} in, {fix.output_tokens ?? '--'} out · cost {fix.cost_usd ?? '--'} USD ·{' '}
            {Math.round(fix.latency_ms)} ms
          </p>
          {fix.status === 'proposed' ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void flow.approve()} disabled={busy}
                className={`${BTN} border-ghost-verified/60 bg-ghost-verified/15 text-ghost-verified hover:bg-ghost-verified/25`}>
                <CheckCircle2 size={16} aria-hidden="true" />
                Approve fix
              </button>
              <button type="button" onClick={() => void flow.reject()} disabled={busy}
                className={`${BTN} border-base-line bg-base-surface text-ink hover:border-violet-neon`}>
                <XCircle size={16} aria-hidden="true" />
                Reject
              </button>
            </div>
          ) : (
            <p className="m-0 text-base font-ui text-ink" role="status">
              {fix.status === 'approved' ? 'Approved' : 'Rejected'} by {fix.decided_by} at{' '}
              {fix.decided_at ? new Date(fix.decided_at).toLocaleString() : '--'}. Diff{' '}
              <span className="font-mono break-all">{fix.diff_sha256?.slice(0, 12)}</span>. No file in the repo was changed.
            </p>
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

function CopyRunResult({ run, okVerdict, okText, badText }: {
  run: NonNullable<FixValue['fix']>['verify']; okVerdict: 'PASSED' | 'BLOCKED'; okText: React.ReactNode; badText: string;
}) {
  if (!run) return null;
  if (run.status === 'running') {
    return (
      <p className="m-0 flex items-center gap-2 text-base font-ui text-ink-muted" role="status">
        <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" />
        The keyboard walker is running on the copy.
      </p>
    );
  }
  if (run.status === 'error' || !run.verdict) {
    return <Note>The run failed, so no result is shown. {run.error}</Note>;
  }
  const ok = run.verdict === okVerdict;
  return (
    <div role="status" className="flex flex-col gap-2">
      <p className="m-0 flex items-start gap-2 text-base font-ui text-ink">
        {ok ? (
          <CheckCircle2 size={16} className="mt-1 shrink-0 text-ghost-verified" aria-hidden="true" />
        ) : (
          <XCircle size={16} className="mt-1 shrink-0 text-ghost-blocked" aria-hidden="true" />
        )}
        <span>{ok ? okText : badText}</span>
      </p>
      <p className="m-0 text-base font-ui text-ink-muted">
        Checker: {run.verdict}
        {run.reason_code ? ` (${run.reason_code})` : ''}, {run.agent_mode} mode.
      </p>
    </div>
  );
}

export function VerificationPanel({ flow }: { flow: FixValue }) {
  const { fix, busy } = flow;
  return (
    <div className="panel p-4 flex flex-col gap-3">
      <p className="text-base font-ui text-ink-faint uppercase tracking-widest">Verification (by Verifier Agent)</p>
      {!fix || fix.status === 'proposed' ? (
        <Note>Waiting for a person to approve a fix.</Note>
      ) : fix.status !== 'approved' ? (
        <Note>The fix was {fix.status === 'rejected' ? 'rejected' : 'not proposed'}, so there is nothing to verify.</Note>
      ) : !fix.verify ? (
        <>
          <Note>The approved fix is applied to a copy of the bank, never the real file. Then the keyboard walker tries the payment.</Note>
          <button type="button" onClick={() => void flow.verify()} disabled={busy}
            className={`${BTN} border-violet-neon/60 bg-violet-600 text-white hover:bg-violet-500`}>
            Verify on a patched copy
          </button>
        </>
      ) : (
        <CopyRunResult run={fix.verify} okVerdict="PASSED"
          okText={<><span className="font-semibold">Journey Verified.</span> The keyboard walker sent the payment on the patched copy.</>}
          badText="Not verified: the keyboard walker still could not send the payment on the patched copy." />
      )}
    </div>
  );
}

export function RegressionPanel({ flow }: { flow: FixValue }) {
  const { fix, busy } = flow;
  const verified = fix?.verify?.verdict === 'PASSED';
  const caught = fix?.regression?.verdict === 'BLOCKED';
  return (
    <div className={`panel p-4 flex flex-col gap-3 ${caught ? 'border-ghost-blocked/70' : ''}`}>
      <p className="text-base font-ui text-ink-faint uppercase tracking-widest">Regression Guard (The Returning Ghost)</p>
      {!verified ? (
        <Note>Runs after the fix is verified.</Note>
      ) : !fix?.regression ? (
        <>
          <Note>Puts the bug back on purpose, on a copy, and checks that the checker blocks it again.</Note>
          <button type="button" onClick={() => void flow.regression()} disabled={busy}
            className={`${BTN} border-ghost-blocked/60 bg-ghost-blocked/15 text-ink hover:bg-ghost-blocked/25`}>
            Put the bug back and check
          </button>
        </>
      ) : (
        <>
          <CopyRunResult run={fix.regression} okVerdict="BLOCKED"
            okText={<>Bug reintroduced on purpose. <span className="font-semibold">Caught:</span> the keyboard walker is blocked again.</>}
            badText="Not caught: with the bug put back, the checker did not block the journey." />
          {caught && (
            <p className="m-0 flex items-center gap-3 rounded-lg border border-base-line p-3 text-base font-ui font-semibold text-ink">
              <GhostMascot state="blocked" size={36} animate={false} />
              The ghost is back. But this time, we caught it.
            </p>
          )}
        </>
      )}
    </div>
  );
}
