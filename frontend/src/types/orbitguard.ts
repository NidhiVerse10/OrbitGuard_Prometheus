// src/types/orbitguard.ts
// OrbitGuard Core Types
// Autonomous Multi-Agent Conjunction Response System
//
// Backend API is the source of truth.
// Backend contract uses snake_case.
// Frontend-only aliases are optional and must never be
// required for backend integration.

// =========================================================
// THREAT
// =========================================================

export type ThreatSeverity =
  | 'CRITICAL'
  | 'HIGH'
  | 'MODERATE'
  | 'LOW';

export type ThreatStatus =
  | 'ACTIVE'
  | 'HIGH RISK CONJUNCTION'
  | 'ACTIVE_CONJUNCTION'
  | 'EVALUATING'
  | 'MITIGATED';

// =========================================================
// MANEUVER
// =========================================================

export type ManeuverType =
  | 'RAISE_ORBIT'
  | 'LOWER_ORBIT'
  | 'PHASE_SHIFT'
  | 'WAIT'
  | 'HOLD';

export type PlanStatus =
  | 'PENDING'
  | 'SIMULATING'
  | 'REJECTED'
  | 'SELECTED'
  | 'FEASIBLE';

// =========================================================
// AGENTS
// =========================================================

export type AgentRole =
  | 'THREAT DETECTOR'
  | 'MANEUVER PLANNER'
  | 'CONFLICT CHECKER'
  | 'MISSION GUARDIAN'
  | 'COMMANDER'
  | 'VERIFIER';

// =========================================================
// ORBITAL GEOMETRY
// =========================================================

export interface OrbitalPoint {
  lat: number;
  lon: number;

  // Frontend-normalized field
  altKm: number;

  // Optional backend-compatible alias
  alt_km?: number;
}

// =========================================================
// ORBITAL OBJECT
// =========================================================

export interface OrbitalObject {
  id: string;
  name: string;

  shortName?: string;

  type:
    | 'PAYLOAD'
    | 'DEBRIS'
    | 'ROCKET_BODY';

  // -------------------------------------------------------
  // Backend orbital fields
  // -------------------------------------------------------

  norad_id?: number;

  altitude_km?: number;

  inclination_deg?: number;

  velocity_km_s?: number;

  current_position?: OrbitalPoint;

  orbit_trajectory?: OrbitalPoint[];

  // -------------------------------------------------------
  // Frontend normalized aliases
  // -------------------------------------------------------

  noradId?: number;

  altitudeKm?: number;

  inclinationDeg?: number;

  velocityKmS?: number;

  currentPosition?: OrbitalPoint;

  orbitTrajectory?: OrbitalPoint[];

  // -------------------------------------------------------
  // UI metadata
  // These are frontend-only and are NOT part of the
  // frozen backend API contract.
  // -------------------------------------------------------

  color?: string;

  roleLabel?: string;

  counterfactualNotice?: string;

  legendLabel?: string;

  role?:
    | 'PRIMARY_ASSET'
    | 'SECONDARY_FLEET'
    | 'THREAT_OBJECT'
    | 'BACKGROUND';

  status?:
    | 'OPERATIONAL'
    | 'THREATENED'
    | 'SAFE'
    | 'CONFLICT_RISK';
}

// Backwards-compatible alias
export type OrbitalAsset = OrbitalObject;

// =========================================================
// THREAT
// =========================================================

export interface Threat {
  // -------------------------------------------------------
  // Frozen backend /api/threats contract
  // -------------------------------------------------------

  id: string;

  primary_object: string;

  secondary_object: string;

  tca: string;

  miss_distance_km: number;

  relative_velocity_km_s: number;

  risk_score: number;

  severity: ThreatSeverity;

  // -------------------------------------------------------
  // Optional backend identifier
  // -------------------------------------------------------

  threat_id?: string;

  // -------------------------------------------------------
  // Frontend-only normalized fields
  // -------------------------------------------------------

  threatenedSatId?: string;

  threatenedSat?: OrbitalObject;

  threatObjectId?: string;

  threatObject?: OrbitalObject;

  tcaUtc?: string;

  tcaCountdownSeconds?: number;

  missDistanceKm?: number;

  relativeVelocityKmS?: number;

  riskScore?: number;

  riskSeverity?: ThreatSeverity;

  conjunctionPoint?: OrbitalPoint;

  status?: ThreatStatus;

  // -------------------------------------------------------
  // Optional encounter geometry
  // -------------------------------------------------------

  encounter_geometry?: {
    radial_miss_km: number;
    in_track_miss_km: number;
    cross_track_miss_km: number;
  };

  encounterGeometry?: {
    radialMissKm: number;
    inTrackMissKm: number;
    crossTrackMissKm: number;
  };
}

// Backwards-compatible alias
export type ConjunctionThreat = Threat;

// =========================================================
// SECONDARY CONFLICT
// =========================================================

export interface SecondaryConflictDetail {
  conflictSatId: string;

  conflictSatName: string;

  missDistanceKm: number;

  description: string;
}

// =========================================================
// MANEUVER PLAN
// =========================================================

export interface ManeuverPlan {
  // -------------------------------------------------------
  // Frozen backend plan identity
  // -------------------------------------------------------

  id: string;

  plan_number?: number;

  name: string;

  type: ManeuverType;

  description: string;

  delta_v_ms: number;

  delay_window: string;

  propellant_kg: number;

  primary_conflict:
    | 'RESOLVED'
    | 'UNRESOLVED';

  /*
   * Frozen contract:
   *
   * secondary_conflicts is a collection.
   *
   * Empty array = no secondary conflicts.
   */
  secondary_conflicts: string[];

  // -------------------------------------------------------
  // Optional frontend aliases
  // -------------------------------------------------------

  planNumber?: number;

  deltaVMs?: number;

  delay?: string;

  propellantKg?: number;

  deltaVAcceptable?: boolean;

  primaryConflictResolved?: boolean;

  /*
   * Compatibility field only.
   *
   * The authoritative representation is
   * secondary_conflicts: string[].
   */
  secondaryConflictDetected?: boolean;

  secondaryConflictDetail?: SecondaryConflictDetail;

  rejectionReason?: string;

  selectionReason?: string;

  projected_trajectory?: OrbitalPoint[];

  projectedTrajectory?: OrbitalPoint[];

  status?: PlanStatus;

  reason?: string;
}

// Backwards-compatible alias
export type CandidateManeuver = ManeuverPlan;

// =========================================================
// GEMINI REASONING
// =========================================================

export interface GeminiReasoning {
  plan_id?: string;

  agent?: AgentRole;

  headline: string;

  text: string;

  confidence?: number;

  implication: string;

  justification?: string;
}

// =========================================================
// VERIFICATION
// =========================================================

export type VerificationStatus =
  | 'SAFE'
  | 'UNSAFE'
  | 'EVALUATING';

export interface VerificationResult {
  selected_plan: string;

  primary_conflict:
    | 'RESOLVED'
    | 'UNRESOLVED';

  /*
   * Backend normally returns a collection.
   *
   * "NONE" is retained only for compatibility with older
   * demo data.
   */
  secondary_conflicts:
    | string[]
    | string;

  closest_approach_km: number;

  verification_status: VerificationStatus;

  verification_notes: string;

  // -------------------------------------------------------
  // Optional frontend aliases
  // -------------------------------------------------------

  status?: VerificationStatus;

  reason?: string;
}

// =========================================================
// DECISION TRACE
// =========================================================

export type DecisionStepStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'APPROVED'
  | 'SAFE'

  // Legacy/lowercase compatibility
  | 'complete'
  | 'active'
  | 'queued'
  | 'running'
  | 'rejected'
  | 'approved'
  | 'safe';

export interface DecisionTraceStep {
  id: string;

  // -------------------------------------------------------
  // Optional numbering
  // -------------------------------------------------------

  stepNumber?: number;

  step_number?: number;

  // -------------------------------------------------------
  // Agent
  // -------------------------------------------------------

  agent: AgentRole;

  timestamp?: string;

  title: string;

  status: DecisionStepStatus;

  // -------------------------------------------------------
  // Explanation
  // -------------------------------------------------------

  explanation?: string;

  detail?: string;

  // -------------------------------------------------------
  // Plan association
  // -------------------------------------------------------

  planId?: string;

  planName?: string;

  // -------------------------------------------------------
  // Gemini reasoning
  // -------------------------------------------------------

  gemini_reasoning?: GeminiReasoning;

  // -------------------------------------------------------
  // Optional key-value telemetry
  // -------------------------------------------------------

  keyValues?: Array<{
    label: string;

    value: string;

    highlight?:
      | 'good'
      | 'bad'
      | 'neutral';
  }>;

  // -------------------------------------------------------
  // Counterfactual explanation
  // -------------------------------------------------------

  counterfactual?: {
    testedSolution: string;

    discoveredProblem: string;

    autonomousAction: string;
  };
}

// Backwards-compatible alias
export type DecisionStep = DecisionTraceStep;

// =========================================================
// SIMULATION
// =========================================================

export interface SimulationResult {
  // Backend traceability
  plan_id?: string;

  // -------------------------------------------------------
  // Primary conflict
  // -------------------------------------------------------

  primary_resolved?: boolean;

  primary_conflict_resolved?: boolean;

  // -------------------------------------------------------
  // Secondary conflicts
  // -------------------------------------------------------

  secondary_conflicts?: string[];

  secondary_conflict_detected?: boolean;

  secondary_conflict_object?: string;

  // -------------------------------------------------------
  // Simulation metrics
  // -------------------------------------------------------

  closest_approach_km?: number;

  feasible?: boolean;

  delta_v_acceptable?: boolean;

  // -------------------------------------------------------
  // Simulation status
  // -------------------------------------------------------

  status:
    | 'SAFE'
    | 'UNSAFE'
    | 'REJECTED'
    | 'FEASIBLE'
    | 'SELECTED';

  reason: string;

  // -------------------------------------------------------
  // Optional projected trajectory
  // -------------------------------------------------------

  trajectory?: OrbitalPoint[];
}

// =========================================================
// SCENARIO
// =========================================================

export interface Scenario {
  // -------------------------------------------------------
  // Core scenario data
  // -------------------------------------------------------

  threat: Threat;

  assets: OrbitalObject[];

  /*
   * Optional aliases used by some frontend components.
   */
  objects?: OrbitalObject[];

  secondaryConflictSat?: OrbitalObject;

  secondary_conflict_sat?: OrbitalObject;

  // -------------------------------------------------------
  // Candidate plans
  // -------------------------------------------------------

  candidateManeuvers: ManeuverPlan[];

  candidate_plans?: ManeuverPlan[];

  // -------------------------------------------------------
  // Decision trace
  // -------------------------------------------------------

  decisionSteps: DecisionTraceStep[];

  decision_trace?: DecisionTraceStep[];

  // -------------------------------------------------------
  // Evaluation state
  // -------------------------------------------------------

  activeStepIndex: number;

  selectedPlanId: string | null;

  activeInspectionPlanId: string | null;

  geminiReasoning: GeminiReasoning | null;

  verification: VerificationResult;

  isEvaluating: boolean;

  isEvaluationComplete: boolean;

  // -------------------------------------------------------
  // Human approval
  // -------------------------------------------------------

  operatorApproved: boolean;

  operatorApprovalTime?: string;

  operatorNotes?: string;

  // -------------------------------------------------------
  // Visualization
  // -------------------------------------------------------

  visualizationMode:
    | 'BEFORE'
    | 'AFTER';

  beforeTrajectory: OrbitalPoint[];

  afterTrajectory: OrbitalPoint[];

  // -------------------------------------------------------
  // Decision metadata
  // -------------------------------------------------------

  planScores?: Record<string, number>;

  rejectedPlans?: ManeuverPlan[];

  requiresHumanApproval?: boolean;

  requires_human_approval?: boolean;
}

// Backwards-compatible alias
export type ScenarioState = Scenario;

// =========================================================
// GENERIC API RESPONSE
// =========================================================

export interface ApiResponse<T> {
  success: boolean;

  data: T;

  message?: string;

  timestamp: string;
}