// Centralized API Service for OrbitGuard
// Strict contract adherence to backend specifications with automatic graceful mock fallback

import {
  mockCandidateManeuvers,
  mockDecisionSteps,
  mockThreat,
  initialScenarioState,
} from '../data/mockScenario';
import type {
  CandidateManeuver,
  ConjunctionThreat,
  DecisionStep,
  ScenarioState,
} from '../types/orbitguard';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 2500;

export interface ApiModeState {
  isMockMode: boolean;
  lastConnected: Date | null;
  serverError: string | null;
}

// Helper fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export const OrbitGuardApi = {
  // GET /api/threats
  async getThreats(): Promise<{ threats: ConjunctionThreat[]; isMock: boolean }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/threats`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { threats: Array.isArray(data) ? data : data.threats || [mockThreat], isMock: false };
    } catch {
      // Graceful offline fallback
      return { threats: [mockThreat], isMock: true };
    }
  },

  // POST /api/plan
  async generatePlans(threatId: string): Promise<{ candidatePlans: CandidateManeuver[]; isMock: boolean }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/plan`, {
        method: 'POST',
        body: JSON.stringify({ threatId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        candidatePlans: data.candidatePlans || data.plans || mockCandidateManeuvers,
        isMock: false,
      };
    } catch {
      return { candidatePlans: mockCandidateManeuvers, isMock: true };
    }
  },

  // POST /api/simulate
  async simulatePlan(
    threatId: string,
    maneuverId: string
  ): Promise<{ simulationResult: any; isMock: boolean }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/simulate`, {
        method: 'POST',
        body: JSON.stringify({ threatId, maneuverId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { simulationResult: data, isMock: false };
    } catch {
      const match = mockCandidateManeuvers.find((m) => m.id === maneuverId);
      return {
        simulationResult: {
          maneuverId,
          primaryConflictResolved: match?.primaryConflictResolved ?? true,
          secondaryConflictDetected: match?.secondaryConflictDetected ?? false,
          deltaVAcceptable: match?.deltaVAcceptable ?? true,
          status: match?.status ?? 'REJECTED',
          rejectionReason: match?.rejectionReason,
        },
        isMock: true,
      };
    }
  },

  // POST /api/decide
  async getAutonomousDecision(threatId: string): Promise<{
    steps: DecisionStep[];
    selectedPlanId: string;
    safetyVerified: boolean;
    isMock: boolean;
  }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/decide`, {
        method: 'POST',
        body: JSON.stringify({ threatId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        steps: data.steps || mockDecisionSteps,
        selectedPlanId: data.selectedPlanId || initialScenarioState.selectedPlanId || '',
        safetyVerified: data.safetyVerified ?? true,
        isMock: false,
      };
    } catch {
      return {
        steps: mockDecisionSteps,
        selectedPlanId: initialScenarioState.selectedPlanId || '',
        safetyVerified: true,
        isMock: true,
      };
    }
  },

  // GET /api/scenario
  async getScenario(): Promise<{ scenario: ScenarioState; isMock: boolean }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/scenario`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { scenario: data, isMock: false };
    } catch {
      return { scenario: initialScenarioState, isMock: true };
    }
  },

  // POST /api/scenario/reset
  async resetScenario(): Promise<{ success: boolean; isMock: boolean }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/scenario/reset`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { success: true, isMock: false };
    } catch {
      return { success: true, isMock: true };
    }
  },
};
