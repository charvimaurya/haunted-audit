# Fix, Verify, Prevent - Tasks

Order as requested: Impact rules -> evidence log -> Exorcist -> approval endpoints -> Verifier -> test generator -> regression guard -> API/SSE -> tests. Tests are written with each task; TASK-09 collects the cross-cutting ones.

### TASK-01 Impact rules
**Satisfies:** REQ-IMP-01 to REQ-IMP-06, REQ-TEST-01
1. Add `journey_id` (default `send-payment`) to `JourneyConfig` and `JourneyResult`; `build_journey_config` passes it through.
2. Write `agent/fixing/models.py` and `impact.py`: rule table, WCAG table, `inconclusive` handling, explanation prompt, template fallback.
**Verified by:** Hypothesis tests: critical for payment barrier runs, deterministic, never critical for PASSED, `STEP_LIMIT`, `TIMEOUT`; unit test that the explanation call cannot change severity (stubbed model returns "low" and the stored value stays `critical`).

### TASK-02 Evidence log
**Satisfies:** REQ-LOG-01 to REQ-LOG-03
Write `agent/fixing/store.py` with `FixStore` (`fixes`, `fix_events`), status transition guard, JSON columns, and `get`, `list`, `create`, `update_fields`, `record_event`.
**Verified by:** unit tests on a temp DB: illegal transitions rejected; unmeasured fields stay `null`; no delete method exists.

### TASK-03 Patch engine
**Satisfies:** REQ-EXO-04, REQ-VER-03, REQ-TEST-02
Write `agent/fixing/patching.py`: parse, validate, canonicalise, hash, apply (all or nothing), reverse.
**Verified by:** Hypothesis properties from design 13; fixed bad-diff examples (`..` path, absolute path, create, delete, rename, ambiguous context, over the line limit).

### TASK-04 Exorcist
**Satisfies:** REQ-EXO-01 to REQ-EXO-07, REQ-TEST-07
Write `agent/fixing/exorcist.py` (Strands agent, no tools, JSON output, retry loop with validation errors, usage extraction) and `pipeline.create_fix(run_id)` up to status `proposed`.
**Verified by:** stubbed-agent tests: valid output stored with canonical diff and hash; invalid output retried twice then `exorcist_failed`; `tools == []`; missing credentials -> `exorcist_failed`, no diff. One manual real call after AWS setup, recorded in the fix row.

### TASK-05 Approval
**Satisfies:** REQ-APR-01 to REQ-APR-06, REQ-TEST-06
Implement `FixStore.decide` and the approve/reject API handlers (router file created here with these two endpoints and `GET /fixes`, `GET /fixes/{id}`).
**Verified by:** `TestClient` tests: wrong hash 422; second decision 409; reject keeps the record and allows a new exorcise for the same run.

### TASK-06 Verifier
**Satisfies:** REQ-VER-01 to REQ-VER-07, REQ-TEST-03, REQ-TEST-05
Write `agent/fixing/verifier.py` with temp copies, before and after runs (scripted), result codes, cleanup, tree-hash check.
**Verified by:** real Playwright tests: the correct fix gives `VERIFIED` (before `BLOCKED/TARGET_NOT_FOCUSABLE`, after `PASSED`); comment-only patch gives `STILL_BLOCKED`; stale context gives `PATCH_DOES_NOT_APPLY`; an already-fixed variant gives `NOT_REPRODUCED`; fixture tree hash and `git status` unchanged.

### TASK-07 Journey test generator
**Satisfies:** REQ-GEN-01 to REQ-GEN-06, REQ-TEST-04
1. Add `tests/journeys/package.json` (pinned `@playwright/test`) and `playwright.config.ts`; document `npx playwright install chromium`.
2. Write `testgen.py`: template, byte-stable output, worktree branch writer (two commits), `TEST_FILE_EXISTS`, switch `HAUNTED_AUDIT_TEST_BRANCHES`, fallback to `artifacts/fixes/{id}/`.
3. Prove step: run the test against unpatched and patched copies.
**Verified by:** snapshot test (same record -> same bytes); integration test: fails on unpatched `broken`, passes on unpatched `fixed`, passes on patched copy; the branch has exactly two commits and the main working tree and current branch are unchanged.

### TASK-08 Regression guard
**Satisfies:** REQ-REG-01 to REQ-REG-05, REQ-TEST-08
Write `agent/fixing/regression.py` and the CLI `python -m agent.fixing.regression`.
**Verified by:** integration test gives `GUARD_WORKS` (PASS, FAIL, PASS) with real output stored; a replaced always-pass test gives `GUARD_BROKEN`; no `verified` fix gives `NO_VERIFIED_FIX`.

### TASK-09 API and SSE
**Satisfies:** REQ-API-01 to REQ-API-05
1. Include the router in `main.py`; add `POST /runs/{id}/exorcise`, `POST /fixes/{id}/verify`, `POST /regression/demo`, `GET /fixes/{id}/events`.
2. Generalise `_event_stream` and `events_after` to a stream id (`fix:{id}`); add the job lock and `BUSY`.
3. Emit the phase events listed in REQ-API-02.
4. Update the contract table in `.kiro/specs/product-shell-ia/design.md` (section 8.2) to `approve` and `reject`.
**Verified by:** `TestClient` flow with a stubbed Exorcist: exorcise -> proposed -> approve -> verify -> verified -> test_proven -> regression demo; SSE yields the phases in order; unknown ids 404; error bodies match REQ-API-03.

### TASK-10 End-to-end and docs
**Satisfies:** REQ-LOG-03, REQ-TEST-05
1. Full pytest run (unit + integration), including a "live code unchanged" check around the whole flow.
2. README section "Fix, verify, prevent": the endpoints, the Node setup, the review branch, and the note that Bedrock is required for the Exorcist only.
3. Add the one-line steering clarification from design 10 **only if you confirm D1**.
**Verified by:** a documented command sequence that a new reader can run; every number printed comes from stored run records.

## Open questions (answer before TASK-04 and TASK-07)
1. D1: OK to clarify the Information Barrier for post-verdict agents?
2. D3: OK that the review branch holds both the approved patch and the test, and may be switched off?
3. D6: do you want a labelled `scripted` Exorcist as a demo fallback if Bedrock access is not ready?
