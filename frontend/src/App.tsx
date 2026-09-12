import React from 'react';
import { useOrbitGuard } from './hooks/useOrbitGuard';
import Header from './components/Header';
import { MissionStats } from './components/MissionStats';
import ThreatPanel from './components/ThreatPanel';
import { GlobeView } from './components/GlobeView';
import { DecisionTrace } from './components/DecisionTrace';
import { ErrorBoundary } from './components/ErrorBoundary';

export const App: React.FC = () => {
  const {
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
    selectPlanForInspection,
    startAutonomousEvaluation,
    resetScenario,
    approveManeuver,
    toggleVisualizationMode,
    setActiveStepIndex,
    setIsMockMode,
  } = useOrbitGuard();

  /*
   * The scenario contains one active conjunction threat.
   * Do not reference scenario.threats because the frozen
   * Scenario contract exposes scenario.threat.
   */
  const conjunctionCount =
    scenario.threat ? 1 : 0;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#040711] text-slate-100 font-sans">

      {/* Mission Control Header */}
      <Header
        threat={scenario.threat}
        zuluTime={zuluTime}
        isEvaluating={isEvaluating}
        isMockMode={isMockMode}
        operatorApproved={operatorApproved}
        onTriggerEvaluation={
          startAutonomousEvaluation
        }
        onReset={resetScenario}
        onToggleMode={() =>
          setIsMockMode((prev) => !prev)
        }
      />

      {/* API / Runtime Error */}
      {apiError && (
        <div className="shrink-0 border-b border-red-500/40 bg-red-950/40 px-4 py-2 font-mono text-xs text-red-300">
          <span className="mr-2 text-red-400">
            SYSTEM ERROR
          </span>
          {apiError}
        </div>
      )}

      {/* Telemetry Ribbon */}
      <MissionStats
        conjunctionCount={conjunctionCount}
        threatenedAsset={
          scenario.threat.primary_object
        }
        missDistanceKm={
          scenario.threat.miss_distance_km
        }
        riskScore={
          scenario.threat.risk_score
        }
      />

      {/* Core Operations Dashboard */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">

        {/* Left: Threat Monitor */}
        <ErrorBoundary
          fallbackTitle="THREAT MONITOR ERROR"
        >
          <ThreatPanel
            threat={scenario.threat}
            assets={scenario.assets}
            secondarySat={
              scenario.secondaryConflictSat
            }
          />
        </ErrorBoundary>

        {/* Center: Orbital Visualization */}
        <ErrorBoundary
          fallbackTitle="3D ORBITAL GLOBE ERROR"
        >
          <GlobeView
            threat={scenario.threat}
            assets={scenario.assets}
            secondarySat={
              scenario.secondaryConflictSat
            }
            activePlan={activePlan}
            activeStepIndex={activeStepIndex}
            visualizationMode={
              visualizationMode
            }
            secondaryConflictActive={
              secondaryConflictActive
            }
            onToggleVisualization={
              toggleVisualizationMode
            }
          />
        </ErrorBoundary>

        {/* Right: Multi-Agent Decision Trace */}
        <ErrorBoundary
          fallbackTitle="DECISION TRACE ERROR"
        >
          <DecisionTrace
            steps={scenario.decisionSteps}
            activeStepIndex={
              activeStepIndex
            }
            candidateManeuvers={
              scenario.candidateManeuvers
            }
            activeInspectionPlanId={
              activeInspectionPlanId
            }
            geminiReasoning={
              scenario.geminiReasoning
            }
            verification={
              scenario.verification
            }
            isEvaluating={
              isEvaluating
            }
            operatorApproved={
              operatorApproved
            }
            visualizationMode={
              visualizationMode
            }
            onStepClick={(idx) =>
              setActiveStepIndex(idx)
            }
            onInspectPlan={
              selectPlanForInspection
            }
            onApproveManeuver={
              approveManeuver
            }
            onToggleVisualization={
              toggleVisualizationMode
            }
          />
        </ErrorBoundary>

      </main>
    </div>
  );
};

export default App;