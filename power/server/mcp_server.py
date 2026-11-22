"""Haunted Audit MCP server (stdio).

Tools:
    scan_page(target)  Scan one .html or .tsx file in this workspace for form fields with no label.
                       Same rule and same finding shape as the scan-on-save hook (backend/scan_file.py).

Not here yet: exorcise_page(finding_id). It needs the Exorcist agent, which does not exist
(see docs/waiting-on.md).

Run: python3 backend/mcp_server.py   (Kiro starts it from .kiro/settings/mcp.json)
Spec: .kiro/specs/mcp-server-power/
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
import scan_file as sf  # noqa: E402  (same folder, also in power/server/)

from mcp.server.mcpserver import MCPServer  # noqa: E402
from mcp.server.mcpserver.exceptions import ToolError  # noqa: E402

server = MCPServer(
    name="haunted-audit",
    instructions=(
        "Haunted Audit accessibility tools. scan_page reads one .html or .tsx file in this workspace "
        "and returns form fields that have no accessible name. It never fetches a web page and never "
        "changes a file. A person approves any fix."
    ),
)


def scan_page_impl(target: str) -> dict:
    """Validate the target, then scan it. Raises ValueError with one plain sentence when refused."""
    raw = (target or "").strip()
    if not raw:
        raise ValueError("Give a file path, for example fixtures/haunted_bank/index.html.")
    parsed = urlparse(raw)
    scheme = parsed.scheme.lower()
    if scheme in ("http", "https", "ftp", "ws", "wss"):
        raise ValueError("scan_page only reads files in this workspace. It never fetches a web page.")
    if scheme == "file":
        if parsed.netloc not in ("", "localhost"):
            raise ValueError("A file:// URL with a host is not a file in this workspace.")
        raw = unquote(parsed.path)
        if re.match(r"^/[A-Za-z]:/", raw):  # file:///C:/... on Windows
            raw = raw[1:]
    elif len(scheme) > 1:  # one letter is a Windows drive, not a scheme
        raise ValueError("Only a file path or a file:// URL can be scanned.")

    root = sf.REPO.resolve()
    path = Path(raw)
    if not path.is_absolute():
        path = root / path
    path = path.resolve()
    try:
        rel = path.relative_to(root).as_posix()
    except ValueError:
        raise ValueError("That file is outside this workspace, so it is not scanned.") from None
    if path.suffix not in (".html", ".tsx"):
        raise ValueError("Only .html and .tsx files can be scanned.")
    if not path.is_file():
        raise ValueError(f"No file at {rel}.")
    return {"file": rel, "findings": sf.scan_file(path)}


@server.tool(
    name="scan_page",
    description=(
        "Scan one .html or .tsx file in this workspace for form fields with no label "
        "(WCAG 1.3.1, 3.3.2, 4.1.2). target: a workspace-relative path such as "
        "fixtures/haunted_bank/index.html, or a file:// URL inside the workspace. "
        "Web URLs are refused. Returns {file, findings[]}; findings is empty when the file is clean."
    ),
)
def scan_page(target: str) -> dict:
    try:
        return scan_page_impl(target)
    except ValueError as exc:  # a refusal, not a crash: the sentence reaches the user
        raise ToolError(str(exc)) from None


if __name__ == "__main__":
    server.run("stdio")
