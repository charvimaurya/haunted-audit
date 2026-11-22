---
name: exorcise-fix
description: "UNVERIFIED: needs the Exorcist and journey-test writer to be verified. Draft a minimal code fix for one Haunted Audit finding (a ghost) as a unified diff for a person to approve. Use only when asked to propose a fix for a specific finding_id or blocked element."
metadata:
  project: haunted-audit
  status: unverified
  needs: Exorcist agent (.kiro/specs/exorcist/), journey-test writer
---

# Exorcise fix (unverified draft)

**Status: needs the Exorcist and journey-test writer to be verified.** Neither exists yet. Do not claim this skill has fixed anything, and do not count it as used in any report.

## Rules

1. Fix one finding at a time: the one named by `finding_id` or by the checker's `blocked_element`.
2. Output a unified diff only, plus one sentence on the cause. Never apply it. A person approves or rejects.
3. Change the fewest lines that remove the barrier. No restyling, no refactor.
4. Prefer the native element: a real `<button>`, a real `<label for>`.
5. Say how the fix will be checked: the checker must return `PASSED` on the patched page, and the regression test must fail when the bug is put back.

## Example from this repo (bank barrier 1)

Cause: Send Payment is a `div` with a click handler, so the keyboard cannot reach it.

```diff
- <div class="pay-btn" id="send-payment" onclick="window.submitPayment()">Send Payment</div>
+ <button type="submit" class="btn-primary" id="send-payment">Send Payment</button>
```

This matches the reference fixed page (`fixtures/haunted_bank/index.html?variant=fixed`). It has not been produced by an Exorcist agent.

## Example from this repo (bank barrier 2)

Cause: the Amount field's text is a `span`, not a `label`.

```diff
- <span class="field-title">Amount (EUR)</span>
+ <label class="field-title" for="amount">Amount (EUR)</label>
```
