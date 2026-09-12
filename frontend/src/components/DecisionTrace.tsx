import React from 'react';
import type {
  ManeuverPlan,
  DecisionTraceStep as IDecisionStep,
  GeminiReasoning,
  VerificationResult,
} from '../types/orbitguard';
import { DecisionStep } from './DecisionStep';
import { ManeuverCard } from './ManeuverCard';
import { StatusBadge } from './StatusBadge';
import {
  BrainCircuit,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface DecisionTraceProps {
  steps: IDecisionStep[];
  activeStepIndex: number;
  candidateManeuvers: ManeuverPlan[];
  activeInspectionPlanId: string | null;
  geminiReasoning: GeminiReasoning | null;
  verification: VerificationResult;
  isEvaluating: boolean;
  operatorApproved: boolean;
  visualizationMode: 'BEFORE' | 'AFTER';
  onStepClick: (index: number) => void;
  onInspectPlan: (planId: string) => void;
  onApproveManeuver: () => void;
  onToggleVisualization: () => void;
}

export const DecisionTrace: React.FC<DecisionTraceProps> = ({
  steps,
  activeStepIndex,
  candidateManeuvers,
  activeInspectionPlanId,
  geminiReasoning,
  verification,
  isEvaluating,
  operatorApproved,
  visualizationMode,
  onStepClick,
  onInspectPlan,
  onApproveManeuver,
  onToggleVisualization,
}) => {
  // Verification is safe if step index reached verifier stage and is not evaluating
  const isVerificationSafe =
    !isEvaluating &&
    activeStepIndex >= 5 &&
    verification.verification_status === 'SAFE';

  return (
    <aside className="w-full lg:w-[480px] flex flex-col gap-3 p-3 bg-[#060913] border-l border-slate-800 overflow-y-auto max-h-full font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-200 uppercase">
          <BrainCircuit className="w-4 h-4 text-cyan-400" />
          <span>MULTI-AGENT DECISION ENGINE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">
            PHASE {activeStepIndex + 1}/{steps.length}
          </span>
          <StatusBadge
            status={
              isEvaluating
                ? 'EVALUATING'
                : operatorApproved
                ? 'APPROVED'
                : isVerificationSafe
                ? 'SAFE'
                : 'PENDING'
            }
          />
        </div>
      </div>

      {/* Gemini Reasoning Synthesis Callout */}
      {geminiReasoning && (
        <div className="p-3 rounded border border-cyan-800/60 bg-[#071326]/70 shadow-[0_0_12px_rgba(0,242,254,0.1)]">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase tracking-wider mb-1.5 text-[10px]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>GEMINI-POWERED REASONING SYNTHESIS</span>
          </div>
          <p className="text-slate-100 text-[11px] leading-relaxed mb-1.5 font-sans italic">
            "{geminiReasoning.text}"
          </p>
          <div className="text-[9px] text-cyan-400/90 font-mono">
            {geminiReasoning.implication}
          </div>
        </div>
      )}

      {/* Multi-Agent Decision Pipeline Steps */}
      <div className="space-y-0.5 mt-1">
        {steps.map((step, idx) => (
          <DecisionStep
            key={step.id}
            step={step}
            isActive={idx === activeStepIndex}
            isPast={idx <= activeStepIndex}
            onClick={() => onStepClick(idx)}
          />
        ))}
      </div>

      {/* Candidate Maneuvers Section */}
      <div className="mt-2 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            CANDIDATE MANEUVERS
          </span>
          <span className="text-[9px] text-slate-500">CLICK TO INSPECT ORBIT</span>
        </div>

        <div className="space-y-2">
          {candidateManeuvers.map((maneuver) => (
            <ManeuverCard
              key={maneuver.id}
              maneuver={maneuver}
              isSelected={maneuver.id === activeInspectionPlanId}
              onInspect={onInspectPlan}
            />
          ))}
        </div>
      </div>

      {/* Dedicated FINAL VERIFICATION Section (Appears before approval control) */}
      <div className="mt-2 pt-2 border-t border-slate-800">
        <div className="p-3 rounded border border-slate-700 bg-slate-950/90">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              FINAL VERIFICATION // {verification.selected_plan}
            </span>
            <StatusBadge status={isVerificationSafe ? 'SAFE' : 'EVALUATING'} />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] mb-2">
            <div>
              <span className="text-slate-500 block uppercase">PRIMARY CONFLICT:</span>
              <span className="text-emerald-400 font-bold">{verification.primary_conflict}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase">SECONDARY CONFLICTS:</span>
              <span className="text-emerald-400 font-bold">{verification.secondary_conflicts}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase">CLOSEST APPROACH:</span>
              <span className="text-slate-200 font-bold">{verification.closest_approach_km} km</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase">VERIFICATION:</span>
              <span className="text-emerald-300 font-bold">{isVerificationSafe ? 'SAFE' : 'PENDING'}</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed">
            {verification.verification_notes}
          </p>
        </div>
      </div>

      {/* Human Approval Control (Item 7: APPROVE MANEUVER) */}
      <div className="mt-auto pt-2 border-t border-slate-800">
        {operatorApproved ? (
          <div className="p-3 rounded border border-emerald-500/50 bg-emerald-950/30 text-emerald-300 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs uppercase">MANEUVER APPROVED</span>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-900/60 font-bold">
                SIMULATION ACTIVE
              </span>
            </div>

            <p className="text-[10px] text-slate-300">
              Autonomous phase-shift burn confirmed. Orbit visualization updated to post-maneuver trajectory.
            </p>

            {/* Before / After Toggle Button */}
            <button
              onClick={onToggleVisualization}
              className="w-full py-1.5 px-2 rounded border border-cyan-700 bg-slate-900 text-cyan-300 font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Layers className="w-3 h-3" />
              <span>
                VIEWING: {visualizationMode === 'AFTER' ? 'AFTER (SAFE TRAJECTORY)' : 'BEFORE (CONJUNCTION)'} — CLICK TO TOGGLE
              </span>
            </button>
          </div>
        ) : (
          <div className="p-3 rounded border border-slate-800 bg-[#0a101f] space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-amber-400 uppercase font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" />
                OPERATOR APPROVAL REQUIRED
              </span>
              <span className="text-slate-500">HUMAN-IN-THE-LOOP</span>
            </div>

            <button
              onClick={onApproveManeuver}
              disabled={!isVerificationSafe || isEvaluating}
              className={`w-full py-2.5 px-3 rounded font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isVerificationSafe && !isEvaluating
                  ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>APPROVE MANEUVER</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-[9px] text-slate-500 text-center uppercase tracking-widest">
              SIMULATION ACTION ONLY — NO REAL SPACECRAFT COMMAND TRANSMITTED
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
