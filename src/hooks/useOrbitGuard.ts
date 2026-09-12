import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import { initialScenarioState } from '../data/mockScenario';
import { OrbitGuardApi } from '../services/api';

import type {
  ManeuverPlan,
  Scenario,
} from '../types/orbitguard';

export function useOrbitGuard() {
  const [scenario, setScenario] =
    useState<Scenario>(initialScenarioState);

  const [activeStepIndex, setActiveStepIndex] =
    useState(0);

  const [isEvaluating, setIsEvaluating] =
    useState(false);

  const [isMockMode, setIsMockMode] =
    useState(false);

  const [apiError, setApiError] =
    useState<string | null>(null);

  const [
    activeInspectionPlanId,
    setActiveInspectionPlanId,
  ] = useState<string | null>(null);

  const [
    visualizationMode,
    setVisualizationMode,
  ] = useState<'BEFORE' | 'AFTER'>('BEFORE');

  const [
    secondaryConflictActive,
    setSecondaryConflictActive,
  ] = useState(false);

  const [
    operatorApproved,
    setOperatorApproved,
  ] = useState(false);

  const [
    operatorModalOpen,
    setOperatorModalOpen,
  ] = useState(false);

  const [zuluTime, setZuluTime] =
    useState('');

  const evaluationTimerRef =
    useRef<number | null>(null);

  /* ---------------------------------------------------------------------- */
  /*                              ZULU CLOCK                                */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      const hours = String(
        now.getUTCHours(),
      ).padStart(2, '0');

      const mins = String(
        now.getUTCMinutes(),
      ).padStart(2, '0');

      const secs = String(
        now.getUTCSeconds(),
      ).padStart(2, '0');

      setZuluTime(
        `${hours}:${mins}:${secs} UTC`,
      );
    };

    updateTime();

    const interval =
      window.setInterval(updateTime, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  /*                         LOAD SCENARIO                                  */
  /* ---------------------------------------------------------------------- */

  const loadScenario = useCallback(
    async () => {
      try {
        setApiError(null);

        const response =
          await OrbitGuardApi.getScenario();

        const loadedScenario =
          response.scenario;

        setScenario(loadedScenario);

        setIsMockMode(response.isMock);

        setActiveStepIndex(
          loadedScenario.activeStepIndex ?? 0,
        );

        setActiveInspectionPlanId(
          loadedScenario.activeInspectionPlanId ??
            null,
        );

        setOperatorApproved(
          loadedScenario.operatorApproved ??
            false,
        );

        setVisualizationMode(
          loadedScenario.visualizationMode ??
            'BEFORE',
        );

        setSecondaryConflictActive(false);

        /*
         * IMPORTANT:
         *
         * Loading a scenario must NOT start autonomous
         * evaluation automatically.
         *
         * Evaluation starts only when the user invokes
         * startAutonomousEvaluation().
         */
        setIsEvaluating(
          loadedScenario.isEvaluating ?? false,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load ORBITGUARD scenario.';

        console.error(
          '[ORBITGUARD] Scenario load failed:',
          error,
        );

        setApiError(message);

        /*
         * Backend failure is NOT silently converted
         * into mock mode.
         */
        setScenario(initialScenarioState);

        setIsMockMode(false);

        setIsEvaluating(false);

        setActiveStepIndex(0);

        setActiveInspectionPlanId(null);

        setOperatorApproved(false);

        setVisualizationMode('BEFORE');

        setSecondaryConflictActive(false);
      }
    },
    [],
  );

  /*
   * This only loads the scenario.
   *
   * It does NOT call startAutonomousEvaluation().
   */
  useEffect(() => {
    void loadScenario();
  }, [loadScenario]);

  /* ---------------------------------------------------------------------- */
  /*                     SELECT PLAN FOR INSPECTION                         */
  /* ---------------------------------------------------------------------- */

  const selectPlanForInspection =
    useCallback(
      (planId: string) => {
        const plan =
          scenario.candidateManeuvers.find(
            (candidate) =>
              candidate.id === planId,
          );

        if (!plan) {
          return;
        }

        setActiveInspectionPlanId(planId);

        setSecondaryConflictActive(
          Array.isArray(
            plan.secondary_conflicts,
          ) &&
            plan.secondary_conflicts.length > 0,
        );
      },
      [scenario.candidateManeuvers],
    );

  /* ---------------------------------------------------------------------- */
  /*                 AUTONOMOUS MULTI-AGENT EVALUATION                     */
  /* ---------------------------------------------------------------------- */

  const startAutonomousEvaluation =
    useCallback(async () => {
      if (isEvaluating) {
        return;
      }

      const threatId =
        scenario.threat?.id;

      if (!threatId) {
        setApiError(
          'No active conjunction threat is available for evaluation.',
        );
        return;
      }

      if (
        evaluationTimerRef.current !== null
      ) {
        window.clearInterval(
          evaluationTimerRef.current,
        );

        evaluationTimerRef.current = null;
      }

      setApiError(null);

      setIsEvaluating(true);

      setActiveStepIndex(0);

      setActiveInspectionPlanId(null);

      setSecondaryConflictActive(false);

      setOperatorApproved(false);

      setVisualizationMode('BEFORE');

      /*
       * Reset the scenario into the beginning of
       * autonomous evaluation.
       */
      setScenario((previous) => ({
        ...previous,

        decisionSteps: [],

        decision_trace: [],

        selectedPlan: null,

        selectedPlanId: null,

        activeInspectionPlanId: null,

        rejectedPlans: [],

        planScores: undefined,

        geminiReasoning: null,

        verification: {
          selected_plan: '',

          primary_conflict: 'UNRESOLVED',

          verification_status: 'EVALUATING',

          status: 'EVALUATING',

          reason:
            'Awaiting multi-agent evaluation.',

          verification_notes:
            'The Verifier has not yet evaluated a selected maneuver.',

          closest_approach_km: 0,

          secondary_conflicts: [],
        },

        isEvaluating: true,

        isEvaluationComplete: false,

        operatorApproved: false,

        visualizationMode: 'BEFORE',
      }));

      try {
        /*
         * Backend contract:
         *
         * POST /api/decide
         *
         * {
         *   threat_id: threatId
         * }
         */
        const decisionResponse =
          await OrbitGuardApi.getAutonomousDecision(
            threatId,
          );

        /*
         * These values come from the actual backend
         * response through api.ts.
         */
        const steps =
          decisionResponse.decisionSteps ?? [];

        const selectedPlan =
          decisionResponse.selected_plan ?? null;

        const selectedPlanId =
          decisionResponse.selected_plan_id ??
          selectedPlan?.id ??
          null;

        const rejectedPlans =
          decisionResponse.rejected_plans ?? [];

        const planScores =
          decisionResponse.scores;

        const justification =
          decisionResponse.justification;

        /*
         * A successful backend decision should contain
         * an agent trace.
         */
        if (steps.length === 0) {
          throw new Error(
            'Decision engine returned no agent trace steps.',
          );
        }

        setIsMockMode(
          decisionResponse.isMock,
        );

        /*
         * Backend selected_plan is authoritative.
         */
        setScenario((previous) => ({
          ...previous,

          decisionSteps: steps,

          decision_trace: steps,

          selectedPlan,

          selectedPlanId,

          activeInspectionPlanId:
            selectedPlanId,

          rejectedPlans,

          planScores,

          geminiReasoning:
            justification
              ? {
                  headline:
                    'GEMINI MISSION ASSESSMENT',

                  text: justification,

                  implication: justification,
                }
              : null,

          verification:
            decisionResponse.verification ??
            previous.verification,

          requiresHumanApproval:
            decisionResponse.requires_human_approval,

          requires_human_approval:
            decisionResponse.requires_human_approval,

          isEvaluating: true,

          isEvaluationComplete: false,

          operatorApproved: false,

          visualizationMode: 'BEFORE',
        }));

        /*
         * Backend decision is already complete.
         *
         * The timer only animates the agent trace
         * for the UI/demo.
         */

        let currentStep = 0;

        setActiveStepIndex(0);

        evaluationTimerRef.current =
          window.setInterval(() => {
            currentStep += 1;

            if (
              currentStep < steps.length
            ) {
              setActiveStepIndex(
                currentStep,
              );

              const step =
                steps[currentStep];

              if (step.planId) {
                setActiveInspectionPlanId(
                  step.planId,
                );

                const plan =
                  scenario.candidateManeuvers.find(
                    (candidate) =>
                      candidate.id ===
                      step.planId,
                  );

                setSecondaryConflictActive(
                  Boolean(
                    step.counterfactual ||
                      (
                        Array.isArray(
                          plan?.secondary_conflicts,
                        ) &&
                        plan.secondary_conflicts
                          .length > 0
                      ),
                  ),
                );
              } else {
                setSecondaryConflictActive(
                  false,
                );
              }

              return;
            }

            /*
             * Trace animation finished.
             */
            if (
              evaluationTimerRef.current !==
              null
            ) {
              window.clearInterval(
                evaluationTimerRef.current,
              );

              evaluationTimerRef.current = null;
            }

            setActiveStepIndex(
              steps.length - 1,
            );

            setIsEvaluating(false);

            setActiveInspectionPlanId(
              selectedPlanId,
            );

            setSecondaryConflictActive(false);

            /*
             * Final authoritative state.
             */
            setScenario((previous) => ({
              ...previous,

              decisionSteps: steps,

              decision_trace: steps,

              selectedPlan,

              selectedPlanId,

              activeInspectionPlanId:
                selectedPlanId,

              rejectedPlans,

              planScores,

              geminiReasoning:
                justification
                  ? {
                      headline:
                        'GEMINI MISSION ASSESSMENT',

                      text: justification,

                      implication:
                        justification,
                    }
                  : null,

              verification:
                decisionResponse.verification ??
                previous.verification,

              requiresHumanApproval:
                decisionResponse.requires_human_approval,

              requires_human_approval:
                decisionResponse.requires_human_approval,

              isEvaluating: false,

              isEvaluationComplete: true,

              operatorApproved: false,

              visualizationMode: 'BEFORE',
            }));
          }, 1500);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Autonomous evaluation failed.';

        console.error(
          '[ORBITGUARD] Autonomous evaluation failed:',
          error,
        );

        if (
          evaluationTimerRef.current !== null
        ) {
          window.clearInterval(
            evaluationTimerRef.current,
          );

          evaluationTimerRef.current = null;
        }

        setApiError(message);

        setIsEvaluating(false);

        setActiveStepIndex(0);

        setActiveInspectionPlanId(null);

        setSecondaryConflictActive(false);

        /*
         * Backend failure must remain visible.
         *
         * Do NOT convert the failure into mock mode.
         */
        setScenario((previous) => ({
          ...previous,

          decisionSteps: [],

          decision_trace: [],

          selectedPlan: null,

          selectedPlanId: null,

          activeInspectionPlanId: null,

          rejectedPlans: [],

          planScores: undefined,

          geminiReasoning: null,

          verification: {
            selected_plan: '',

            primary_conflict: 'UNRESOLVED',

            verification_status: 'EVALUATING',

            status: 'EVALUATING',

            reason:
              'Autonomous evaluation failed.',

            verification_notes:
              'Backend decision unavailable.',

            closest_approach_km: 0,

            secondary_conflicts: [],
          },

          isEvaluating: false,

          isEvaluationComplete: false,

          operatorApproved: false,

          visualizationMode: 'BEFORE',
        }));
      }
    }, [
      isEvaluating,
      scenario.threat,
      scenario.candidateManeuvers,
    ]);

  /* ---------------------------------------------------------------------- */
  /*                         TIMER CLEANUP                                  */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    return () => {
      if (
        evaluationTimerRef.current !== null
      ) {
        window.clearInterval(
          evaluationTimerRef.current,
        );

        evaluationTimerRef.current = null;
      }
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  /*                              RESET                                     */
  /* ---------------------------------------------------------------------- */

  const resetScenario =
    useCallback(async () => {
      if (
        evaluationTimerRef.current !== null
      ) {
        window.clearInterval(
          evaluationTimerRef.current,
        );

        evaluationTimerRef.current = null;
      }

      setIsEvaluating(false);

      setApiError(null);

      setOperatorApproved(false);

      setOperatorModalOpen(false);

      setSecondaryConflictActive(false);

      setVisualizationMode('BEFORE');

      setActiveStepIndex(0);

      setActiveInspectionPlanId(null);

      try {
        const response =
          await OrbitGuardApi.resetScenario();

        setScenario(response.scenario);

        setIsMockMode(response.isMock);

        setIsEvaluating(
          response.scenario.isEvaluating ??
            false,
        );

        setActiveStepIndex(
          response.scenario.activeStepIndex ??
            0,
        );

        setActiveInspectionPlanId(
          response.scenario
            .activeInspectionPlanId ??
            null,
        );

        setVisualizationMode(
          response.scenario
            .visualizationMode ??
            'BEFORE',
        );

        setOperatorApproved(
          response.scenario
            .operatorApproved ??
            false,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to reset ORBITGUARD scenario.';

        console.error(
          '[ORBITGUARD] Scenario reset failed:',
          error,
        );

        setApiError(message);

        setScenario(initialScenarioState);

        /*
         * Backend failure is not mock mode.
         */
        setIsMockMode(false);

        setIsEvaluating(false);

        setActiveStepIndex(0);

        setActiveInspectionPlanId(null);

        setOperatorApproved(false);

        setVisualizationMode('BEFORE');

        setSecondaryConflictActive(false);
      }
    }, []);

  /* ---------------------------------------------------------------------- */
  /*                         OPERATOR APPROVAL                              */
  /* ---------------------------------------------------------------------- */

  const approveManeuver =
    useCallback(async () => {
      const selectedPlanId =
        scenario.selectedPlanId;

      if (!selectedPlanId) {
        setApiError(
          'No maneuver has been selected for approval.',
        );
        return;
      }

      const verificationStatus =
        scenario.verification
          ?.verification_status ??
        scenario.verification?.status;

      if (
        verificationStatus !== 'SAFE'
      ) {
        setApiError(
          'Maneuver cannot be approved until Verifier status is SAFE.',
        );
        return;
      }

      const threatId =
        scenario.threat?.id;

      if (!threatId) {
        setApiError(
          'No active conjunction threat is available for approval.',
        );
        return;
      }

      try {
        setApiError(null);

        const response =
          await OrbitGuardApi.approveManeuver(
            threatId,
            selectedPlanId,
          );

        if (!response.approved) {
          setApiError(
            'Maneuver approval was rejected or could not be confirmed by the backend.',
          );
          return;
        }

        setOperatorApproved(true);

        setOperatorModalOpen(false);

        setVisualizationMode('AFTER');

        setActiveInspectionPlanId(
          selectedPlanId,
        );

        setScenario((previous) => ({
          ...previous,

          operatorApproved: true,

          visualizationMode: 'AFTER',

          activeInspectionPlanId:
            selectedPlanId,
        }));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Maneuver approval failed.';

        console.error(
          '[ORBITGUARD] Maneuver approval failed:',
          error,
        );

        setApiError(message);
      }
    }, [
      scenario.selectedPlanId,
      scenario.threat,
      scenario.verification,
    ]);

  /* ---------------------------------------------------------------------- */
  /*                        BEFORE / AFTER                                  */
  /* ---------------------------------------------------------------------- */

  const toggleVisualizationMode =
    useCallback(() => {
      setVisualizationMode(
        (previous) =>
          previous === 'BEFORE'
            ? 'AFTER'
            : 'BEFORE',
      );
    }, []);

  /* ---------------------------------------------------------------------- */
  /*                            ACTIVE PLAN                                 */
  /* ---------------------------------------------------------------------- */

  const activePlan:
    | ManeuverPlan
    | undefined =
    scenario.candidateManeuvers.find(
      (plan) =>
        plan.id ===
        (
          activeInspectionPlanId ??
          scenario.selectedPlanId
        ),
    );

  /* ---------------------------------------------------------------------- */
  /*                              RETURN                                    */
  /* ---------------------------------------------------------------------- */

  return {
    scenario,

    activeStepIndex,

    isEvaluating,

    isMockMode,

    apiError,

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

    loadScenario,
  };
}