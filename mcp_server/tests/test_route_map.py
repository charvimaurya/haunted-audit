"""Route mapping tests (TASK-04)."""

from __future__ import annotations

from mcp_server.route_map import routes_for_file


def test_routes_for_known_and_unknown_files() -> None:
    assert routes_for_file("dashboard/src/components/journey/PossessionMode.tsx") == ["/#journeys"]
    assert len(routes_for_file("dashboard/src/components/layout/TopNav.tsx")) == 6
    assert len(routes_for_file("dashboard/src/index.css")) == 6
    assert routes_for_file("dashboard/src/components/results/MetricValue.tsx") == ["/#reports"]
    assert routes_for_file("dashboard/src/lib/Unknown.ts") == ["/"]
