# Final integration on `main`, 25 Nov 2026

Integration coordinator: Kiro session `sess_ad2d6780`, on the owner's instruction to consolidate all completed work
directly on `main` (no feature branches, no squash, no force-push, no history rewrite).
Base on GitHub before this work: `ab6fdac`. Every local branch is now an ancestor of `main`.

## What came in

| Source | How | Notes |
|---|---|---|
| `chore/rest-of-work` (`7921c76`, `9976734`) | already merged by another session | fail-006 then corrected forward in `2f18357` |
| Voice grammar fix (`f154693`), Home hero pause (`8b55b00`), manual Verify (`f39d344`) | committed by session `f547bf3c` | kept as committed |
| Coordinator corrections | `2f18357`..`ac37f44` | fail-006, tracker, item-4 evidence, v9 labels, decision log, deprecation, README, Devpost source, claims audit |
| `fix/ui-review` (`d6fd525`) | merged by another session | spec files only; implementation still waits for the owner's approval |
| `feature/ui-v9-fixes` (`e001148`, `a3b7af7`) | merged | v9 Fixes screen; its tests are the single guard for the v9 labels and white ghost |
| `fix/voice-details-precedence` (`87734cd`) | merge started by another session, finished here | one voice-to-details implementation (see the merge message) |

## Measured results

Code commit `ff682bf` (later commits add docs, PNGs, the hero button size and the Devpost hosting wording):

| Check | Result |
|---|---|
| `.venv/bin/python -m pytest -q` | 506 passed, 0 failed |
| `cd dashboard && npx vitest run` | 26 files, 183 passed |
| `npx tsc -b --noEmit`, `npm run build`, `npm run lint` | clean; build ok; 0 lint errors (2 existing warnings in `VerifierEvidence.tsx`) |
| `npx playwright test` (re-run after the hero button fix) | 8 passed: axe finds no WCAG 2.2 AA violation on any of the **20 pages** (normal, Calm, high contrast); H1 and primary button never covered at 1280 and 1440 px |
| `scripts/keyboard_walk.py` (after the hero button fix) | **pages failing: 0 of 20**; every stop has visible focus |
| `scripts/keyboard_loop_walk.py` (API and dashboard on spare ports, temp DB) | 0 failures. Uses "Replay both journeys" and "Put the bug back and run both tests". Keyboard and voice VERIFIED on the patched copy (API: keyboard PASSED, voice PASSED); both FAILED with the bug put back |
| `test_fail_006_is_fixed_voice_passes_on_the_patched_copy` | 1 passed |
| `python -m agent.fixes.regression_guard --runs 5` | `GUARD_WORKS 5 of 5` |
| `scripts/smoke_container.sh` on a fresh amd64 image of `a3b7af7` | passed: `/ping` ok; broken BLOCKED / TARGET_NOT_FOCUSABLE; fixed PASSED. cgroup `memory.peak` 933.77 MiB for the whole run; docker stats peak 805.10 MiB. No container left |

Not run: LLM mode, the LLM Exorcist and anything on AWS (no credentials; LLM mode stays off). No deployment
exists. The real-speech voice test (owner speaking in Chrome) was not run.

## Independent review

Reviewer agent (read-only, different model), range `ab6fdac..a3b7af7`. Verdict before fixes:
**Serious issues open: 1.**

| # | Severity | Finding | Disposition |
|---|---|---|---|
| 4 | serious | `docs/devpost.md` states "0 axe issues on 20 pages" and "0 of 20 pages failing a keyboard-only walk"; the evidence file was missing | **Fixed**: both re-measured after the last UI change (table above; 20 pages counted with the test's own rule over `src/routes.ts`) and recorded in this file |
| 1 | minor | Hero pause button used `text-sm` (14px), below the 16px rule | **Fixed**: `text-base`; hero tests 5 passed; axe, overlap and keyboard walk re-run |
| 2 | minor | Three documents cite this file, which did not exist | **Fixed**: this file |
| 6 | minor | Devpost hosting line reads as fact; nothing is deployed | **Fixed**: uses the "ready for ECS Express Mode" wording; the deployed wording is kept in a comment |
| 3 | minor | `fix-panels.test.tsx` and `ui-v9-fixes.test.tsx` both check that Verify waits for a press | Kept: one asserts no API call before the press, the other the v9 screen; harmless overlap |
| 5 | minor | Devpost bracket placeholders remain | Kept: the draft's own rule is to fill them from a real run or delete them before submission |

Not Done: nothing in this integration is marked Done. Items 1 to 5 are Built, not Done; item 12 and PR #17 wait
for their review; the Reference field waits for Shilpa's written approval.

**Re-review** of the fixes (`dd11fd2`, `fde2af2`), Reviewer agent, read-only: all four fixed findings resolved;
every number in this file traced to its log; the 20-page count matches `routes.ts` and `axe-pages.e2e.ts`.
Verdict: **No serious issue open.**
