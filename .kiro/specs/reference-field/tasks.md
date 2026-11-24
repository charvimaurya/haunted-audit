# Tasks: Reference field (branch feature/reference-field, one commit per task)

- [x] RF-01 Bank page: Reference field in both variants, confirmation, clear on send and Cancel (REQ-RF-01, 02, 03). Verified by: `agent/tests/test_bank_page.py`, `agent/tests/test_bank_barriers.py` (still six barriers).
- [ ] RF-02 Config, prompt and scripted walker types Reference (REQ-RF-04, 05). Verified by: `agent/tests/` walker and runner tests, 5 scripted runs per variant.
- [ ] RF-03 Possession checklist and form: "Tab to Reference" (REQ-RF-06). Verified by: Vitest; keyboard check.
- [ ] RF-04 Evidence: `docs/evidence.md`, `docs/evidence-seed.json`, `bank/PLANTED.md` note (REQ-RF-07, 08). Verified by: numbers copied from the commands' output.
- [ ] RF-05 Docs: devlog line, review record, plan status.
