"""
Two-body Keplerian propagation.

Converts orbital elements (as stored in mock_scenario.json) into
ECI position/velocity vectors at any future time. This is the
sanctioned simplified fallback from Section 9.1 of the project bible
(instead of full SGP4/TLE parsing), since our objects are defined by
clean synthetic Keplerian elements, not TLE lines.
"""

from datetime import datetime, timezone
import numpy as np

from models import OrbitalElements, ScenarioObject

MU_EARTH = 398600.4418  # km^3 / s^2, Earth's gravitational parameter


def parse_epoch(epoch_str: str) -> datetime:
    """Parse an ISO 8601 UTC string like '2026-09-12T10:00:00Z'."""
    return datetime.fromisoformat(epoch_str.replace("Z", "+00:00"))


def solve_kepler_equation(mean_anomaly_rad: float, eccentricity: float,
                           tol: float = 1e-8, max_iter: int = 100) -> float:
    """Solve M = E - e*sin(E) for eccentric anomaly E via Newton-Raphson."""
    E = mean_anomaly_rad if eccentricity < 0.8 else np.pi
    for _ in range(max_iter):
        f = E - eccentricity * np.sin(E) - mean_anomaly_rad
        f_prime = 1 - eccentricity * np.cos(E)
        delta = f / f_prime
        E -= delta
        if abs(delta) < tol:
            break
    return E


def state_vector_from_elements(elements: OrbitalElements, seconds_since_epoch: float):
    """
    Given orbital elements and elapsed time since THIS element set's own
    epoch, return (position_km, velocity_km_s) as numpy arrays in the
    Earth-Centered Inertial (ECI) frame.
    """
    a = elements.semi_major_axis_km
    e = elements.eccentricity
    i = np.radians(elements.inclination_deg)
    raan = np.radians(elements.raan_deg)
    arg_pe = np.radians(elements.arg_perigee_deg)
    m0 = np.radians(elements.mean_anomaly_deg)

    n = np.sqrt(MU_EARTH / a**3)  # mean motion, rad/s
    M = m0 + n * seconds_since_epoch
    M = M % (2 * np.pi)

    E = solve_kepler_equation(M, e)

    # True anomaly
    nu = 2 * np.arctan2(np.sqrt(1 + e) * np.sin(E / 2), np.sqrt(1 - e) * np.cos(E / 2))

    r = a * (1 - e * np.cos(E))

    # Position and velocity in perifocal (orbital plane) frame
    p = a * (1 - e**2)
    x_pf = r * np.cos(nu)
    y_pf = r * np.sin(nu)

    h = np.sqrt(MU_EARTH * p)
    vx_pf = -(MU_EARTH / h) * np.sin(nu)
    vy_pf = (MU_EARTH / h) * (e + np.cos(nu))

    # Rotation: perifocal -> ECI (3-1-3 rotation: RAAN, inclination, arg_pe)
    cos_raan, sin_raan = np.cos(raan), np.sin(raan)
    cos_i, sin_i = np.cos(i), np.sin(i)
    cos_arg, sin_arg = np.cos(arg_pe), np.sin(arg_pe)

    R = np.array([
        [cos_raan * cos_arg - sin_raan * sin_arg * cos_i,
         -cos_raan * sin_arg - sin_raan * cos_arg * cos_i,
         sin_raan * sin_i],
        [sin_raan * cos_arg + cos_raan * sin_arg * cos_i,
         -sin_raan * sin_arg + cos_raan * cos_arg * cos_i,
         -cos_raan * sin_i],
        [sin_arg * sin_i,
         cos_arg * sin_i,
         cos_i]
    ])

    position = R @ np.array([x_pf, y_pf, 0.0])
    velocity = R @ np.array([vx_pf, vy_pf, 0.0])

    return position, velocity


def propagate_window(objects: list[ScenarioObject], duration_s: float = 21600, step_s: float = 30):
    """
    Propagate every object over a lookahead window (default 6 hours, 30s steps).

    Returns:
        times_s: np.ndarray of shape (N,) - seconds from the earliest epoch
        positions: dict[object_id] -> np.ndarray of shape (N, 3) in km
    """
    epochs = {obj.id: parse_epoch(obj.orbital_elements.epoch) for obj in objects}
    reference_epoch = min(epochs.values())

    times_s = np.arange(0, duration_s, step_s)
    positions = {}

    for obj in objects:
        offset_s = (epochs[obj.id] - reference_epoch).total_seconds()
        obj_positions = np.zeros((len(times_s), 3))
        for idx, t in enumerate(times_s):
            seconds_since_own_epoch = offset_s + t
            pos, _ = state_vector_from_elements(obj.orbital_elements, seconds_since_own_epoch)
            obj_positions[idx] = pos
        positions[obj.id] = obj_positions

    return times_s, positions


def closest_approach_refined(elements_a, offset_a_s, elements_b, offset_b_s,
                              t_guess_s, half_window_s):
    """
    Refine a coarse closest-approach estimate to sub-second precision using
    local bounded optimization, and return the exact analytic relative
    velocity at that instant (no finite-difference approximation).
    """
    from scipy.optimize import minimize_scalar

    def distance_at(t):
        pos_a, _ = state_vector_from_elements(elements_a, offset_a_s + t)
        pos_b, _ = state_vector_from_elements(elements_b, offset_b_s + t)
        return np.linalg.norm(pos_a - pos_b)

    lo = max(0.0, t_guess_s - half_window_s)
    hi = t_guess_s + half_window_s
    result = minimize_scalar(distance_at, bounds=(lo, hi), method="bounded",
                              options={"xatol": 1e-3})

    t_refined = result.x
    pos_a, vel_a = state_vector_from_elements(elements_a, offset_a_s + t_refined)
    pos_b, vel_b = state_vector_from_elements(elements_b, offset_b_s + t_refined)
    distance_km = float(np.linalg.norm(pos_a - pos_b))
    relative_velocity_km_s = float(np.linalg.norm(vel_a - vel_b))

    return t_refined, distance_km, relative_velocity_km_s
