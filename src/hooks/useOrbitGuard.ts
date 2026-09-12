import { useState, useEffect, useCallback, useRef } from 'react';
import { initialScenarioState } from '../data/mockScenario';
import { OrbitGuardApi } from '../services/api';
import type { ManeuverPlan, Scenario } from '../types/orbitguard';

export function useOrbitGuard() {
  const [scenario, setScenario] = useState<Scenario>(initialScenarioState);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(5); // 0-indexed, default fully verified
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isMockMode, setIsMockMode] = useState<boolean>(true);
  const [activeInspectionPlanId, setActiveInspectionPlanId] = useState<string | null>(
    initialScenarioState.selectedPlanId
  );
  const [visualizationMode, setVisualizationMode] = useState<'BEFORE' | 'AFTER'>('BEFORE');
  const [secondaryConflictActive, setSecondaryConflictActive] = useState<boolean>(false);
  const [operatorApproved, setOperatorApproved] = useState<boolean>(false);
  const [operatorModalOpen, setOperatorModalOpen] = useState<boolean>(false);
  const [zuluTime, setZuluTime] = useState<string>('');

  const evaluationTimerRef = useRef<number | null>(null);

  // Zulu Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const mins = String(now.getUTCMinutes()).padStart(2, '0');
      const secs = String(now.getUTCSeconds()).padStart(2, '0');
      setZuluTime(`${hours}:${mins}:${secs} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initial check against backend
  const checkBackend = useCallback(async () => {
    try {
      const res = await OrbitGuardApi.getThreats();
      setIsMockMode(res.isMock);
    } catch {
      setIsMockMode(true);
    }
  }, []);

  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  // Handle plan inspection selection
  const selectPlanForInspection = useCallback((planId: string) => {
    setActiveInspectionPlanId(planId);
    const plan = scenario.candidateManeuvers.find((p) => p.id === planId);
    setSecondaryConflictActive(Boolean(plan?.secondaryConflictDetected));
  }, [scenario.candidateManeuvers]);

  // Autonomous Multi-Agent Decision Animation Sequence
  const startAutonomousEvaluation = useCallback(async () => {
    if (isEvaluating) return;
    setIsEvaluating(true);
    setActiveStepIndex(0);
    setActiveInspectionPlanId(null);
    setSecondaryConflictActive(false);
    setOperatorApproved(false);
    setVisualizationMode('BEFORE');

    let activeSteps = scenario.decisionSteps;

    // In live backend mode, query backend /api/decide
    if (!isMockMode) {
      try {
        const decisionRes = await OrbitGuardApi.getAutonomousDecision(scenario.threat.id);
        if (decisionRes.steps && decisionRes.steps.length > 0) {
          activeSteps = decisionRes.steps;
          setScenario((prev) => ({
            ...prev,
            decisionSteps: decisionRes.steps,
            selectedPlanId: decisionRes.selectedPlanId,
          }));
        }
      } catch (err) {
        console.warn('Backend decide call failed, falling back to deterministic agent trace:', err);
      }
    }

    let currentStep = 0;
    const totalSteps = activeSteps.length;

    if (evaluationTimerRef.current) {
      clearInterval(evaluationTimerRef.current);
    }

    // Step pacing: ~1.5s per agent step for clarity during demonstrations
    evaluationTimerRef.current = window.setInterval(() => {
      currentStep++;
      if (currentStep < totalSteps) {
        setActiveStepIndex(currentStep);

        const step = activeSteps[currentStep];
        if (step.planId) {
          setActiveInspectionPlanId(step.planId);
          const plan = scenario.candidateManeuvers.find((p) => p.id === step.planId);
          setSecondaryConflictActive(Boolean(plan?.secondaryConflictDetected || step.counterfactual));
        }
      } else {
        if (evaluationTimerRef.current) {
          clearInterval(evaluationTimerRef.current);
          evaluationTimerRef.current = null;
        }
        setIsEvaluating(false);
        setActiveStepIndex(totalSteps - 1);
        setActiveInspectionPlanId(scenario.selectedPlanId);
        setSecondaryConflictActive(false);
      }
    }, 1500);
  }, [isEvaluating, isMockMode, scenario.candidateManeuvers, scenario.decisionSteps, scenario.selectedPlanId, scenario.threat.id]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (evaluationTimerRef.current) {
        clearInterval(evaluationTimerRef.current);
      }
    };
  }, []);

  // Reset scenario
  const resetScenario = useCallback(async () => {
    if (evaluationTimerRef.current) {
      clearInterval(evaluationTimerRef.current);
      evaluationTimerRef.current = null;
    }
    setIsEvaluating(false);
    await OrbitGuardApi.resetScenario();
    setScenario(initialScenarioState);
    setActiveStepIndex(0);
    setActiveInspectionPlanId(null);
    setSecondaryConflictActive(false);
    setOperatorApproved(false);
    setVisualizationMode('BEFORE');
  }, []);

  // Operator Action: APPROVE MANEUVER
  const approveManeuver = useCallback(() => {
    setOperatorApproved(true);
    setOperatorModalOpen(false);
    // Transition to AFTER trajectory visualization
    setVisualizationMode('AFTER');
    setActiveInspectionPlanId(scenario.selectedPlanId);
  }, [scenario.selectedPlanId]);

  // Toggle before / after manually
  const toggleVisualizationMode = useCallback(() => {
    setVisualizationMode((prev) => (prev === 'BEFORE' ? 'AFTER' : 'BEFORE'));
  }, []);

  // Current active inspected plan
  const activePlan: ManeuverPlan | undefined = scenario.candidateManeuvers.find(
    (p) => p.id === (activeInspectionPlanId || scenario.selectedPlanId)
  );

  return {
    scenario,
    activeStepIndex,
    isEvaluating,
    isMockMode,
    zuluTime,
    activeInspectionPlanId,
    activePlan,
    visualizationMode,
    secondaryConflictActive,
    operatorApproved,
    operatorModalOpen,
    setOperatorModalOpen,
    selectPlanForInspection,
    startAutonomousEvaluation,
    resetScenario,
    approveManeuver,
    toggleVisualizationMode,
    setActiveStepIndex,
    setIsMockMode,
  };
}
