# Waiting on

Every wait on Shilpa or Charvi, with the plan's "if late" default. Source for defaults: `docs/Sukhdha plan.docx`. Dates are 2026. Updated Fri 20 Nov, 21:42 IST.

| Date opened | Activity | Waiting on | What | Plan's "if late" default | Status |
|---|---|---|---|---|---|
| 19 Nov | 2.1 Exorcist | Sukhada (you) | OK on `.kiro/specs/exorcist/requirements.md` and answers to Q1 to Q7 | None; this is your gate, not the plan's | **Open.** Spec is on `feature/exorcist` (`97d34e2`). Design and code are not started. |
| 19 Nov | 2.1 Exorcist | Shilpa | Approval of the Exorcist requirements, within 12 hours of the PR | Start the design from my own reading | **Open.** Not asked yet; your OK comes first. |
| 19 Nov | 2.1 Exorcist | Charvi | IAM sign-in and Bedrock access for Claude (needed to run the AI Exorcist 5 times) | Start with Playwright and a stubbed / scripted Exorcist; add Bedrock the day access lands. LLM pass rate stays "not measured" until then | **Open.** Still no AWS credentials (`decision-log.md` on `chore/unblock`; earlier eval: credentials not configured). |
| 20 Nov | 0.6 Bank barriers | Reviewer / merge | Open a PR for `feature/bank-payment-barriers` (`Kiro.bank`, tip `fe32f17`, **pushed**) | Merge when green; do not wait to start Exorcist design after your OK | **Open.** Pushed; PR + merge still needed for DoD. |
| 20 Nov | Catch-up C1–C8 | You | Open a PR for `chore/unblock` (`Kiro.unblock`, tip `97e9c8c`, **committed + pushed**) | Take the defaults; paperwork unblocks Definition of done for later PRs | **Open.** On GitHub; PR + merge still needed. PR template, agents, steering, decision-log, cases.yaml, relative hook, Pages workflow removed. |
| 20 Nov | Payment journey | Merge / Fix-Verify-Prevent | Remaining deferred REQ on `feature/payment-journey` (`d494af4`, **pushed**) after bank barriers land | Carry on with bank + Exorcist; sessions/UI stay deferred until Fix/Verify exist | **Open.** Diagnosis and reduced scope on GitHub. |
