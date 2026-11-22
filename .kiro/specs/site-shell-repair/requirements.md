# Site shell repair: requirements (plan item U11)

Approved by the owner on 22 Nov 2026, including one test edit and the footer move. Evidence of the problems: `docs/shell-regression.md`.

**REQ-SH-01: v7 top menu on every page.** Both shells show the same top menu: Home, Scans, Journeys, Fixes, Kiro, Reports, then Calm mode, Sound and the Kiro pill. The current item has `aria-current="page"`. Journeys is current on every journey page, and Fixes on every fix step.

**REQ-SH-02: Footer for the other public pages.** How it works, Try, Results, Trust, Roadmap, About and Accessibility move to the footer, with `aria-current` on the current one.

**REQ-SH-03: One route table.** `src/routes.ts` is the only place a path is written. Every nav item, sidebar item, tab, breadcrumb, "Next step" and in-page link takes its path from a page id. TypeScript rejects an unknown id.

**REQ-SH-04: Possession Mode and the four fix steps load.**
- Possession Mode is at `/app/journeys/send-payment/possession`, with the H1 "Possession Mode" and the breadcrumb App / Journeys / Possession Mode.
- Find, Fix, Verify and Regression are at `/app/fixes/<step>`.

**REQ-SH-05: Old and short URLs redirect and keep their meaning.**
- `/journeys/send-payment/possession`, `/journeys/send-payment/fixes/<step>`, `/journeys/send-payment/agents`, `/fixes`, `/fixes/<step>`, `/journeys`, `/possession`, `/scans`, `/reports` and `/app/regression` each redirect.
- A step in the old URL is kept.

**REQ-SH-06: Not-found page with a way back.**
- Any unknown path, in either shell, shows "Page not found" with links to Home, Possession Mode and the app dashboard.

**REQ-SH-07: Link crawl.**
- A test renders every page and follows every internal link in the top menu, footer, sidebar, breadcrumbs and page body.
- It fails if any link lands on "Page not found".

**REQ-SH-08: Ghosts never cover content.**
- The ambient layer stays behind the content: `z-index` below it, `pointer-events: none`, `aria-hidden`.
- Its flight paths avoid the H1 and the main button.
- A Playwright test turns pointer events on for the ghost layer, so `elementFromPoint` can see it.
- It then checks the centre and four corners of the H1 and of each primary button over several seconds of movement, at 1440 and 1280 px.

**REQ-SH-09: No test loosened.** The 64 existing tests stay. The one approved edit is in "moves focus to the new H1": the clicked link changes from "Results" to "Reports".
