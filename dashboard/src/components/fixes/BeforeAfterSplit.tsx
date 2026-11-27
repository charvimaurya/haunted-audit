/**
 * BeforeAfterSplit: the final split screen (.kiro/specs/spooky-steps/ REQ-SS-02, SS-03).
 * Left: the run that found the barrier (BLOCKED, red ghost). Right: the Verifier's keyboard run on the patched
 * copy, VERIFIED with the green ghost only when the checker said PASSED. Otherwise "Not run yet" or
 * "Not verified", and no green ghost. Status is icon plus text; ghosts are aria-hidden.
 */
import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react';
import { GhostMascot } from '../ghost/GhostMascot';
import type { Fix } from '../../fixes/fixContext';

export interface BeforeAfterSplitProps {
  fix: Fix | null;
}

const HALF = 'flex flex-1 basis-64 items-center gap-4 rounded-lg border p-4';

export function BeforeAfterSplit({ fix }: BeforeAfterSplitProps) {
  const v = fix?.verify;
  const passed = v?.status === 'complete' && v.verdict === 'PASSED';
  const after = !v || v.status === 'running' ? 'Not run yet' : passed ? 'VERIFIED' : v.status === 'error' ? 'The run failed, so no result is shown' : 'Not verified';
  return (
    <section className="panel mt-6 p-4 flex flex-col gap-3" aria-labelledby="before-after-heading">
      <h2 id="before-after-heading" className="m-0 text-base font-semibold font-ui text-ink">Before and after</h2>
      {!fix ? (
        <p className="m-0 flex items-start gap-2 text-base font-ui text-ink-muted">
          <CircleDashed size={16} className="mt-1 shrink-0" aria-hidden="true" />
          <span>Not run yet: approve and verify a fix to see the before and after.</span>
        </p>
      ) : (
        <div className="flex flex-wrap gap-4">
          <div className={`${HALF} border-ghost-blocked/60`}>
            <GhostMascot state="blocked" size={64} />
            <div className="flex flex-col gap-1">
              <p className="m-0 flex items-center gap-2 text-xl font-ui font-bold text-ink">
                <XCircle size={22} className="shrink-0 text-ghost-blocked" aria-hidden="true" />
                <span><span className="sr-only">Before: </span>BLOCKED</span>
              </p>
              <p className="m-0 text-base font-ui text-ink-muted">
                {fix.reason_code ?? '--'}, {fix.agent_mode ?? 'unknown'} mode. Run{' '}
                <span className="font-mono break-all">{fix.run_id}</span>
              </p>
            </div>
          </div>
          <div className={`${HALF} ${passed ? 'border-ghost-verified/60 split-reveal' : 'border-base-line'}`} data-after={passed ? 'verified' : 'none'}>
            {passed && <GhostMascot state="verified" size={64} />}
            <div className="flex flex-col gap-1">
              <p className="m-0 flex items-center gap-2 text-xl font-ui font-bold text-ink">
                {passed ? (
                  <CheckCircle2 size={22} className="shrink-0 text-ghost-verified" aria-hidden="true" />
                ) : after === 'Not verified' ? (
                  <XCircle size={22} className="shrink-0 text-ghost-blocked" aria-hidden="true" />
                ) : (
                  <CircleDashed size={22} className="shrink-0 text-ink-muted" aria-hidden="true" />
                )}
                <span><span className="sr-only">After: </span>{after}</span>
              </p>
              {v && v.status !== 'running' && (
                <p className="m-0 text-base font-ui text-ink-muted">
                  Patched copy, {v.agent_mode ?? 'unknown'} mode. Run <span className="font-mono break-all">{v.run_id}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
