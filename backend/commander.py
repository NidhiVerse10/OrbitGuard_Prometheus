"""
Commander scoring (Section 6.4) - deterministic. Never touched by an LLM.

NOTE for integration with the AI Agent (Member 4): the `justification`
field returned here is a placeholder. Member 4's orchestrator should
call Gemini with this same Decision data (selected plan, scores,
rejected_plans, verification) and the backend will swap in their
justification-generation function once it exists. See the TODO below.
"""

from models import ScenarioObject, Threat, Candidate, Scores, RejectedPlan, Verification, DecideResponse
from simulator import check_candidate

CRITICALITY_WEIGHTS = {"critical": 1.0, "standard": 0.6, "low": 0.3}


def score_candidate(candidate: Candidate, sim_result, criticality_weight: float,
                     max_delta_v: float, max_delay: float) -> Scores:
    safety_score = 1.0 if sim_result.feasible else 0.0

    normalized_delta_v = (candidate.delta_v_ms / max_delta_v) if max_delta_v > 0 else 0.0
    normalized_delay = (candidate.delay_min / max_delay) if max_delay > 0 else 0.0

    total = (
        0.5 * safety_score
        + 0.2 * (1 - normalized_delta_v)
        + 0.2 * criticality_weight
        + 0.1 * (1 - normalized_delay)
    )

    return Scores(
        safety=safety_score,
        secondary_conflicts=len(sim_result.secondary_conflicts),
        delta_v_ms=candidate.delta_v_ms,
        mission_criticality_weight=criticality_weight,
        total_score=round(total, 4)
    )


def _pick_best(candidates, sim_results, criticality_weight: float):
    """Among feasible candidates, pick highest total_score; tie-break lower delta_v, then lower delay."""
    max_delta_v = max((c.delta_v_ms for c in candidates), default=0.0)
    max_delay = max((c.delay_min for c in candidates), default=0.0)

    feasible = [(c, r) for c, r in zip(candidates, sim_results) if r.feasible]
    if not feasible:
        return None, None, None

    scored = []
    for c, r in feasible:
        s = score_candidate(c, r, criticality_weight, max_delta_v, max_delay)
        scored.append((c, r, s))

    scored.sort(key=lambda item: (-item[2].total_score, item[0].delta_v_ms, item[0].delay_min))
    best_c, best_r, best_s = scored[0]
    return best_c, best_r, best_s


def decide(objects: list[ScenarioObject], threat: Threat) -> DecideResponse:
    from maneuver import generate_candidates

    primary_obj = next(o for o in objects if o.id == threat.primary)
    criticality_weight = CRITICALITY_WEIGHTS[primary_obj.criticality]

    candidates, _ = generate_candidates(primary_obj.orbital_elements)
    sim_results = [check_candidate(objects, threat, c.id) for c in candidates]

    excluded_ids = set()
    replans_used = 0

    while True:
        remaining = [(c, r) for c, r in zip(candidates, sim_results) if c.id not in excluded_ids]
        rem_candidates = [c for c, r in remaining]
        rem_results = [r for c, r in remaining]

        best_c, best_r, best_s = _pick_best(rem_candidates, rem_results, criticality_weight)

        if best_c is None:
            # No feasible plan at all - Section 9 edge case
            return DecideResponse(
                threat_id=threat.id,
                selected_plan="NONE",
                scores=Scores(safety=0.0, secondary_conflicts=0, delta_v_ms=0.0,
                               mission_criticality_weight=criticality_weight, total_score=0.0),
                rejected_plans=[
                    RejectedPlan(plan_id=c.id, status="REJECTED",
                                 closest_approach_km=r.closest_approach_km, reason=r.reason)
                    for c, r in zip(candidates, sim_results)
                ],
                justification="No feasible maneuver was found. Recommend continued monitoring and escalation to a human operator.",
                verification=Verification(status="FAILED", closest_approach_km=0.0, replans_used=replans_used),
                requires_human_approval=True
            )

        # Verifier: reuse check_candidate one more time on the selected plan (Section 5.6)
        verify_result = check_candidate(objects, threat, best_c.id)

        if verify_result.feasible or replans_used >= 1:
            verification_status = "SAFE" if verify_result.feasible else "FAILED"
            rejected_plans = []
            for c, r in zip(candidates, sim_results):
                if c.id == best_c.id:
                    continue
                if r.feasible:
                    reason = (
                        f"Feasible and resolves the conjunction, but scored lower than "
                        f"{best_c.id} due to higher fuel cost, delay, or lower priority."
                    )
                else:
                    reason = r.reason
                rejected_plans.append(RejectedPlan(
                    plan_id=c.id, status="REJECTED",
                    closest_approach_km=r.closest_approach_km, reason=reason
                ))
            # TODO(AI Agent / Member 4): replace this placeholder with a call to your
            # Gemini justification function, e.g.:
            #   justification = agent.commander.generate_justification(threat, best_c, best_s, rejected_plans, verify_result)
            justification = (
                f"{best_c.type.replace('_', ' ').title()} resolves the conjunction with "
                f"{threat.secondary} with no secondary conflicts, at an acceptable fuel cost "
                f"for a {primary_obj.criticality} asset."
            )
            return DecideResponse(
                threat_id=threat.id,
                selected_plan=best_c.id,
                scores=best_s,
                rejected_plans=rejected_plans,
                justification=justification,
                verification=Verification(
                    status=verification_status,
                    closest_approach_km=verify_result.closest_approach_km,
                    replans_used=replans_used
                ),
                requires_human_approval=True
            )
        else:
            # Verification failed - exactly one replan attempt (Section 2.4), excluding this plan
            excluded_ids.add(best_c.id)
            replans_used += 1
