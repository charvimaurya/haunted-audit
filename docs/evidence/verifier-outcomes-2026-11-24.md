# Verifier outcomes and Exorcist QA, measured 2026-11-24 (commit 047dacb, macOS, scripted)

Plan v5.3 items 1 and 2. Commands: `.venv/bin/python scripts/qa_verifier_outcomes.py` (5 times) and `.venv/bin/python scripts/qa_exorcist.py --runs 5`.

## Verifier outcomes, run 1 of 5

| case | expected | measured | as expected |
| --- | --- | --- | --- |
| correct fix (Scripted repair demonstration) | VERIFIED | before BLOCKED/TARGET_NOT_FOCUSABLE, after PASSED | yes |
| comment-only patch | STILL_BLOCKED | diff gate accepted it; checker BLOCKED/TARGET_NOT_FOCUSABLE | yes |
| stale patch | PATCH_DOES_NOT_APPLY | diff gate refused it: A hunk's context was not found in the file. | yes |
| already-fixed page (variant=fixed) | NOT_REPRODUCED | checker PASSED, reason_code None; the API refuses a fix with NOTHING_TO_FIX | yes |
| patched copy, mouse click | payment confirmed | confirmation shown | yes |

agent_mode: scripted (walker), exorcist_mode: scripted. fixtures/haunted_bank unchanged: yes

## Verifier outcomes, run 2 of 5

| case | expected | measured | as expected |
| --- | --- | --- | --- |
| correct fix (Scripted repair demonstration) | VERIFIED | before BLOCKED/TARGET_NOT_FOCUSABLE, after PASSED | yes |
| comment-only patch | STILL_BLOCKED | diff gate accepted it; checker BLOCKED/TARGET_NOT_FOCUSABLE | yes |
| stale patch | PATCH_DOES_NOT_APPLY | diff gate refused it: A hunk's context was not found in the file. | yes |
| already-fixed page (variant=fixed) | NOT_REPRODUCED | checker PASSED, reason_code None; the API refuses a fix with NOTHING_TO_FIX | yes |
| patched copy, mouse click | payment confirmed | confirmation shown | yes |

agent_mode: scripted (walker), exorcist_mode: scripted. fixtures/haunted_bank unchanged: yes

## Verifier outcomes, run 3 of 5

| case | expected | measured | as expected |
| --- | --- | --- | --- |
| correct fix (Scripted repair demonstration) | VERIFIED | before BLOCKED/TARGET_NOT_FOCUSABLE, after PASSED | yes |
| comment-only patch | STILL_BLOCKED | diff gate accepted it; checker BLOCKED/TARGET_NOT_FOCUSABLE | yes |
| stale patch | PATCH_DOES_NOT_APPLY | diff gate refused it: A hunk's context was not found in the file. | yes |
| already-fixed page (variant=fixed) | NOT_REPRODUCED | checker PASSED, reason_code None; the API refuses a fix with NOTHING_TO_FIX | yes |
| patched copy, mouse click | payment confirmed | confirmation shown | yes |

agent_mode: scripted (walker), exorcist_mode: scripted. fixtures/haunted_bank unchanged: yes

## Verifier outcomes, run 4 of 5

| case | expected | measured | as expected |
| --- | --- | --- | --- |
| correct fix (Scripted repair demonstration) | VERIFIED | before BLOCKED/TARGET_NOT_FOCUSABLE, after PASSED | yes |
| comment-only patch | STILL_BLOCKED | diff gate accepted it; checker BLOCKED/TARGET_NOT_FOCUSABLE | yes |
| stale patch | PATCH_DOES_NOT_APPLY | diff gate refused it: A hunk's context was not found in the file. | yes |
| already-fixed page (variant=fixed) | NOT_REPRODUCED | checker PASSED, reason_code None; the API refuses a fix with NOTHING_TO_FIX | yes |
| patched copy, mouse click | payment confirmed | confirmation shown | yes |

agent_mode: scripted (walker), exorcist_mode: scripted. fixtures/haunted_bank unchanged: yes

## Verifier outcomes, run 5 of 5

| case | expected | measured | as expected |
| --- | --- | --- | --- |
| correct fix (Scripted repair demonstration) | VERIFIED | before BLOCKED/TARGET_NOT_FOCUSABLE, after PASSED | yes |
| comment-only patch | STILL_BLOCKED | diff gate accepted it; checker BLOCKED/TARGET_NOT_FOCUSABLE | yes |
| stale patch | PATCH_DOES_NOT_APPLY | diff gate refused it: A hunk's context was not found in the file. | yes |
| already-fixed page (variant=fixed) | NOT_REPRODUCED | checker PASSED, reason_code None; the API refuses a fix with NOTHING_TO_FIX | yes |
| patched copy, mouse click | payment confirmed | confirmation shown | yes |

agent_mode: scripted (walker), exorcist_mode: scripted. fixtures/haunted_bank unchanged: yes

**Verifier outcomes: 5 of 5 runs had every row as expected.**

## Exorcist, 5 runs per mode

| exorcist_mode | runs | valid diffs | changed lines | verified (checker PASSED on patched copy) | caught (checker BLOCKED with bug put back) | tokens | cost usd | avg latency ms | passes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| scripted | 5 | 5 | [2] | 5 | 5 | [(0, 0)] | [0.0] | 3.1 | yes |
| llm | 5 | not run: AWS credentials could not be read: The config profile (haunted-audit) could not be found | -- | -- | -- | -- | -- | -- | not run |
