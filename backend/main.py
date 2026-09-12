"""
FastAPI app - route definitions only (Section 5.2).
All actual logic lives in propagation/conjunction/maneuver/simulator/commander.
"""

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import (
    ScenarioObject, ScenarioResponse, ThreatsResponse,
    PlanRequest, PlanResponse,
    SimulateRequest, SimulateResponse,
    DecideRequest, DecideResponse,
    ApproveRequest, ApproveResponse,
)
from conjunction import detect_threats
from maneuver import generate_candidates
from simulator import check_candidate
from agent_bridge import decide_via_agent_or_fallback

app = FastAPI(title="OrbitGuard Backend")

# Wide-open CORS for a local hackathon demo - frontend runs on a different port (Vite).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = Path(__file__).parent.parent / "data" / "mock_scenario.json"

# In-memory state (Section 2.2 - no database needed for a 24h demo)
_state = {"objects": []}


def _load_scenario():
    data = json.loads(DATA_PATH.read_text())
    _state["objects"] = [ScenarioObject(**o) for o in data["objects"]]


_load_scenario()


def _find_object(object_id: str) -> ScenarioObject:
    for obj in _state["objects"]:
        if obj.id == object_id:
            return obj
    raise HTTPException(status_code=404, detail=f"Object {object_id} not found")


def _current_threats():
    return detect_threats(_state["objects"])


def _find_threat(threat_id: str):
    threats = _current_threats()
    for t in threats:
        if t.id == threat_id:
            return t
    raise HTTPException(status_code=404, detail=f"Threat {threat_id} not found")


@app.get("/api/scenario", response_model=ScenarioResponse)
def get_scenario():
    return ScenarioResponse(objects=_state["objects"])


@app.post("/api/scenario/reset", response_model=ScenarioResponse)
def reset_scenario():
    _load_scenario()
    return ScenarioResponse(objects=_state["objects"])


@app.get("/api/threats", response_model=ThreatsResponse)
def get_threats():
    return ThreatsResponse(threats=_current_threats())


@app.post("/api/plan", response_model=PlanResponse)
def post_plan(request: PlanRequest):
    threat = _find_threat(request.threat_id)
    primary_obj = _find_object(threat.primary)
    candidates, _ = generate_candidates(primary_obj.orbital_elements)
    return PlanResponse(threat_id=request.threat_id, candidates=candidates)


@app.post("/api/simulate", response_model=SimulateResponse)
def post_simulate(request: SimulateRequest):
    threat = _find_threat(request.threat_id)
    return check_candidate(_state["objects"], threat, request.plan_id)


@app.post("/api/decide", response_model=DecideResponse)
def post_decide(request: DecideRequest):
    threat = _find_threat(request.threat_id)
    return decide_via_agent_or_fallback(_state["objects"], threat)


# Optional per Section 4.6 - can be frontend-only, but trivial to have here too.
@app.post("/api/approve", response_model=ApproveResponse)
def post_approve(request: ApproveRequest):
    return ApproveResponse(
        threat_id=request.threat_id,
        plan_id=request.plan_id,
        approved=True
    )
