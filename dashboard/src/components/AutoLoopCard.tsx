/**
 * AutoLoopCard: run the broken page once, see the cause, approve the fix, watch it pass (Find, Experience, Fix, Verify).
 * One person approves the diff. Every verdict shown is the checker's, read from the API.
 */
import { CheckCircle2, Info, Loader2, Play, ThumbsDown, ThumbsUp, XCircle } from 'lucide-react';
import { useAutoLoop } from '../loop/useAutoLoop';

const BTN = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-base font-ui text-ink disabled:cursor-not-allowed disabled:opacity-50';

function Row({ icon, children }: { icon: 'ok' | 'fail' | 'info' | 'busy'; children: React.ReactNode }) {
  const Icon = icon === 'ok' ? CheckCircle2 : icon === 'fail' ? XCircle : icon === 'busy' ? Loader2 : Info;
  const tone = icon === 'ok' ? 'text-ghost-verified' : icon === 'fail' ? 'text-ghost-blocked' : 'text-ink-muted';
  return (
    <li className="flex items-start gap-2 text-base font-ui text-ink">
      <Icon size={16} className={`mt-1 shrink-0 ${tone} ${icon === 'busy' ? 'motion-safe:animate-spin' : ''}`} aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

export function AutoLoopCard({ recipient }: { recipient: string }) {
  const { state, start, approve, reject } = useAutoLoop(recipient);
  const { phase, found, fix, message } = state;
  const busy = phase === 'finding' || phase === 'proposing' || phase === 'verifying';
  const verify = fix?.verify ?? null;
  const voice = fix?.verify_voice ?? null;
  return (
    <section aria-labelledby="auto-loop-heading" className="panel mt-6 flex flex-col gap-3 p-5">
      <h2 id="auto-loop-heading" className="m-0 text-xl font-semibold font-ui text-ink">Run the whole loop</h2>
      <p className="m-0 text-base font-ui text-ink-muted">
        Runs the broken Haunted Bank page, tells you why it fails, proposes a fix, and after you approve it, runs the fixed copy.
        Nothing in your files changes. The checker decides pass or fail.
      </p>
      <div>
        <button type="button" onClick={() => void start()} disabled={busy || phase === 'awaiting_approval'} className={`${BTN} border-base-line bg-base/40`}>
          <Play size={16} aria-hidden="true" /> Run the whole loop
        </button>
      </div>
      <ol aria-live="polite" className="m-0 flex list-none flex-col gap-2 p-0">
        {phase === 'finding' && <Row icon="busy">Running the broken page with the keyboard…</Row>}
        {found && (
          <Row icon={found.verdict === 'BLOCKED' ? 'fail' : 'ok'}>
            Broken page: {found.verdict}{found.reason_code ? ` (${found.reason_code})` : ''}. Keyboard agent, {found.agent_mode} mode.
          </Row>
        )}
        {phase === 'proposing' && <Row icon="busy">Asking the Exorcist for a fix…</Row>}
        {fix && (
          <Row icon="info">
            Cause: {fix.reason ?? 'not stated'}
            {fix.blocked_element?.tag ? ` (the ${fix.blocked_element.tag} named “${fix.blocked_element.text ?? fix.blocked_element.accessible_name ?? '--'}”)` : ''}
          </Row>
        )}
        {phase === 'nothing_to_fix' && <Row icon="ok">The checker found no barrier, so there is nothing to fix.</Row>}
        {phase === 'verifying' && <Row icon="busy">Running the fixed copy with keyboard and voice…</Row>}
        {verify?.verdict && (
          <Row icon={verify.verdict === 'PASSED' ? 'ok' : 'fail'}>
            Fixed copy, keyboard: {verify.verdict}{verify.reason_code ? ` (${verify.reason_code})` : ''}. {verify.agent_mode ?? '--'} mode.
          </Row>
        )}
        {voice?.verdict && (
          <Row icon={voice.verdict === 'PASSED' ? 'ok' : 'fail'}>
            Fixed copy, voice: {voice.verdict}{voice.reason_code ? ` (${voice.reason_code})` : ''}. {voice.agent_mode ?? '--'} mode.
          </Row>
        )}
        {phase === 'failed' && message && <Row icon="fail">{message}</Row>}
      </ol>
      {phase === 'awaiting_approval' && fix && (
        <div className="flex flex-col gap-3">
          <pre className="m-0 max-h-72 overflow-auto rounded-lg border border-base-line bg-base p-3 font-mono text-base text-ink" tabIndex={0} aria-label="Proposed change">
            {fix.diff}
          </pre>
          <p className="m-0 text-base font-ui text-ink-muted">Approve to run the fixed copy. {fix.changed_lines ?? '--'} lines change, on a copy only.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void approve(fix)} className={`${BTN} border-violet-neon/50 bg-violet-600/25`}>
              <ThumbsUp size={16} aria-hidden="true" /> Approve and run
            </button>
            <button type="button" onClick={() => void reject(fix)} className={`${BTN} border-base-line bg-base/40`}>
              <ThumbsDown size={16} aria-hidden="true" /> Reject
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
