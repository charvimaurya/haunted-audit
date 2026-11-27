import { Button, Card, CardBody, CardHeader } from '@heroui/react';
import { CircleDashed, Loader2, Mic, Play, X, XCircle } from 'lucide-react';
import { CodeBlock } from '../ui/CodeBlock';
import { GhostFigure } from '../ghost/GhostFigure';
import { V9Dot } from '../ghost/V9Dot';
import { ExorcismMoment } from './ExorcismMoment';
import { ResultState } from '../results/ResultState';
import { VerifierEvidence, firstVoiceFailure } from './VerifierEvidence';
import type { FixValue } from '../../fixes/fixContext';
import type { ApiStatus } from '../../runs/runContext';
import { getScenarioDef } from '../../runs/scenarios';
import type { JourneyResult } from '../../types/index';

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
  focused?: boolean;
}

export function ProposedFixPanel({ result, apiStatus, isRunning, flow, focused = false }: Props) {
  const { fix, busy } = flow;
  const blocked =
    result && !isRunning && result.verdict === 'BLOCKED' && (result.agent_kind ?? 'keyboard') === 'keyboard';

  return (
    <Card
      id="fc-fix"
      aria-label="Proposed fix"
      className={`flex flex-col text-white shadow-none ${focused ? 'panel-glow' : 'v9-card'}`}
    >
      <CardHeader className="border-b border-[#2b3254] px-4 py-3.5">
        <h3 className="m-0 text-base sm:text-[17px] font-extrabold text-white">
          Proposed Fix <span className="font-medium text-[#cfd3ee]">(by Exorcist Agent)</span>
        </h3>
      </CardHeader>

      <CardBody className="flex flex-1 flex-col gap-3 px-4 py-4">
        {blocked && result?.blocked_element && (
          <p className="m-0 text-sm text-ink-muted">
            Finding: <code className="font-mono text-white">{result.blocked_element.selector}</code> (
            {result.reason_code}), {result.agent_mode} mode.
          </p>
        )}

        {!result || isRunning ? (
          <ResultState result={result} apiStatus={apiStatus} isRunning={isRunning} hint="Start one in Possession Mode." />
        ) : !blocked ? (
          <p className="m-0 flex items-start gap-2 text-sm text-ink-muted">
            <CircleDashed size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>Nothing to fix: only a finished, BLOCKED keyboard run has a finding to fix.</span>
          </p>
        ) : !fix ? (
          <>
            <p className="m-0 flex items-start gap-2 text-sm text-ink-muted">
              <CircleDashed size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>No fix proposed yet for this run.</span>
            </p>
            <Button
              type="button"
              isDisabled={busy}
              onPress={() => void flow.propose()}
              className="mt-auto h-10 rounded-xl border border-[#a78bfa] bg-gradient-to-b from-[#3b1f86] to-[#2a1466] font-bold text-white shadow-[0_0_16px_#8b5cf666]"
            >
              Propose a fix (scripted Exorcist)
            </Button>
          </>
        ) : fix.status === 'exorcist_failed' ? (
          <p className="m-0 flex items-start gap-2 text-sm text-[#ff7a7a]">
            <XCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>The Exorcist could not propose a fix: {fix.error}</span>
          </p>
        ) : (
          <>
            <p className="m-0 text-sm text-ink">{fix.reason}</p>
            {fix.diff && <CodeBlock lines={diffLines(fix.diff)} ariaLabel="Proposed fix, as a diff" />}
            <p className="m-0 text-xs text-ink-muted">
              {fix.exorcist_mode} Exorcist · {fix.changed_lines ?? '--'} lines · tokens{' '}
              {fix.input_tokens ?? '--'} in / {fix.output_tokens ?? '--'} out · {Math.round(fix.latency_ms)} ms
            </p>
            {fix.status === 'proposed' ? (
              <div className="mt-auto flex flex-wrap gap-2.5 border-t border-[#2b3254] pt-3">
                <Button
                  type="button"
                  isDisabled={busy}
                  onPress={() => void flow.approve()}
                  startContent={<V9Dot state="ok" size={18} />}
                  className="h-10 flex-1 rounded-xl border border-[#22c55e] bg-gradient-to-b from-[#14532d] to-[#0f3d22] font-bold text-[#dcfce7] shadow-[0_0_14px_#22c55e44]"
                >
                  Approve Fix
                </Button>
                <Button
                  type="button"
                  isDisabled={busy}
                  onPress={() => void flow.reject()}
                  startContent={<X size={16} aria-hidden="true" />}
                  className="h-10 flex-1 rounded-xl border border-[#353c60] bg-[#1e2340] font-bold text-[#dfe3ff]"
                >
                  Reject
                </Button>
              </div>
            ) : (
              <div className="mt-auto flex flex-col gap-2 border-t border-[#2b3254] pt-3">
                <p className="m-0 text-xs sm:text-sm text-ink" role="status">
                  {fix.status === 'approved' ? 'Approved' : 'Rejected'} by {fix.decided_by} at{' '}
                  {fix.decided_at ? new Date(fix.decided_at).toLocaleString() : '--'}. Diff{' '}
                  <span className="font-mono break-all">{fix.diff_sha256?.slice(0, 12)}</span>. No file in the repo was changed.
                </p>
                {fix.status === 'approved' && !fix.verify && <ExorcismMoment />}
              </div>
            )}
          </>
        )}

        {flow.error && (
          <p className="m-0 text-sm text-[#ff7a7a]" role="alert">
            {flow.error}
          </p>
        )}
      </CardBody>
    </Card>
  );
}

type Mark = 'yes' | 'no' | 'pending' | 'busy';

function MarkRow({ mark, children, voice = false }: { mark: Mark; children: React.ReactNode; voice?: boolean }) {
  const word = mark === 'yes' ? 'Done' : mark === 'no' ? 'Not done' : mark === 'busy' ? 'Running' : 'Not run yet';
  return (
    <li className={`flex items-center gap-3 text-sm sm:text-[15px] ${voice ? 'text-[#e5dcff]' : 'text-ink'}`}>
      {mark === 'yes' && <V9Dot state="ok" size={22} />}
      {mark === 'no' && <V9Dot state="bad" size={22} />}
      {mark === 'busy' && <Loader2 size={18} className="shrink-0 animate-spin text-violet-300" aria-hidden="true" />}
      {mark === 'pending' && <V9Dot state="wait" size={22} />}
      <span className="sr-only">{word}: </span>
      <span className={mark === 'yes' ? 'row-tick' : undefined}>{children}</span>
    </li>
  );
}

function voiceMark(fix: FixValue['fix'], run: FixValue['verifyResult'] | undefined, submitLabel: string): Mark {
  const v = fix?.verify_voice;
  if (v?.status === 'running') return 'busy';
  if (v?.status !== 'complete' || !run) return 'pending';
  const click = run.step_events.find((e) => e.args.name === submitLabel || e.args.name === 'Send Payment');
  return click?.args.outcome === 'done' ? 'yes' : 'no';
}

function verifyMarks(fix: FixValue['fix'], run: FixValue['verifyResult'], submitLabel: string): { label: string; mark: Mark }[] {
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
    { label: `Tab to ${submitLabel}`, mark: m(reached) },
    { label: 'Activate with Enter', mark: m(entered) },
    { label: `${submitLabel} successful`, mark: m(paid) },
  ];
}

export function VerificationPanel({ flow, scenarioId, focused = false }: { flow: FixValue; scenarioId?: string; focused?: boolean }) {
  const { fix, busy, verifyResult, voiceVerifyResult } = flow;
  const submitLabel = getScenarioDef(scenarioId).submitLabel;
  const passed = fix?.verify?.verdict === 'PASSED';
  const voicePassed = fix?.verify_voice?.status === 'complete' && fix.verify_voice.verdict === 'PASSED';
  const marks = verifyMarks(fix, verifyResult, submitLabel);

  return (
    <Card
      id="fc-verify"
      aria-label="Verification"
      className={`flex flex-col text-white shadow-none ${focused ? 'panel-glow' : 'v9-card'}`}
    >
      <CardHeader className="border-b border-[#2b3254] px-4 py-3.5">
        <h3 className="m-0 text-base sm:text-[17px] font-extrabold text-white">
          Verification <span className="font-medium text-[#cfd3ee]">(by Verifier Agent)</span>
        </h3>
      </CardHeader>

      <CardBody className="flex flex-1 flex-col gap-3 px-4 py-4">
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0" aria-label="Verification steps" aria-live="polite">
          {marks.slice(0, 3).map((r) => (
            <MarkRow key={r.label} mark={r.mark}>
              {r.label}
            </MarkRow>
          ))}
          <MarkRow mark={voiceMark(fix, voiceVerifyResult, submitLabel)} voice>
            <span className="inline-flex items-center gap-1.5">
              <Mic size={15} className="shrink-0 text-[#c084fc]" aria-hidden="true" />
              <span>Say &quot;click {submitLabel}&quot;</span>
            </span>
          </MarkRow>
          {marks.slice(3).map((r) => (
            <MarkRow key={r.label} mark={r.mark}>
              {r.label}
            </MarkRow>
          ))}
        </ul>

        {!fix || fix.status === 'proposed' ? (
          <p className="m-0 mt-auto text-sm text-ink-muted">Waiting for a person to approve a fix.</p>
        ) : fix.status !== 'approved' ? (
          <p className="m-0 mt-auto text-sm text-ink-muted">
            The fix was {fix.status === 'rejected' ? 'rejected' : 'not proposed'}, so there is nothing to verify.
          </p>
        ) : !fix.verify ? (
          <Button
            type="button"
            isDisabled={busy}
            onPress={() => void flow.verify()}
            startContent={<Play size={15} aria-hidden="true" />}
            className="mt-auto h-10 rounded-xl border border-[#a78bfa] bg-gradient-to-b from-[#3b1f86] to-[#2a1466] font-bold text-white shadow-[0_0_16px_#8b5cf666]"
          >
            Replay both journeys
          </Button>
        ) : fix.verify.status === 'complete' && fix.verify.verdict ? (
          <div role="status" className="mt-auto flex flex-col gap-2">
            {passed ? (
              <>
                <div className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#22c55e] bg-gradient-to-b from-[#14532d] to-[#0f3d22] font-bold text-[#dcfce7] shadow-[0_0_14px_#22c55e44]">
                  <V9Dot state="ok" size={18} />
                  <span>Journey Verified</span>
                </div>
                <p className="m-0 text-center text-xs sm:text-sm text-ink-muted">
                  {voicePassed ? 'Keyboard and voice' : 'Keyboard only'} · Checker: PASSED ({fix.verify.agent_mode} mode)
                </p>
              </>
            ) : (
              <p className="m-0 text-sm text-[#ff7a7a]">
                Not verified: action could not complete on the patched copy.
              </p>
            )}
          </div>
        ) : fix.verify.status === 'error' ? (
          <p className="m-0 mt-auto text-sm text-[#ff7a7a]">The run failed, so no result is shown. {fix.verify.error}</p>
        ) : null}

        {fix?.verify && <VerifierEvidence fix={fix} voiceResult={voiceVerifyResult} />}
      </CardBody>
    </Card>
  );
}

export function RegressionPanel({ flow, scenarioId, focused = false }: { flow: FixValue; scenarioId?: string; focused?: boolean }) {
  const { fix, busy, regressionVoiceResult } = flow;
  const submitLabel = getScenarioDef(scenarioId).submitLabel;
  const verified = fix?.verify?.verdict === 'PASSED';
  const g = fix?.regression;
  const caught = g?.verdict === 'BLOCKED';
  const gv = fix?.regression_voice;
  const voiceVerified = fix?.verify_voice?.status === 'complete' && fix.verify_voice.verdict === 'PASSED';
  const voiceWhy = firstVoiceFailure(regressionVoiceResult);

  return (
    <Card
      id="fc-reg"
      aria-label="Regression guard"
      className={`v9-fcard reg flex flex-col text-white shadow-none ${focused ? 'ring-1 ring-[#a78bfa]' : ''}`}
    >
      <CardHeader className="border-b border-[#4a1a2a] px-4 py-3.5">
        <h3 className="m-0 text-base sm:text-[17px] font-extrabold text-[#ff8a8a]">
          Regression Guard <span className="font-medium text-[#ffd5d5]">(The Returning Ghost)</span>
        </h3>
      </CardHeader>

      <CardBody className="relative flex flex-1 flex-col gap-2.5 px-4 py-4">
        {caught && (
          <div className="pointer-events-none absolute right-2 top-2" aria-hidden="true">
            <GhostFigure tone="red" face="worried" size={64} />
          </div>
        )}

        <ul className="m-0 flex list-none flex-col gap-2 p-0 pr-14 text-sm text-[#e7dbe6]" aria-label="Regression steps" aria-live="polite">
          <li className="flex items-center gap-2.5">
            <V9Dot state={g ? (g.status === 'running' ? 'wait' : 'ok') : 'wait'} size={18} />
            <span>Bug reintroduced on purpose</span>
          </li>
          <li className="flex items-center gap-2.5 font-mono text-xs">
            <V9Dot state={g ? (g.status === 'running' ? 'wait' : 'ok') : 'wait'} size={18} />
            <span>send_payment.spec.ts</span>
          </li>
          {gv && (
            <li className="flex items-center gap-2.5 font-mono text-xs">
              <V9Dot state={gv.status === 'running' ? 'wait' : 'ok'} size={18} />
              <span>send_payment_voice.spec.ts</span>
            </li>
          )}
        </ul>

        {g?.status === 'complete' && g.verdict && (
          <div className="mt-1 flex items-center gap-2 font-mono text-xs font-extrabold text-[#ff6b6b]">
            <V9Dot state={caught ? 'bad' : 'ok'} size={18} />
            <span>
              {caught ? `FAILED: ${submitLabel} not focusable (${g.reason_code})` : 'PASSED: bug was not caught'}
            </span>
          </div>
        )}

        {gv?.status === 'complete' && gv.verdict && voiceVerified && (
          <div className="flex items-center gap-2 font-mono text-xs font-extrabold text-[#ff6b6b]">
            <V9Dot state={gv.verdict === 'BLOCKED' ? 'bad' : 'ok'} size={18} />
            <span>
              {gv.verdict === 'BLOCKED'
                ? `FAILED (voice): ${voiceWhy ?? `voice journey blocked (${gv.reason_code})`}`
                : 'PASSED (voice): bug was not caught'}
            </span>
          </div>
        )}

        {!verified ? (
          <p className="m-0 mt-auto text-sm text-ink-muted">Verify the fix first.</p>
        ) : !g ? (
          <Button
            type="button"
            isDisabled={busy}
            onPress={() => void flow.regression()}
            startContent={<Play size={15} aria-hidden="true" />}
            className="mt-auto h-10 rounded-xl border border-[#ff6b6b] bg-gradient-to-b from-[#4a1220] to-[#3a0f1a] font-bold text-[#ffd5d5] shadow-[0_0_16px_#ef444455]"
          >
            Put the bug back and run both tests
          </Button>
        ) : g.status === 'error' ? (
          <p className="m-0 mt-auto text-sm text-[#ff7a7a]">The run failed, so no result is shown. {g.error}</p>
        ) : caught ? (
          <div
            className="mt-auto flex items-center gap-3 rounded-xl border border-[#3a2236] bg-[#140c1c] p-3 text-sm sm:text-base font-extrabold text-white"
            role="status"
            data-ghost-caught="true"
          >
            <GhostFigure tone="white" face="worried" size={40} className="shrink-0" />
            <span>
              The ghost is back.
              <br />
              But this time, we caught it.
            </span>
          </div>
        ) : g.status === 'complete' ? (
          <p className="m-0 mt-auto text-sm text-white" role="status">
            Not caught: with the bug put back, the checker did not block the journey.
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
