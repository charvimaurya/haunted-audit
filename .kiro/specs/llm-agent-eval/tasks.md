# LLM agent eval - Tasks

Order: setup -> preflight -> reporting -> dry check -> scored run -> publish -> NO-GO edits.

### TASK-01 AWS setup (you)
**Satisfies:** REQ-ENV-01, REQ-ENV-02, REQ-ENV-04
Install the AWS CLI v2 (optional but easiest), create profile `haunted-audit` (region `us-east-1`), enable Bedrock access to the Claude model. Exact steps are in the reply that accompanies this spec and in design section 3.
**Done when:** `aws sts get-caller-identity --profile haunted-audit` prints an account id. `.env` holds no keys.

### TASK-02 Preflight module
**Satisfies:** REQ-PRE-01, REQ-PRE-02, REQ-PRE-03, REQ-ENV-04, REQ-TEST-01
Write `agent/eval/preflight.py` and tests with a stubbed boto3 client for each row in design section 3.
**Done when:** unit tests pass for no profile, expired token, access denied, model not found, success.

### TASK-03 Error classification and cost guard
**Satisfies:** REQ-SCORE-02, REQ-SCORE-03, REQ-RUN-04, REQ-TEST-02
Add `setup_error`, "not run" handling, `INCOMPLETE` status and `--max-cost-usd` to `run_eval.py`.
**Done when:** tests show a pre-step error is "not run", a mid-run error is incorrect, fewer than 5 LLM runs gives `INCOMPLETE`.

### TASK-04 Report fields and per-run table
**Satisfies:** REQ-REC-01 to REQ-REC-04, REQ-OUT-01, REQ-PRE-04, REQ-TEST-03
Add run fields, commit hash, dirty flag, date, model, settings, totals and per-run rows to `results.json` and `results.md`.
**Done when:** a unit test builds a report from fake `JourneyResult` objects (test data only) and totals equal the row sums.

### TASK-05 Publish script
**Satisfies:** REQ-OUT-02, REQ-OUT-03
Write `agent/eval/publish.py` that turns `results.json` into `docs/eval.md` and refuses `NOT RUN`, `INCOMPLETE` or dirty trees.
**Done when:** refusal cases are tested.

### TASK-06 Commit tasks 02 to 05
Commit the code changes first so the scored run is on a clean tree (REQ-PRE-04). This needs your approval.

### TASK-07 Preflight against AWS
**Satisfies:** REQ-PRE-01, REQ-PRE-02
Run the preflight alone. If it stops, fix the one item it names and run it again.
**Done when:** it prints account id, principal type, and a successful 5-token Converse call with its token count.

### TASK-08 Scored run
**Satisfies:** REQ-RUN-01 to REQ-RUN-03, REQ-ENV-03
`python -m agent.eval.run_eval --modes llm,scripted --runs 5` (step limit 25, timeout 90 seconds, temperature 0.1).
**Done when:** 20 runs executed or the cost guard stopped it (then status is `INCOMPLETE`); `artifacts/eval/results.md` exists.

### TASK-09 Publish and decide
**Satisfies:** REQ-OUT-02, REQ-OUT-03, REQ-SCORE-01
`python -m agent.eval.publish`; read the final sentence.
**Done when:** `docs/eval.md` has date, commit hash, tables, total cost and the GO or NO-GO sentence.

### TASK-10 If NO-GO: honest labels
**Satisfies:** REQ-NOGO-01 to REQ-NOGO-03
Edit README, dashboard labels and the deck notes section. If GO: skip (REQ-NOGO-04).
**Done when:** `grep -i "LLM keyboard agent"` in README and dashboard shows no claim that the demo agent is the LLM; dashboard tests pass.

### TASK-11 Report
Tell you the result, the cost of the whole eval (measured tokens times rate card), and anything that did not run.
