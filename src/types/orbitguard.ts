// OrbitGuard Core Types — Autonomous Multi-Agent Conjunction Response System
// Updated for Multi-Agent Workflow: Threat Detector, Maneuver Planner, Conflict Checker,
// Mission Guardian, Commander, and Verifier with Gemini Reasoning & Before/After Orbit Telemetry.

export type ThreatSeverity = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export type ManeuverType = 'RAISE_ORBIT' | 'LOWER_ORBIT' | 'PHASE_SHIFT' | 'WAIT' | 'HOLD';

export type PlanStatus = 'PENDING' | 'SIMULATING' | 'REJECTED' | 'SELECTED';

export type AgentRole =
  | 'THREAT DETECTOR'
  | 'MANEUVER PLANNER'
  | 'CONFLICT CHECKER'
  | 'MISSION GUARDIAN'
  | 'COMMANDER'
  | 'VERIFIER';

export interface OrbitalPoint {
  lat: number;
  lon: number;
  altKm: number;
  alt_km?: number;
}

export interface OrbitalObject {
  id: string;
  name: string;
  norad_id?: number;
  noradId?: number;
  type: 'PAYLOAD' | 'DEBRIS' | 'ROCKET_BODY';
  altitude_km: number;
  altitudeKm: number;
  inclination_deg: number;
  inclinationDeg: number;
  velocity_km_s: number;
  velocityKmS: number;
  current_position?: OrbitalPoint;
  currentPosition: OrbitalPoint;
  orbit_trajectory?: OrbitalPoint[];
  orbitTrajectory: OrbitalPoint[];
  color: string;
  shortName?: string;
  roleLabel?: string;
  counterfactualNotice?: string;
  legendLabel?: string;
  role?: 'PRIMARY_ASSET' | 'SECONDARY_FLEET' | 'THREAT_OBJECT' | 'BACKGROUND';
  status: 'OPERATIONAL' | 'THREATENED' | 'SAFE' | 'CONFLICT_RISK';
}

// Backwards-compatible alias
export type OrbitalAsset = OrbitalObject;

export interface Threat {
  id: string; // THR-001
  threat_id?: string;
  primary_object: string; // SAT-03
  secondary_object: string; // OBJECT-17 (COSMOS 2251 DEBRIS)
  threatenedSatId: string;
  threatenedSat: OrbitalObject;
  threatObjectId: string;
  threatObject: OrbitalObject;
  tca: string; // 14:32:00 UTC
  tcaUtc?: string;
  tcaCountdownSeconds?: number;
  miss_distance_km: number; // 2.8 km
  missDistanceKm: number;
  relative_velocity_km_s: number; // 7.4 km/s
  relativeVelocityKmS: number;
  risk_score: number; // 0.91
  riskScore: number;
  collision_probability: number;
  collisionProbability: number;
  severity: ThreatSeverity; // HIGH
  riskSeverity: ThreatSeverity;
  status: 'ACTIVE' | 'HIGH RISK CONJUNCTION' | 'ACTIVE_CONJUNCTION' | 'EVALUATING' | 'MITIGATED';
  conjunctionPoint?: OrbitalPoint;
  encounter_geometry?: {
    radial_miss_km: number;
    in_track_miss_km: number;
    cross_track_miss_km: number;
  };
  encounterGeometry: {
    radialMissKm: number;
    inTrackMissKm: number;
    crossTrackMissKm: number;
  };
}

// Backwards-compatible alias
export type ConjunctionThreat = Threat;

export interface ManeuverPlan {
  id: string; // PLAN-1, PLAN-2, PLAN-3, PLAN-4
  plan_number?: number;
  planNumber: number;
  name: string;
  type: ManeuverType;
  description: string;
  delta_v_ms: number;
  deltaVMs: number;
  delay_window: string; // e.g. "15 min"
  delay?: string;
  propellant_kg: number;
  propellantKg: number;
  deltaVAcceptable: boolean;
  primary_conflict: 'RESOLVED' | 'UNRESOLVED';
  primaryConflictResolved: boolean;
  secondary_conflicts: string; // "SAT-05" or "NONE"
  secondaryConflictDetected: boolean;
  secondaryConflictDetail?: {
    conflictSatId: string;
    conflictSatName: string;
    missDistanceKm: number;
    description: string;
  };
  status: PlanStatus;
  reason: string;
  rejectionReason?: string;
  selectionReason?: string;
  projected_trajectory?: OrbitalPoint[];
  projectedTrajectory: OrbitalPoint[];
}

// Backwards-compatible alias
export type CandidateManeuver = ManeuverPlan;

export interface GeminiReasoning {
  plan_id?: string;
  agent?: AgentRole;
  headline: string;
  text: string;
  confidence?: number;
  implication: string;
}

export interface VerificationResult {
  selected_plan: string;
  primary_conflict: 'RESOLVED';
  secondary_conflicts: 'NONE';
  closest_approach_km: number;
  verification_status: 'SAFE' | 'UNSAFE' | 'EVALUATING';
  verification_notes: string;
}

export interface DecisionTraceStep {
  id: string;
  stepNumber: number;
  step_number?: number;
  agent: AgentRole;
  timestamp: string;
  title: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'REJECTED' | 'APPROVED' | 'SAFE';
  explanation: string;
  planId?: string;
  planName?: string;
  gemini_reasoning?: GeminiReasoning;
  keyValues?: { label: string; value: string; highlight?: 'good' | 'bad' | 'neutral' }[];
  counterfactual?: {
    testedSolution: string;
    discoveredProblem: string;
    autonomousAction: string;
  };
}

// Backwards-compatible alias
export type DecisionStep = DecisionTraceStep;

export interface SimulationResult {
  plan_id: string;
  primary_conflict_resolved: boolean;
  secondary_conflict_detected: boolean;
  secondary_conflict_object?: string;
  delta_v_acceptable: boolean;
  status: 'REJECTED' | 'FEASIBLE' | 'SELECTED';
  reason: string;
  trajectory?: OrbitalPoint[];
}

export interface Scenario {
  threat: Threat;
  assets: OrbitalObject[];
  objects?: OrbitalObject[];
  secondaryConflictSat: OrbitalObject;
  secondary_conflict_sat?: OrbitalObject;
  candidateManeuvers: ManeuverPlan[];
  candidate_plans?: ManeuverPlan[];
  decisionSteps: DecisionTraceStep[];
  decision_trace?: DecisionTraceStep[];
  activeStepIndex: number;
  selectedPlanId: string | null;
  activeInspectionPlanId: string | null;
  geminiReasoning: GeminiReasoning | null;
  verification: VerificationResult;
  isEvaluating: boolean;
  isEvaluationComplete: boolean;
  operatorApproved: boolean;
  operatorApprovalTime?: string;
  operatorNotes?: string;
  visualizationMode: 'BEFORE' | 'AFTER';
  beforeTrajectory: OrbitalPoint[];
  afterTrajectory: OrbitalPoint[];
}

// Backwards-compatible alias
export type ScenarioState = Scenario;

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}
