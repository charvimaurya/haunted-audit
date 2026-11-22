# Haunted Audit power

Finds form fields with no label in HTML and TSX files, explains a finding in WCAG terms, and reviews a screen against accessibility rules. It is read-only. A person approves every fix.

Format: Kiro Powers (Agent Plugins 1.0.0), from kiro.dev/docs/powers/create (read 22 Nov 2026).

## What is in it

| Path | What | Part of the Powers format? |
|---|---|---|
| `plugin.json` | manifest: name, description, keywords | yes |
| `mcp.json` | the `haunted-audit` stdio MCP server, tool `scan_page` | yes |
| `skills/` | `wcag-ghost-mapper`, `accessible-ui-review` (in use); `exorcise-fix`, `journey-test-writer` (unverified drafts) | yes |
| `server/` | `mcp_server.py` and `scan_file.py`, Python standard library plus `mcp` | yes (the server the manifest runs) |
| `hooks/scan-on-save.json` | scan a saved file automatically | **no**, copy it by hand (step 4) |
| `steering/accessibility.md` | the accessibility rules | **no**, copy it by hand (step 4) |

The Powers documentation lists only `plugin.json`, `skills/` and `mcp.json` as power components. Hooks and steering are not listed, so this power ships them as plain files to copy. I am not sure whether Kiro will pick them up from inside a power, so the README does not rely on it.

## Install on a new laptop, from scratch

You need Python 3.11 or newer, git and Kiro IDE.

1. **Get the files.**
   ```
   git clone https://github.com/charvimaurya/haunted-audit.git
   ```
2. **Install the one Python package the server needs.**
   - macOS or Linux: `python3 -m pip install "mcp>=2.3,<3"`
   - Windows: `py -3 -m pip install "mcp>=2.3,<3"`
   - Check: `python3 -c "import mcp.server.mcpserver"` (Windows: `py -3 -c ...`) prints nothing.
3. **Install the power in Kiro.** Open Kiro, then **Powers** panel, then **Add Custom Power**, then **Import power from a folder**, and pick the `power/` folder. (Or **Import power from GitHub** with the repository URL and the `power` folder.)
   - Windows: open `power/mcp.json` first and change `"command": "python3"` to `"command": "py"` with `"args": ["-3", "${PLUGIN_ROOT}/server/mcp_server.py"]`.
4. **Optional: the save hook and the steering, in the project you want to check.**
   - Copy `power/server/scan_file.py` to `backend/scan_file.py` in that project.
   - Copy `power/hooks/scan-on-save.json` to `.kiro/hooks/` (on Windows change `python3` to `py -3` in it).
   - Copy `power/steering/accessibility.md` to `.kiro/steering/`.
   - Start a new Kiro session. Hooks load when a session starts.
5. **Try it.** Open a project with an HTML or TSX form and ask Kiro: "scan src/form.html for missing labels". The power activates on words like *accessibility*, *a11y*, *WCAG*, *form label*. Kiro calls `scan_page`. Then ask "explain this finding".

## What `scan_page` will and will not do

- It reads one `.html` or `.tsx` file inside the workspace Kiro started it in.
- It refuses web URLs, paths outside the workspace, and other file types, with one plain sentence.
- It never changes a file and never calls a model.
- To scan a different folder, set `HAUNTED_AUDIT_ROOT` in the server's environment.

## No secrets

The power needs no keys, tokens or accounts. No path in it is absolute.

Built with Kiro.
