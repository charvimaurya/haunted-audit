# Requirements: UI review, U3 and U5 (plan v5.3 item 6)

Branch `fix/ui-review`, from `origin/main` 9c2f07a (24 Nov 2026). Status: **spec only, uncommitted, revised after the owner's review, waiting for the owner's approval. No code written. UR-01 has not started.**

## Why
- **U3.** The Results tile prints `n / 6`. The 6 is typed into `ResultsSection.tsx` (line 63, `` `${n} / 6` ``). The count is measured; the total must come from the answer key `bank/PLANTED.md`.
- **U5.** After a run, the Possession checklist ticks from the run's real `focus_trail`, but nothing shows the keyboard's path. The plan asks for a visible focus outline that moves through `focus_trail` in order, readable with reduced motion, checked at desktop and 390 px.

## Decisions already made by the owner (24 Nov 2026)
| # | Decision | Effect on this spec |
|---|---|---|
| D1 | U3 total comes from a **committed JSON generated from `PLANTED.md`, with a drift test** (option B) | REQ-UR-01 to 04, 21 |
| D2 | Typed Recipient and Amount values are **not** part of U5. They belong to `user-typed-test-details` (PR #15, merged) | U5 must not render typed values and must not read `runDetails`: REQ-UR-19 |
| D3 | No `reference` field on `POST /runs` without Shilpa's written approval (plan item 20) | This spec changes no API and adds no field: REQ-UR-15, 18 |
| D4 | The owner's uncommitted dashboard work stays untouched. Work only in this worktree | REQ-UR-14 |
| D5 | The `reference` field already on `POST /runs` is **implemented, pending Shilpa's written approval**. Approval is **not** recorded as given | Status section below. This spec does not change or remove the field |
| D6 | The focus trail is drawn on the **replica inside the Possession panel**, not on the real Haunted Bank page in a browser | REQ-UR-06, 07. Nothing under `fixtures/` changes |
| D7 | **No live checklist updates.** The replay is a separate, user-controlled interaction. `PossessionJourney` is not changed and `liveSteps` is not passed | REQ-UR-17 |

### Status of the Reference field on `POST /runs` (D5)
- **Implemented:** yes. `agent/api/main.py` in this worktree (9c2f07a) declares `reference: str | None = None` on the run request. It arrived with PR #15, which `gh pr list` showed as merged on 24 Nov.
- **Tests:** test files that exercise `reference` exist in this worktree (for example `agent/tests/test_typed_details.py` and `dashboard/src/test/reference-field.test.tsx`), and `docs/devlog.md` line 60 records a test result written by that PR's author. This spec did **not** re-run them and did **not** verify that they ran or passed on the merged `main`. This spec does not rely on them.
- **Shilpa's written approval under plan item 20:** **pending. Not given. Not to be recorded as given** until Shilpa writes it.
- **Tracking:** the master task tracker (`docs/completion/MASTER_TASK_TRACKER.md`) does **not** record this approval today. Its only Reference line is row 31, which still says NOT_STARTED and is out of date. UR-05 must record the approval as pending, accurately, in the item 6 review record. This spec does not edit the tracker.
- `.kiro/steering/team-rules.md` (24 Nov) says fields may be added to `POST /runs`. The owner's rule is stricter, so this spec follows the owner's rule and keeps the approval open.

## State of this worktree that the spec relies on (checked 24 Nov 2026, at 9c2f07a)
- `PossessionMode.tsx` has replica inputs `pm-recipient`, `pm-amount` and `pm-reference`, the rows "Tab to Reference" and the typed-value rows, and the props `liveSteps` and `runDetails`. The ghost is shown beside the Send Payment element.
- `bank/PLANTED.md` has exactly 6 lines that start `| <number> |`, plus the sections "Not planted: the Reference field" and "Not planted: the Send Payment button colour", which have no numbered rows.
- `ImmersionContext` exposes `calm`, which is true when the visitor turned Calm mode on or the system asks for reduced motion.
- Nothing exists yet at `dashboard/src/generated/`, `dashboard/src/lib/planted.ts`, `dashboard/src/lib/focusTrail.ts`, `dashboard/src/components/FocusTrailReplay.tsx` or `scripts/export_planted.py`.

## How each requirement is verified
The **Verified by** column uses ids from the test catalogue in `design.md`. Four kinds exist, and they are kept apart:
- **Auto**: an automated test (`T…` unit, component or guard test; `E…` real-browser test). It runs by command and passes or fails.
- **Cmd**: a command the author runs and pastes into the review record (`C…`). Someone else reads it.
- **Review**: a reviewer reads the record or the diff. Not automated.
- **Human**: a person does it with a keyboard and writes down what they saw (`H01`). **No automated test counts as Human.**

## U3 requirements
| ID | Requirement | Verified by |
|---|---|---|
| REQ-UR-01 | `scripts/export_planted.py` reads `bank/PLANTED.md`, counts the lines that start `\| <number> \|`, and writes `dashboard/src/generated/planted.json` as `{"total": <int>, "source": "bank/PLANTED.md"}`. It fails with a plain message if there are no numbered rows, if the numbers are not 1, 2, 3 and so on in order, or if a number repeats. It never writes a guessed value. | Auto: T02, T03, T04 |
| REQ-UR-02 | No app file under `dashboard/src` (tests, `samples/` and `generated/` excluded) contains a typed barrier total. `ResultsSection` receives the total as the prop `barriersTotal`. The pages pass `plantedTotal()` from `dashboard/src/lib/planted.ts`, which returns the JSON's `total` or `null`. | Auto: T05, T06, T09, T10 |
| REQ-UR-03 | The tile shows `n / total` when both are known. For a broken run the checker's count is 1, so the tile reads `1 / <total>`, which is `1 / 6` while `PLANTED.md` has six rows. When the count is not measured the tile shows `--` with "not yet measured". When `total` is `null` the tile shows the count and the words "total not yet measured". It never invents a denominator. | Auto: T06, T07, T08, T09 |
| REQ-UR-04 | A drift test fails when `planted.json` differs from what `export_planted.py` would write now. Its message names the command that regenerates the file. | Auto: T01 |

U3 does not change what "detected" means. The numerator stays `1` for a BLOCKED run with a `blocked_element`, as today in `Reports.tsx` and `marketing/Results.tsx`. Making the numerator a measured count of matched barriers is item 25 and 27 work and is not claimed here.

## U5 requirements
Types used below (full definition in `design.md`): `FocusTrailStop`, `focusTrailStops(result)`.

| ID | Requirement | Verified by |
|---|---|---|
| REQ-UR-05 | The pure function `focusTrailStops(result)` takes a `JourneyResult`, `null` or `undefined` and returns `FocusTrailStop[]` in trail order. Each stop has `position` (1-based), `total`, `hint`, `label`, `role`, `name` and `replicaId` (`string` or `null`). It uses only each snapshot's `selector_hint`, `role` and `accessible_name`. It drops `body`. It keeps only the **first** visit to each control (see open item A1). It never reads `bounding_box`, because trail coordinates belong to the real 1280 x 800 bank and the replica has a different size. | Auto: T21, T25, T27 |
| REQ-UR-23 | `focusTrailStops(result)` never throws and prints nothing. It returns `[]` when `result` is `null` or `undefined`, when `focus_trail` is missing or not an array, and when no entry is usable. It skips an entry that is not an object or has no non-empty string `selector_hint`. A `role` that is not a string becomes `null`. An `accessible_name` that is not a string becomes `''`. | Auto: T20 |
| REQ-UR-06 | Each stop maps to a replica control by `selector_hint`: `#recipient` to `pm-recipient`, `#amount` to `pm-amount`, `#reference` to `pm-reference`, `#send-payment` to `pm-send-payment`. A stop with no replica control (skip link, bank navigation, offer, cancel, privacy, any unknown hint) has `replicaId: null`. It is listed in text and never drawn on the replica. | Auto: T22, T23, T26 |
| REQ-UR-13 | Matching is one table in `focusTrail.ts`. A hint matches an id key when it equals the key or ends with it (`#recipient` and `input#recipient` match; `#recipient-hint` does not). This is stricter than the checklist's `includes` (see open item A2). | Auto: T24 |
| REQ-UR-07 | A "Replay focus trail" control, a real `<button type="button">`, steps through the stops. Each press shows exactly one more stop. Enter and Space both work. While a stop is active and has a `replicaId`, that replica control gets a 3px outline and a numbered badge ("3"). A stop with `replicaId: null` draws nothing and is only announced in text. The replay never moves DOM focus, and everything it draws is `aria-hidden` and `pointer-events: none`. The label is "Replay focus trail" when idle or finished and "Next stop" while stepping. After the last stop, one more press shows "Replay finished" and draws nothing. The next press starts again at stop 1. The panel carries the words "Replay of the keyboard path on this drawing". | Auto: T35, T36, T39, T40 |
| REQ-UR-08 | A text line states the active stop in words ("Stop 3 of 9: Amount, text box"). It lives in one `aria-live="polite"` region, updated only on a button press. A text list of all stops is always present. Status is never colour alone. | Auto: T28, T35, T42 |
| REQ-UR-09 | **Broken run:** no badge is drawn on Send Payment because `#send-payment` is not in the trail. The panel says "Tab never landed on Send Payment", and only when the checker's `reason_code` is `TARGET_NOT_FOCUSABLE`. **Fixed run:** a fresh run's mapped stops end `#recipient`, `#amount`, `#reference`, `#send-payment`, in that order. | Auto: T26, T33, T34 |
| REQ-UR-10 | **Calm mode** (`useImmersion().calm`, which already includes reduced motion): the replay button is **not rendered**. There is no timer and no movement. Every mapped stop shows at once as a static numbered badge. The text list is shown. | Auto: T37, E01 (Calm run), T38 |
| REQ-UR-11 | **No run yet** (`result` is `null`, not running): the panel says "Not run yet" and draws nothing. **Run going** (`isRunning`): the panel says "The keyboard path is not ready: the run is still going." and draws nothing. **Finished run with no usable stops** (a voice run has `focus_trail: []`, or the trail is malformed): the panel says "No keyboard trail in this run" and draws nothing. In these three states there is no replay button. It never shows a made-up trail. | Auto: T30, T31, T32 |
| REQ-UR-12 | **Layout. Every item is a measurable pass or fail.** Badge size: at least 28 x 28 CSS px, number text at least 16px (computed). Replay button: at least 44 px tall and 44 px wide. Placement: each badge sits beside its control at the end of the control's row and outside the control's own box. A badge's box intersects none of these boxes: any `label`, any `input`, the Send Payment element, any heading, the ghost, or another badge. The 3px outline on the control itself is not counted. Viewports: 1440 x 900, 1366 x 768, 640 x 900 (200% zoom of 1280) and 390 x 844, each in normal, Calm and high-contrast modes. At 390 px the page has no horizontal scroll (`documentElement.scrollWidth <= 390`) and every badge lies inside the replica card and inside the viewport. If a criterion cannot be met, the task stops and reports; it does not shrink a badge below 28 px or let it overlap. | Auto: E01, E02, E03, E04 |

## Process and scope requirements
| ID | Requirement | Verified by |
|---|---|---|
| REQ-UR-14 | **Commits.** Implementation tasks UR-01, UR-02, UR-03, UR-04 and UR-05 each get one commit that names its task id. **UR-04b is a human walkthrough and gets no commit.** Branch `fix/ui-review`. The owner's checkout, its uncommitted files and every other worktree are never edited, staged, stashed or committed. Work happens only in `.worktrees/ui-review`. | Cmd: C01 (the commit subjects carry the task ids and UR-04b has none). Review: C03 (the reviewer confirms with `git worktree list` that only `.worktrees/ui-review` has commits from this work) |
| REQ-UR-15 | No change to `agent/`, `fixtures/`, `bank/PLANTED.md`, `.kiro/steering/`, `dashboard/src/index.css`, `dashboard/src/types/`, `dashboard/src/pages/app/Possession.tsx`, `dashboard/src/components/PossessionJourney.tsx`, `dashboard/package.json`, or any API or data contract. No new runtime dependency. | Cmd: C01 (path allow-list). Review: C03 |
| REQ-UR-16 | Every measured number in the review record comes from a command run on this branch and is pasted next to the command. Nothing is marked Done by the author. Item 6 stays BUILT_PENDING_REVIEW until an independent reviewer signs off. | Review: C03 reads the record |
| REQ-UR-17 | The replay is its own control and does not drive the checklist. The checklist keeps reading the finished run exactly as today (`stepsFromResult`). No `liveSteps` is passed, and `PossessionJourney.tsx` is not edited. | Auto: T41. Cmd: C01 |
| REQ-UR-18 | The merged Reference field is preserved as is. This work adds no field to the bank page, the replica form, `JourneyConfig` or `POST /runs`. `#reference` appears in the replay only as one more mapped stop. | Cmd: C01. Auto: T22 |
| REQ-UR-19 | `focusTrail.ts` and `FocusTrailReplay.tsx` do not render or read typed Recipient, Amount or Reference **values**: no `runDetails`, `test_details`, `RecordedDetails` or `type_text` and no step `args`. | Auto: T11 |
| REQ-UR-20 | The keyboard-only walkthrough is a separate item, UR-04b. It is **outstanding** until a person performs it with only Tab, Shift+Tab, Enter and Space and writes down what they saw. Automated keyboard tests do not replace it, and the review record must say so. | **Human: H01** |
| REQ-UR-21 | No app code contains the barrier total as a literal. The only place the number appears is the generated `planted.json`, which `export_planted.py` derives from `bank/PLANTED.md`. | Auto: T10 |
| REQ-UR-22 | `FocusTrailReplay` takes exactly two props, `result: JourneyResult | null` and `isRunning: boolean`. It reads Calm mode from `useImmersion().calm` and from nowhere else. There is no `calm` prop and no other prop. `PossessionMode` passes its own `result` and `isRunning`, and gains no new prop. | Auto: T43 (type check through `npm run build`), T37, T38 |

## Out of scope
- Typed Recipient and Amount values (D2).
- Drawing the trail on the real bank page (`fixtures/haunted_bank/index.html`) (D6).
- Live checklist ticking while a run happens (D7).
- Any change to the Reference field or to `POST /runs` (D3, D5).
- `index.css`, `Possession.tsx`, `PossessionJourney.tsx`, `types/index.ts` and `package.json`: this work does not need them.
- Item 25 (axe scanner) and item 27 (benchmark): they would change what "detected" means.

## Open items
Settled by the owner on 24 Nov 2026: D1 to D7. Still unresolved and reported to the owner. Each has a stated default in this spec so the work is testable, and the default is open to change:
| ID | Question | Default in this spec |
|---|---|---|
| A1 | A control visited twice (for example in a focus loop) shows only its first visit. That drops evidence of a loop. Should repeats be listed? | First visit only (REQ-UR-05) |
| A2 | The replay matches whole id tokens. The checklist uses `includes`. The two can disagree on a hint like `#recipient-hint`, which never takes focus today. Should they share one rule? | Replay is stricter, checklist untouched (REQ-UR-13) |
| A3 | In a verified run the green ghost sits beside Send Payment. The Send Payment badge must not touch it. Which side of the row does the badge take? | Not fixed here. UR-03 chooses a slot that meets REQ-UR-12 and reports which |
| A4 | Badges are drawn into the replica card by a portal, which needs one extra `id` on that card (see `design.md`). The other way, holding the stop state inside `PossessionMode`, touches more of that file. Which does the owner prefer? | Portal |
| A5 | The master tracker's row 31 still says NOT_STARTED and the tracker has no line for the Reference approval. Should that be fixed outside this spec? | Not touched here. UR-05 records the approval as pending in the review record only |
Outstanding and not part of the build: Shilpa's written approval of the `reference` field (D5), and the person's keyboard-only walkthrough H01 (REQ-UR-20).
