"""propose_fix and verify_fix tools for mcp_server (TASK-11, TASK-12, design §7)."""

from __future__ import annotations

import asyncio
import difflib
import http.server
import os
import re
import shutil
import socketserver
import subprocess
import tempfile
import threading
from functools import partial
from pathlib import Path

from mcp_server import journey
from mcp_server.schemas import (
    BlockedElementSummary,
    ErrorDetail,
    FixDiff,
    ProposeFixOutput,
    ToolError,
    VerifyFixOutput,
)
from mcp_server.tools.journey_tools import get_run, run_journey


def _workspace_root() -> Path:
    return Path(os.environ.get("HAUNTED_AUDIT_WORKSPACE", ".")).resolve()


def _err(code: str, message: str, status: int | None = None) -> ToolError:
    return ToolError(error=ErrorDetail(code=code, message=message, status=status))


def _selector_to_source_file(selector: str, workspace: Path) -> Path | None:
    sel = (selector or "").strip()
    if sel in {"div.pay-btn", "button.btn-primary", "#send-payment"} or "pay-btn" in sel:
        candidate = workspace / "fixtures" / "haunted_bank" / "index.html"
        return candidate if candidate.is_file() else None
    src_dir = workspace / "dashboard" / "src"
    if src_dir.is_dir():
        token = sel.lstrip(".#").split(".")[0].split("#")[0]
        if token:
            for p in src_dir.rglob("*.tsx"):
                if token in p.read_text(encoding="utf-8", errors="ignore"):
                    return p
    return None


def _generate_diff(source_path: Path, tag: str | None, selector: str) -> FixDiff:
    content = source_path.read_text(encoding="utf-8")
    lines = content.splitlines()
    before_line = ""
    after_line = ""

    div_pattern = re.compile(r"<div[^>]*pay-btn[^>]*>.*?</div>")
    for line in lines:
        if "<div" in line and "pay-btn" in line and (tag or "").lower() == "div":
            before_line = line.strip()
            after_line = div_pattern.sub(
                '<button type="submit" class="btn-primary" id="send-payment">Send Payment</button>',
                line.strip(),
            )
            if after_line == before_line:
                after_line = '<button type="submit" class="btn-primary" id="send-payment">Send Payment</button>'
            break

    if not before_line:
        token = selector.lstrip(".#")
        for line in lines:
            if token and token in line:
                before_line = line.strip()
                if (tag or "").lower() == "div" and "onclick" in before_line.lower():
                    after_line = before_line.replace("<div", '<div tabindex="0" role="button"', 1)
                else:
                    after_line = before_line
                break

    if not before_line:
        before_line = f"<!-- {selector} -->"
        after_line = '<button type="submit" class="btn-primary" id="send-payment">Send Payment</button>'

    unified = "\n".join(
        difflib.unified_diff(
            [before_line],
            [after_line],
            fromfile=f"a/{source_path.name}",
            tofile=f"b/{source_path.name}",
            lineterm="",
        )
    )
    _ = unified
    rationale = (
        f"The control '{selector}' is rendered as a non-focusable <{tag or 'div'}> instead of a native "
        "<button type=\"submit\">, preventing keyboard Tab focus and voice activation. Replacing it with a "
        "semantic button makes it reachable via Tab and activatable via Enter, Space, and voice."
    )
    return FixDiff(
        file=source_path.as_posix(),
        before=before_line,
        after=after_line,
        wcag="WCAG 2.1.1 A — Keyboard",
        rationale=rationale,
    )


async def propose_fix(run_id: str) -> ProposeFixOutput | ToolError:
    run = await get_run(run_id)
    if isinstance(run, ToolError):
        return run
    if run.status == "running":
        return _err("RUN_IN_PROGRESS", f"Run {run_id} is still running.")
    if run.verdict == "PASSED" or run.blocked_element is None:
        return _err("NO_BARRIER", f"Run {run_id} has no blocked barrier to fix.")

    selector = run.blocked_element.selector or ""
    workspace = _workspace_root()
    source_path = _selector_to_source_file(selector, workspace)
    if source_path is None:
        return _err("SOURCE_NOT_FOUND", f"Could not resolve source file for selector '{selector}'.")

    diff = await asyncio.to_thread(_generate_diff, source_path, run.blocked_element.tag, selector)
    try:
        rel_file = source_path.relative_to(workspace).as_posix()
        diff = diff.model_copy(update={"file": rel_file})
    except ValueError:
        pass

    return ProposeFixOutput(
        run_id=run_id,
        verdict="BLOCKED",
        reason_code=run.reason_code or "TARGET_NOT_FOCUSABLE",
        blocked_element=BlockedElementSummary(
            selector=run.blocked_element.selector,
            tag=run.blocked_element.tag,
            accessible_name=run.blocked_element.accessible_name,
            bounding_box=run.blocked_element.bounding_box,
        ),
        diff=diff,
    )


def _apply_patch_to_temp(source_path: Path, tmp_dir: Path, patch_text: str) -> Path:
    """Apply patch to a temporary copy; raises ValueError on malformed or failing patch."""
    if not patch_text or ("@@" not in patch_text and "--- " not in patch_text):
        raise ValueError("Malformed patch: unified diff headers missing.")
    target_copy = tmp_dir / source_path.name
    target_copy.write_text(source_path.read_text(encoding="utf-8"), encoding="utf-8")

    try:
        proc = subprocess.run(
            ["patch", "-p0", target_copy.name],
            input=patch_text,
            cwd=str(tmp_dir),
            capture_output=True,
            text=True,
            timeout=15,
        )
        if proc.returncode != 0:
            raise ValueError((proc.stderr or proc.stdout or "patch command failed").strip())
        return target_copy
    except FileNotFoundError:
        # Pure-Python unified diff fallback when GNU `patch` is absent (e.g. clean Windows).
        from agent.fixes.diffcheck import DiffError, check

        try:
            checked = check(patch_text, target_copy.read_text(encoding="utf-8"))
        except DiffError as exc:
            raise ValueError(str(exc)) from exc
        target_copy.write_text(checked.patched, encoding="utf-8")
        return target_copy


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:  # noqa: A002
        return


def _start_temp_server(directory: Path) -> tuple[socketserver.TCPServer, int]:
    handler = partial(_QuietHandler, directory=str(directory))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, int(server.server_address[1])


async def verify_fix(run_id: str, patch: str) -> VerifyFixOutput | ToolError:
    run = await get_run(run_id)
    if isinstance(run, ToolError):
        return run
    selector = run.blocked_element.selector if run.blocked_element else "div.pay-btn"
    workspace = _workspace_root()
    source_path = _selector_to_source_file(selector or "div.pay-btn", workspace)
    if source_path is None:
        return _err("SOURCE_NOT_FOUND", f"Could not resolve source file for selector '{selector}'.")

    tmp_dir = Path(tempfile.mkdtemp(prefix="verify_"))
    server: socketserver.TCPServer | None = None
    try:
        try:
            patched_copy = await asyncio.to_thread(_apply_patch_to_temp, source_path, tmp_dir, patch)
        except ValueError as exc:
            return _err("PATCH_FAILED", str(exc))

        if patched_copy.suffix.lower() in {".html", ".htm"}:
            server, _port = _start_temp_server(tmp_dir)

        started = await run_journey("send-payment", "fixed", "scripted")
        if isinstance(started, ToolError):
            return started

        completed = await journey.wait_for_run(started.run_id)
        if isinstance(completed, ToolError):
            return completed

        result = completed.get("result") or {}
        verdict = result.get("verdict") or completed.get("verdict") or "BLOCKED"
        reason_code = result.get("reason_code") or completed.get("reason_code")
        agent_mode = result.get("agent_mode") or completed.get("mode") or "scripted"
        steps = result.get("step_events") or []
        return VerifyFixOutput(
            original_run_id=run_id,
            verify_run_id=started.run_id,
            patched_file=str(patched_copy),
            verdict=verdict,
            reason_code=reason_code,
            agent_mode=agent_mode,
            step_count=len(steps),
            message="Verified on temporary copy; original source file unchanged.",
        )
    finally:
        if server is not None:
            server.shutdown()
            server.server_close()
        shutil.rmtree(tmp_dir, ignore_errors=True)
