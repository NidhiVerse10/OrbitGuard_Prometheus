"""
Counterfactual simulation (Section 4.4, 5.6): apply a candidate maneuver
to the primary object, re-propagate, and check whether it (a) resolves
the original threat and (b) creates any NEW conflict with other objects.

The Verifier (Section 5.6) reuses check_candidate() directly - it is not
a separate module, just this same function called once more on the
Commander's selected plan.
"""

import numpy as np

from models import ScenarioObject, Threat, Candidate, SimulateResponse, SecondaryConflict
from propagation import state_vector_from_elements, parse_epoch, closest_approach_refined
from conjunction import risk_score, THREAT_THRESHOLD_KM
from maneuver import generate_candidates

DURATION_S = 21600  # 6 hours
STEP_S = 30


def _propagate_object(elements, epoch_offset_s: float, times_s: np.ndarray) -> np.ndarray:
    """Propagate a single object's elements over the given absolute time array."""
    positions = np.zeros((len(times_s), 3))
    for idx, t in enumerate(times_s):
        pos, _ = state_vector_from_elements(elements, epoch_offset_s + t)
        positions[idx] = pos
    return positions


def check_candidate(objects: list[ScenarioObject], threat: Threat, candidate_id: str) -> SimulateResponse:
    """
    Runs the counterfactual check for one candidate maneuver against a threat.
    Returns a SimulateResponse matching Section 4.4 exactly.
    """
    primary_obj = next(o for o in objects if o.id == threat.primary)
    candidates, new_elements_by_id = generate_candidates(primary_obj.orbital_elements)
    candidate = next(c for c in candidates if c.id == candidate_id)
    new_primary_elements = new_elements_by_id[candidate_id]

    epochs = {o.id: parse_epoch(o.orbital_elements.epoch) for o in objects}
    reference_epoch = min(epochs.values())

    # "wait" candidates don't change the orbit - they shift WHEN we check it.
    delay_s = candidate.delay_min * 60
    if candidate.type == "wait":
        times_s = np.arange(delay_s, delay_s + DURATION_S, STEP_S)
    else:
        times_s = np.arange(0, DURATION_S, STEP_S)

    primary_offset = (epochs[primary_obj.id] - reference_epoch).total_seconds()
    primary_positions = _propagate_object(new_primary_elements, primary_offset, times_s)

    worst_distance_km = float("inf")
    secondary_conflicts = []
    primary_resolved = True
    original_secondary_min_km = None

    for other in objects:
        if other.id == primary_obj.id:
            continue

        other_offset = (epochs[other.id] - reference_epoch).total_seconds()
        other_positions = _propagate_object(other.orbital_elements, other_offset, times_s)

        distances = np.linalg.norm(primary_positions - other_positions, axis=1)
        min_idx = int(np.argmin(distances))
        min_dist = float(distances[min_idx])

        if other.id == threat.secondary:
            if min_dist < THREAT_THRESHOLD_KM:
                _, refined_dist, _ = closest_approach_refined(
                    new_primary_elements, primary_offset,
                    other.orbital_elements, other_offset,
                    times_s[min_idx], half_window_s=STEP_S
                )
                original_secondary_min_km = refined_dist
                worst_distance_km = min(worst_distance_km, refined_dist)
                if refined_dist < THREAT_THRESHOLD_KM:
                    primary_resolved = False
            else:
                original_secondary_min_km = min_dist
                worst_distance_km = min(worst_distance_km, min_dist)
        else:
            if min_dist < THREAT_THRESHOLD_KM:
                _, refined_dist, rel_v = closest_approach_refined(
                    new_primary_elements, primary_offset,
                    other.orbital_elements, other_offset,
                    times_s[min_idx], half_window_s=STEP_S
                )
                worst_distance_km = min(worst_distance_km, refined_dist)
                secondary_conflicts.append(SecondaryConflict(
                    object=other.id,
                    miss_distance_km=round(refined_dist, 3),
                    risk_score=round(risk_score(refined_dist, rel_v), 3)
                ))
            else:
                worst_distance_km = min(worst_distance_km, min_dist)

    feasible = primary_resolved and len(secondary_conflicts) == 0
    status = "SELECTED" if feasible else "REJECTED"

    if not primary_resolved:
        reason = (
            f"This plan does not sufficiently increase separation from {threat.secondary}; "
            f"closest approach remains {original_secondary_min_km:.2f} km."
        )
    elif secondary_conflicts:
        worst = min(secondary_conflicts, key=lambda c: c.miss_distance_km)
        reason = (
            f"Although this plan resolves the original threat with {threat.secondary}, "
            f"its simulated trajectory creates a new high-risk conjunction with {worst.object}."
        )
    else:
        reason = "Resolves the primary conjunction with no secondary conflicts detected."

    return SimulateResponse(
        plan_id=candidate_id,
        primary_resolved=primary_resolved,
        secondary_conflicts=secondary_conflicts,
        closest_approach_km=round(worst_distance_km, 3),
        feasible=feasible,
        status=status,
        reason=reason
    )
