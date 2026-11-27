"""File-path to dev-server route mapping (design §8)."""

from __future__ import annotations

import re
from pathlib import Path

ROUTE_MAP: list[tuple[re.Pattern[str], list[str]]] = [
    (
        re.compile(r"TopNav|layout|globals\.css|tailwind\.config", re.I),
        ["/", "/#scans", "/#journeys", "/#fixes", "/#kiro", "/#reports"],
    ),
    (re.compile(r"HeroSection|page\.tsx", re.I), ["/"]),
    (re.compile(r"PossessionMode|ChecklistItem|GhostOverlay", re.I), ["/#journeys"]),
    (re.compile(r"AgentCard|GhostHuntSection|LiveTimeline", re.I), ["/#scans"]),
    (re.compile(r"PipelineSection|CodeBlock|FixPanel|VerifyPanel", re.I), ["/#fixes"]),
    (re.compile(r"KiroIntegration|FileTree|HookCode", re.I), ["/#kiro"]),
    (re.compile(r"ResultsSection|OutcomeCard|MetricValue", re.I), ["/#reports"]),
    (re.compile(r"GhostMascot|GhostSVG", re.I), ["/"]),
    (
        re.compile(r"index\.css|globals\.css", re.I),
        ["/", "/#scans", "/#journeys", "/#fixes", "/#kiro", "/#reports"],
    ),
]


def routes_for_file(path: str) -> list[str]:
    """Return the dev-server routes affected by changing ``path``."""
    basename = Path(path).name
    for pattern, routes in ROUTE_MAP:
        if pattern.search(basename) or pattern.search(path):
            return list(routes)
    return ["/"]
