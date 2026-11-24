# Evidence

Measured on the scripted keyboard walker. LLM rows were not executed because Amazon Bedrock credentials were not configured. Re-run `python -m agent.eval.run_eval` to reproduce. Artifacts stay gitignored.

| mode | variant | runs | correct verdicts | avg steps | avg latency ms | avg cost usd | mismatches | reliable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| llm | broken | 0/5 | 0 | n/a | n/a | n/a | 0 | no |
| llm | fixed | 0/5 | 0 | n/a | n/a | n/a | 0 | no |
| scripted | broken | 5/5 | 5 | 19.0 | 921.1 | 0.000000 | 0 | yes |
| scripted | fixed | 5/5 | 5 | 15.0 | 771.7 | 0.000000 | 0 | yes |

Scripted rows re-measured on 24 Nov 2026 (`artifacts/eval/results.json`, generated 2026-11-24T09:05:53Z) after the bank gained the optional Reference field (user-typed-test-details). The field adds one tab stop, so each run takes one more step. The voice eval on the same day: broken 5 of 5, fixed 5 of 5.

Broken verdict: `BLOCKED` / `TARGET_NOT_FOCUSABLE`, blocked element `div.pay-btn`. Fixed verdict: `PASSED`. The checker, not the model, decided both.
