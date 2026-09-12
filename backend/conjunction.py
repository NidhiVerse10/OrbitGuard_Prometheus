"""
Conjunction detection: pairwise distance search over a propagated window,
refined to sub-second precision with analytic velocity, plus the
simplified risk score formula from Section 5.3.
"""

from itertools import combinations
from datetime import datetime, timezone
import numpy as np

from models import ScenarioObject, Threat
from propagation import propagate_window, parse_epoch, closest_approach_refined

SAFE_DISTANCE_KM = 5.0
THREAT_THRESHOLD_KM = 5.0  # pairs under this distance are flagged as threats


def risk_score(miss_distance_km: float, relative_velocity_km_s: float) -> float:
    """Section 5.3 simplified risk heuristic."""
    proximity_factor = np.clip(1 - (miss_distance_km / SAFE_DISTANCE_KM), 0, 1)
    velocity_factor = min(relative_velocity_km_s / 10, 1.0)
    return float(proximity_factor * velocity_factor)


def severity_from_score(score: float) -> str:
    if score >= 0.7:
        return "HIGH"
    elif score >= 0.3:
        return "MEDIUM"
    else:
        return "LOW"


def detect_threats(objects: list[ScenarioObject], duration_s: float = 21600,
                    step_s: float = 30) -> list[Threat]:
    """
    Propagate all objects at coarse resolution to find candidate close
    approaches, then refine each below-threshold pair to sub-second
    precision with exact analytic relative velocity.
    """
    times_s, positions = propagate_window(objects, duration_s, step_s)

    epochs = {obj.id: parse_epoch(obj.orbital_elements.epoch) for obj in objects}
    reference_epoch = min(epochs.values())
    offsets = {obj.id: (epochs[obj.id] - reference_epoch).total_seconds() for obj in objects}
    elements_by_id = {obj.id: obj.orbital_elements for obj in objects}

    threats = []
    threat_counter = 1

    for obj_a, obj_b in combinations(objects, 2):
        pos_a = positions[obj_a.id]
        pos_b = positions[obj_b.id]
        distances = np.linalg.norm(pos_a - pos_b, axis=1)
        min_idx = int(np.argmin(distances))
        coarse_min_distance = float(distances[min_idx])

        if coarse_min_distance < THREAT_THRESHOLD_KM:
            t_refined, min_distance, relative_velocity = closest_approach_refined(
                elements_by_id[obj_a.id], offsets[obj_a.id],
                elements_by_id[obj_b.id], offsets[obj_b.id],
                times_s[min_idx], half_window_s=step_s
            )

            score = risk_score(min_distance, relative_velocity)
            tca_datetime = reference_epoch.timestamp() + t_refined
            tca_iso = datetime.fromtimestamp(tca_datetime, tz=timezone.utc).strftime(
                "%Y-%m-%dT%H:%M:%SZ"
            )

            threats.append(Threat(
                id=f"THREAT-{threat_counter:03d}",
                primary=obj_a.id,
                secondary=obj_b.id,
                tca=tca_iso,
                miss_distance_km=round(min_distance, 3),
                relative_velocity_km_s=round(relative_velocity, 3),
                risk_score=round(score, 3),
                severity=severity_from_score(score)
            ))
            threat_counter += 1

    return threats
