# Whole-euro amount support (`amount-whole-euros`)

## Requirements
- Accept whole euros and up to two decimal places (`90`, `90.5`, `90.55`) across the Haunted Bank fixture, `clean_amount`, the dashboard `TestDetailsForm` / `commandsFromDetails` / `RunProvider`, and `scripts/record_seed.py`.
- Normalize valid values into two-decimal EUR strings (`90.00`, `90.50`, `90.55`).
- Keep rejecting `0`, `0.00`, `1000.01`, `90.555`, `050`, `-5`, `abc`, `5e1`.
