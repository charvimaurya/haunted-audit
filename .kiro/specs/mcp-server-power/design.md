# MCP server and Kiro Power: design

## Server

- Python MCP SDK `mcp` 2.x (`from mcp.server.mcpserver import MCPServer`), stdio transport. Pinned in `requirements.txt`.
- `backend/mcp_server.py` imports `scan_file` and `in_scope`-style checks from `backend/scan_file.py`. The tool logic lives in a plain function `scan_page_impl(target) -> dict` so unit tests call it without a server.
- Refusals raise `ValueError` with one plain sentence. The MCP layer returns it as a tool error.
- The repo root is found from the file location, so the server works from any working directory.

## Kiro registration

`.kiro/settings/mcp.json`:

```json
{ "mcpServers": { "haunted-audit": { "command": "python3", "args": ["backend/mcp_server.py"], "disabled": false } } }
```

Kiro runs workspace MCP servers from the workspace root, so the relative path works. Python must have `mcp` installed (the project `.venv` does). Windows: `py -3`.

## Power layout

```
power/
├── plugin.json            manifest (Agent Plugins schema 1.0.0)
├── mcp.json               the haunted-audit stdio server
├── README.md              install from scratch, what is and is not a power component
├── server/                copies of backend/scan_file.py and backend/mcp_server.py
├── hooks/scan-on-save.json
├── steering/accessibility.md
└── skills/                the four skills (Phase E)
```

`power/server/` holds copies so the power works outside this repo. A test checks the copies match `backend/` byte for byte, so they cannot drift.

Outside this repo the "repo root" for `scan_page` is the folder Kiro starts the server in (the user's workspace), set by `HAUNTED_AUDIT_ROOT` or the current directory.

## Tests

`tests/unit/test_mcp_server.py`: `scan_page_impl` on the bank fixture, each refusal, the copies match, and a stdio connection test with `mcp.client.stdio`.
