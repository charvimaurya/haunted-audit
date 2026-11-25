# UI v9 replica (owner, 25 Nov: "exact replica of v9, with the honest differences")

Target: `design/v9/index.html`, all screens, at 1366 x 657 in Chrome, including its "COMPACT" laptop rules.
Rebuilt in React with real data (`design/v9/README.md`: do not paste the HTML). Branch `feature/ui-v9-replica`.

## Honest differences (owner-approved, 25 Nov)
- `[x]`, `[n]`: measured value, or `--` with "not yet measured".
- Ticks, crosses, PASS, FAIL, VERIFIED, "caught": only from the checker's verdict on that run; else "Not run yet".
- v9 test file names (`send_payment.spec.ts`, `send_payment_voice.spec.ts`): the real journey names.
- v9 "Scan a public URL": not built (agents run only on the bundled bank; no scan endpoint).
- Text 16px minimum where v9 uses 13 to 15.5px. One H1 per page (v9 uses hidden h2s).
- "Live Test" chip only while a run is going (`design/v9/README.md`); otherwise Ready, Blocked or Passed from the last run.

## REQ-RP-01 Tokens
v9 colours (`--page`, `--frame-a/b`, `--card-a/b`, `--card-line`, `--violet*`, `--ink`, `--mute`, `--dim`, `--ok*`,
`--bad*`) are tokens in `index.css` and `tailwind.config.js`. No hex in components.
**Acceptance:** grep finds no new hex in `src/components` or `src/layouts`.

## REQ-RP-02 Shell
Top menu as v9 (brand, centred links, Kiro pill, icon-only Settings button with an accessible name). App pages sit in
one framed panel (`.appframe`, at most 1360px wide) with a head bar (breadcrumb with icon, Variant, run chip) and a
190px sidebar (Overview, Agents, Findings, Fixes, Verification, Regression, Kiro, Reports). The castle band is not shown
on app pages. The H1 is the page title inside the panel; the breadcrumb's last item matches it.
**Acceptance:** side-by-side at 1366 x 657 with `design/v9/index.html`; axe clean in normal, Calm and high contrast;
keyboard walk of every app page 0 failures.

## REQ-RP-03 to RP-08 Screens
Home, Possession (Keyboard and Voice), Agents, Fixes, Kiro, Results each match their v9 view and fit 1366 x 657
without page scroll, with real data.
**Acceptance per screen:** side-by-side image in `docs/ui-fidelity/v9-replica/`, Vitest + axe, keyboard walk,
200% zoom and 390px checks.

## Tests
A test made obsolete by the new layout is listed for the owner before it is changed (standing override O7).
