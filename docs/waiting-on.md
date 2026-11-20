# Waiting on

Every wait on Shilpa or Charvi, with the plan's "if late" default. Source for defaults: `docs/Sukhdha plan.docx`. Dates are 2026. Updated Fri 20 Nov.

| Date opened | Activity | Waiting on | What | Plan's "if late" default | Status |
|---|---|---|---|---|---|
| 19 Nov | 2.1 Exorcist | Sukhada (you) | OK on `.kiro/specs/exorcist/requirements.md` and answers to Q1 to Q7 | None; this is your gate, not the plan's | **Open.** Spec is on `feature/exorcist` (GitHub). Design and code are not started. |
| 19 Nov | 2.1 Exorcist | Shilpa | Approval of the Exorcist requirements, within 12 hours of the PR | Start the design from my own reading | **Open.** Not asked yet; your OK comes first. |
| 19 Nov | 2.1 Exorcist | Charvi | IAM sign-in and Bedrock access for Claude (needed to run the AI Exorcist 5 times) | Start with Playwright and a stubbed / scripted Exorcist; add Bedrock the day access lands. LLM pass rate stays "not measured" until then | **Open.** Still no AWS credentials (`decision-log.md` on `chore/unblock`; earlier eval: credentials not configured). |
| 20 Nov | 0.6 Bank barriers | Reviewer / merge | Push and open a PR for `feature/bank-payment-barriers` (`Kiro.bank`, tip `fe32f17`) | Merge when green; do not wait to start Exorcist design after your OK | **Open.** Seven commits local, not pushed. |
| 20 Nov | Catch-up C1–C8 | You | Commit staged `chore/unblock` work (`Kiro.unblock`) and open a PR | Take the defaults; paperwork unblocks Definition of done for later PRs | **Open.** Staged, not committed: PR template, agents, steering, decision-log, cases.yaml, relative hook, Pages workflow removed. |
| 20 Nov | Payment journey | Merge / Fix-Verify-Prevent | Remaining deferred REQ on `feature/payment-journey` after bank barriers land | Carry on with bank + Exorcist; sessions/UI stay deferred until Fix/Verify exist | **Open.** Diagnosis and reduced scope on GitHub (1 commit ahead locally). |
