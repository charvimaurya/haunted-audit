# UI v9 replica (25 Nov 2026)

Branch `feature/ui-v9-replica`, spec `.kiro/specs/ui-v9-replica/`. Target `design/v9/index.html` at 1366 x 657 in Chrome.
Images `docs/ui-fidelity/v9-replica/side-<screen>.png`: v9 on the left, the app after real scripted runs on the right
(fonts served correctly; the earlier `v9-audit` images used fallback fonts).

| Screen | Now matches v9 | Still differs (and why) |
|---|---|---|
| Shell (every app page) | Top menu (bold brand, centred links, Kiro pill, gear), one framed panel, head bar with breadcrumb and run chip, v9 sidebar and icons | Verification icon is a shield, not v9's circle tick (a tick before any run reads as a pass; no-mock-results guard). Sidebar keeps "Journeys" and touch targets stay 44px (v9 38px) |
| Home | Rubik Wet Paint title at v9 size, bold tagline, big rounded CTA, larger chips, Pause animation bottom right, hero fills the screen | Footer below the hero (marketing shell rule) |
| Possession, Keyboard and Voice | v9 cards, Keyboard/Voice segment, violet Run button | **Layout**: v9 shows the bank and the Possession card side by side with the Run button inside the card and Variant in the head bar; the app keeps the Test details form above the bank. **Needs the owner's decision** (moves the typed-details form and the Variant select; standing override O2 limits selectors on user screens) |
| Agents | Panel title, three cards with v9 icons and filled dots, a row of timeline chips, large Critical Ghost card with a picture of the blocked control | Rows show the agents' real messages, so cards are taller; the page H1 "Agents" sits above the v9 title |
| Fixes | v9 step strip with line arrows, cards with header bands, v9 buttons, filled dots, only changed diff lines, glowing borders from the verdicts | The real diff, the evidence rows with run IDs, BLOCKED to VERIFIED and Before and after (plan items 4 and 5) make the page taller |
| Kiro | Title with hourglass, editor card (K badge, folder tree with icons, file tab, v9 code colours), hook card with bolt, ghost, alert dot, Built with Kiro | `/kiro` is a public page, so it has no app frame or sidebar (v9 shows it inside the app). Moving it is a route change: **owner decision** |
| Results | Four coloured tiles and the torn parchment in one row | Third tile says "Test scenarios evaluated" (v9 "Journeys passing"); "/ 6" is still fixed text (U3, waits for the ui-review spec); Verifier evidence rows below the tiles (plan item 4) |
| Scans | Not changed | v9 "Scan a public URL": conflicts with the bundled-bank rule; **owner decision** |

Honest differences approved by the owner (25 Nov): measured numbers or `--`; ticks and verdicts only from the checker;
real journey names instead of v9 test file names; no public URL scan; 16px minimum text; one H1; "Live Test" only while running.

## Checks (25 Nov, this branch)
Vitest 183 passed. Browser tests 8 passed (axe 0 violations on every page in normal, Calm and high contrast; ghost
never covers the H1 or main button at 1280 and 1440px). Keyboard walk of every page: 0 of 20 failing. Keyboard loop walk:
0 failures with motion and with reduced motion. No sideways scroll on 8 key pages at 390px or at 683px (200% zoom).
