# Power: install from scratch (22 Nov 2026)

On this Mac, in an empty folder (`/tmp/fresh`), following `power/README.md` steps 1 and 2:

1. `git clone https://github.com/charvimaurya/haunted-audit.git` (main at `fd9f336`)
2. A brand-new Python 3.11.18 environment with only `mcp>=2.3,<3` installed (`uv venv`, `uv pip install`). The check `import mcp.server.mcpserver` passed.
3. The server was started the way `power/mcp.json` tells Kiro to: `python3 ${PLUGIN_ROOT}/server/mcp_server.py`. Its working directory was a different project (`/tmp/fresh/other-project`) holding one file, `src/form.html`: `<label for="a">Name</label><input id="a"><input id="b">`.
4. An MCP client over stdio (`/tmp/fresh/client.py`) gave this output, verbatim:

```
tools: ['scan_page']
findings: ['input#b']
web url refused: True
```

The labelled `input#a` was not reported. The unlabelled `input#b` was. A web URL was refused with "scan_page only reads files in this workspace. It never fetches a web page."

## Not tested here

- Step 3 of the README ("Add Custom Power" in the Kiro UI) on a **second** laptop. It needs the Kiro IDE on another machine.
- Windows. `power/README.md` gives the `py -3` changes; they have not been run.
