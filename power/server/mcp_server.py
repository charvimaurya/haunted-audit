"""Haunted Audit MCP server (stdio) shipped with the Kiro Power."""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
import scan_file as sf  # noqa: E402

from mcp.server.mcpserver import MCPServer  # noqa: E402
from mcp.server.mcpserver.exceptions import ToolError  # noqa: E402

server = MCPServer(
    name="haunted-audit",
    instructions=(
        "Haunted Audit accessibility tools. scan_page reads one .html or .tsx file in this workspace "
        "and returns form fields that have no accessible name. run_journey runs the scripted keyboard "
        "payment journey on the bundled Haunted Bank fixture (broken or fixed) and refuses web URLs."
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
        if re.match(r"^/[A-Za-z]:/", raw):
            raw = raw[1:]
    elif len(scheme) > 1:
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


def run_journey_impl(variant: str = "broken", target: str | None = None) -> dict:
    """Run the scripted keyboard payment journey on the bundled Haunted Bank fixture only."""
    if target is not None and str(target).strip():
        raise ValueError("run_journey only runs on the bundled Haunted Bank. Web URLs and external targets are refused.")
    v = (variant or "broken").strip().lower()
    if v not in ("broken", "fixed"):
        raise ValueError("variant must be 'broken' or 'fixed'.")

    root = sf.REPO.resolve()
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))

    from agent.keyboard_agent.runner import build_journey_config, run_journey as exec_journey  # noqa: E402

    cfg = build_journey_config(variant=v, mode="scripted")
    res = exec_journey(cfg)
    return {
        "run_id": res.run_id,
        "variant": v,
        "verdict": res.verdict,
        "reason_code": res.reason_code,
        "blocked_element": res.blocked_element.selector if res.blocked_element else None,
    }


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
    except ValueError as exc:
        raise ToolError(str(exc)) from None


@server.tool(
    name="run_journey",
    description=(
        "Run the scripted keyboard payment journey on the bundled Haunted Bank fixture "
        "(variant: 'broken' or 'fixed'). Refuses any external web URL or non-bundled target. "
        "Returns {run_id, variant, verdict, reason_code, blocked_element}."
    ),
)
def run_journey(variant: str = "broken", target: str | None = None) -> dict:
    try:
        return run_journey_impl(variant=variant, target=target)
    except ValueError as exc:
        raise ToolError(str(exc)) from None


if __name__ == "__main__":
    server.run("stdio")
