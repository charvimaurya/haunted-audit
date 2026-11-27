# Haunted Audit — Evaluation & Benchmark Summary

Generated from `artifacts/eval/results.json` (`2026-11-27T03:40:54.323195+00:00`) and `evals/cases.yaml` (`12` labelled cases across planted Haunted Bank barriers, failure regressions, and clean/variant fixtures).

## Scripted Keyboard Walker (5 runs per variant)

| Mode | Variant | Runs | Correct verdicts | Avg steps | Avg latency (ms) | Avg cost (USD) | Mismatches | Reliable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| scripted | broken | 5/5 | 5 | 20.0 | 10334.1 | 0.000000 | 0 | yes |
| scripted | fixed | 5/5 | 5 | 16.0 | 8618.8 | 0.000000 | 0 | yes |

### Recorded Run IDs

- **Broken (`BLOCKED` / `TARGET_NOT_FOCUSABLE`)**:
  - `2c72f259-4cb0-4a31-8840-9f296022e153`
  - `41a5dc1e-1d6c-452a-968a-790d4a96df94`
  - `47c22bde-f81d-4367-96da-2b008e16677b`
  - `4a86476b-50ad-4249-8436-3af531176721`
  - `bcf7a3bf-61d1-4727-95ae-71a0faef7159`
- **Fixed (`PASSED`)**:
  - `e16c424e-fd1a-4999-9667-972b36c89f70`
  - `fedd6f5f-3e32-4bd2-8642-c865800361c0`
  - `2983f85d-657a-40fd-9e1f-12e114fd1903`
  - `1a3d6d61-3ae8-480c-8bd6-08f52650e4ab`
  - `50b16324-9951-48a1-9210-9dd4dadb605c`

## Ghost Hunter Scanner (`POST /scan` + `backend/scanner/axe_scanner.py`)

- Deterministic verification (`agent/tests/test_ghost_scanner.py`):
  - `broken` variant returns `3` findings matching `bank/PLANTED.md`: `label` (`#amount`), `color-contrast` (`#recipient-hint`), `button-name` (`#cancel`).
  - `fixed` variant returns `0` findings.
  - Public URL scans enforce `agent/api/url_guard.py` (`check_url`) and `1` scan per minute per client IP.

## LLM Mode Status

- **Decision:** `NO-GO` for automated LLM scoring on this environment because Amazon Bedrock credentials were not configured (`0` LLM runs scored). All metrics reflect real local scripted executions only.
