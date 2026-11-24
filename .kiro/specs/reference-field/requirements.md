# Requirements: Reference field on the bank page (plan v5.3 item 31)

Why: the demo script fills three fields: Recipient, Amount and Reference ("Electricity bill"). The Possession checklist ticks all three.

Scope: `fixtures/haunted_bank/index.html`, the scripted walker, the journey config, the Possession checklist, tests, evidence. Not in scope: any change to `POST /runs` or `GET /runs/{id}` (plan item 20), the voice replay phrases, the recipient default.

| ID | Requirement |
|---|---|
| REQ-RF-01 | Both variants have a text field `#reference`, after Amount and before Send Payment in the tab order, with a visible label "Reference" that is tied to the input (`for`/`id`) in both variants. |
| REQ-RF-02 | Reference is optional. An empty Reference never blocks a payment. The confirmation keeps its first sentence ("Sent EUR 50.00 to Alex Carter.") and adds " Reference: <text>." at the end only when Reference is not empty. Reference is cleared on send and on Cancel. Maximum 60 characters (`maxlength`). |
| REQ-RF-03 | The Reference field adds no new accessibility barrier. The haunted page still has exactly the six planted barriers in `bank/PLANTED.md`, and the keyboard is still blocked only by the Send Payment `div` (`TARGET_NOT_FOCUSABLE`). |
| REQ-RF-04 | `JourneyConfig.reference` defaults to `"Electricity bill"`. The scripted walker types it into the third editable field. The agent goal and the LLM prompt mention it. The walker does not depend on Reference to press Send Payment (a page without the field still works). No selector reaches the prompt (information barrier unchanged). |
| REQ-RF-05 | The scripted walker on the haunted page ends BLOCKED / TARGET_NOT_FOCUSABLE and on the fixed page ends PASSED, 5 of 5 each. |
| REQ-RF-06 | The Possession checklist has "Tab to Reference" between Amount and Send Payment. A row turns green only when `#reference` is in the run's real `focus_trail`. Before a run it shows pending, never a pass. The Possession form shows an empty Reference input the tester can type in, like Recipient and Amount. |
| REQ-RF-07 | `docs/evidence.md` step counts and `docs/evidence-seed.json` come from new real runs (5 each variant). No number is edited by hand. |
| REQ-RF-08 | `bank/PLANTED.md` states that Reference is a properly labelled, non-planted field, and its measured claims stay true. |

Out of scope on purpose: the plan's example default Recipient "Alex Carter" already exists in `JourneyConfig`; the dashboard keeps its empty Recipient field (commits ea3581f, 1568826).
