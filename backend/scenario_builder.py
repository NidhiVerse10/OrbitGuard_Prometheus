"""
scenario_builder.py

Adapts the backend's deterministic pipeline (conjunction / maneuver /
simulator / commander - all built to the frozen Section 4 snake_case
contracts in models.py) into the composed shape the frontend's
`Scenario` / `ManeuverPlan` / `Threat` TypeScript interfaces
(frontend/src/types/orbitguard.ts) actually require.

The frontend only ever calls three endpoints (frontend/src/services/api.ts):

    GET  /api/scenario         -> full Scenario snapshot
    POST /api/scenario/reset   -> full Scenario snapshot
    POST /api/decide           -> full decision payload with real
                                   ManeuverPlan objects, not plan-id strings

This module is purely a translation layer sitting between that pipeline
and those three HTTP responses. conjunction.py / maneuver.py /
simulator.py / commander.py / agent_bridge.py are untouched and keep
talking to each other in the original frozen contract.

Two field-name renames matter most (these were the actual source of the
frontend crash):

  * Threat:  backend `primary` / `secondary`
             -> frontend `primary_object` / `secondary_object`

  * Scenario: backend `/api/scenario` returned `{ objects: [...] }`
             -> frontend needs `threat`, `assets`, `candidateManeuvers`,
                `decisionSteps`, `verification`, etc. all present.
"""

import math
from typing import Optional

import numpy as np

from models import ScenarioObject, Threat, Candidate, SimulateResponse, DecideResponse
from conjunction import detect_threats
from maneuver import generate_candidates
from simulator import check_candidate
from propagation import state_vector_from_elements

EARTH_RADIUS_KM = 6378.137
MU_EARTH = 398600.4418  # km^3/s^2
ORBIT_TRACK_STEPS = 72  # points per full-orbit ring, matches the old mock generator

# The frozen backend contract never specifies spacecraft wet mass or
# thruster Isp (propellant mass isn't part of models.py at all). These are
# reasonable smallsat placeholders used only so the UI has an indicative
# propellant figure to show next to delta-v - not a physically authoritative
# number.
ASSUMED_WET_MASS_KG = 500.0
ASSUMED_ISP_S = 220.0
G0_M_S2 = 9.80665

OBJECT_TYPE_MAP = {
    "satellite": "PAYLOAD",
    "debris": "DEBRIS",
}

MANEUVER_TYPE_MAP = {
    "raise_orbit": "RAISE_ORBIT",
    "lower_orbit": "LOWER_ORBIT",
    "phase_shift": "PHASE_SHIFT",
    "wait": "WAIT",
}

MANEUVER_LABEL = {
    "raise_orbit": "Raise Orbit",
    "lower_orbit": "Lower Orbit",
    "phase_shift": "Phase Shift",
    "wait": "Hold / Wait",
}


def _circular_speed_km_s(semi_major_axis_km: float) -> float:
    return float(np.sqrt(MU_EARTH / semi_major_axis_km))


def _estimate_propellant_kg(delta_v_ms: float) -> float:
    """Tsiolkovsky rocket equation, indicative only (see module docstring)."""
    if delta_v_ms <= 0:
        return 0.0
    mass_fraction = math.exp(delta_v_ms / (ASSUMED_ISP_S * G0_M_S2))
    return round(ASSUMED_WET_MASS_KG * (1 - 1 / mass_fraction), 3)


def _orbital_period_s(semi_major_axis_km: float) -> float:
    return float(2 * np.pi * np.sqrt(semi_major_axis_km ** 3 / MU_EARTH))


def _eci_to_point(position_km: np.ndarray) -> dict:
    """
    Turns an ECI position vector into a lat/lon/altKm point for the globe.

    This ignores Earth's rotation (no GMST correction), exactly like the
    frontend's old mock generator (frontend/src/data/mockScenario.ts's
    generateOrbitTrack()) did - it isn't a real ground track, it's a fixed
    ring in space around the globe, which is what actually renders as the
    smooth closed "orbit ring" in CesiumGlobe/GlobeView.
    """
    x, y, z = position_km
    r = float(np.linalg.norm(position_km))
    lat = float(np.degrees(np.arcsin(np.clip(z / r, -1.0, 1.0))))
    lon = float(np.degrees(np.arctan2(y, x)))
    lon = ((lon + 180) % 360) - 180  # normalize to [-180, 180]
    alt_km = round(r - EARTH_RADIUS_KM, 2)

    return {
        "lat": round(lat, 3),
        "lon": round(lon, 3),
        "altKm": alt_km,
        "alt_km": alt_km,
    }


def _build_orbit_trajectory(elements) -> list[dict]:
    """One full closed orbit ring, sampled at ORBIT_TRACK_STEPS points."""
    period_s = _orbital_period_s(elements.semi_major_axis_km)
    points = []
    for k in range(ORBIT_TRACK_STEPS + 1):
        t = (k / ORBIT_TRACK_STEPS) * period_s
        position, _ = state_vector_from_elements(elements, t)
        points.append(_eci_to_point(position))
    return points


def build_asset(obj: ScenarioObject) -> dict:
    elements = obj.orbital_elements

    current_position_eci, _ = state_vector_from_elements(elements, 0.0)
    current_position = _eci_to_point(current_position_eci)
    orbit_trajectory = _build_orbit_trajectory(elements)

    return {
        "id": obj.id,
        "name": obj.name,
        "type": OBJECT_TYPE_MAP.get(obj.type, "DEBRIS"),
        "altitude_km": round(elements.semi_major_axis_km - EARTH_RADIUS_KM, 2),
        "inclination_deg": round(elements.inclination_deg, 3),
        "velocity_km_s": round(_circular_speed_km_s(elements.semi_major_axis_km), 3),
        "role": "PRIMARY_ASSET" if obj.criticality == "critical" else "BACKGROUND",
        "status": "OPERATIONAL",
        # GlobeView.tsx / CesiumGlobe.tsx read these camelCase fields
        # directly (no snake_case fallback for these two, unlike
        # altitude/inclination) - this is what actually draws the rings.
        "currentPosition": current_position,
        "current_position": current_position,
        "orbitTrajectory": orbit_trajectory,
        "orbit_trajectory": orbit_trajectory,
    }


def build_threat_dict(threat: Threat) -> dict:
    return {
        "id": threat.id,
        "primary_object": threat.primary,
        "secondary_object": threat.secondary,
        "tca": threat.tca,
        "miss_distance_km": threat.miss_distance_km,
        "relative_velocity_km_s": threat.relative_velocity_km_s,
        "risk_score": threat.risk_score,
        "severity": threat.severity,
    }


def _placeholder_threat(objects: list[ScenarioObject]) -> dict:
    """Structurally valid Threat for the (unlikely, given the demo data)
    case where no conjunction is detected - the frontend's Scenario type
    requires `threat` to always be present."""
    return {
        "id": "THREAT-NONE",
        "primary_object": objects[0].id if objects else "",
        "secondary_object": objects[1].id if len(objects) > 1 else "",
        "tca": "",
        "miss_distance_km": 0.0,
        "relative_velocity_km_s": 0.0,
        "risk_score": 0.0,
        "severity": "LOW",
    }


def build_maneuver_plan(
    candidate: Candidate,
    sim: SimulateResponse,
    plan_number: int,
    status: Optional[str] = None,
) -> dict:
    delay_window = (
        "IMMEDIATE" if candidate.delay_min == 0 else f"T+{candidate.delay_min:.0f} min"
    )
    return {
        "id": candidate.id,
        "plan_number": plan_number,
        "name": f"{MANEUVER_LABEL.get(candidate.type, candidate.type)} ({candidate.id})",
        "type": MANEUVER_TYPE_MAP.get(candidate.type, "HOLD"),
        "description": sim.reason,
        "delta_v_ms": candidate.delta_v_ms,
        "delay_window": delay_window,
        "propellant_kg": _estimate_propellant_kg(candidate.delta_v_ms),
        "primary_conflict": "RESOLVED" if sim.primary_resolved else "UNRESOLVED",
        "secondary_conflicts": [c.object for c in sim.secondary_conflicts],
        "status": status or sim.status,
        "reason": sim.reason,
    }


def _empty_verification() -> dict:
    return {
        "selected_plan": "",
        "primary_conflict": "UNRESOLVED",
        "secondary_conflicts": [],
        "closest_approach_km": 0.0,
        "verification_status": "EVALUATING",
        "verification_notes": "The Verifier has not yet evaluated a selected maneuver.",
    }


def build_scenario_snapshot(objects: list[ScenarioObject]) -> dict:
    """
    Composes the full `Scenario` payload for GET /api/scenario and
    POST /api/scenario/reset. frontend/src/types/orbitguard.ts's `Scenario`
    interface requires `threat`, `assets`, `candidateManeuvers`, and
    `decisionSteps` unconditionally - this is why the raw `{ objects }`
    response crashed the app (frontend/src/hooks/useOrbitGuard.ts line 888
    calls `scenario.candidateManeuvers.find(...)` on every render).
    """
    assets = [build_asset(o) for o in objects]
    threats = detect_threats(objects)

    base = {
        "assets": assets,
        "decisionSteps": [],
        "activeStepIndex": 0,
        "selectedPlanId": None,
        "activeInspectionPlanId": None,
        "geminiReasoning": None,
        "isEvaluating": False,
        "isEvaluationComplete": False,
        "operatorApproved": False,
        "visualizationMode": "BEFORE",
        "beforeTrajectory": [],
        "afterTrajectory": [],
    }

    if not threats:
        return {
            **base,
            "threat": _placeholder_threat(objects),
            "candidateManeuvers": [],
            "verification": _empty_verification(),
        }

    # Highest-risk conjunction becomes the active threat shown to the UI.
    active_threat = max(threats, key=lambda t: t.risk_score)

    primary_obj = next(o for o in objects if o.id == active_threat.primary)
    candidates, _ = generate_candidates(primary_obj.orbital_elements)
    sim_results = [check_candidate(objects, active_threat, c.id) for c in candidates]

    candidate_plans = [
        # No plan has been chosen by the Commander yet at rest, so avoid
        # simulator.py's own "SELECTED" label (which just means
        # "feasible") - that word should only appear once /api/decide has
        # actually run.
        build_maneuver_plan(c, r, idx + 1, status="FEASIBLE" if r.feasible else "REJECTED")
        for idx, (c, r) in enumerate(zip(candidates, sim_results))
    ]

    return {
        **base,
        "threat": build_threat_dict(active_threat),
        "candidateManeuvers": candidate_plans,
        "verification": _empty_verification(),
    }


def build_decide_payload(
    objects: list[ScenarioObject],
    threat: Threat,
    decision: DecideResponse,
) -> dict:
    """
    Adapts commander.decide() / agent_bridge.decide_via_agent_or_fallback()'s
    DecideResponse - where `selected_plan` is a plan *id string*
    (models.py) - into the shape frontend/src/services/api.ts's
    getAutonomousDecision() expects, where `selected_plan` is the full
    ManeuverPlan object rendered by DecisionTrace / ManeuverCard.
    """
    primary_obj = next(o for o in objects if o.id == threat.primary)
    candidates, _ = generate_candidates(primary_obj.orbital_elements)
    candidate_by_id = {c.id: c for c in candidates}
    sim_by_id = {c.id: check_candidate(objects, threat, c.id) for c in candidates}
    order = list(candidate_by_id)

    selected_plan_dict = None
    if decision.selected_plan in candidate_by_id:
        selected_plan_dict = build_maneuver_plan(
            candidate_by_id[decision.selected_plan],
            sim_by_id[decision.selected_plan],
            plan_number=order.index(decision.selected_plan) + 1,
            status="SELECTED",
        )

    rejected_plan_dicts = []
    for rp in decision.rejected_plans:
        if rp.plan_id not in candidate_by_id:
            continue
        plan_dict = build_maneuver_plan(
            candidate_by_id[rp.plan_id],
            sim_by_id[rp.plan_id],
            plan_number=order.index(rp.plan_id) + 1,
            status="REJECTED",
        )
        plan_dict["reason"] = rp.reason
        plan_dict["rejectionReason"] = rp.reason
        rejected_plan_dicts.append(plan_dict)

    verification_status = "SAFE" if decision.verification.status == "SAFE" else "UNSAFE"

    verification_dict = {
        "selected_plan": decision.selected_plan,
        "primary_conflict": "RESOLVED" if verification_status == "SAFE" else "UNRESOLVED",
        "secondary_conflicts": [],
        "closest_approach_km": decision.verification.closest_approach_km,
        "verification_status": verification_status,
        "verification_notes": decision.justification,
    }

    return {
        "selected_plan": selected_plan_dict,
        "selected_plan_id": selected_plan_dict["id"] if selected_plan_dict else None,
        "scores": decision.scores.model_dump(),
        "rejected_plans": rejected_plan_dicts,
        "justification": decision.justification,
        "verification": verification_dict,
        "requires_human_approval": decision.requires_human_approval,
    }