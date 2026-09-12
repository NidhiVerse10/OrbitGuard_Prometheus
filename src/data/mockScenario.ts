// src/data/mockScenario.ts

import type {
  ManeuverPlan,
  Threat,
  DecisionTraceStep,
  OrbitalObject,
  OrbitalPoint,
  Scenario,
  GeminiReasoning,
  VerificationResult,
} from '../types/orbitguard';

/**
 * DEMO / FALLBACK DATA ONLY
 *
 * Backend remains the primary source of truth.
 * This data is used only when explicit mock mode is enabled.
 */

// ---------------------------------------------------------
// ORBIT TRACK GENERATOR
// ---------------------------------------------------------

function generateOrbitTrack(
  inclinationDeg: number,
  ascendingNodeLon: number,
  altitudeKm: number,
  steps = 72,
): OrbitalPoint[] {
  const points: OrbitalPoint[] = [];

  const incRad =
    (inclinationDeg * Math.PI) / 180;

  for (let i = 0; i <= steps; i++) {
    const u =
      (i / steps) * 2 * Math.PI;

    const latRad = Math.asin(
      Math.sin(incRad) * Math.sin(u),
    );

    const lonRad =
      Math.atan2(
        Math.cos(incRad) * Math.sin(u),
        Math.cos(u),
      ) +
      (ascendingNodeLon * Math.PI) / 180;

    const lat =
      (latRad * 180) / Math.PI;

    let lon =
      (lonRad * 180) / Math.PI;

    while (lon > 180) {
      lon -= 360;
    }

    while (lon < -180) {
      lon += 360;
    }

    points.push({
      lat,
      lon,
      altKm: altitudeKm,
      alt_km: altitudeKm,
    });
  }

  return points;
}

// ---------------------------------------------------------
// PRIMARY PROTECTED ASSET
// ---------------------------------------------------------

export const mockSat03: OrbitalObject = {
  id: 'SAT-03',
  name: 'SAT-03 // AEGIS-SENTINEL',
  shortName: 'SAT-03',

  roleLabel: 'PROTECTED ASSET',
  legendLabel:
    'SAT-03 Protected Asset (520 km)',

  noradId: 48921,
  norad_id: 48921,

  type: 'PAYLOAD',

  altitudeKm: 520,
  altitude_km: 520,

  inclinationDeg: 97.4,
  inclination_deg: 97.4,

  velocityKmS: 7.61,
  velocity_km_s: 7.61,

  currentPosition: {
    lat: 38.64,
    lon: -42.18,
    altKm: 520,
    alt_km: 520,
  },

  orbitTrajectory: generateOrbitTrack(
    97.4,
    -40,
    520,
  ),

  color: '#00f2fe',

  role: 'PRIMARY_ASSET',
  status: 'THREATENED',
};

// ---------------------------------------------------------
// SECONDARY FLEET
// ---------------------------------------------------------

export const mockSat05: OrbitalObject = {
  id: 'SAT-05',
  name: 'SAT-05 // TACTICAL RELAY',
  shortName: 'SAT-05',

  roleLabel: 'SISTER FLEET',
  legendLabel:
    'SAT-05 Sister Fleet (535 km)',

  counterfactualNotice:
    'Any posigrade orbit-raise candidate > +12 km triggers a secondary collision risk with SAT-05.',

  noradId: 49104,
  norad_id: 49104,

  type: 'PAYLOAD',

  altitudeKm: 535,
  altitude_km: 535,

  inclinationDeg: 97.4,
  inclination_deg: 97.4,

  velocityKmS: 7.55,
  velocity_km_s: 7.55,

  currentPosition: {
    lat: 42.15,
    lon: -39.4,
    altKm: 535,
    alt_km: 535,
  },

  orbitTrajectory: generateOrbitTrack(
    97.4,
    -36,
    535,
  ),

  color: '#ffb703',

  role: 'SECONDARY_FLEET',
  status: 'OPERATIONAL',
};

// ---------------------------------------------------------
// THREAT OBJECT
// ---------------------------------------------------------

export const mockObject17: OrbitalObject = {
  id: 'OBJECT-17',
  name: 'OBJECT-17 // COSMOS-2251 DEBRIS',
  shortName: 'OBJECT-17',

  roleLabel: 'THREAT DEBRIS',
  legendLabel:
    'OBJECT-17 Threat Debris (522 km)',

  noradId: 33762,
  norad_id: 33762,

  type: 'DEBRIS',

  altitudeKm: 522,
  altitude_km: 522,

  inclinationDeg: 74.0,
  inclination_deg: 74.0,

  velocityKmS: 7.58,
  velocity_km_s: 7.58,

  currentPosition: {
    lat: 38.82,
    lon: -42.02,
    altKm: 522,
    alt_km: 522,
  },

  orbitTrajectory: generateOrbitTrack(
    74.0,
    15,
    522,
  ),

  color: '#ff3366',

  role: 'THREAT_OBJECT',
  status: 'CONFLICT_RISK',
};

// ---------------------------------------------------------
// BACKGROUND ASSET
// ---------------------------------------------------------

export const mockSat01: OrbitalObject = {
  id: 'SAT-01',
  name: 'SAT-01 // SAR SENSOR',
  shortName: 'SAT-01',

  roleLabel: 'CONSTELLATION ASSET',
  legendLabel:
    'SAT-01 Constellation Asset (510 km)',

  noradId: 47210,
  norad_id: 47210,

  type: 'PAYLOAD',

  altitudeKm: 510,
  altitude_km: 510,

  inclinationDeg: 97.4,
  inclination_deg: 97.4,

  velocityKmS: 7.63,
  velocity_km_s: 7.63,

  currentPosition: {
    lat: -12.4,
    lon: 65.2,
    altKm: 510,
    alt_km: 510,
  },

  orbitTrajectory: generateOrbitTrack(
    97.4,
    70,
    510,
  ),

  color: '#00f59b',

  role: 'BACKGROUND',
  status: 'SAFE',
};

// ---------------------------------------------------------
// THREAT
// ---------------------------------------------------------

export const mockThreat: Threat = {
  id: 'THR-001',

  threat_id: 'THR-001',

  primary_object: 'SAT-03',

  secondary_object: 'OBJECT-17',

  threatenedSatId: 'SAT-03',

  threatenedSat: mockSat03,

  threatObjectId: 'OBJECT-17',

  threatObject: mockObject17,

  tca: '14:32:00 UTC',

  tcaUtc: '14:32:00 UTC',

  tcaCountdownSeconds: 874,

  miss_distance_km: 2.8,

  missDistanceKm: 2.8,

  relative_velocity_km_s: 7.4,

  relativeVelocityKmS: 7.4,

  risk_score: 0.91,

  riskScore: 0.91,

  /*
   * Kept only as optional legacy fallback data.
   * It is NOT required by the backend contract.
   */
  collision_probability: 4.8e-3,

  collisionProbability: 4.8e-3,

  severity: 'HIGH',

  riskSeverity: 'HIGH',

  status: 'HIGH RISK CONJUNCTION',

  conjunctionPoint: {
    lat: 38.7,
    lon: -42.1,
    altKm: 521,
    alt_km: 521,
  },

  encounter_geometry: {
    radial_miss_km: 0.9,
    in_track_miss_km: 2.4,
    cross_track_miss_km: 1.1,
  },

  encounterGeometry: {
    radialMissKm: 0.9,
    inTrackMissKm: 2.4,
    crossTrackMissKm: 1.1,
  },
};

// ---------------------------------------------------------
// CANDIDATE MANEUVERS
// ---------------------------------------------------------

export const mockCandidateManeuvers: ManeuverPlan[] = [
  {
    id: 'PLAN-1',

    planNumber: 1,

    plan_number: 1,

    name: 'PLAN-1 — RAISE ORBIT',

    type: 'RAISE_ORBIT',

    description:
      'Posigrade burn targeting +15 km apogee boost into 535 km shell.',

    delta_v_ms: 12.4,

    deltaVMs: 12.4,

    delay_window: '15 min',

    delay: '15 min',

    propellant_kg: 2.8,

    propellantKg: 2.8,

    deltaVAcceptable: true,

    primary_conflict: 'RESOLVED',

    primaryConflictResolved: true,

    secondary_conflicts: ['SAT-05'],

    secondaryConflictDetected: true,

    secondaryConflictDetail: {
      conflictSatId: 'SAT-05',

      conflictSatName:
        'SAT-05 (Tactical Relay)',

      missDistanceKm: 1.1,

      description:
        'Creates secondary conjunction with SAT-05 at T+42m (1.1 km miss distance).',
    },

    status: 'REJECTED',

    reason:
      'Creates a secondary conjunction with SAT-05.',

    rejectionReason:
      'Creates a secondary conjunction with SAT-05.',

    projectedTrajectory:
      generateOrbitTrack(
        97.4,
        -38,
        535,
      ),
  },

  {
    id: 'PLAN-2',

    planNumber: 2,

    plan_number: 2,

    name: 'PLAN-2 — LOWER ORBIT',

    type: 'LOWER_ORBIT',

    description:
      'Retrograde deceleration burn dropping perigee below threat altitude.',

    delta_v_ms: 48.6,

    deltaVMs: 48.6,

    delay_window: '22 min',

    delay: '22 min',

    propellant_kg: 11.2,

    propellantKg: 11.2,

    deltaVAcceptable: false,

    primary_conflict: 'RESOLVED',

    primaryConflictResolved: true,

    secondary_conflicts: [],

    secondaryConflictDetected: false,

    status: 'REJECTED',

    reason:
      'Delta-v / feasibility constraint exceeded (48.6 m/s required vs. 25.0 m/s budget).',

    rejectionReason:
      'Delta-v / feasibility constraint exceeded.',

    projectedTrajectory:
      generateOrbitTrack(
        97.4,
        -43,
        498,
      ),
  },

  {
    id: 'PLAN-3',

    planNumber: 3,

    plan_number: 3,

    name: 'PLAN-3 — PHASE SHIFT',

    type: 'PHASE_SHIFT',

    description:
      'Along-track radial phasing burn offsetting mean anomaly by 14.8 km.',

    delta_v_ms: 8.2,

    deltaVMs: 8.2,

    delay_window: '10 min',

    delay: '10 min',

    propellant_kg: 1.9,

    propellantKg: 1.9,

    deltaVAcceptable: true,

    primary_conflict: 'RESOLVED',

    primaryConflictResolved: true,

    secondary_conflicts: [],

    secondaryConflictDetected: false,

    status: 'SELECTED',

    reason:
      'Resolves primary conflict without secondary conflict. Fuel margin acceptable.',

    selectionReason:
      'Resolves primary conflict without secondary conflict.',

    projectedTrajectory:
      generateOrbitTrack(
        97.4,
        -40.8,
        520,
      ),
  },

  {
    id: 'PLAN-4',

    planNumber: 4,

    plan_number: 4,

    name: 'PLAN-4 — WAIT',

    type: 'WAIT',

    description:
      'Maintain passive nominal trajectory without thruster actuation.',

    delta_v_ms: 0,

    deltaVMs: 0,

    delay_window: 'N/A',

    delay: 'N/A',

    propellant_kg: 0,

    propellantKg: 0,

    deltaVAcceptable: true,

    primary_conflict: 'UNRESOLVED',

    primaryConflictResolved: false,

    secondary_conflicts: [],

    secondaryConflictDetected: false,

    status: 'REJECTED',

    reason:
      'Unsafe / infeasible. Conjunction risk remains unmitigated (2.8 km miss distance).',

    rejectionReason:
      'Unsafe / infeasible.',

    projectedTrajectory:
      generateOrbitTrack(
        97.4,
        -40,
        520,
      ),
  },
];

// ---------------------------------------------------------
// GEMINI FALLBACK REASONING
// ---------------------------------------------------------

export const mockGeminiReasoning: GeminiReasoning = {
  plan_id: 'PLAN-1',

  headline:
    'COUNTERFACTUAL CONFLICT DETECTED BY GEMINI REASONING',

  text:
    'PLAN-1 resolves the primary conjunction but introduces a secondary conflict with SAT-05. Therefore the maneuver is rejected.',

  implication:
    'Autonomous agent pruned candidate and redirected optimization to along-track phasing.',

  justification:
    'PLAN-1 is rejected because it resolves the primary conjunction but introduces a secondary conflict with SAT-05.',
};

// ---------------------------------------------------------
// VERIFIER FALLBACK RESULT
// ---------------------------------------------------------

export const mockVerificationResult: VerificationResult = {
  selected_plan: 'PLAN-3',

  primary_conflict: 'RESOLVED',

  secondary_conflicts: [],

  closest_approach_km: 14.8,

  verification_status: 'SAFE',

  verification_notes:
    'All constellation keep-out zones verified clean across 72h propagation horizon.',
};

// ---------------------------------------------------------
// DECISION TRACE
// ---------------------------------------------------------

export const mockDecisionSteps: DecisionTraceStep[] = [
  {
    id: 'AGENT-STEP-1',

    stepNumber: 1,

    agent: 'THREAT DETECTOR',

    timestamp: '14:17:32 UTC',

    title:
      '[THREAT DETECTOR] THREAT IDENTIFIED',

    status: 'COMPLETED',

    explanation:
      'Conjunction detected between SAT-03 and OBJECT-17 (COSMOS 2251 Debris).',

    keyValues: [
      {
        label: 'Primary Object',
        value: 'SAT-03',
      },
      {
        label: 'Secondary Object',
        value: 'OBJECT-17',
      },
      {
        label: 'Risk Score',
        value: '0.91',
        highlight: 'bad',
      },
      {
        label: 'Severity',
        value: 'HIGH',
        highlight: 'bad',
      },
    ],
  },

  {
    id: 'AGENT-STEP-2',

    stepNumber: 2,

    agent: 'MANEUVER PLANNER',

    timestamp: '14:17:36 UTC',

    title:
      '[MANEUVER PLANNER] 4 CANDIDATES GENERATED',

    status: 'COMPLETED',

    explanation:
      'Formulated 4 candidate orbital adjustments: Raise Orbit, Lower Orbit, Phase Shift, and Hold/Wait.',

    keyValues: [
      {
        label: 'Candidates',
        value: '4 Maneuver Options',
      },
      {
        label: 'Operational Envelope',
        value: 'LEO 520 km shell',
      },
      {
        label: 'Max ΔV Budget',
        value: '25.0 m/s',
      },
    ],
  },

  {
    id: 'AGENT-STEP-3',

    stepNumber: 3,

    agent: 'CONFLICT CHECKER',

    timestamp: '14:17:40 UTC',

    title:
      '[CONFLICT CHECKER] PLAN-1 SIMULATED & REJECTED',

    status: 'REJECTED',

    planId: 'PLAN-1',

    gemini_reasoning:
      mockGeminiReasoning,

    explanation:
      'PLAN-1 simulated. Primary conflict resolved, but secondary conflict detected with sister satellite SAT-05.',

    counterfactual: {
      testedSolution:
        'PLAN-1 (+15 km orbit raise)',

      discoveredProblem:
        'Introduced secondary conflict with SAT-05 (1.1 km miss distance)',

      autonomousAction:
        'Rejected candidate automatically; initiated counterfactual prune',
    },

    keyValues: [
      {
        label: 'Primary Conflict',
        value: 'RESOLVED',
        highlight: 'good',
      },
      {
        label: 'Secondary Conflict',
        value: 'SAT-05 (1.1 km)',
        highlight: 'bad',
      },
      {
        label: 'Status',
        value: 'REJECTED',
        highlight: 'bad',
      },
    ],
  },

  {
    id: 'AGENT-STEP-4',

    stepNumber: 4,

    agent: 'MISSION GUARDIAN',

    timestamp: '14:17:44 UTC',

    title:
      '[MISSION GUARDIAN] SAFETY CONSTRAINTS EVALUATED',

    status: 'REJECTED',

    planId: 'PLAN-2',

    explanation:
      'PLAN-2 simulated. Primary resolved, but ΔV requirement (48.6 m/s) breaches satellite fuel reserve ceiling (25.0 m/s limit). PLAN-2 rejected.',

    keyValues: [
      {
        label: 'Primary Conflict',
        value: 'RESOLVED',
        highlight: 'good',
      },
      {
        label: 'Required ΔV',
        value:
          '48.6 m/s (Limit: 25.0 m/s)',
        highlight: 'bad',
      },
      {
        label: 'Status',
        value: 'REJECTED',
        highlight: 'bad',
      },
    ],
  },

  {
    id: 'AGENT-STEP-5',

    stepNumber: 5,

    agent: 'COMMANDER',

    timestamp: '14:17:48 UTC',

    title:
      '[COMMANDER] PLAN-3 SELECTED',

    status: 'APPROVED',

    planId: 'PLAN-3',

    explanation:
      'PLAN-3 selected. Resolves primary conflict without secondary conflict. ΔV is 8.2 m/s (within budget).',

    keyValues: [
      {
        label: 'Selected Plan',
        value:
          'PLAN-3 — PHASE SHIFT',
        highlight: 'good',
      },
      {
        label: 'Secondary Conflicts',
        value: 'NONE',
        highlight: 'good',
      },
      {
        label: 'ΔV Cost',
        value:
          '8.2 m/s (Feasible)',
        highlight: 'good',
      },
    ],
  },

  {
    id: 'AGENT-STEP-6',

    stepNumber: 6,

    agent: 'VERIFIER',

    timestamp: '14:17:52 UTC',

    title:
      '[VERIFIER] FINAL MANEUVER VERIFICATION',

    status: 'SAFE',

    planId: 'PLAN-3',

    explanation:
      'Final ephemeris verification complete. Primary conflict resolved, 0 secondary fleet conjunctions, closest approach 14.8 km.',

    keyValues: [
      {
        label: 'Closest Approach',
        value: '14.8 km',
        highlight: 'good',
      },
      {
        label: 'Secondary Fleet Risk',
        value: 'NONE',
        highlight: 'good',
      },
      {
        label: 'Verification',
        value: 'SAFE',
        highlight: 'good',
      },
    ],
  },
];

// ---------------------------------------------------------
// FALLBACK TRAJECTORIES
// ---------------------------------------------------------

export const mockBeforeTrajectory: OrbitalPoint[] =
  mockSat03.orbitTrajectory ?? [];

export const mockAfterTrajectory: OrbitalPoint[] =
  mockCandidateManeuvers.find(
    (plan) => plan.id === 'PLAN-3',
  )?.projectedTrajectory ??
  mockBeforeTrajectory;

// ---------------------------------------------------------
// FALLBACK SCENARIO
// ---------------------------------------------------------

export const initialScenarioState: Scenario = {
  threat: mockThreat,

  assets: [
    mockSat03,
    mockObject17,
    mockSat05,
    mockSat01,
  ],

  objects: [
    mockSat03,
    mockObject17,
    mockSat05,
    mockSat01,
  ],

  secondaryConflictSat: mockSat05,

  secondary_conflict_sat: mockSat05,

  candidateManeuvers:
    mockCandidateManeuvers,

  candidate_plans:
    mockCandidateManeuvers,

  decisionSteps: [],

  decision_trace: [],

  /*
   * IMPORTANT:
   * The demo starts in the threat-detected state.
   * No maneuver is selected yet.
   */
  activeStepIndex: 0,

  selectedPlanId: null,

  activeInspectionPlanId: null,

  /*
   * Gemini reasoning is only populated after
   * autonomous evaluation.
   */
  geminiReasoning: null,

  /*
   * Do NOT start with SAFE verification.
   * The Verifier runs only after Commander selection.
   */
  verification: {
    selected_plan: '',

    primary_conflict: 'UNRESOLVED',

    secondary_conflicts: [],

    closest_approach_km: 0,

    verification_status: 'EVALUATING',

    verification_notes:
      'Awaiting autonomous maneuver evaluation.',
  },

  isEvaluating: false,

  isEvaluationComplete: false,

  operatorApproved: false,

  operatorApprovalTime: undefined,

  operatorNotes: undefined,

  visualizationMode: 'BEFORE',

  beforeTrajectory:
    mockBeforeTrajectory,

  afterTrajectory:
    mockAfterTrajectory,

  planScores: undefined,

  rejectedPlans: [],

  requiresHumanApproval: true,

  requires_human_approval: true,
};