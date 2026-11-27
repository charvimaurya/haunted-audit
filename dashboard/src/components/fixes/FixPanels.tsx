/**
 * FixPanels: Proposed Fix, Verification and Regression with real data (.kiro/specs/exorcist/ REQ-X-15, 16).
 * Visual layout matches design/v9/index.html#fixes while every state comes strictly from GET /fixes/{id}.
 * "Verified" and "caught" are shown only when the checker actually measured them on a copy of the target.
 */
import { Check, Loader2, Mic, Play, X, XCircle } from 'lucide-react';
import { ResultState } from '../results/ResultState';
import { VerifierEvidence, firstVoiceFailure } from './VerifierEvidence';
import { GhostFigure } from '../ghost/GhostFigure';
import type { FixValue } from '../../fixes/fixContext';
import type { ApiStatus } from '../../runs/runContext';
import type { JourneyResult } from '../../types/index';

interface DiffLine {
  type: '+' | '-' | ' ';
  text: string;
}

function diffLines(diff: string): DiffLine[] {
  return diff
    .split('\n')
    .filter((l) => l && !l.startsWith('---') && !l.startsWith('+++') && !l.startsWith('@@'))
    .map((l) => ({
      type: (l[0] === '+' || l[0] === '-' ? l[0] : ' ') as '+' | '-' | ' ',
      text: l.slice(1),
    }));
}

/**
 * Returns true when a run hit NO_ACTIVATION against an already-accessible native <button>
 * (or on the fixed variant), meaning form validation—not a div barrier—rejected the submit.
 */
function isValidationRejectOnAccessibleButton(result: JourneyResult | null): boolean {
  if (!result || result.verdict !== 'BLOCKED') return false;
  const tag = result.blocked_element?.tag?.toLowerCase();
  return (
    tag === 'button' ||
    (result.variant === 'fixed' && result.reason_code === 'NO_ACTIVATION')
  );
}

interface ProposedFixProps {
  result: JourneyResult | null;
  apiStatus: ApiStatus;
  isRunning: boolean;
  flow: FixValue;
  focused?: boolean;
}

export function ProposedFixPanel({ result, apiStatus, isRunning, flow, focused = false }: ProposedFixProps) {
  const { fix, busy } = flow;
  const blocked = Boolean(result && !isRunning && result.verdict === 'BLOCKED');
  const accessibleButtonValidation = blocked && isValidationRejectOnAccessibleButton(result);
  const lines = fix?.diff ? diffLines(fix.diff) : [];

  return (
    <section
      aria-label="Proposed fix"
      className={`v9-fix-card ${focused ? 'v9-fix-card-focus' : ''}`}
    >
      <h3 className="v9-fix-card-head">
        Proposed Fix <span>(by Exorcist Agent)</span>
      </h3>

      {!result || isRunning ? (
        <div className="px-[22px] pt-4">
          <ResultState result={result} apiStatus={apiStatus} isRunning={isRunning} hint="Start one in Possession Mode." />
        </div>
      ) : !blocked ? (
        <p className="m-0 px-[22px] pt-4 text-sm text-[#cfd3ee]">
          No fix needed: this run <span className="font-semibold text-[#6ee7a0]">PASSED</span> cleanly with no accessibility barrier.
        </p>
      ) : accessibleButtonValidation && (!fix || fix.status === 'exorcist_failed') ? (
        <div className="px-[22px] pt-4 pb-2 flex flex-col gap-2.5">
          <div className="rounded-xl border border-[#22c55e44] bg-[#0f2a1b]/70 p-3.5 text-sm text-[#dff7e8]">
            <p className="m-0 font-semibold text-[#6ee7a0]">
              No accessibility patch needed ({result.variant} page)
            </p>
            <p className="m-0 mt-1.5 text-xs leading-relaxed text-[#cfd3ee]">
              The {result.agent_kind ?? 'voice'} agent reached and activated the native{' '}
              <code className="font-mono text-white">
                &lt;{result.blocked_element?.tag ?? 'button'}&gt;
              </code>{' '}
              (<code className="font-mono text-white">{result.blocked_element?.selector ?? 'button'}</code>).
              Confirmation did not appear because form validation rejected the submitted values (for example, Haunted Bank requires an amount between EUR 0.01 and EUR 1000.00) rather than an inaccessible element.
            </p>
          </div>
          <p className="m-0 text-xs text-[#9aa3c7]">
            Re-run in Possession Mode with a valid amount (&le; 1000.00) on <span className="text-white">fixed</span> to see a <span className="text-[#6ee7a0]">PASSED</span> verdict, or test the <span className="text-white">broken</span> variant to patch the <code className="font-mono">&lt;div&gt;</code> button.
          </p>
        </div>
      ) : !fix ? (
        <>
          <div className="px-[22px] pt-4 flex flex-col gap-2">
            {result.blocked_element && (
              <p className="m-0 text-sm text-[#cfd3ee]">
                Finding ({result.agent_kind ?? 'keyboard'}):{' '}
                <code className="font-mono text-white">{result.blocked_element.selector}</code> ({result.reason_code})
              </p>
            )}
            <p className="m-0 text-sm text-ink-muted">
              No fix proposed yet for this run. Draft an Exorcist patch to inspect the diff.
            </p>
          </div>
          <div className="v9-fix-fbtns">
            <button
              type="button"
              onClick={() => void flow.propose()}
              disabled={busy}
              className="v9-fix-btn v9-fix-btn-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
            >
              {busy ? <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
              <span>Propose a fix ({result.agent_mode})</span>
            </button>
          </div>
        </>
      ) : fix.status === 'exorcist_failed' ? (
        <div className="px-[22px] pt-4">
          <p className="m-0 flex items-start gap-2 text-sm text-white">
            <XCircle size={16} className="mt-0.5 shrink-0 text-[#ff6b6b]" aria-hidden="true" />
            <span>The Exorcist could not propose a fix: {fix.error}</span>
          </p>
        </div>
      ) : (
        <>
          {lines.length > 0 && (
            <div className="v9-fix-diff" tabIndex={0} role="region" aria-label="Proposed fix, as a diff">
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className={[
                    'v9-fix-diff-row',
                    line.type === '-'
                      ? 'v9-fix-diff-del'
                      : line.type === '+'
                        ? 'v9-fix-diff-add'
                        : 'v9-fix-diff-ctx',
                  ].join(' ')}
                >
                  <span className="mr-3 font-bold text-white" aria-hidden="true">
                    {line.type}
                  </span>
                  {line.type === '+' && <span className="sr-only">Added: </span>}
                  {line.type === '-' && <span className="sr-only">Removed: </span>}
                  <span>{line.text}</span>
                </div>
              ))}
            </div>
          )}

          <div className="px-[22px] pt-3.5 pb-4 flex flex-col gap-1.5">
            {fix.reason && <p className="m-0 text-sm text-[#dfe3ff]">{fix.reason}</p>}
            <p className="m-0 text-xs text-[#9aa3c7]">
              {fix.exorcist_mode} Exorcist · {fix.changed_lines ?? '--'} lines changed · tokens{' '}
              {fix.input_tokens ?? '--'} in, {fix.output_tokens ?? '--'} out · cost {fix.cost_usd ?? '--'} USD ·{' '}
              {Math.round(fix.latency_ms)} ms
            </p>
          </div>

          <div className="v9-fix-fbtns">
            {fix.status === 'proposed' ? (
              <>
                <button
                  type="button"
                  onClick={() => void flow.approve()}
                  disabled={busy}
                  className="v9-fix-btn v9-fix-btn-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]"
                >
                  <span className="v9-fix-dot v9-fix-dot-ok" aria-hidden="true">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span>Approve Fix</span>
                </button>
                <button
                  type="button"
                  onClick={() => void flow.reject()}
                  disabled={busy}
                  className="v9-fix-btn v9-fix-btn-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
                >
                  <X size={16} aria-hidden="true" />
                  <span>Reject</span>
                </button>
              </>
            ) : fix.status === 'approved' ? (
              <div className="flex w-full flex-col gap-3">
                <div className="flex flex-wrap gap-3">
                  <button type="button" disabled aria-disabled="true" className="v9-fix-btn v9-fix-btn-green">
                    <span className="v9-fix-dot v9-fix-dot-ok" aria-hidden="true">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <span>Approve Fix</span>
                  </button>
                  <button type="button" disabled aria-disabled="true" className="v9-fix-btn v9-fix-btn-grey">
                    <X size={16} aria-hidden="true" />
                    <span>Reject</span>
                  </button>
                </div>
                <p className="m-0 text-xs text-[#cfd3ee]" role="status">
                  Approved by {fix.decided_by} at {fix.decided_at ? new Date(fix.decided_at).toLocaleString() : '--'}. Diff{' '}
                  <span className="font-mono break-all">{fix.diff_sha256?.slice(0, 12)}</span>. No file in the repo was changed.
                </p>
              </div>
            ) : (
              <p className="m-0 text-sm text-[#cfd3ee]" role="status">
                Rejected by {fix.decided_by} at {fix.decided_at ? new Date(fix.decided_at).toLocaleString() : '--'}. No change applied.
              </p>
            )}
          </div>
        </>
      )}

      {flow.error && !accessibleButtonValidation && (
        <p className="m-0 px-[22px] pt-3 text-sm text-[#ff8a8a]" role="alert">
          {flow.error}
        </p>
      )}
    </section>
  );
}

type Mark = 'yes' | 'no' | 'pending' | 'busy';

function MarkRow({ mark, voice = false, children }: { mark: Mark; voice?: boolean; children: React.ReactNode }) {
  const word = mark === 'yes' ? 'Done' : mark === 'no' ? 'Not done' : mark === 'busy' ? 'Running' : 'Not run yet';
  return (
    <li className={`flex items-center gap-3 text-[15px] leading-snug ${voice ? 'text-[#e5dcff]' : 'text-white'}`}>
      {mark === 'yes' && (
        <span className="v9-fix-dot v9-fix-dot-ok" aria-hidden="true">
          <Check size={14} strokeWidth={3} />
        </span>
      )}
      {mark === 'no' && (
        <span className="v9-fix-dot v9-fix-dot-bad" aria-hidden="true">
          <X size={14} strokeWidth={3} />
        </span>
      )}
      {mark === 'busy' && (
        <span className="v9-fix-dot v9-fix-dot-wait" aria-hidden="true">
          <Loader2 size={14} className="motion-safe:animate-spin text-[#c084fc]" />
        </span>
      )}
      {mark === 'pending' && <span className="v9-fix-dot v9-fix-dot-wait" aria-hidden="true" />}
      <span className="sr-only">{word}: </span>
      <span className="flex flex-wrap items-center gap-1.5">
        {children}
        {mark === 'yes' && (
          <span className="font-extrabold text-[#4ade80]" aria-hidden="true">
            ✓
          </span>
        )}
      </span>
    </li>
  );
}

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

export function VerificationPanel({ flow, focused = false }: { flow: FixValue; focused?: boolean }) {
  const { fix, busy, verifyResult, voiceVerifyResult } = flow;
  const passed = fix?.verify?.verdict === 'PASSED';
  const voicePassed = fix?.verify_voice?.status === 'complete' && fix.verify_voice.verdict === 'PASSED';
  const marks = verifyMarks(fix, verifyResult);

  return (
    <section
      aria-label="Verification"
      className={`v9-fix-card ${focused ? 'v9-fix-card-focus' : ''}`}
    >
      <h3 className="v9-fix-card-head">
        Verification <span>(by Verifier Agent)</span>
      </h3>

      <ul className="m-0 flex list-none flex-col gap-3 px-[22px] pt-4 pb-5" aria-label="Verification steps" aria-live="polite">
        <MarkRow mark={marks[0].mark}>{marks[0].label}</MarkRow>
        <MarkRow mark={marks[1].mark}>{marks[1].label}</MarkRow>
        <MarkRow mark={marks[2].mark}>{marks[2].label}</MarkRow>
        <MarkRow mark={voiceMark(fix, voiceVerifyResult)} voice>
          <span className="inline-flex items-center gap-1.5">
            <Mic size={15} className="shrink-0 text-[#c084fc]" aria-hidden="true" />
            <span>Say &quot;click Send Payment&quot;</span>
          </span>
        </MarkRow>
        <MarkRow mark={marks[3].mark}>{marks[3].label}</MarkRow>
      </ul>

      <div className="px-[22px] pt-1 flex flex-col gap-3">
        {!fix || fix.status === 'proposed' ? (
          <p className="m-0 text-sm text-[#9aa3c7]">Approve the fix first.</p>
        ) : fix.status !== 'approved' ? (
          <p className="m-0 text-sm text-[#9aa3c7]">
            The fix was {fix.status === 'rejected' ? 'rejected' : 'not proposed'}, so there is nothing to verify.
          </p>
        ) : !fix.verify ? (
          <button
            type="button"
            onClick={() => void flow.verify()}
            disabled={busy}
            className="v9-fix-btn v9-fix-btn-violet w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
          >
            {busy ? <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
            <span>Replay both journeys</span>
          </button>
        ) : fix.verify.status === 'complete' && fix.verify.verdict ? (
          <div role="status" className="flex flex-col items-center gap-2 text-center">
            {passed ? (
              <>
                <div className="v9-fix-btn v9-fix-btn-green w-full">
                  <span className="v9-fix-dot v9-fix-dot-ok" aria-hidden="true">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span>Journey Verified</span>
                </div>
                <p className="m-0 text-sm text-[#cfd3ee]">{voicePassed ? 'Keyboard and voice' : 'Keyboard only'}</p>
              </>
            ) : (
              <p className="m-0 text-sm text-[#ff8a8a]">
                Not verified: the payment still could not be sent on the patched copy ({fix.verify.verdict}).
              </p>
            )}
          </div>
        ) : fix.verify.status === 'error' ? (
          <p className="m-0 text-sm text-[#ff8a8a]">The run failed, so no result is shown. {fix.verify.error}</p>
        ) : null}

        {fix?.verify && (
          <div className="pt-2 border-t border-[#252a4a]/80">
            <VerifierEvidence fix={fix} voiceResult={voiceVerifyResult} />
          </div>
        )}
      </div>
    </section>
  );
}

export function RegressionPanel({ flow, focused = false }: { flow: FixValue; focused?: boolean }) {
  const { fix, busy, regressionVoiceResult } = flow;
  const verified = fix?.verify?.verdict === 'PASSED';
  const g = fix?.regression;
  const gv = fix?.regression_voice;
  const caught = g?.verdict === 'BLOCKED';
  const voiceVerified = fix?.verify_voice?.status === 'complete' && fix.verify_voice.verdict === 'PASSED';
  const voiceWhy = firstVoiceFailure(regressionVoiceResult);

  return (
    <section
      aria-label="Regression guard"
      className={`v9-fix-card v9-fix-card-reg ${focused ? 'ring-2 ring-[#ff8a8a]/70' : ''}`}
    >
      <h3 className="v9-fix-card-head">
        Regression Guard <span>(The Returning Ghost)</span>
      </h3>

      <div className="relative px-[22px] pt-4 flex flex-1 flex-col gap-3">
        {caught && (
          <div className="pointer-events-none absolute right-3 top-1 hidden sm:block" aria-hidden="true">
            <GhostFigure tone="red" face="angry" size={84} />
          </div>
        )}

        <div className={`flex flex-col gap-3 ${caught ? 'sm:pr-20' : ''}`} aria-live="polite">
          <div className="v9-fix-regline">Bug reintroduced on purpose</div>
          <div className="v9-fix-regline">
            Keyboard journey {g?.status === 'running' ? '(running…)' : ''}
          </div>
          {gv && (
            <div className="v9-fix-regline">
              Voice-command simulation {gv.status === 'running' ? '(running…)' : ''}
            </div>
          )}

          {g?.status === 'complete' && g.verdict && (
            <div className="flex items-start gap-2.5 font-mono text-[14px] font-bold text-[#ff6b6b]">
              <span className="v9-fix-dot v9-fix-dot-bad mt-0.5" aria-hidden="true">
                <X size={13} strokeWidth={3} />
              </span>
              <span>
                {caught ? `FAILED: button not focusable (${g.reason_code})` : 'PASSED: the bug was not caught'}
              </span>
            </div>
          )}

          {gv?.status === 'complete' && gv.verdict && voiceVerified && (
            <div className="flex items-start gap-2.5 font-mono text-[14px] font-bold text-[#ff6b6b]">
              <span className="v9-fix-dot v9-fix-dot-bad mt-0.5" aria-hidden="true">
                <X size={13} strokeWidth={3} />
              </span>
              <span>
                {gv.verdict === 'BLOCKED'
                  ? `FAILED (voice): ${voiceWhy ?? `no button named "Send Payment" (${gv.reason_code})`}`
                  : 'PASSED (voice): the bug was not caught'}
              </span>
            </div>
          )}
        </div>

        <div className="pt-2">
          {!verified ? (
            <p className="m-0 text-sm text-[#e7dbe6]/75">Verify the fix first.</p>
          ) : !g ? (
            <button
              type="button"
              onClick={() => void flow.regression()}
              disabled={busy}
              className="v9-fix-btn v9-fix-btn-danger w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b6b]"
            >
              {busy ? <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
              <span>Put the bug back and run both tests</span>
            </button>
          ) : g.status === 'error' ? (
            <p className="m-0 text-sm text-[#ff8a8a]">The run failed, so no result is shown. {g.error}</p>
          ) : caught ? (
            <div role="status" className="v9-fix-caught">
              <GhostFigure tone="white" face="worried" size={50} className="shrink-0" />
              <span>
                The ghost is back.
                <br />
                But this time, we caught it.
              </span>
            </div>
          ) : g.status === 'complete' ? (
            <p className="m-0 text-sm text-[#ffd5d5]" role="status">
              Not caught: with the bug put back, the checker did not block the journey.
            </p>
          ) : null}

          {gv?.status === 'complete' && !voiceVerified && (
            <p className="m-0 mt-2 text-xs text-[#e7dbe6]/75">
              Voice: not counted, the voice journey was not verified first.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
