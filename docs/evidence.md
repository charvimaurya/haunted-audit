# Evidence

Measured on the scripted keyboard walker. LLM rows were not executed because Amazon Bedrock credentials were not configured. Re-run `python -m agent.eval.run_eval` to reproduce. Artifacts stay gitignored.

| mode | variant | runs | correct verdicts | avg steps | avg latency ms | avg cost usd | mismatches | reliable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| llm | broken | 0/5 | 0 | n/a | n/a | n/a | 0 | no |
| llm | fixed | 0/5 | 0 | n/a | n/a | n/a | 0 | no |
| scripted | broken | 5/5 | 5 | 18.0 | 897.8 | 0.000000 | 0 | yes |
| scripted | fixed | 5/5 | 5 | 14.0 | 756.2 | 0.000000 | 0 | yes |

Broken verdict: `BLOCKED` / `TARGET_NOT_FOCUSABLE`, blocked element `div.pay-btn`. Fixed verdict: `PASSED`. The checker, not the model, decided both.
