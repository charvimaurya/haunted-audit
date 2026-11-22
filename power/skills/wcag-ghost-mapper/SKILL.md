---
name: wcag-ghost-mapper
description: Explain an accessibility finding (a "ghost") in plain English. Maps a finding from scan_page, the scan-on-save hook, axe, or the keyboard checker to its WCAG success criteria, a severity, and one line on who it blocks. Use when asked to explain this finding, what WCAG rule a ghost breaks, how bad a barrier is, or what a reason_code means.
metadata:
  project: haunted-audit
  examples-from: bank/PLANTED.md, evals/cases.yaml, backend/scan_file.py
---

# WCAG ghost mapper

A ghost is an accessibility barrier. This skill turns one finding into four lines a person can act on.

## Output, always in this order

1. **Finding**: the element and what is wrong, in one sentence.
2. **WCAG**: the success criteria numbers and names (WCAG 2.2).
3. **Severity**: `blocker`, `serious` or `moderate`, using the rules below.
4. **Impact**: one line on who is stopped and how.

End with: "Source: <where the finding came from>." Never add a number that is not in the finding.

## Severity rules (one right answer, so follow them exactly)

- **blocker**: a person using only a keyboard, or a screen reader, cannot finish the journey. Any `reason_code` from the checker (`TARGET_NOT_FOCUSABLE`, `FOCUS_TRAP`, `NO_ACTIVATION`) is a blocker.
- **serious**: the journey can be finished, but a control has no name, a field has no label, or a status is not announced.
- **moderate**: the information is there but hard to perceive: low contrast, a missing focus outline on one control.

The checker alone sets `verdict` and `reason_code`. This skill explains them. It never changes them.

## Six examples from this repo

**1. Checker: `BLOCKED` / `TARGET_NOT_FOCUSABLE` on `div.pay-btn`** (bank barrier 1, `evals/cases.yaml` bank-001)
- Finding: Send Payment is a `div` with a click handler, so Tab never reaches it.
- WCAG: 2.1.1 Keyboard; 4.1.2 Name, Role, Value.
- Severity: blocker.
- Impact: a keyboard-only user cannot send the payment at all. A mouse user can.

**2. `scan_page` / hook: `label` on `input#amount`** (bank barrier 2, `finding_id` `label-594db4fb701f`)
- Finding: the Amount field has no accessible name. "Amount (EUR)" is a `span`, not a `label`.
- WCAG: 1.3.1 Info and Relationships; 3.3.2 Labels or Instructions; 4.1.2 Name, Role, Value.
- Severity: serious.
- Impact: a screen reader says "edit text" with no name, so the user has to guess what to type.

**3. axe: `color-contrast` on `#recipient-hint`** (bank barrier 3)
- Finding: the helper text under Recipient measures 3.52:1 against its panel (from `bank/PLANTED.md`).
- WCAG: 1.4.3 Contrast (Minimum).
- Severity: moderate.
- Impact: people with low vision may not be able to read the hint.

**4. Keyboard check: no focus outline on `#recipient`** (bank barrier 4)
- Finding: when Tab lands on Recipient, nothing on screen changes.
- WCAG: 2.4.7 Focus Visible.
- Severity: moderate.
- Impact: a keyboard user loses track of where they are on the form.

**5. axe: `button-name` on `button#cancel`** (bank barrier 5)
- Finding: Cancel is an icon-only button with no name.
- WCAG: 4.1.2 Name, Role, Value.
- Severity: serious.
- Impact: a screen reader announces only "button", so the user cannot tell it cancels the payment.

**6. DOM check: errors not announced on `#form-error`** (bank barrier 6)
- Finding: after a failed submit the error text appears, but it has no `role="alert"` or `aria-live` and is not tied to its field.
- WCAG: 4.1.3 Status Messages (and 3.3.1 Error Identification).
- Severity: serious.
- Impact: a screen reader user does not hear that the payment failed or why.

## When the finding is unclear

Say what is missing ("The finding has no element, so I cannot name the control") and stop. Do not guess a criterion.
