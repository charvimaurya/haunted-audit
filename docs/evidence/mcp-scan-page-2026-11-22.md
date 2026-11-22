# `scan_page` called from Kiro chat

Date: Sun 22 Nov 2026. Client: Kiro IDE chat (this session). Server: `haunted-audit` from `.kiro/settings/mcp.json`, command `.venv/bin/python backend/mcp_server.py`.

Kiro loaded the server at session start. Its instructions appeared in the chat context, and the tool was listed as `tool::haunted-audit::scan_page`.

## Call 1: the bank page

Request: `scan_page({"target": "fixtures/haunted_bank/index.html"})`

The plan says `bank/index.html`. The bank page lives at `fixtures/haunted_bank/index.html`; `bank/` holds only `PLANTED.md` and a README.

Response (verbatim):

```json
{
  "file": "fixtures/haunted_bank/index.html",
  "findings": [
    {
      "finding_id": "label-594db4fb701f",
      "source": "scan_file",
      "rule": "label",
      "wcag": ["1.3.1", "3.3.2", "4.1.2"],
      "severity": "serious",
      "file": "fixtures/haunted_bank/index.html",
      "line": 188,
      "element": "input#amount",
      "message": "This input has no accessible name. Add <label for=\"amount\">, aria-label or aria-labelledby."
    }
  ]
}
```

This is planted barrier 2 in `bank/PLANTED.md`. `#recipient` (labelled) is not reported.

## Call 2: a web URL is refused

Request: `scan_page({"target": "https://example.com"})`

Response (verbatim): `MCP tool error: Error executing tool scan_page: scan_page only reads files in this workspace. It never fetches a web page.`

## Screenshot

Not taken by the agent. The owner takes it in Kiro IDE (open the MCP panel, ask "scan the bank page for missing labels").
