"""Bundled Possession sandbox scenarios (Haunted Bank + 8 domain sandboxes)."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class ScenarioDef:
    id: str
    name: str
    category: str
    rel_path: str
    submit_label: str
    summary: str


SCENARIOS: dict[str, ScenarioDef] = {
    "haunted-bank": ScenarioDef(
        id="haunted-bank",
        name="Haunted Bank",
        category="Banking",
        rel_path="fixtures/haunted_bank/index.html",
        submit_label="Send Payment",
        summary="Money transfer checkout where the Send Payment control is trapped in a clickable div.",
    ),
    "phantom-checkout": ScenarioDef(
        id="phantom-checkout",
        name="Phantom Checkout",
        category="E-Commerce",
        rel_path="fixtures/scenarios/phantom_checkout.html",
        submit_label="Complete Order",
        summary="Retail cart confirmation where keyboard Tab skips past the Complete Order div.",
    ),
    "cursed-clinic": ScenarioDef(
        id="cursed-clinic",
        name="Cursed Clinic",
        category="Healthcare",
        rel_path="fixtures/scenarios/cursed_clinic.html",
        submit_label="Confirm Visit",
        summary="Patient visit booking and co-pay portal blocked on a mouse-only confirm action.",
    ),
    "ghost-hr": ScenarioDef(
        id="ghost-hr",
        name="GhostHR Portal",
        category="Enterprise HR",
        rel_path="fixtures/scenarios/ghost_hr.html",
        submit_label="Submit Request",
        summary="Employee expense & stipend claim form where Submit Request omits keyboard focus.",
    ),
    "crypt-cloud": ScenarioDef(
        id="crypt-cloud",
        name="CryptCloud Console",
        category="Developer SaaS",
        rel_path="fixtures/scenarios/crypt_cloud.html",
        submit_label="Invite Member",
        summary="Team workspace seat & budget allocation form unreachable without a mouse.",
    ),
    "specter-gov": ScenarioDef(
        id="specter-gov",
        name="SpecterGov Portal",
        category="Public Sector",
        rel_path="fixtures/scenarios/specter_gov.html",
        submit_label="Submit Renewal",
        summary="Municipal permit renewal fee portal failing WCAG 2.1.1 keyboard accessibility.",
    ),
    "haunted-uni": ScenarioDef(
        id="haunted-uni",
        name="HauntedUni Registration",
        category="Education",
        rel_path="fixtures/scenarios/haunted_uni.html",
        submit_label="Confirm Enrollment",
        summary="Student semester enrollment & lab fee confirmation trapped in a div control.",
    ),
    "hex-pay": ScenarioDef(
        id="hex-pay",
        name="HexPay Disputes",
        category="FinTech",
        rel_path="fixtures/scenarios/hex_pay.html",
        submit_label="Submit Dispute",
        summary="Card chargeback dispute form where Submit Dispute cannot be activated via Enter.",
    ),
    "necro-stream": ScenarioDef(
        id="necro-stream",
        name="NecroStream Billing",
        category="Subscriptions",
        rel_path="fixtures/scenarios/necro_stream.html",
        submit_label="Confirm Cancellation",
        summary="Subscription cancellation refund flow blocking keyboard-only users with a div button.",
    ),
}

ALLOWED_SCENARIO_TARGETS: set[str] = {s.rel_path for s in SCENARIOS.values()}


def get_scenario(scenario_id: str | None) -> ScenarioDef:
    sid = (scenario_id or "haunted-bank").strip().lower()
    if sid not in SCENARIOS:
        raise ValueError(f"Unknown sandbox scenario: {sid}")
    return SCENARIOS[sid]


def scenario_path(scenario_id: str | None) -> Path:
    return REPO_ROOT / get_scenario(scenario_id).rel_path
