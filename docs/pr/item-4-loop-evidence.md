# Items 2 and 4: keyboard and voice evidence on the patched copy (committed on main, no PR)

Owner rule (23 Nov): everything on `main`, no feature branches, so there is no pull request. This file holds what
the PR template would hold. Spec `.kiro/specs/loop-evidence/`. Commits: `1f063e7` (spec), `06933b3` LE-01,
`774f08b` LE-02, `16fbe46` LE-03, `57d642a` LE-01 review fixes.

> **Correction, 25 Nov 2026.** The voice result below is the state on 24 Nov before the owner's decision, and is
> kept as history. Since commit `724d456` the scripted Exorcist also labels Amount, so on the patched copy the
> voice-command simulation is **PASSED** as well as the keyboard journey, and both are BLOCKED with the bug put
> back. Evidence: `docs/pr/item-2-1-exorcist-closure.md` (keyboard loop walk: keyboard VERIFIED and voice VERIFIED,
> "Keyboard and voice") and `agent/tests/test_loop_evidence.py::test_fail_006_is_fixed_voice_passes_on_the_patched_copy`
> (1 passed, 25 Nov). evals `fail-006` is `resolved`. "No PR" below is also out of date: under
> `.kiro/steering/team-rules.md` this record counts instead of a PR once a Reviewer report is added.

## What changed
- `POST /fixes/{id}/verify` and `/regression` run the keyboard journey, then the voice-command simulation, on the
  same copy of the bank. Each run has its own run ID (`run_id`, `voice_run_id`). One limiter slot for both.
- `GET /fixes/{id}` adds `verify_voice` and `regression_voice`. Old fix databases get two columns (additive).
  `POST /runs` and `GET /runs/{id}` are unchanged (O6).
- Verification panel: voice row 'Say "click Send Payment"', a large BLOCKED → VERIFIED (only from a PASSED Verifier
  run), "Keyboard and voice" or "Keyboard only", and two evidence rows with run IDs and agent_mode.
- Regression panel: a voice line, counted only when the voice journey was verified first.
- Reports: "Verifier evidence (patched copy)" with the same two rows.
- `scripts/keyboard_loop_walk.py`: the whole loop by Tab, Shift+Tab, Enter and Space only.

## Measured result (scripted)
On the patched copy the keyboard journey is PASSED and the voice-command simulation is BLOCKED (NO_ACTIVATION):
"Could not type in Amount: no accessible label". The fix repairs barrier 1 only; barrier 2 (Amount has no label)
still stops a voice user. So the screens say "Keyboard only" and "Voice-command simulation: Not verified".
Recorded as evals `fail-006`. (25 Nov: decided and resolved; see the correction at the top.)

## Tests
| | Before (`305832e`) | After (`57d642a`) |
|---|---|---|
| pytest | 414 passed | 416 passed |
| Dashboard (Vitest) | 117 passed | 129 passed |
| test_loop_evidence.py, 5 runs | did not exist | 5 of 5 |
| Keyboard loop walk, 5 runs | did not exist | 5 of 5, 0 failures (keyboard PASSED, voice BLOCKED each run) |
AI steps: none (no AWS credentials). CI: see the GitHub Actions run for `57d642a`.

## Checks
- Keyboard checked: Possession, Fixes Find, Fix, Verify, Regression and Reports, by `scripts/keyboard_loop_walk.py`
  (every stop has a focus ring, Shift+Tab goes back, no trap). Screenshots `docs/evidence/loop-evidence-*.png`.
- Secrets: diff searched for AKIA, secret, password, .env: nothing.
- `git status --short fixtures/` empty.
- evals: `fail-006` added.

## QA agent report
QA: FAIL on the working tree, PASS on the commits. pytest 416/416. Vitest 128/129 on the working tree: the one
failure (`voice-agent.test.tsx`, GhostHuntSection) came from someone else's uncommitted `GhostHuntSection.tsx`
change, now committed by that session on `wip/dashboard-uncommitted` (`81bc722`) with its own evals case
`fail-007`. On a clean checkout of `main` Vitest is 129/129. test_loop_evidence.py 5 of 5; keyboard loop walk
5 of 5 with 0 failures; REQ-LE-01 to 06 all met.

## Reviewer agent report (accessible-ui-review skill loaded)
No serious issue open. Two minor items, both fixed in `57d642a`:
1. A limiter slot could leak if setup failed before the thread started. Fixed: released on any setup error.
2. If the keyboard run failed hard, the voice run could stay "running". Fixed: it is marked error.
One note left as is: `fix.pop("verify_voice_run_id", None)` has a defensive default.

## Text for Shilpa to approve
- "Say "click Send Payment"" (from v9), "BLOCKED → VERIFIED", "Keyboard and voice", "Keyboard only"
- "Keyboard journey: VERIFIED / Not verified / Running / Not run yet", "Voice-command simulation: ..."
- "Voice: not counted, the voice journey was not verified first."
- "FAILED (voice): Send Payment could not be activated (NO_ACTIVATION)"
- "Verifier evidence (patched copy)" (Reports)
- README: Verify step and "What you should see" step 6.
- Wording question: v9 says "Replay both journeys" and "Put the bug back and run both tests"; plan 5.3 says
  "Summon the Ghost Again". The buttons still say "Verify on a patched copy" and "Put the bug back and check"
  until the v9 items (35 to 41).

## Claims affected
On 24 Nov this said the deck or video must not claim the voice journey is verified after the fix. Since `724d456`
(both barriers fixed in one approved diff) the checker returns PASSED for voice on the patched copy, so that claim
is now allowed, as long as it cites a current run.
