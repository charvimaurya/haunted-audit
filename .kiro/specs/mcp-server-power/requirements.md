# MCP server and Kiro Power: requirements

Plan item 18. Approved by the owner on 22 Nov 2026 ("make all the decisions").

## Goal

Anyone using Kiro can ask "scan the bank page" and get the same file findings as the save hook, through an MCP tool, and can install the whole kit (tool, hook, steering, skills) on another laptop from one folder.

## Requirements

**REQ-MCP-01: `scan_page` tool.** `backend/mcp_server.py` is a stdio MCP server named `haunted-audit` with one tool, `scan_page(target)`. `target` is a repo-relative path to an `.html` or `.tsx` file, or a `file://` URL that points inside the repo. It returns `{"file", "findings": [File finding]}` from `backend/scan_file.py` (shape in `.kiro/steering/data-contract.md`).
- Acceptance: `scan_page("fixtures/haunted_bank/index.html")` returns exactly one finding, `input#amount`.

**REQ-MCP-02: Stays on the bundled files.** Agents run only on the bundled Haunted Bank and this repo (`product.md`). `scan_page` refuses `http(s)` URLs, paths outside the repo, and other file types, with a plain sentence and no file read.
- Acceptance: tests for `https://example.com`, `../x.html`, `/etc/passwd`, and `a.css`.

**REQ-MCP-03: No `exorcise_page` yet.** `exorcise_page(finding_id)` is added only when the Exorcist exists. It does not, so the tool is left out and `docs/waiting-on.md` records that it is blocked by the Exorcist spec.

**REQ-MCP-04: Registered in Kiro.** `.kiro/settings/mcp.json` registers the server with a relative path and no secrets.

**REQ-MCP-05: Power folder.** `power/` follows the Kiro Powers format from kiro.dev/docs/powers/create (read 22 Nov 2026): `plugin.json`, `mcp.json`, `skills/`. It also carries the scan-on-save hook and the accessibility steering as plain files, because the Powers documentation does not list hooks or steering as power components. The README says so and gives copy steps.

**REQ-MCP-06: Install from scratch.** `power/README.md` lets someone with only Python 3.11+, git and Kiro install and use the power on a new laptop, on macOS or Windows.

**REQ-MCP-07: Tests.** A unit test per tool with a fixture, and a connection test that starts the server over stdio, lists the tools and calls `scan_page`.
