# Site shell regression (plan item U11)

Date: Sun 22 Nov 2026. Branch: `feature/site-shell` (new, from `main` at `47f7da2`; no site-shell branch existed).

## Test state

| Where | Dashboard tests | How measured |
|---|---|---|
| `11e1846` (`feature/exorcist`, the commit before the route fix) | **24 failed, 40 passed (64)** | `npx vitest run` in a temporary worktree of that commit, 22 Nov |
| `main` today (`47f7da2`) | **64 passed (64)** | `npm test`, 22 Nov |

The 24 failures were fixed in `92aaa00` and merged in PR #6. **Disclosure:** that fix also edited `src/test/routes.test.tsx` in four places. Each edit changed an expected URL or link name to the renamed routes. No assertion was removed, but the tests were changed. Under the rule you set today ("fix the code, not the tests") I should have asked first. Those edits are listed under each cause below.

## The 24 failures at `11e1846`, by root cause

Commit `e3da505` ("Stage 1 marketing and app multipage shell") rewrote the route manifest (`src/routes.ts`) and added `MarketingLayout` and `AppLayout`. It did not update `src/AppRoutes.tsx`, which still mounted the 7 old routes under `RootLayout`. `RootLayout` no longer rendered the top nav.

### Cause 1: routes renamed in the manifest but not mounted (17 tests)

The manifest moved pages under `/app/*` and added marketing pages. The router did not know them, so each one rendered "Page not found".

| Failing test (`routes.test.tsx > every page > ...`) | Error |
|---|---|
| `/how-it-works`, `/try`, `/results`, `/trust`, `/roadmap`, `/about`, `/accessibility` | `expected 'Page not found' to be '<H1>'` |
| `/app`, `/app/scans`, `/app/journeys`, `/app/agents` | same |
| `/app/fixes/find`, `/app/fixes/fix`, `/app/fixes/verify`, `/app/regression` | same |
| `/app/reports`, `/app/settings` | same |

### Cause 2: missing layout (4 tests)

`RootLayout` stopped rendering `TopNav`, and the new layouts were never mounted. Pages that did render had no "Primary navigation".

| Failing test | Error |
|---|---|
| `every page > /` | `Unable to find ... role "navigation" and name "Primary navigation"` |
| `every page > /kiro` | same |
| `every page > /journeys/send-payment/agents` | same |
| `navigation > moves focus to the new H1 and announces the page` | same |

Test edit in `92aaa00`: the nav check now looks for the nav named `App` on app-shell pages, and `Primary navigation` on marketing pages.

### Cause 3: page ids renamed (2 tests)

The old `FixStep` page looked up ids `fixes-find` and `fixes-fix`. The manifest renamed them to `app-fixes-*`, so `Page` threw.

| Failing test | Error |
|---|---|
| `navigation > unknown steps redirect to Find, unknown paths show the not-found page` | `Error: Unknown page id: fixes-find` |
| `navigation > the fix pipeline shows one step at a time with Back and Next` | `Error: Unknown page id: fixes-fix`, then `Unable to find role="heading" and name "Fixes: Find"` |

Test edit in `92aaa00`: the two URLs changed from `/journeys/send-payment/fixes/...` to `/app/fixes/...`.

### Cause 4: changed link target (1 test)

| Failing test | Error |
|---|---|
| `navigation > Possess This App goes to Possession Mode and starts no run` | `expected '/try' to be '/journeys/send-payment/possession'` |

`e3da505` pointed the hero button at `/try`. Test edit in `92aaa00`: expected `/try` and the H1 "Try Possession Mode". In the other nav test, the clicked link also changed from "Reports" to "Results".

### Cause 5: ambient-layer overlap (0 tests)

No test covered it, so it never failed.

## Defects on `main` today that no test catches

Measured in Chrome at 1440 x 900 with `/tmp/crawl.py` and `/tmp/probe.py` (Playwright, 22 Nov).

| Defect | Measured |
|---|---|
| The v7 top menu (Home, Scans, Journeys, Fixes, Kiro, Reports, Kiro pill, Calm mode, Sound) is gone | Marketing pages show `Home, How it works, Try, Results, Trust, Kiro, App` (9 pages). App pages show **no top menu** (10 pages), only a sidebar |
| Possession Mode has no page of its own | `/journeys/send-payment/possession` redirects to `/app/journeys` (H1 "Journeys"). `/app/possession` and `/possession` show "Page not found" |
| Fix steps lose their step | `/journeys/send-payment/fixes/fix`, `/verify` and `/regression` all land on "Fixes: Find". `/app/fixes/regression` lands on Find; Regression lives at `/app/regression` |
| Short paths are dead | `/fixes`, `/fixes/find`, `/journeys` show "Page not found" |
| A ghost crosses the page title | On Home a roaming ghost's box intersects the H1 box in **25 of 40** samples (one every 250 ms). The layer is already behind the text (`z-index` 0 under 1), `aria-hidden="true"` and `pointer-events: none`. It is seen through the thin letters |
| `elementFromPoint` cannot see the ghosts | With `pointer-events: none`, `elementFromPoint` skips the ghost. At the H1 centre and corners it reported **0 of 40** covered while the boxes overlapped 25 of 40 times. An overlap test must turn pointer events on for the ghost layer during the test, or it cannot fail |
| Links reachable by clicking | 19 pages crawled from `/`; **none** shows "Page not found". The dead paths above are typed or old URLs, not links in the app today |

## Plan for step 2 (not started)

1. One route table (`src/routes.ts`): every path is built from it, and every nav item, sidebar item, tab and "Go to" link takes its `to` from a page id. A test fails if any `to` does not match a page.
2. The v7 top menu on every page in both shells, with `aria-current="page"`, the Kiro pill, Calm mode and Sound. Marketing-only pages (How it works, Try, Results, Trust, Roadmap, About, Accessibility) move to the footer.
3. Possession Mode at `/app/journeys/send-payment/possession`, linked from Journeys. Fix steps at `/app/fixes/{find,fix,verify,regression}`. Old URLs redirect and keep the step. `/fixes`, `/journeys` and `/possession` redirect too.
4. Not-found page with a link back to Home and to the app; a link-crawl test over every page's nav, sidebar and body links.
5. Ghost bands moved off the H1 and the main buttons; a Playwright test that turns on pointer events for the ghost layer and checks `elementFromPoint` at the centre and four corners of the H1 and each primary button while the ghosts move.
