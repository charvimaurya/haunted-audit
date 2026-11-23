# No made-up results: requirements (plan item U2)

Approved by the owner on 22 Nov 2026. The audit is in `docs/mock-data-audit.md` (items M1 to M9).

**REQ-NM-01: Example label.**
- A sample value that is still shown sits inside `ExampleLabel`: an icon plus the text "Example only, not a real run".
- A sample never shows a PASS, FAIL, "Verified" or "caught" state, and never a tick or cross icon.

**REQ-NM-02: Not run yet.**
- When the API is up but no run has finished, every result area says "Not run yet" with a neutral icon.
- It shows no tick, cross, "Verified" or "caught".
- Metric tiles keep `--` and "not yet measured" (`product-rules.md`).

**REQ-NM-03: Offline.**
- The dashboard checks `GET /health` when it loads and every 30 seconds.
- While the API does not answer, every result area shows an offline state: an icon plus "Offline: the audit service is not answering, so no result can be shown."

**REQ-NM-04: Real data only.**
- Results come from the API: `JourneyResult` from `GET /runs/{id}`, and steps from `GET /runs/{id}/events` (SSE).
- A pass or fail state appears only when a run has finished, and it shows the run's `agent_mode`.

**REQ-NM-05: Fix pages.**
- Proposed Fix (Exorcist), Verification (Verifier) and Regression show "Not available yet" until those agents and a fix endpoint exist (`data-contract.md`, "Fix: PLANNED").
- The Find panel shows the keyboard checker's finding from the run.

**REQ-NM-06: Kiro page.**
- The Kiro page shows the real hook command and the real `.kiro/` folders.
- Instead of a fake "live" event list, it shows one finding recorded on 22 Nov 2026, with its source file.

**REQ-NM-07: Voice panel.**
- Until the voice runner exists (Phase 3), voice outcomes are a simulation against the keyboard run.
- They carry the Example label and neutral icons only.

**REQ-NM-08: Guard test.**
- A test renders every page with no run, once with the API online and once offline.
- It fails if any pass, fail, Verified, caught or achieved state appears outside an `ExampleLabel`.

**REQ-NM-09: Build check.**
- Sample values live only in `src/samples/`.
- The production build fails if app code imports that folder, and a unit test checks the same.

**REQ-NM-10: No test loosened.** Existing tests stay as they are.
