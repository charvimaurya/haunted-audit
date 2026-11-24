# Loop evidence: keyboard and voice on the patched copy (plan v5.3 items 2 and 4)

Plan v5.3 item 2 leaves: "replay the voice journey on the same patched copy with its own run ID". Item 4 leaves:
"the two VERIFIED rows with run IDs on the Results page". The approved UI v9 (`design/v9/05-fixes.html`) shows the
same: a voice row in Verification ('Say "click Send Payment"'), "Keyboard and voice" under Journey Verified, and a
voice test line in the Regression Guard.

Measured before writing this (23 Nov, scripted): on the patched copy the keyboard journey is PASSED, and the voice
journey is BLOCKED because "Could not type in Amount: no accessible label" (barrier 2 in `bank/PLANTED.md`; the
scripted Exorcist fixes barrier 1 only). So the screens must show the voice result the checker measures, which is
"Not verified" today. They never show VERIFIED for voice unless the checker says PASSED.

Owner rule (23 Nov): everything on `main`, no branches. O6: `POST /runs` and `GET /runs/{id}` are not changed;
new fields are optional with safe defaults.

## REQ-LE-01 Verify replays keyboard and voice
`POST /fixes/{id}/verify` starts a keyboard run and a voice run on the same patched copy, each with its own run ID.
The response keeps `run_id` (keyboard) and `status`, and adds `voice_run_id`.
The voice commands are fixed in code: `type "Test Recipient" in Recipient`, `type 10.00 in Amount`, `click Send Payment`
(input_source `typed`; a voice-command simulation, no microphone).
**Acceptance:** an API test gets two different run IDs; the voice run's result has `agent_kind: "voice"`; the checker
sets both verdicts.

## REQ-LE-02 Regression replays keyboard and voice
`POST /fixes/{id}/regression` does the same on the copy with the bug put back. The gate is unchanged (keyboard verify PASSED).
**Acceptance:** API test: `regression_voice.run_id` exists and differs from `regression.run_id`.

## REQ-LE-03 Fix record
`GET /fixes/{id}` adds `verify_voice` and `regression_voice` (same shape as `verify`; `null` until started).
`history` keeps its events; the voice run ID is in the `detail` of `verify_started` and `regression_started`.
Existing databases get the two new columns without losing rows.
**Acceptance:** the existing full-flow test passes unchanged; a store opened on an old-schema file keeps its rows.

## REQ-LE-04 Verification panel
Shows a voice row 'Say "click Send Payment"' (mic icon) marked from the voice run, and two evidence rows,
"Keyboard journey" and "Voice-command simulation", each with icon + word (VERIFIED, Not verified, Running, Not run yet),
its run ID, and its agent_mode. When the voice run is not PASSED, the first failed voice step's message is shown.
A large "BLOCKED → VERIFIED" appears only when the original run was BLOCKED and the keyboard Verifier run PASSED.
"Journey Verified" is followed by "Keyboard and voice" only when both PASSED, otherwise "Keyboard only".
**Acceptance:** Vitest: PASSED/BLOCKED/running/null each render the right word; no VERIFIED text without a PASSED verdict; axe clean.

## REQ-LE-05 Regression panel
Adds a voice line from `regression_voice`. "Caught" for voice is said only when the voice Verifier run PASSED and the
voice regression run is BLOCKED. Otherwise: "Voice: not counted, the voice journey was not verified first."
**Acceptance:** Vitest for both cases.

## REQ-LE-06 Results page
Reports shows the same two evidence rows (component `VerifierEvidence`), or "Not run yet" for both.
**Acceptance:** Vitest on Reports with and without a fix.

## Out of scope (decision for the owner)
- Fixing barrier 2 (Amount label) so the voice journey can pass. That is a second finding and a second fix.
- The v9 restyle and button wording ("Replay both journeys", "Put the bug back and run both tests"): items 35 to 41.
