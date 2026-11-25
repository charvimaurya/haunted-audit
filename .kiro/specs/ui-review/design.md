# Design: UI review, U3 and U5

Reads with `requirements.md`. Nothing here is built yet. Decisions D1 to D7 in `requirements.md` are applied below. Requirement ids (`REQ-UR-nn`) and test ids (`T…`, `E…`, `C…`, `H01`) are the same in all three spec files.

## U3: planted total

**Choice.** Committed JSON generated from `bank/PLANTED.md` (D1). The dashboard is built with Vercel Root Directory `dashboard` (plan Appendix A), so a build-time import of `../bank/PLANTED.md` may not resolve there. A generated file inside `dashboard/` always does, and a drift test keeps it honest.

**Files**
- `scripts/export_planted.py` (new). Standard library only. Exposes `planted_total(text: str) -> int` and a `main()` that writes the JSON. It takes lines that match `^\|\s*(\d+)\s*\|`, checks the numbers are 1, 2, 3 and so on with no gap or repeat, and fails with a plain message otherwise. Checked on 24 Nov 2026: exactly 6 lines in `bank/PLANTED.md` match. The axe table (its first column is a backticked rule name) and the "Not planted" sections do not match. Regenerate with `python scripts/export_planted.py`.
- `dashboard/src/generated/planted.json` (new, committed): `{"total": <n>, "source": "bank/PLANTED.md"}`. It is the only place the number is written down (REQ-UR-21).
- `dashboard/src/lib/planted.ts` (new): `parsePlantedTotal(json: unknown): number | null` (a positive integer `total`, else `null`) and `plantedTotal(): number | null`, which calls `parsePlantedTotal` on the imported JSON.
- `dashboard/src/components/ResultsSection.tsx` (edit): new prop `barriersTotal?: number | null`, default `null`. With both known the tile reads `${n} / ${total}`. With only the count known it shows the count plus the visible words "total not yet measured". With no count it shows `--` and "not yet measured" as today.
- `dashboard/src/pages/app/Reports.tsx` and `dashboard/src/pages/marketing/Results.tsx` (edit, one line each): pass `barriersTotal={plantedTotal()}`.

**Why the numerator is unchanged.** `1` for a BLOCKED run with a `blocked_element` is today's measured claim: the checker found the one barrier that can stop the keyboard. Changing it needs the axe scanner (item 25). The label already says "Planted barriers detected", so `1 / 6` stays true.

## U5: focus-trail replay

**Data in, nothing out.** The code reads the run's `focus_trail` and `reason_code`. It adds no field to the API, no type to `types/index.ts` and nothing to the data contract.

### `focusTrail.ts` (new, pure, no React)
```ts
export interface FocusTrailStop {
  position: number;          // 1-based among the retained stops
  total: number;             // count of retained stops; the same on every stop
  hint: string;              // the snapshot's selector_hint, trimmed
  label: string;             // plain name from STOP_TABLE, else accessible_name, else hint
  role: string | null;       // snapshot role, or null
  name: string;              // snapshot accessible_name, '' if missing
  replicaId: string | null;  // DOM id on the replica, or null for a text-only stop
}
export function focusTrailStops(result: JourneyResult | null | undefined): FocusTrailStop[];
export function describeStop(stop: FocusTrailStop): string;   // "Stop 3 of 9: Amount, text box"
```
- **One signature everywhere:** `focusTrailStops(result)`. It reads `result.focus_trail` only.
- **Safe handling (REQ-UR-23).** `null`, `undefined`, a missing or non-array `focus_trail`, an entry that is not an object, or an entry with no non-empty string `selector_hint` never throw and never log. Bad entries are skipped. If nothing is usable the result is `[]`. Position and total are counted over the stops that were kept.
- **Order and repeats (REQ-UR-05).** Trail order is kept. `body` is dropped. Only the first visit to each `hint` is kept (open item A1).
- **STOP_TABLE (REQ-UR-06, 13).** One ordered table of `{ key, label, replicaId }`. A hint matches a key when it equals the key or ends with it. Keys starting `#` are id keys, so `#recipient-hint` does not match `#recipient`. Entries:

| key | label | replicaId |
|---|---|---|
| `#recipient` | Recipient | `pm-recipient` |
| `#amount` | Amount | `pm-amount` |
| `#reference` | Reference | `pm-reference` |
| `#send-payment` | Send Payment | `pm-send-payment` |
| `a.skip` | Skip link | `null` |
| `#nav-dashboard`, `#nav-accounts`, `#nav-transactions`, `#nav-offer` | Dashboard link, Accounts link, Transactions link, Offer link | `null` |
| `#cancel` | Cancel | `null` |
| `#offer-terms` | Offer terms | `null` |
| `#privacy` | Privacy | `null` |
| (any other hint) | accessible name, else the hint | `null` |

  The non-id keys come from the real broken-run trail in `docs/evidence-seed.json` (`a.skip`, `#nav-…`, `#cancel`, `#offer-terms`, `#privacy`). A different bank page would show up as "any other hint", never as a made-up name.

### `FocusTrailReplay.tsx` (new, one component)
- **Props, exactly two (REQ-UR-22):** `{ result: JourneyResult | null; isRunning: boolean }`. Nothing else. There is no `calm` prop and no `highlightTargets` prop.
- **Calm source, exactly one:** `useImmersion().calm`. That value is already true for the Calm toggle and for the system's reduced-motion setting.
- **State:** `step`, a number from `0` (idle) to `stops.length + 1` (finished). Nothing else is stored.
- **Render, by state (REQ-UR-10, 11):**
  1. `isRunning`: "The keyboard path is not ready: the run is still going." No button, no list.
  2. `result === null`: "Not run yet." No button.
  3. `stops.length === 0`: "No keyboard trail in this run." No button.
  4. Calm: heading, caption, the text list of all stops, and a static badge on every stop that has a `replicaId`. **No replay button is rendered.** No timer, no movement.
  5. Otherwise (normal): heading, caption, the text list, the live region and the button. Idle and finished label: "Replay focus trail". While stepping: "Next stop". Each press moves `step` by one. At `step = 1…N` the stop is announced, and drawn if it has a `replicaId`. At `step = N + 1` the live region says "Replay finished" and nothing is drawn. The next press goes back to stop 1.
- **Broken-run sentence (REQ-UR-09):** "Tab never landed on Send Payment" is shown only when `result.reason_code === 'TARGET_NOT_FOCUSABLE'`.
- **Caption (REQ-UR-07):** "Replay of the keyboard path on this drawing".
- **Live region:** one `aria-live="polite"` element, updated only on a button press.
- **Badge layer.** The panel sits in the checklist card on the right. The badges belong on the replica card on the left. The component renders the badge layer with `createPortal` into the replica card (id `pm-replica-card`, added by this work, open item A4). For each badge it finds the control with `document.getElementById(replicaId)` inside the card and measures it with `getBoundingClientRect()` against the card's own rect. No trail coordinate is used (REQ-UR-05). It measures again when the active stop changes and when the card is resized (`ResizeObserver`). That is a layout measurement, not an animation, so the 334 ms rule does not apply. If the card or the control is missing, no badge is drawn and nothing throws.
- **Badge and outline styling.** A 3px outline on the control and a numbered circle of at least 1.75rem, with number text of at least 1rem. Tailwind classes only. `aria-hidden="true"` and `pointer-events: none`. `index.css` is not touched.

### `PossessionMode.tsx` edits (four small ones, all in this worktree)
Facts in this worktree at 9c2f07a (no assumption about the owner's checkout):
- the `PossessionGhost` import is at line 43;
- the replica inputs `pm-recipient`, `pm-amount` and `pm-reference` are at lines 272, 283 and 295;
- the Send Payment element starts near line 304: a `<button aria-label="Send Payment">` in the fixed variant and a `div role="button"` in the broken variant;
- the checklist card (`<aside aria-label="Possession Mode tab step results">`) starts near line 369.

Edits: (1) one `import { FocusTrailReplay }` line; (2) `id="pm-replica-card"` on the existing replica card `div` (the one labelled "Send Payment form demonstration"); (3) `id="pm-send-payment"` on the Send Payment element, in both variants (only one renders at a time); (4) one `<FocusTrailReplay result={result} isRunning={isRunning} />` line inside the checklist card. `PossessionMode` gains no prop.

**Collision plan.** The only file with a possible overlap is `PossessionMode.tsx`, and only this worktree is edited. Whether the owner's own checkout has uncommitted changes in that file is not inspected by this spec and is not assumed. If the owner's later work conflicts with these four edits, the conflict is found at merge time and is the owner's to resolve; this spec does not touch the owner's checkout or any other worktree to avoid it. `PossessionJourney.tsx`, `Possession.tsx`, `index.css` and `types/index.ts` are not edited.

### Trails the tests use (inline fixtures, not `docs/evidence-seed.json`, which other branches rewrite)
- **Broken, from the real seed run (14 entries):** body, skip link, three bank nav links, offer link, `#recipient`, `#amount`, `#cancel`, `#offer-terms`, `#privacy`, body. After the rules: first visits only, `body` dropped. Mapped on the replica: Recipient, Amount. Never Send Payment.
- **Fresh fixed run, with the merged Reference field:** body, skip link, nav links, `#recipient`, `#amount`, **`#reference`**, `#send-payment`. Mapped stops, in order: Recipient, Amount, Reference, Send Payment. (The older seed shows 9 entries and has no `#reference`, because it was recorded before the field. Tests must not use it.)
- **Voice run:** `focus_trail: []`.
- **Malformed:** `focus_trail` is `null`, a string, or an array with `null`, a number, and an object with no `selector_hint`.

## Test catalogue
Every id below is cited by a requirement's **Verified by** cell or by a task. File names and test titles are the names the tests will have.

### Python: `tests/unit/test_export_planted.py` (UR-01)
| Id | Title | Checks |
|---|---|---|
| T01 | `test_committed_json_matches_planted_md` | The drift test. Generated output equals `planted.json`. The failure message names `python scripts/export_planted.py` (REQ-UR-04) |
| T02 | `test_total_counts_numbered_rows_only` | A fixture with 7 rows gives 7. A fixture with "Not planted" sections and an axe-style table still gives its numbered rows only (REQ-UR-01) |
| T03 | `test_gap_repeat_or_no_rows_fail_with_a_plain_message` | Rows 1, 2, 4 fail. Rows 1, 2, 2 fail. No numbered rows fail. Nothing is written on failure (REQ-UR-01) |
| T04 | `test_json_has_total_and_source_only` | Shape is `{"total": <int>, "source": "bank/PLANTED.md"}` (REQ-UR-01) |

### Vitest: `dashboard/src/test/planted-total.test.tsx` (UR-01)
| Id | Title | Checks |
|---|---|---|
| T05 | `parsePlantedTotal returns a positive integer or null` | `6`, `7` pass. `0`, `-1`, `1.5`, `"6"`, missing, `null` give `null` (REQ-UR-02) |
| T06 | `ResultsSection shows n / total` | `barriersDetected=1` with `barriersTotal=6` shows `1 / 6`. With `7` shows `1 / 7` (REQ-UR-02, 03) |
| T07 | `ResultsSection shows the count and "total not yet measured" when the total is null` | (REQ-UR-03) |
| T08 | `ResultsSection shows -- and "not yet measured" when the count is unmeasured` | (REQ-UR-03) |
| T09 | `Reports and Results pass the planted total for a broken run` | The expected text is built from `plantedTotal()`, not a typed number (REQ-UR-02, 03) |

### Vitest guards: `dashboard/src/test/ui-review-guards.test.ts` (T10 in UR-01, T11 added in UR-02 and extended in UR-03)
| Id | Title | Checks |
|---|---|---|
| T10 | `no app file contains a typed barrier total` | Scans non-test files under `dashboard/src` (not `samples/`, not `generated/`) for the literal `/ 6`, `of 6`, and a template string of the form `${x} / <digits>` (REQ-UR-21, 02) |
| T11 | `focus-trail files do not read typed values or bounding boxes` | `focusTrail.ts` and, once it exists, `FocusTrailReplay.tsx` contain none of `runDetails`, `test_details`, `RecordedDetails`, `type_text`, `.args`, `bounding_box` (REQ-UR-19, 05) |

### Vitest: `dashboard/src/test/focus-trail.test.ts` (UR-02)
| Id | Title | Checks |
|---|---|---|
| T20 | `focusTrailStops never throws on missing or malformed input` | `null`, `undefined`, no `focus_trail`, a string, bad entries: returns `[]` or skips the entry, no throw, no console output (REQ-UR-23) |
| T21 | `keeps trail order, drops body, keeps the first visit only` | (REQ-UR-05, open item A1) |
| T22 | `maps recipient, amount, reference and send-payment to replica ids` | (REQ-UR-06, 18) |
| T23 | `text-only and unknown hints have replicaId null` | (REQ-UR-06) |
| T24 | `matches whole id tokens` | `#recipient` and `input#recipient` map. `#recipient-hint` does not (REQ-UR-13) |
| T25 | `numbers stops 1..N with the same total` | (REQ-UR-05) |
| T26 | `broken trail has no send-payment stop; fresh fixed trail ends recipient, amount, reference, send-payment` | Inline fixtures from the section above (REQ-UR-06, 09) |
| T27 | `ignores bounding_box` | The same stops come back whatever `bounding_box` holds (REQ-UR-05) |
| T28 | `describeStop wording` | "Stop 3 of 9: Amount, text box" (REQ-UR-08) |

### Vitest component: `dashboard/src/test/focus-trail-replay.test.tsx` (UR-03; wrapped in `ImmersionProvider`, with Calm set the way `dashboard/src/test/immersion.test.tsx` sets it)
| Id | Title | Checks |
|---|---|---|
| T30 | `says "Not run yet" with no run` | No button, no badge (REQ-UR-11) |
| T31 | `says the trail is not ready while a run is going` | No button, no badge (REQ-UR-11) |
| T32 | `says "No keyboard trail in this run" for an empty trail` | A voice-shaped result (REQ-UR-11) |
| T33 | `broken run: no badge on Send Payment; sentence only for TARGET_NOT_FOCUSABLE` | A `FOCUS_TRAP` result does not show the sentence (REQ-UR-09) |
| T34 | `fresh fixed run ends on Send Payment after Reference` | (REQ-UR-09) |
| T35 | `the button advances one stop per press by click, Enter and Space` | Label cycle "Replay focus trail", "Next stop", "Replay finished", restart. Live region text per step (REQ-UR-07, 08) |
| T36 | `the button is a real button reachable by Tab and DOM focus stays on it` | (REQ-UR-07) |
| T37 | `Calm: no button, every mapped badge shown, text list shown` | (REQ-UR-10, 22) |
| T38 | `not Calm: no badge is drawn before the first press` | (REQ-UR-10, 22) |
| T39 | `badges and outlines are aria-hidden and pointer-events none` | (REQ-UR-07) |
| T40 | `shows the caption "Replay of the keyboard path on this drawing"` | (REQ-UR-07) |
| T41 | `pressing the replay button leaves every checklist row unchanged` | Rows read before and after each press (REQ-UR-17) |
| T42 | `jest-axe finds no violation in each state` | Idle, stepping, finished, Calm, not run, running, empty (REQ-UR-08) |
| T43 | `FocusTrailReplay accepts only result and isRunning` | A type-level check that `npm run build` (`tsc -b`) enforces (REQ-UR-22) |

### Real browser: `dashboard/e2e/focus-trail.e2e.ts` (UR-04)
Geometry does not exist in jsdom, so layout is only checked here. These tests need a finished real run to draw a trail, so they use the repo's real-API e2e config (`npm run test:e2e:api`) and make a scripted run first. If the API cannot run on the machine, they are reported as **not run**, never simulated. Modes are set the way `axe-pages.e2e.ts` sets them (`localStorage` keys `haunted-audit.calm` and `haunted-audit.contrast`).
| Id | Title | Checks |
|---|---|---|
| E01 | `badges do not touch labels, inputs, Send Payment, headings, the ghost or each other` | At 1440 x 900, 1366 x 768, 640 x 900 and 390 x 844, in normal, Calm and high-contrast, for the broken and the fixed run, at every step (REQ-UR-12, 10) |
| E02 | `no horizontal scroll at 390 px, and every badge is inside the replica card and the viewport` | `documentElement.scrollWidth <= 390` (REQ-UR-12) |
| E03 | `badge is at least 28 x 28 with 16px text; the button is at least 44 x 44` | Computed styles and boxes (REQ-UR-12) |
| E04 | `axe finds no WCAG 2.2 AA violation with the replay active` | Normal, Calm and high-contrast (REQ-UR-12) |

### Commands the author runs and pastes into the review record (UR-05)
| Id | Command | Shows |
|---|---|---|
| C01 | `git log --format=%s origin/main..HEAD` and `git diff --name-only origin/main...HEAD` | Task ids on the commits (REQ-UR-14). Every changed path is in the allow-list: `.kiro/specs/ui-review/`, `scripts/export_planted.py`, `tests/unit/test_export_planted.py`, `dashboard/src/generated/`, `dashboard/src/lib/`, `dashboard/src/components/{ResultsSection,FocusTrailReplay,PossessionMode}.tsx`, `dashboard/src/pages/app/Reports.tsx`, `dashboard/src/pages/marketing/Results.tsx`, `dashboard/src/test/`, `dashboard/e2e/`, `docs/devlog.md`, `docs/pr/item-6-ui-review.md`, and `docs/completion/MASTER_TASK_TRACKER.md` (REQ-UR-15, 17, 18) |
| C02 | `.venv/bin/python -m pytest -q`, `cd dashboard && npm test`, `npm run build`, `npm run test:e2e:api` | Pass counts and any failure, copied as printed (REQ-UR-16) |
| C03 | the Reviewer agent run and its output | An independent read of the diff and the record (REQ-UR-15, 16) |

### Human walkthrough (UR-04b, no commit)
| Id | Who | What |
|---|---|---|
| H01 | A person, not the author | On the Possession page, use only Tab, Shift+Tab, Enter and Space. Reach the replay button, step through a broken run's trail and a fixed run's trail, turn Calm on and confirm the button is gone and the badges are all shown. Write down what they saw, when, and on which browser. **Outstanding until done** (REQ-UR-20) |

## Accessibility
- Button: at least 44px, `type="button"`, the existing visible 3px focus ring, text 16px or larger in `rem`.
- Badges and outline: `aria-hidden`, `pointer-events: none`, never over text.
- One polite live region. No colour-only status: every outline comes with a number and a sentence.

## Risks
1. **"The bank" is the replica** (D6). The replay shows the keyboard's order on a drawing of the bank. The caption says so, so nobody reads it as a screenshot of the real page.
2. **`PossessionMode.tsx` is the busiest file.** Keep to the four small edits listed above.
3. **Trail shapes differ by run kind.** A voice run has an empty trail. That state must read as plain information, not as an error.
4. **`POST /runs` already carries `reference`** (D5). Implemented, pending Shilpa's written approval. Not caused by this work, not changed by it, and not recorded as approved.
5. **Replay and checklist must not blur** (D7). The checklist keeps reading the finished run. T41 guards it.
6. **The Send Payment badge and the verified ghost share a row** (open item A3). The criteria in REQ-UR-12 decide, not taste.
