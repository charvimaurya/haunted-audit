# Item 31: Reference field. Review record

Branch `feature/reference-field`. Spec `.kiro/specs/reference-field/`, RF-01 to RF-05.

## Measured on this branch (24 Nov 2026)
- `pytest` (full, `-o addopts=""`): 439 passed, 2 skipped (54 s).
- `cd dashboard && npm test`: 18 files, 141 passed. `npm run build`: built.
- `python -m agent.eval.run_eval --runs 5`: scripted broken 5/5 BLOCKED, avg steps 20.0; scripted fixed 5/5 PASSED, avg steps 16.0 (was 18.0 and 14.0). llm 0/5: no AWS credentials, not run.
- `python -m agent.fixes.regression_guard --runs 5`: GUARD_WORKS 5 of 5.
- axe tests on the haunted and fixed bank: unchanged (same three rules on the same three elements).
- Real runs exported to `docs/evidence-seed.json`: broken `64fc82e3-ad66-456f-9365-c3c3b64281e5`, fixed `3af222da-e566-42a5-9d6a-b79c44a27771`.

## Reviewer agent (first pass, read-only)
No serious issue. Three minor: (1) the walker's claim text said "and the reference" even if not filled: fixed; (2) tasks.md unticked: fixed; (3) the older "fields stay empty" test does not name Reference: left, covered by `reference-field.test.tsx`.

## Not verified
- Keyboard-only walk of the Possession screen by a person. The checklist and field are covered by Vitest only.
- A second reviewer and PR approval.
- Voice replay phrases (`VOICE_REPLAY`) are unchanged on purpose and do not type a Reference.
