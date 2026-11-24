# Waiting on

Every wait on Shilpa or Charvi, with the plan's "if late" default. Source for defaults: `docs/Sukhdha plan.docx`. Dates are 2026. Updated Sun 22 Nov.

| Date opened | Activity | Waiting on | What | Plan's "if late" default | Status |
|---|---|---|---|---|---|
| 19 Nov | 2.1 Exorcist | Sukhada (you) | OK on `.kiro/specs/exorcist/requirements.md` and answers to Q1 to Q7 | None; this is your gate, not the plan's | **Open.** Spec is on `feature/exorcist` (`97d34e2`). Design and code are not started. |
| 19 Nov | 2.1 Exorcist | Shilpa | Approval of the Exorcist requirements, within 12 hours of the PR | Start the design from my own reading | **Open.** Not asked yet; your OK comes first. |
| 19 Nov | 2.1 Exorcist | Charvi | IAM sign-in and Bedrock access for Claude (needed to run the AI Exorcist 5 times) | Start with Playwright and a stubbed / scripted Exorcist; add Bedrock the day access lands. LLM pass rate stays "not measured" until then | **Open.** Still no AWS credentials (`decision-log.md` on `chore/unblock`; earlier eval: credentials not configured). |
| 20 Nov | 0.6 Bank barriers | Reviewer / merge | PR for `feature/bank-payment-barriers` | Merge when green | **Closed 22 Nov.** PR #5 merged after the reviewer's contrast fix. |
| 20 Nov | Catch-up C1–C8 | You | PR for `chore/unblock` | Take the defaults | **Closed 22 Nov.** PR #3 merged; `pages.yml` removal explained in `docs/decision-log.md`. |
| 20 Nov | Payment journey | Merge / Fix-Verify-Prevent | Remaining deferred REQ on `feature/payment-journey` (`d494af4`, **pushed**) after bank barriers land | Carry on with bank + Exorcist; sessions/UI stay deferred until Fix/Verify exist | **Open.** Diagnosis and reduced scope on GitHub. |
| 22 Nov | 18 MCP server | Exorcist spec and code | `exorcise_page(finding_id)` tool in `backend/mcp_server.py` | Ship `scan_page` only; add `exorcise_page` the day the Exorcist exists | **Open.** Blocked by the Exorcist (`.kiro/specs/exorcist/requirements.md` has requirements only, no design, no code). |
| 22 Nov | 29 Skills | Exorcist and journey-test writer | Verify `exorcise-fix` and `journey-test-writer` skills | Keep them written but marked unverified and unclaimed | **Open.** Neither agent exists. |
| 22 Nov | Phase B | You | Install `kiro-cli` and run the `qa` and `reviewer` agents on one merged PR | Reviews ran as a Kiro sub-agent following `reviewer.md`; labelled in every PR | **Open.** `kiro-cli` is not installed on this machine. |
| 24 Nov | Items 2 and 4 | Sukhada (you) | Should the Exorcist also propose the Amount label fix (barrier 2), so the voice journey can pass on the patched copy? | Keep one fix for barrier 1; screens say "Keyboard only" and the voice row "Not verified" (evals fail-006) | **Open.** |
| 24 Nov | Items 2 and 4 | Shilpa | Approve the new screen text (docs/pr/item-4-loop-evidence.md, "Text for Shilpa") and the v9 button wording question | Ship the text as built | **Open.** |
