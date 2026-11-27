---
name: audit-component
description: Scan a changed component file for WCAG violations and summarise by severity
tools:
  - scan_file
---

# Audit Component

## When to use

Run after creating or modifying a frontend `.tsx` or `.html` component file to catch WCAG 2.x violations before review.

## Steps

1. Call `scan_file(path="<component-path>")`.
2. Group violations into severity buckets (`critical`, `serious`, `moderate`, `minor`):
   - `critical`: blocks keyboard navigation or form submission; fix immediately.
   - `serious`: missing labels, names, or focus leaks; fix before commit.
   - `moderate` / `minor`: contrast or heading structure improvements.
3. Report each violation with rule ID, WCAG criterion, selector, and failure summary.

## Output format

- Summary line with route, total violation count, and passes count.
- Bullet list per severity bucket (`critical` -> `minor`), or explicit confirmation when `violation_count == 0`.

## Constraints

- Severity classification is deterministic Python code (not model judgement).
- Always end with either **"Zero WCAG violations found."** (`violation_count == 0`) or **"No code changed."**
