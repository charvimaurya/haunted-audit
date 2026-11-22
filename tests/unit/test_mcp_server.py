"""Tests for backend/mcp_server.py and the power/ folder (spec: .kiro/specs/mcp-server-power/)."""
import asyncio
import json
import sys
from pathlib import Path

import pytest

from backend import mcp_server as ms

REPO = Path(__file__).resolve().parents[2]
BANK = "fixtures/haunted_bank/index.html"


# ── scan_page: unit, with the bank fixture ──────────────────────────────────

def test_scan_page_on_bank_fixture():
    out = ms.scan_page_impl(BANK)
    assert out["file"] == BANK
    assert [f["element"] for f in out["findings"]] == ["input#amount"]


def test_scan_page_accepts_file_url_inside_repo():
    out = ms.scan_page_impl((REPO / BANK).as_uri())
    assert out["file"] == BANK and len(out["findings"]) == 1


def test_scan_page_clean_file_has_no_findings():
    assert ms.scan_page_impl("dashboard/src/components/RunControls.tsx")["findings"] == []


@pytest.mark.parametrize("target,words", [
    ("https://example.com", "never fetches a web page"),
    ("http://localhost:5173/", "never fetches a web page"),
    ("../outside.html", "outside this workspace"),
    ("/etc/passwd", "outside this workspace"),
    ("dashboard/src/index.css", "Only .html and .tsx"),
    ("ftp://x/y.html", "never fetches a web page"),
    ("mailto:a@b.c", "file path or a file:// URL"),
    ("", "Give a file path"),
    ("fixtures/haunted_bank/missing.html", "No file at"),
])
def test_scan_page_refuses(target, words):
    with pytest.raises(ValueError, match=words):
        ms.scan_page_impl(target)


# ── no exorcise_page until the Exorcist exists ──────────────────────────────

def test_only_scan_page_is_exposed():
    names = [t.name for t in asyncio.run(ms.server.list_tools())]
    assert names == ["scan_page"]


# ── power/ copies cannot drift ──────────────────────────────────────────────

@pytest.mark.parametrize("name", ["scan_file.py", "mcp_server.py"])
def test_power_server_copies_match_backend(name):
    assert (REPO / "power" / "server" / name).read_bytes() == (REPO / "backend" / name).read_bytes()


def test_power_hook_matches_workspace_hook():
    assert (REPO / "power" / "hooks" / "scan-on-save.json").read_bytes() == \
        (REPO / ".kiro" / "hooks" / "scan-on-save.json").read_bytes()


def test_power_manifest_and_mcp_config():
    plugin = json.loads((REPO / "power" / "plugin.json").read_text())
    assert plugin["name"] == "haunted-audit" and plugin["keywords"] and plugin["author"]["name"]
    mcp = json.loads((REPO / "power" / "mcp.json").read_text())
    server = mcp["mcpServers"]["haunted-audit"]
    assert server["type"] == "stdio"
    for value in [server["command"], *server["args"]]:
        assert not value.startswith("/") and ":\\" not in value  # relative paths only


def test_workspace_mcp_config_is_relative_and_has_no_secrets():
    cfg = json.loads((REPO / ".kiro" / "settings" / "mcp.json").read_text())
    server = cfg["mcpServers"]["haunted-audit"]
    assert server["args"] == ["backend/mcp_server.py"]
    text = json.dumps(cfg).lower()
    for word in ("key", "secret", "token", "password", "/users/"):
        assert word not in text


# ── connection test: a real stdio client ────────────────────────────────────

def test_stdio_connection_lists_and_calls_scan_page():
    from mcp.client.session import ClientSession
    from mcp.client.stdio import StdioServerParameters, stdio_client

    async def run():
        params = StdioServerParameters(command=sys.executable, args=[str(REPO / "backend" / "mcp_server.py")],
                                       cwd=str(REPO))
        async with stdio_client(params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                tools = [t.name for t in (await session.list_tools()).tools]
                ok = await session.call_tool("scan_page", {"target": BANK})
                refused = await session.call_tool("scan_page", {"target": "https://example.com"})
                return tools, ok, refused

    tools, ok, refused = asyncio.run(asyncio.wait_for(run(), timeout=30))
    assert tools == ["scan_page"]
    assert not ok.is_error
    body = json.loads(ok.content[0].text)
    assert [f["element"] for f in body["findings"]] == ["input#amount"]
    assert refused.is_error and "never fetches a web page" in refused.content[0].text


def test_power_copy_runs_outside_the_repo(tmp_path):
    """The power's server works in another workspace: it scans files relative to where Kiro starts it."""
    import shutil
    import subprocess
    work = tmp_path / "other-project"
    (work / "src").mkdir(parents=True)
    (work / "src" / "form.html").write_text('<form><input id="q"></form>')
    server_dir = tmp_path / "power-server"
    shutil.copytree(REPO / "power" / "server", server_dir)
    code = ("import sys; sys.path.insert(0, %r); import mcp_server as m; "
            "print(m.scan_page_impl('src/form.html')['findings'][0]['element'])") % str(server_dir)
    r = subprocess.run([sys.executable, "-c", code], cwd=work, capture_output=True, text=True, timeout=30)
    assert r.returncode == 0, r.stderr
    assert r.stdout.strip() == "input#q"


SKILLS = ["wcag-ghost-mapper", "accessible-ui-review", "exorcise-fix", "journey-test-writer"]


@pytest.mark.parametrize("name", SKILLS)
def test_skill_frontmatter_and_power_copy(name):
    text = (REPO / ".kiro" / "skills" / name / "SKILL.md").read_text(encoding="utf-8")
    head = text.split("---")[1]
    assert f"name: {name}\n" in head and "description:" in head
    assert len(name) <= 64 and name == name.lower()
    assert (REPO / "power" / "skills" / name / "SKILL.md").read_text(encoding="utf-8") == text


@pytest.mark.parametrize("name", ["exorcise-fix", "journey-test-writer"])
def test_unbuilt_skills_are_marked_unverified(name):
    text = (REPO / ".kiro" / "skills" / name / "SKILL.md").read_text(encoding="utf-8")
    assert "needs the Exorcist and journey-test writer to be verified" in text
    assert "status: unverified" in text


def test_reviewer_agent_loads_the_review_skill():
    text = (REPO / ".kiro" / "agents" / "reviewer.md").read_text(encoding="utf-8")
    assert "skill://.kiro/skills/accessible-ui-review/SKILL.md" in text
