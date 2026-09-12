"""
Bridge between the backend's deterministic pipeline and the AI Agent's
orchestrator (agent/orchestrator.py, Member 4). Builds the exact dict
shapes AgentOrchestrator.resolve_threat() expects, calls it, and adapts
its return value to match Section 4.5 / models.DecideResponse exactly.

Note: the orchestrator nests `requires_human_approval` inside
"verification", but our contract (Section 4.5, models.py) has it as a
top-level field - this bridge lifts it out so the API response is
correct either way.

Falls back to the backend's own commander.decide() if the agent module
is unavailable or raises for any reason - the demo must never break
because an external API call failed (Section 9.3).
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from models import DecideResponse, Scores, RejectedPlan, Verification
from maneuver import generate_candidates
from simulator import check_candidate
import commander as fallback_commander

try:
    from agent.orchestrator import AgentOrchestrator
    _orchestrator = AgentOrchestrator()
    AGENT_AVAILABLE = True
except Exception as e:
    print(f"[agent_bridge] agent.orchestrator unavailable, will use fallback commander: {e}")
    AGENT_AVAILABLE = False


def _gather_candidates_and_results(objects, threat):
    primary_obj = next(o for o in objects if o.id == threat.primary)
    candidates, _ = generate_candidates(primary_obj.orbital_elements)
    sim_results = [check_candidate(objects, threat, c.id) for c in candidates]
    return primary_obj, candidates, sim_results


def decide_via_agent_or_fallback(objects, threat) -> DecideResponse:
    primary_obj, candidates, sim_results = _gather_candidates_and_results(objects, threat)

    if not AGENT_AVAILABLE:
        return fallback_commander.decide(objects, threat)

    try:
        raw = _orchestrator.resolve_threat(
            threat_id=threat.id,
            scenario_data=primary_obj.model_dump(),
            threat_data=threat.model_dump(),
            candidates=[c.model_dump() for c in candidates],
            sim_results=[r.model_dump() for r in sim_results]
        )

        verification_raw = dict(raw.get("verification") or {})
        requires_human_approval = verification_raw.pop("requires_human_approval", True)

        selected_plan = raw.get("selected_plan")
        if selected_plan is None:
            selected_plan = "NONE"
            scores_raw = raw.get("scores") or {}
            scores = Scores(
                safety=scores_raw.get("safety", 0.0),
                secondary_conflicts=scores_raw.get("secondary_conflicts", 0),
                delta_v_ms=scores_raw.get("delta_v_ms", 0.0),
                mission_criticality_weight=scores_raw.get("mission_criticality_weight", 0.0),
                total_score=scores_raw.get("total_score", 0.0)
            )
        else:
            scores = Scores(**raw["scores"])

        rejected_plans = [RejectedPlan(**rp) for rp in raw.get("rejected_plans", [])]
        verification = Verification(
            status=verification_raw.get("status", "FAILED"),
            closest_approach_km=verification_raw.get("closest_approach_km", 0.0),
            replans_used=verification_raw.get("replans_used", 0)
        )

        return DecideResponse(
            threat_id=raw.get("threat_id", threat.id),
            selected_plan=selected_plan,
            scores=scores,
            rejected_plans=rejected_plans,
            justification=raw.get("justification", ""),
            verification=verification,
            requires_human_approval=requires_human_approval
        )

    except Exception as e:
        print(f"[agent_bridge] resolve_threat() failed, falling back to commander.decide(): {e}")
        return fallback_commander.decide(objects, threat)
