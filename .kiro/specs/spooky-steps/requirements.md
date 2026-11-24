# Spooky moments as loop steps (plan v5.3 item 5)

v5.3 says what is left: "the exorcism moment on Approve and the final split screen (red ghost BLOCKED to green
ghost VERIFIED), each with a Calm-mode version". The returning ghost ("The ghost is back. But this time, we caught
it.") already exists on the Regression step. Every moment is functional: it shows a state the checker or a person
set, never a made-up one. Owner rule: everything on `main`.

## REQ-SS-01 Exorcism on Approve
When a person approves the fix, the Fix panel shows the red ghost, which glows and fades in about 1 second, next to
the text "Exorcism started: a person approved the fix. The Verifier still has to prove it."
The moment never says the barrier is gone; only the Verifier's PASSED run does that.
**Acceptance:** Vitest: after Approve the text and a ghost marked `data-moment="exorcism"` appear; before Approve they do not.

## REQ-SS-02 Final split screen
On the Regression step, a full-width panel "Before and after": left, the red ghost with "BLOCKED" and the original
run's reason code and run ID; right, the green ghost with "VERIFIED" and the Verifier's keyboard run ID, only when
that run is PASSED. Otherwise the right half says "Not run yet" or "Not verified" and shows no green ghost.
Status is icon plus text. Ghosts are `aria-hidden`.
**Acceptance:** Vitest for PASSED, BLOCKED and not-run Verifier states; axe clean.

## REQ-SS-03 Calm mode and reduced motion keep every state
With Calm mode or `prefers-reduced-motion: reduce`, the same elements and text show and nothing moves. The
exorcism ghost's resting style is its end state (faded), so the animation's end and the Calm version look the same.
No animation is shorter than 334 ms or repeats in these moments.
**Acceptance:** browser check (Chrome, reduced motion emulated): `getAnimations()` is empty on both moments and the
same text shows; Vitest checks the DOM is the same with and without motion except the animation class.

## REQ-SS-04 Keyboard
No new tab stops; the loop walk still passes.
**Acceptance:** `scripts/keyboard_loop_walk.py` 0 failures.

## Out of scope
- Starting Verify by itself after Approve. A person presses Verify (a person stays in charge; one main action).
- Changing the returning-ghost moment.
