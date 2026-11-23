# Exorcist, Verifier and regression check: design

## Files

| File | What |
|---|---|
| `agent/fixes/diffcheck.py` | REQ-X-05: parse one unified diff, locate hunks by exact context, apply to a copy, count changed lines, check nothing removed; SHA-256 |
| `agent/fixes/exorcist.py` | REQ-X-14 scripted rule; REQ-X-13 llm mode (credential check; fails honestly without AWS) |
| `agent/fixes/store.py` | REQ-X-12 `fixes` and append-only `fix_events` tables in the same SQLite file |
| `agent/fixes/verifier.py` | writes the patched copy (and the bug-reintroduced copy) under `artifacts/verify/<fix_id>/`, runs the scripted keyboard walker on it |
| `agent/api/main.py` | `POST /runs/{id}/fixes`, `GET /fixes/{id}`, `POST /fixes/{id}/approve`, `/reject`, `/verify`, `/regression` |
| `prompts/exorcist.md` | REQ-X-04 prompt and rules for the llm mode |
| `dashboard/src/fixes/` | fix state for the Fix pages |

## Decisions

- **"No feature removed"** (REQ-X-05.4). Every element `id` before the patch must still be in the file. Every function an inline handler calls (for example `submitPayment` in `onclick="window.submitPayment()"`) must still be named in the file. The handler attribute itself may go: the planted fix replaces an `onclick` div with a real submit button, and the form's submit listener still calls `submitPayment`.
- **The scripted fix is 2 changed lines** (1 removed, 1 added). The plan's "3 to 5 line fix" is a target, not a minimum. The QA report states the real number.
- **Verifier.** Approve changes no tracked file (REQ-X-08). Verify copies `fixtures/haunted_bank/index.html` to `artifacts/verify/<fix_id>/patched.html` (git-ignored), applies the stored diff, and runs the scripted keyboard walker on `?variant=broken`. The checker decides. The browser route guard also allows `artifacts/verify/` (our own copies of the bank).
- **Regression check.** It reverse-applies the same diff to the patched copy (bytes equal to the original), writes `reintroduced.html` and runs the walker again. "Caught" means the checker returns BLOCKED there. It runs only after a PASSED verify.
- **Fix record:** `status` stays one of `proposed`, `approved`, `rejected`, `exorcist_failed`. `verify` and `regression` are separate objects `{run_id, status, verdict, reason_code}` read from the runs table.
- **llm mode:** no AWS credentials exist, so it ends as `exorcist_failed` with the credential error. Calling Bedrock is not built or tested; it waits for access.
