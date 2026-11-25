# Integration: Home hero Pause-animation button (v9 item 36)

Integrated directly on `main`, 25 Nov 2026, per `team-rules.md`.

## What this is

A local "Pause animation" control inside the Home hero (WCAG 2.2.2), per `design/v9/01-home.html`'s own
script. Corrected during this session after an earlier version wrongly wired it to the global Calm mode
toggle.

## Correction made before this commit

The first implementation called `toggleCalm()` directly, so pressing the hero's Pause button would have
silently changed the visitor's sitewide Calm preference (every page, saved to `localStorage`). Read the
v9 mockup's own JavaScript (`design/v9/01-home.html`) to confirm the two are not equivalent: its
`setPaused()` only toggles a local `paused` CSS class and never touches the Calm checkbox.

Fixed: `HeroSection.tsx` now owns a local `paused` state. A new CSS rule,
`.hero-paused .ambient-roam, .hero-paused .ambient-particle { animation-play-state: paused; }`
(`dashboard/src/index.css`), freezes only the hero's own roaming ghosts. The button:
- Reads "Pause animation" / "Play animation" (matching the v9 script's own label text, not "Resume").
- Hides itself when Calm mode or `prefers-reduced-motion` is already on (redundant control, per v9).
- Writes nothing to `localStorage` and never calls `toggleCalm`.

## Files changed

- `dashboard/src/components/HeroSection.tsx`: local `paused` state, `alreadyStopped` guard, button.
- `dashboard/src/index.css`: `.hero-paused` scoped animation-pause rule.
- `dashboard/src/test/hero-art.test.tsx`: rewritten from a test that asserted no pause button exists
  (stale, from an earlier explicit "remove the pause button" instruction later superseded by the v9 spec
  requiring it) to 5 tests: default state, local freeze without touching Calm, keyboard activation,
  and the two auto-hide cases (reduced motion, Calm already on).

## Tests

- `cd dashboard && npx vitest run src/test/hero-art.test.tsx`: 5/5 pass.
- `cd dashboard && npx vitest run` (full suite): 23 files, 166 tests pass.
- Screenshots taken earlier this session (`/tmp/shots/home-default.png`, `/tmp/shots/home-paused.png`)
  at 1366px via Playwright, confirmed visually: button toggles label, ghosts freeze, Calm mode and the
  Kiro nav pill are unaffected by the click.

## Not done

- Button position: this implementation places it top-right of the hero; the v9 mockup places it
  bottom-right. Flagged, not resolved, pending the owner's confirmation this is acceptable.
