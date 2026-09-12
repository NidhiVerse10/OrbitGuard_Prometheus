// src/services/api.ts

import {
  initialScenarioState,
  mockCandidateManeuvers,
  mockDecisionSteps,
  mockThreat,
} from '../data/mockScenario';

import type {
  DecisionTraceStep,
  ManeuverPlan,
  ScenarioState,
  SimulationResult,
  Threat,
} from '../types/orbitguard';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const REQUEST_TIMEOUT_MS = 8000;

/**
 * Explicit demo/mock mode.
 *
 * Enable only when:
 *
 * VITE_ORBITGUARD_MOCK=true
 *
 * When this is false or absent, backend errors are surfaced
 * instead of silently switching to mock data.
 */
const EXPLICIT_MOCK_MODE =
  String(import.meta.env.VITE_ORBITGUARD_MOCK).toLowerCase() === 'true';

/* -------------------------------------------------------------------------- */
/*                               HTTP HELPERS                                 */
/* -------------------------------------------------------------------------- */

async function fetchWithTimeout(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();

  const timeout = window.setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(
      `API ${response.status}: ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return {};
}

function extractArray<T>(
  value: unknown,
  keys: string[] = [],
): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  const record = asRecord(value);

  for (const key of keys) {
    if (Array.isArray(record[key])) {
      return record[key] as T[];
    }
  }

  return [];
}

function reportApiError(
  endpoint: string,
  error: unknown,
): void {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  console.error(
    `[OrbitGuard API] ${endpoint} failed: ${message}`,
  );
}

/* -------------------------------------------------------------------------- */
/*                         DECISION TRACE MAPPING                             */
/* -------------------------------------------------------------------------- */

/**
 * The backend /api/decide response is the source of truth.
 *
 * Frozen response:
 *
 * {
 *   selected_plan,
 *   scores,
 *   rejected_plans,
 *   justification,
 *   verification,
 *   requires_human_approval
 * }
 *
 * The frontend converts that response into its DecisionTraceStep[].
 */
function buildDecisionTrace(
  selectedPlan: ManeuverPlan | undefined,
  scores: Record<string, number> | undefined,
  rejectedPlans: ManeuverPlan[],
  justification: string | undefined,
  verification: ScenarioState['verification'] | undefined,
): DecisionTraceStep[] {
  const steps: DecisionTraceStep[] = [];

  /* --------------------------- THREAT DETECTOR --------------------------- */

  steps.push({
    id: 'THREAT-DETECTOR',
    agent: 'THREAT DETECTOR',
    status: 'complete',
    title: 'Threat detected',
    detail:
      'Conjunction threat received from the backend threat assessment.',
  });

  /* -------------------------- MANEUVER PLANNER --------------------------- */

  const scoreCount = Object.keys(scores ?? {}).length;

  steps.push({
    id: 'MANEUVER-PLANNER',
    agent: 'MANEUVER PLANNER',
    status: selectedPlan ? 'complete' : 'active',
    title: selectedPlan
      ? 'Candidate maneuvers evaluated'
      : 'Generating candidate maneuvers',
    detail: selectedPlan
      ? `${scoreCount || 'Multiple'} candidate plan score(s) received.`
      : 'Waiting for maneuver planning result.',
  });

  /* -------------------------- CONFLICT CHECKER --------------------------- */

  steps.push({
    id: 'CONFLICT-CHECKER',
    agent: 'CONFLICT CHECKER',
    status: 'complete',
    title:
      rejectedPlans.length > 0
        ? 'Conflicting maneuvers rejected'
        : 'Candidate maneuvers checked',
    detail:
      rejectedPlans.length > 0
        ? `${rejectedPlans.length} maneuver(s) rejected after counterfactual conflict analysis.`
        : 'No rejected maneuver plans reported by the backend.',
  });

  /* -------------------------- MISSION GUARDIAN --------------------------- */

  steps.push({
    id: 'MISSION-GUARDIAN',
    agent: 'MISSION GUARDIAN',
    status: selectedPlan ? 'complete' : 'active',
    title: 'Mission constraints evaluated',
    detail: selectedPlan
      ? 'Selected maneuver satisfies the returned mission constraints.'
      : 'Waiting for the backend decision.',
  });

  /* ------------------------------ COMMANDER ------------------------------ */

  steps.push({
    id: 'COMMANDER',
    agent: 'COMMANDER',
    status: selectedPlan ? 'complete' : 'active',
    title: selectedPlan
      ? 'Maneuver selected'
      : 'Selecting maneuver',
    detail:
      justification ||
      (selectedPlan
        ? `Selected plan: ${selectedPlan.name || selectedPlan.id}.`
        : 'Waiting for final maneuver selection.'),
  });

  /* ------------------------------- VERIFIER ------------------------------ */

  /**
   * Frozen verification contract uses `verification_status`.
   *
   * `status` is retained only as a frontend compatibility fallback.
   */
  const verificationStatus =
    verification?.verification_status ??
    verification?.status;

  steps.push({
    id: 'VERIFIER',
    agent: 'VERIFIER',
    status:
      verificationStatus === 'SAFE'
        ? 'complete'
        : verification
          ? 'complete'
          : 'active',
    title:
      verificationStatus === 'SAFE'
        ? 'Verification SAFE'
        : verification
          ? 'Verification completed'
          : 'Awaiting final verification',
    detail:
      verification
        ? verification.reason ||
          `Verification status: ${
            verificationStatus ?? 'UNKNOWN'
          }.`
        : 'The selected maneuver has not yet been verified.',
  });

  return steps;
}

/* -------------------------------------------------------------------------- */
/*                              API SERVICE                                   */
/* -------------------------------------------------------------------------- */

export const OrbitGuardApi = {
  /* ---------------------------------------------------------------------- */
  /*                              SCENARIO                                  */
  /* ---------------------------------------------------------------------- */

  /**
   * GET /api/scenario
   */
  async getScenario(): Promise<{
    scenario: ScenarioState;
    isMock: boolean;
  }> {
    /*
     * Mock mode is explicit.
     * It is never entered automatically because of a backend failure.
     */
    if (EXPLICIT_MOCK_MODE) {
      return {
        scenario: initialScenarioState,
        isMock: true,
      };
    }

    try {
      const response =
        await fetchWithTimeout('/api/scenario');

      const value =
        await parseJson<unknown>(response);

      const record = asRecord(value);

      /*
       * Supports either:
       *
       * { scenario: {...} }
       *
       * or directly:
       *
       * {...scenario fields...}
       */
      const scenarioValue =
        record.scenario ?? value;

      return {
        scenario:
          scenarioValue as ScenarioState,
        isMock: false,
      };
    } catch (error) {
      reportApiError('/api/scenario', error);

      /*
       * Do NOT silently return mock data.
       */
      throw error;
    }
  },

  /* ---------------------------------------------------------------------- */
  /*                               THREATS                                  */
  /* ---------------------------------------------------------------------- */

  /**
   * GET /api/threats
   *
   * Frozen response:
   *
   * [
   *   {
   *     id,
   *     primary_object,
   *     secondary_object,
   *     tca,
   *     miss_distance_km,
   *     relative_velocity_km_s,
   *     risk_score,
   *     severity
   *   }
   * ]
   *
   * Or:
   *
   * {
   *   threats: [...]
   * }
   */
  async getThreats(): Promise<{
    threats: Threat[];
    isMock: boolean;
  }> {
    if (EXPLICIT_MOCK_MODE) {
      return {
        threats: [mockThreat],
        isMock: true,
      };
    }

    try {
      const response =
        await fetchWithTimeout('/api/threats');

      const value =
        await parseJson<unknown>(response);

      const threats =
        extractArray<Threat>(value, [
          'threats',
        ]);

      return {
        threats,
        isMock: false,
      };
    } catch (error) {
      reportApiError('/api/threats', error);

      /*
       * Backend failure is surfaced.
       * No automatic mock fallback.
       */
      throw error;
    }
  },

  /* ---------------------------------------------------------------------- */
  /*                               PLANNER                                  */
  /* ---------------------------------------------------------------------- */

  /**
   * POST /api/plan
   *
   * Frozen request:
   *
   * {
   *   "threat_id": "..."
   * }
   */
  async generatePlans(
    threatId: string,
  ): Promise<{
    plans: ManeuverPlan[];
    isMock: boolean;
  }> {
    if (EXPLICIT_MOCK_MODE) {
      return {
        plans: mockCandidateManeuvers,
        isMock: true,
      };
    }

    try {
      const response =
        await fetchWithTimeout('/api/plan', {
          method: 'POST',
          body: JSON.stringify({
            /*
             * IMPORTANT:
             * Frozen backend contract uses snake_case.
             */
            threat_id: threatId,
          }),
        });

      const value =
        await parseJson<unknown>(response);

      const plans =
        extractArray<ManeuverPlan>(value, [
          'candidate_plans',
          'plans',
        ]);

      return {
        plans,
        isMock: false,
      };
    } catch (error) {
      reportApiError('/api/plan', error);
      throw error;
    }
  },

  /* ---------------------------------------------------------------------- */
  /*                              SIMULATOR                                 */
  /* ---------------------------------------------------------------------- */

  /**
   * POST /api/simulate
   *
   * Frozen request:
   *
   * {
   *   "threat_id": "...",
   *   "plan_id": "..."
   * }
   */
  async simulatePlan(
    threatId: string,
    maneuverId: string,
  ): Promise<SimulationResult> {
    if (EXPLICIT_MOCK_MODE) {
      return {
        primary_resolved:
          maneuverId !== 'PLAN-4',

        secondary_conflicts: [],

        closest_approach_km: 12.4,

        feasible: true,

        status: 'SAFE',

        reason:
          'Controlled simulation mode.',
      };
    }

    try {
      const response =
        await fetchWithTimeout(
          '/api/simulate',
          {
            method: 'POST',

            body: JSON.stringify({
              /*
               * IMPORTANT:
               * Frozen backend contract uses snake_case.
               */
              threat_id: threatId,

              plan_id: maneuverId,
            }),
          },
        );

      return await parseJson<SimulationResult>(
        response,
      );
    } catch (error) {
      reportApiError('/api/simulate', error);
      throw error;
    }
  },

  /* ---------------------------------------------------------------------- */
  /*                               DECISION                                 */
  /* ---------------------------------------------------------------------- */

  /**
   * POST /api/decide
   *
   * Frozen request:
   *
   * {
   *   "threat_id": "..."
   * }
   *
   * Frozen response:
   *
   * {
   *   "selected_plan": {...},
   *   "scores": {...},
   *   "rejected_plans": [...],
   *   "justification": "...",
   *   "verification": {...},
   *   "requires_human_approval": true
   * }
   */
  async getAutonomousDecision(
    threatId: string,
  ): Promise<{
    selected_plan?: ManeuverPlan;
    selected_plan_id?: string;
    scores?: Record<string, number>;
    rejected_plans: ManeuverPlan[];
    justification?: string;
    verification?: ScenarioState['verification'];
    requires_human_approval: boolean;
    decisionSteps: DecisionTraceStep[];
    isMock: boolean;
  }> {
    /* ------------------------------ MOCK -------------------------------- */

    if (EXPLICIT_MOCK_MODE) {
      /*
       * ScenarioState stores only the selected plan ID.
       * Resolve the actual mock maneuver from the candidate list.
       */
      const selectedPlan =
        mockCandidateManeuvers.find(
          (plan) =>
            plan.id ===
            initialScenarioState.selectedPlanId,
        );

      const rejectedPlans =
        initialScenarioState.rejectedPlans ?? [];

      return {
        selected_plan: selectedPlan,

        selected_plan_id:
          selectedPlan?.id ??
          initialScenarioState.selectedPlanId ??
          undefined,

        scores:
          initialScenarioState.planScores,

        rejected_plans:
          rejectedPlans,

        justification:
          initialScenarioState.geminiReasoning
            ?.text,

        verification:
          initialScenarioState.verification,

        requires_human_approval: true,

        decisionSteps:
          mockDecisionSteps,

        isMock: true,
      };
    }

    /* ----------------------------- BACKEND ------------------------------- */

    try {
      const response =
        await fetchWithTimeout(
          '/api/decide',
          {
            method: 'POST',

            body: JSON.stringify({
              /*
               * IMPORTANT:
               * Frozen backend contract uses snake_case.
               */
              threat_id: threatId,
            }),
          },
        );

      const value =
        await parseJson<unknown>(response);

      const record =
        asRecord(value);

      /* ------------------------- selected_plan ------------------------- */

      const selectedPlan =
        record.selected_plan as
          | ManeuverPlan
          | undefined;

      /* ----------------------------- scores ----------------------------- */

      const scores =
        typeof record.scores === 'object' &&
        record.scores !== null &&
        !Array.isArray(record.scores)
          ? (
              record.scores as Record<
                string,
                number
              >
            )
          : undefined;

      /* ------------------------- rejected_plans ------------------------ */

      const rejectedPlans =
        extractArray<ManeuverPlan>(
          record.rejected_plans,
        );

      /* -------------------------- justification ------------------------ */

      const justification =
        typeof record.justification === 'string'
          ? record.justification
          : undefined;

      /* -------------------------- verification ------------------------- */

      const verification =
        record.verification as
          | ScenarioState['verification']
          | undefined;

      /* -------------------- human approval flag ------------------------ */

      const requiresHumanApproval =
        typeof record.requires_human_approval ===
        'boolean'
          ? record.requires_human_approval
          : true;

      /* ------------------------- selected plan ID ---------------------- */

      const selectedPlanId =
        selectedPlan?.id;

      /* ------------------------- decision trace ------------------------ */

      /*
       * The backend does NOT need to return frontend-only `steps`.
       *
       * We construct the frontend trace from the actual frozen response.
       */
      const decisionSteps =
        buildDecisionTrace(
          selectedPlan,
          scores,
          rejectedPlans,
          justification,
          verification,
        );

      return {
        selected_plan:
          selectedPlan,

        selected_plan_id:
          selectedPlanId,

        scores,

        rejected_plans:
          rejectedPlans,

        justification,

        verification,

        requires_human_approval:
          requiresHumanApproval,

        decisionSteps,

        isMock: false,
      };
    } catch (error) {
      reportApiError('/api/decide', error);

      /*
       * NEVER pretend a failed backend decision succeeded.
       */
      throw error;
    }
  },

  /* ---------------------------------------------------------------------- */
  /*                               APPROVAL                                 */
  /* ---------------------------------------------------------------------- */

  /**
   * POST /api/approve
   *
   * This endpoint is optional in the project contract.
   *
   * Request:
   *
   * {
   *   "threat_id": "...",
   *   "maneuver_id": "..."
   * }
   */
  async approveManeuver(
    threatId: string,
    maneuverId: string,
  ): Promise<{
    approved: boolean;
    isMock: boolean;
  }> {
    if (EXPLICIT_MOCK_MODE) {
      return {
        approved: true,
        isMock: true,
      };
    }

    try {
      const response =
        await fetchWithTimeout(
          '/api/approve',
          {
            method: 'POST',

            body: JSON.stringify({
              threat_id: threatId,
              maneuver_id: maneuverId,
            }),
          },
        );

      const value =
        await parseJson<unknown>(response);

      const record =
        asRecord(value);

      return {
        approved:
          record.approved === undefined
            ? true
            : Boolean(record.approved),

        isMock: false,
      };
    } catch (error) {
      reportApiError(
        '/api/approve',
        error,
      );

      /*
       * /api/approve is optional.
       *
       * Do not claim that the backend approved
       * something when the backend call failed.
       */
      return {
        approved: false,
        isMock: false,
      };
    }
  },

  /* ---------------------------------------------------------------------- */
  /*                              RESET                                     */
  /* ---------------------------------------------------------------------- */

  /**
   * POST /api/scenario/reset
   */
  async resetScenario(): Promise<{
    scenario: ScenarioState;
    isMock: boolean;
  }> {
    if (EXPLICIT_MOCK_MODE) {
      return {
        scenario: initialScenarioState,
        isMock: true,
      };
    }

    try {
      const response =
        await fetchWithTimeout(
          '/api/scenario/reset',
          {
            method: 'POST',
          },
        );

      /*
       * Make sure the reset request itself succeeded.
       */
      await parseJson<unknown>(response);

      /*
       * Fetch the actual reset scenario from backend.
       */
      return await this.getScenario();
    } catch (error) {
      reportApiError(
        '/api/scenario/reset',
        error,
      );

      /*
       * Do NOT silently switch to mock state.
       */
      throw error;
    }
  },
};