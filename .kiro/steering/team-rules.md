---
inclusion: always
---
# Team rules: build first, review after

- Do not wait for Shilpa's approval to build. Shilpa reviews after the work is built.
- Design questions: if design/v9 shows the answer, follow v9. If v9 is silent, keep what was built, in plain and true words.
- Defaults agreed on 24 Nov:
  - Buttons: "Replay both journeys" and "Put the bug back and run both tests" (v9).
  - The "we caught it" ghost is white (v9).
  - Verify starts when a person presses it.
  - Screens, deck and video claim only what the latest real run shows.
  - A Reviewer report in docs/pr/ counts instead of a GitHub pull request.
- When you use a default, add one line to docs/decision-log.md:
  "<date>: <what>, default from <v9 or team rules>; open for Shilpa's review".
- Night Watch API: you may add fields to POST /runs and GET /runs/{id}. Never rename or remove a field without telling Shilpa first.
- Shilpa must say yes only before: (1) the video is recorded (claims), (2) the submission tag. If there is no reply by the agreed time, Charvi decides.
