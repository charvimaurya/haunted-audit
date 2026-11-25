# Tasks: UI review, U3 and U5 (branch fix/ui-review)

Nothing below is started. The owner settled D1 to D7 on 24 Nov 2026. The spec is **uncommitted**. UR-01 starts only after the owner reviews the final spec diff and says to commit it.

**Commits.** Implementation tasks UR-01, UR-02, UR-03, UR-04 and UR-05 each get one commit that names the task id. **UR-04b is a human walkthrough and gets no commit.** When a person does it, they write what they saw into the review record (`docs/pr/item-6-ui-review.md`); that edit is a later commit by that person or the owner, not a UR-04b commit.

Requirement ids, test ids and file names match `requirements.md` and `design.md`.

- [ ] UR-01 **U3, planted total.** `scripts/export_planted.py`, `dashboard/src/generated/planted.json`, `dashboard/src/lib/planted.ts`, `barriersTotal` prop on `ResultsSection`, one-line wiring in `Reports.tsx` and `marketing/Results.tsx`. Requirements: REQ-UR-01, REQ-UR-02, REQ-UR-03, REQ-UR-04, REQ-UR-21. Verified by: T01 to T10. Files of tests: `tests/unit/test_export_planted.py`, `dashboard/src/test/planted-total.test.tsx`, `dashboard/src/test/ui-review-guards.test.ts`. Also: `npm run build`.
- [ ] UR-02 **U5, trail logic.** `dashboard/src/lib/focusTrail.ts`: `focusTrailStops(result)`, `describeStop`, `STOP_TABLE`. Requirements: REQ-UR-05, REQ-UR-06, REQ-UR-13, REQ-UR-23 (and REQ-UR-19 for this file). Verified by: T20 to T28 in `dashboard/src/test/focus-trail.test.ts`, and T11 for `focusTrail.ts`.
- [ ] UR-03 **U5, replay component.** `dashboard/src/components/FocusTrailReplay.tsx` with props `result` and `isRunning` only; the four small edits in `PossessionMode.tsx`. Requirements: REQ-UR-07, REQ-UR-08, REQ-UR-09, REQ-UR-10, REQ-UR-11, REQ-UR-17, REQ-UR-18, REQ-UR-19, REQ-UR-22. Verified by: T30 to T43 in `dashboard/src/test/focus-trail-replay.test.tsx`, and T11 extended to `FocusTrailReplay.tsx`.
- [ ] UR-04 **Browser checks.** `dashboard/e2e/focus-trail.e2e.ts` with the measurable layout criteria in three modes at four viewports. Requirements: REQ-UR-12 and the browser side of REQ-UR-10. Verified by: E01 to E04 through `npm run test:e2e:api`. If the real API cannot run, the result is recorded as not run, not simulated. If a criterion fails, the task stops and reports.
- [ ] UR-04b **Human keyboard-only walkthrough. No commit.** Requirement: REQ-UR-20. Verified by: H01, by a person who is not the author. **Outstanding.** Nothing in UR-01 to UR-04 closes it, and no automated keyboard test counts as H01.
- [ ] UR-05 **Paperwork.** `docs/devlog.md` line, `docs/pr/item-6-ui-review.md` with the commands C01 and C02 and their output, the Reviewer agent run C03, the item 6 row in `docs/completion/MASTER_TASK_TRACKER.md`, and a plain line that Shilpa's written approval of the `reference` field on `POST /runs` is **pending** (D5). The record lists UR-04b as outstanding if no person has done it. Requirements: REQ-UR-14, REQ-UR-15, REQ-UR-16, REQ-UR-18, REQ-UR-20. Item 6 stays BUILT_PENDING_REVIEW until an independent reviewer signs off. Nothing is marked Done.

## Requirement to task map
| Requirement | Task | Verified by |
|---|---|---|
| REQ-UR-01, REQ-UR-02, REQ-UR-03, REQ-UR-04, REQ-UR-21 | UR-01 | T01 to T10 |
| REQ-UR-05, REQ-UR-06, REQ-UR-13, REQ-UR-23 | UR-02 | T20 to T28, T11 |
| REQ-UR-07, REQ-UR-08, REQ-UR-09, REQ-UR-10, REQ-UR-11, REQ-UR-22 | UR-03 | T30 to T43 |
| REQ-UR-17, REQ-UR-18, REQ-UR-19 | UR-03 | T41, T22, T11, C01 |
| REQ-UR-12 | UR-04 | E01 to E04 |
| REQ-UR-10 (browser side) | UR-04 | E01 |
| REQ-UR-20 | UR-04b | H01 (human) |
| REQ-UR-14, REQ-UR-15, REQ-UR-16 | UR-05 | C01, C02, C03 |

## Order and dependencies
- UR-01 and UR-02 are independent.
- UR-03 needs UR-02.
- UR-04 needs UR-03 and a real API for the browser run.
- UR-04b needs UR-03 and a person.
- UR-05 is last. It records UR-04b as outstanding if it has not happened.
- UR-03 is the only task that edits `PossessionMode.tsx`.
