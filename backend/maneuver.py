"""
Maneuver generation (Section 5.4): given a satellite's current orbital
elements, produce candidate avoidance maneuvers as NEW orbital elements
plus the delta-v (m/s) required, via the vis-viva equation.
"""

import copy
import numpy as np

from models import OrbitalElements, Candidate

MU_EARTH = 398600.4418  # km^3/s^2

ALTITUDE_STEP_KM = 8.0       # raise/lower step
PHASE_SHIFT_DELAY_MIN = 15.0
PHASE_SHIFT_ALTITUDE_STEP_KM = 3.0
WAIT_DELAY_MIN = 20.0


def circular_speed(a_km: float) -> float:
    """Vis-viva for a circular orbit: v = sqrt(mu/a), km/s."""
    return np.sqrt(MU_EARTH / a_km)


def delta_v_for_altitude_change(a_old_km: float, a_new_km: float) -> float:
    """
    Delta-v (m/s) for a simple altitude change, approximated as the
    difference in circular orbital speed between the two altitudes.
    This is a simplification (not a full two-impulse Hohmann calc),
    which is appropriate for a 24h hackathon per Section 5.4.
    """
    v_old = circular_speed(a_old_km)
    v_new = circular_speed(a_new_km)
    return abs(v_new - v_old) * 1000  # km/s -> m/s


def generate_candidates(elements: OrbitalElements) -> tuple[list[Candidate], dict[str, OrbitalElements]]:
    """
    Returns:
        candidates: list of Candidate (Section 4.3 shape)
        new_elements_by_id: dict mapping candidate id -> resulting OrbitalElements
                             (used by simulator.py to re-propagate and check conflicts)
    """
    candidates = []
    new_elements_by_id = {}

    # PLAN-1: raise_orbit
    raise_elements = copy.deepcopy(elements)
    raise_elements.semi_major_axis_km += ALTITUDE_STEP_KM
    dv_raise = delta_v_for_altitude_change(elements.semi_major_axis_km, raise_elements.semi_major_axis_km)
    candidates.append(Candidate(id="PLAN-1", type="raise_orbit", delta_v_ms=round(dv_raise, 2), delay_min=0))
    new_elements_by_id["PLAN-1"] = raise_elements

    # PLAN-2: lower_orbit
    lower_elements = copy.deepcopy(elements)
    lower_elements.semi_major_axis_km -= ALTITUDE_STEP_KM
    dv_lower = delta_v_for_altitude_change(elements.semi_major_axis_km, lower_elements.semi_major_axis_km)
    candidates.append(Candidate(id="PLAN-2", type="lower_orbit", delta_v_ms=round(dv_lower, 2), delay_min=0))
    new_elements_by_id["PLAN-2"] = lower_elements

    # PLAN-3: phase_shift (small altitude bump + mean anomaly shift, then implicitly returns)
    phase_elements = copy.deepcopy(elements)
    phase_elements.semi_major_axis_km += PHASE_SHIFT_ALTITUDE_STEP_KM
    phase_elements.mean_anomaly_deg = (phase_elements.mean_anomaly_deg + 5.0) % 360
    dv_phase = delta_v_for_altitude_change(elements.semi_major_axis_km, phase_elements.semi_major_axis_km)
    candidates.append(Candidate(id="PLAN-3", type="phase_shift", delta_v_ms=round(dv_phase, 2),
                                 delay_min=PHASE_SHIFT_DELAY_MIN))
    new_elements_by_id["PLAN-3"] = phase_elements

    # PLAN-4: wait (no orbital change, just re-check later in the window)
    wait_elements = copy.deepcopy(elements)
    candidates.append(Candidate(id="PLAN-4", type="wait", delta_v_ms=0.0, delay_min=WAIT_DELAY_MIN))
    new_elements_by_id["PLAN-4"] = wait_elements

    return candidates, new_elements_by_id
