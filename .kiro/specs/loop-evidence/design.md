# Design: loop evidence

## Backend
- `agent/voice_agent/runner.py`: `run_voice_journey(..., start_url=None)`; passed to `build_journey_config`.
  The route guard already allows `artifacts/verify/`.
- `agent/fixes/store.py`: columns `verify_voice_run_id`, `regression_voice_run_id`. On open, `PRAGMA table_info`
  and `ALTER TABLE ... ADD COLUMN` for any missing one (additive, no row touched). `link_run(fix_id, kind, run_id,
  voice_run_id=None)` writes both and one event (`{kind}_started`, detail `{run_id, voice_run_id}`).
- `agent/api/main.py` `_start_copy_run`: one limiter slot, two run IDs, both inserted as running. One thread runs
  `_execute_run` (limiter `None`), then `_execute_voice_run` on the same copy (limiter `None`), then releases the slot.
  Returns `{run_id, status, voice_run_id}`. `_fix_view` adds `verify_voice`, `regression_voice` via `run_summary`.
- `VOICE_REPLAY` constant holds the three commands.

## Dashboard
- `fixContext.ts`: `verify_voice?`, `regression_voice?` on `Fix`; `voiceVerifyResult` on `FixValue` (optional for old callers).
- `FixProvider.tsx`: when `verify_voice` is complete, read `GET /runs/{id}` once (like `verifyResult`); poll while
  any of the four runs is running.
- `VerifierEvidence.tsx` (new): two rows from `fix.verify`, `fix.verify_voice`. Pure; props typed.
- `FixPanels.tsx`: voice row in the checklist, evidence rows, BLOCKED → VERIFIED line, voice line in regression.
- `Reports.tsx`: renders `VerifierEvidence` under the results. (Reports is not in the files someone else has open.)

## Words
| State | Word | Icon |
|---|---|---|
| complete, PASSED | VERIFIED | green check |
| complete, BLOCKED | Not verified | red cross |
| running | Running | spinner (static in Calm mode via motion-safe) |
| null | Not run yet | dashed circle |
| error | The run failed, so no result is shown | dashed circle |
