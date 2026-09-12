import React from 'react';
import { useOrbitGuard } from './hooks/useOrbitGuard';
import { Header } from './components/Header';
import { MissionStats } from './components/MissionStats';
import { ThreatPanel } from './components/ThreatPanel';
import { GlobeView } from './components/GlobeView';
import { DecisionTrace } from './components/DecisionTrace';
import { ErrorBoundary } from './components/ErrorBoundary';

export const App: React.FC = () => {
  const {
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
    selectPlanForInspection,
    startAutonomousEvaluation,
    resetScenario,
    approveManeuver,
    toggleVisualizationMode,
    setActiveStepIndex,
    setIsMockMode,
  } = useOrbitGuard();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#040711] text-slate-100 font-sans">
      {/* 1. Aerospace Mission Control Header */}
      <Header
        threat={scenario.threat}
        zuluTime={zuluTime}
        isEvaluating={isEvaluating}
        isMockMode={isMockMode}
        operatorApproved={operatorApproved}
        onTriggerEvaluation={startAutonomousEvaluation}
        onReset={resetScenario}
        onToggleMode={() => setIsMockMode((prev) => !prev)}
      />

      {/* 2. Top Telemetry Ribbon */}
      <MissionStats
        conjunctionCount={1}
        threatenedAsset={scenario.threat.primary_object}
        collisionProb={scenario.threat.collision_probability}
        missDistanceKm={scenario.threat.miss_distance_km}
        riskScore={scenario.threat.risk_score}
      />

      {/* 3. Core 3-Panel Operations Dashboard */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Panel: Threat & Mission Alerts */}
        <ErrorBoundary fallbackTitle="THREAT MONITOR ERROR">
          <ThreatPanel
            threat={scenario.threat}
            assets={scenario.assets}
            secondarySat={scenario.secondaryConflictSat}
          />
        </ErrorBoundary>

        {/* Center Panel: 3D Orbital Visualization Globe */}
        <ErrorBoundary fallbackTitle="3D ORBITAL GLOBE ERROR">
          <GlobeView
            threat={scenario.threat}
            assets={scenario.assets}
            secondarySat={scenario.secondaryConflictSat}
            activePlan={activePlan}
            activeStepIndex={activeStepIndex}
            visualizationMode={visualizationMode}
            secondaryConflictActive={secondaryConflictActive}
            onToggleVisualization={toggleVisualizationMode}
          />
        </ErrorBoundary>

        {/* Right Panel: Multi-Agent Decision Trace */}
        <ErrorBoundary fallbackTitle="DECISION TRACE ERROR">
          <DecisionTrace
            steps={scenario.decisionSteps}
            activeStepIndex={activeStepIndex}
            candidateManeuvers={scenario.candidateManeuvers}
            activeInspectionPlanId={activeInspectionPlanId}
            geminiReasoning={scenario.geminiReasoning}
            verification={scenario.verification}
            isEvaluating={isEvaluating}
            operatorApproved={operatorApproved}
            visualizationMode={visualizationMode}
            onStepClick={(idx) => setActiveStepIndex(idx)}
            onInspectPlan={selectPlanForInspection}
            onApproveManeuver={approveManeuver}
            onToggleVisualization={toggleVisualizationMode}
          />
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default App;
