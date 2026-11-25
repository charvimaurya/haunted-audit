# Integration: voice grammar fix and voice-to-details, with manual precedence

Integrated directly on `main` by the coordinating Kiro session, 25 Nov 2026, per `team-rules.md`
(build first, review after; a Reviewer report in `docs/pr/` counts instead of a GitHub pull request).

## What this is

Two small, previously uncommitted pieces of work found in the main checkout, corrected before commit:

1. `agent/voice_agent/grammar.py`: `_number_words_to_digits` now reads Chrome speech-to-text quirks like
   "hundred.00" or "fifty.50" as an amount with cents, instead of dropping the cents. Two new
   `test_expand_payment` cases cover it. This does not add, remove, or change the click-to-submit step;
   `expand_payment` still ends every recognised send-money phrase with `click Send Payment` immediately,
   exactly as before. **A spoken-confirmation step before submission (if wanted) is a separate, larger
   decision not made in this change** — flagged for the owner, not implemented here.
2. Voice-to-details: `dashboard/src/voice/detailsFromSteps.ts` (new file) reads a finished or in-progress
   voice run's steps and fills the Test details form (Recipient, Amount, Reference) with what was said,
   wired into `dashboard/src/components/PossessionJourney.tsx`.

## Correction made before integrating (coordinator's check)

The code as found violated two rules the owner set:

- **Only successful voice typing should fill a field.** As found, `detailsFromSteps` read every
  `voice_type` step regardless of outcome, including one that failed on the page (its own doc comment
  said so: "A step that failed on the page still fills its field"). **Fixed**: it now requires
  `s.outcome === 'done'`. The old test (`voice-fills-details.test.ts`) asserted the wrong behaviour
  (a `failed` Amount step was asserted to still fill the field) and has been corrected to assert the
  fixed behaviour, plus a new case for the skip.
- **Manual edits must never be overwritten by streamed events or final records.** As found, the effect
  in `PossessionJourney.tsx` unconditionally called `setDetails({ ...details, ...fill })` on every new
  spoken value, with no check for whether the tester had since typed into that field by hand. **Fixed**:
  added `touchedByHandRef`, a `handleDetailsChange` wrapper that marks a field touched the moment a
  manual `onDetailsChange` call changes its value, and `withoutHandTypedFields` (new, exported from
  `detailsFromSteps.ts`) which drops any spoken field already in that set before it reaches `setDetails`.
  `TestDetailsForm.tsx` itself is unchanged; the interception happens one level up, in `PossessionJourney`.

## Files changed

- `agent/voice_agent/grammar.py`, `agent/tests/test_voice_agent.py`: Chrome decimal-speech fix (as found,
  unmodified beyond what was already written).
- `dashboard/src/voice/detailsFromSteps.ts`: `outcome !== 'done'` guard added; new `withoutHandTypedFields`
  helper.
- `dashboard/src/components/PossessionJourney.tsx`: `touchedByHandRef`, `handleDetailsChange`, and the
  voice-fill effect now filtered through `withoutHandTypedFields`.
- `dashboard/src/test/voice-fills-details.test.ts`: corrected the assertion for a failed step; added a
  case for it; added three new tests for `withoutHandTypedFields`.
- `.kiro/specs/user-typed-test-details/requirements.md`: REQ-TD-01 now states both rules precisely
  (successful steps only; manual edits are never overwritten).

## Tests

- `.venv/bin/python -m pytest -q`: exit 0, full suite passes.
- `cd dashboard && npx vitest run`: 23 files, 166 tests pass (up from 162 before this change: 4 new).
- `cd dashboard && npx tsc --noEmit`: no errors.

## Not done / flagged for the owner

- The voice-payment confirmation step (owner decisions 9 and 10, from an earlier instruction in this
  session) is **not implemented**. The committed spec `REQ-VA-12` for `expand_payment` still says the
  phrase becomes "type Recipient, type Amount, click Send Payment" with no pause for confirmation. This
  integration deliberately does not touch that behaviour; it needs its own spec decision before any code
  changes, per the owner's earlier instruction not to silently resolve that conflict.
- `fix/voice-details-precedence` exists as an empty branch pointer on `origin/main` (no commits of its
  own, same name as this task). Not used or touched by this integration; flagged in case another session
  intended to do this work there.
