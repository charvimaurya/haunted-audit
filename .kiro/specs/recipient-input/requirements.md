# Recipient name typed by the tester: requirements
Asked for by the owner on 22 Nov 2026: "i want to enter the name myself for testing". No screen puts a person's name in for you.

## Requirements
**REQ-RI-01: The tester types the name.**
- Possession Mode and the Try page show a "Recipient name" field beside Run Journey when the keyboard agent is chosen. It starts empty and has no example name.
- Run Journey with the field empty does not start a run. It shows "Enter a recipient name first." next to the field (icon and text) and moves focus to the field.
- The name the tester typed is the name the keyboard agent types into the bank's Recipient field.

**REQ-RI-02: The API takes the name, safely.**
- `POST /runs` accepts an optional `recipient`: 1 to 60 characters (the bank's own limit), letters, spaces, full stops, apostrophes and hyphens only, and it must start with a letter. Anything else is a `422`.
- The name goes into the agent's goal text, so it is a trust boundary. The character rule keeps quotes, new lines and instructions out of the prompt.
- When `recipient` is left out, the API keeps its earlier default. Evals, tests and the command line use that; no screen shows it unless the tester typed it.

**REQ-RI-03: Voice commands start with no name.**
- The voice commands list starts empty. The empty message shows an example with `<name>` in place of a person's name.

**REQ-RI-04: Same checks as before.**
- The checker alone decides the verdict. The new field has a visible label, a visible focus ring, 16px text and a 44px target, and passes axe.
