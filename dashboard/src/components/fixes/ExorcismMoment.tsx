/**
 * ExorcismMoment: shown once a person approves the fix (.kiro/specs/spooky-steps/ REQ-SS-01, SS-03).
 * The red ghost glows and fades in about 1 second. Its resting style is the end state, so in Calm mode and with
 * reduced motion (animation: none) the same faded ghost shows at once. It never says the barrier is gone:
 * only the Verifier's PASSED run does that.
 */
import { GhostMascot } from '../ghost/GhostMascot';

export function ExorcismMoment() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-base-line p-3">
      <span className="exorcism-ghost shrink-0" data-moment="exorcism" aria-hidden="true">
        <GhostMascot state="blocked" size={40} animate={false} />
      </span>
      <p className="m-0 text-base font-ui text-ink">
        Exorcism started: a person approved the fix. The Verifier still has to prove it.
      </p>
    </div>
  );
}
