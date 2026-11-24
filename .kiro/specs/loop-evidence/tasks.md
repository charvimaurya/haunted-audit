# Tasks: loop evidence

All on `main` (owner, 23 Nov). One commit per task, task id in the message.

- [ ] LE-01 Backend: voice replay on the patched and the bug-put-back copies, store columns, fix view fields.
  Satisfies REQ-LE-01 to REQ-LE-03. Verified by: pytest (existing full flow unchanged; new voice flow; old-schema store).
- [ ] LE-02 Dashboard: types, provider, `VerifierEvidence`, Verification and Regression panels, Reports.
  Satisfies REQ-LE-04 to REQ-LE-06. Verified by: Vitest + axe; keyboard walk of Fixes Verify, Regression and Reports.
- [ ] LE-03 Docs: data contract, README, evals case (voice blocked by barrier 2 after the barrier 1 fix), devlog, plan status.
  Verified by: every number in the docs comes from a run in this task.
