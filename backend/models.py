from typing import List, Optional, Literal
from pydantic import BaseModel


# ---------- Scenario objects (Section 4.1) ----------

class OrbitalElements(BaseModel):
    semi_major_axis_km: float
    eccentricity: float
    inclination_deg: float
    raan_deg: float
    arg_perigee_deg: float
    mean_anomaly_deg: float
    epoch: str  # ISO 8601 UTC string


class ScenarioObject(BaseModel):
    id: str
    name: str
    type: Literal["satellite", "debris"]
    criticality: Literal["critical", "standard", "low"]
    orbital_elements: OrbitalElements


class ScenarioResponse(BaseModel):
    objects: List[ScenarioObject]


# ---------- GET /api/threats (Section 4.2) ----------

class Threat(BaseModel):
    id: str
    primary: str
    secondary: str
    tca: str  # ISO 8601 UTC string
    miss_distance_km: float
    relative_velocity_km_s: float
    risk_score: float  # 0.0 - 1.0
    severity: Literal["LOW", "MEDIUM", "HIGH"]


class ThreatsResponse(BaseModel):
    threats: List[Threat]


# ---------- POST /api/plan (Section 4.3) ----------

class PlanRequest(BaseModel):
    threat_id: str


class Candidate(BaseModel):
    id: str
    type: Literal["raise_orbit", "lower_orbit", "phase_shift", "wait"]
    delta_v_ms: float
    delay_min: float


class PlanResponse(BaseModel):
    threat_id: str
    candidates: List[Candidate]


# ---------- POST /api/simulate (Section 4.4) ----------

class SimulateRequest(BaseModel):
    threat_id: str
    plan_id: str


class SecondaryConflict(BaseModel):
    object: str
    miss_distance_km: float
    risk_score: float


class SimulateResponse(BaseModel):
    plan_id: str
    primary_resolved: bool
    secondary_conflicts: List[SecondaryConflict]
    closest_approach_km: float
    feasible: bool
    status: Literal["REJECTED", "SELECTED"]
    reason: str


# ---------- POST /api/decide (Section 4.5) ----------

class DecideRequest(BaseModel):
    threat_id: str


class Scores(BaseModel):
    safety: float
    secondary_conflicts: int
    delta_v_ms: float
    mission_criticality_weight: float
    total_score: float


class RejectedPlan(BaseModel):
    plan_id: str
    status: Literal["REJECTED", "SELECTED"]
    closest_approach_km: float
    reason: str


class Verification(BaseModel):
    status: Literal["SAFE", "FAILED"]
    closest_approach_km: float
    replans_used: int  # 0 or 1, never more (Section 2.4)


class DecideResponse(BaseModel):
    threat_id: str
    selected_plan: str
    scores: Scores
    rejected_plans: List[RejectedPlan]
    justification: str
    verification: Verification
    requires_human_approval: bool


# ---------- POST /api/approve (Section 4.6) ----------

class ApproveRequest(BaseModel):
    threat_id: str
    plan_id: str


class ApproveResponse(BaseModel):
    threat_id: str
    plan_id: str
    approved: bool
