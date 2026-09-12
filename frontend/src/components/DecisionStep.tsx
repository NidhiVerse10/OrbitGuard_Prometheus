import React from 'react';
import type { DecisionTraceStep as IDecisionStep } from '../types/orbitguard';
import { StatusBadge } from './StatusBadge';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  GitBranch,
} from 'lucide-react';

interface DecisionStepProps {
  step: IDecisionStep;
  isActive: boolean;
  isPast: boolean;
  onClick: () => void;
}

export const DecisionStep: React.FC<DecisionStepProps> = ({
  step,
  isActive,
  isPast,
  onClick,
}) => {
  const isRejected = step.status === 'REJECTED';
  const isSafe = step.status === 'SAFE' || step.status === 'APPROVED';
  const isCounterfactual = !!step.counterfactual;

  return (
    <div
      onClick={onClick}
      className={`relative pl-7 pb-3 font-mono text-xs cursor-pointer transition-all ${
        isActive
          ? 'scale-[1.01]'
          : isPast
          ? 'opacity-90 hover:opacity-100'
          : 'opacity-40 hover:opacity-70'
      }`}
    >
      {/* Timeline track line */}
      <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-800" />

      {/* Step node icon */}
      <div
        className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center border text-[11px] font-bold z-10 ${
          isRejected
            ? 'bg-red-950 border-red-500 text-red-300 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
            : isSafe
            ? 'bg-emerald-950 border-emerald-400 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
            : isActive
            ? 'bg-cyan-950 border-cyan-400 text-cyan-300 animate-pulse shadow-[0_0_8px_rgba(0,242,254,0.4)]'
            : isPast
            ? 'bg-slate-900 border-slate-700 text-slate-400'
            : 'bg-slate-950 border-slate-800 text-slate-600'
        }`}
      >
        {isRejected ? (
          <XCircle className="w-3.5 h-3.5 text-red-400" />
        ) : isSafe ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <span>{step.stepNumber}</span>
        )}
      </div>

      {/* Main Step Content Box */}
      <div
        className={`p-3 rounded border transition-all ${
          isActive
            ? 'bg-[#0a1224] border-cyan-500/80 shadow-[0_0_15px_rgba(0,242,254,0.15)]'
            : isRejected
            ? 'bg-red-950/15 border-red-900/40 hover:border-red-700/60'
            : isSafe
            ? 'bg-emerald-950/15 border-emerald-900/40 hover:border-emerald-700/60'
            : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
        }`}
      >
        {/* Step Header with Agent Tag */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold text-[10px] border border-cyan-900/50">
              [{step.agent}]
            </span>
            <span
              className={`font-bold text-xs ${
                isRejected
                  ? 'text-red-400'
                  : isSafe
                  ? 'text-emerald-300'
                  : isActive
                  ? 'text-cyan-300'
                  : 'text-slate-200'
              }`}
            >
              {step.title.replace(/^\[.*?\]\s*/, '')}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {step.timestamp}
            </span>
            <StatusBadge status={step.status} />
          </div>
        </div>

        {/* Step Explanation */}
        <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
          {step.explanation}
        </p>

        {/* Gemini Reasoning Representation Box (when attached to step) */}
        {step.gemini_reasoning && (
          <div className="p-2.5 rounded bg-cyan-950/25 border border-cyan-800/50 mb-2 text-[10px]">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>GEMINI REASONING SYNTHESIS</span>
            </div>
            <p className="text-slate-200 italic leading-relaxed mb-1">
              "{step.gemini_reasoning.text}"
            </p>
            <div className="text-[9px] text-cyan-300/80 font-mono">
              IMPLICATION: {step.gemini_reasoning.implication}
            </div>
          </div>
        )}

        {/* Counterfactual Self-Check Box */}
        {isCounterfactual && step.counterfactual && (
          <div
            className={`p-2.5 rounded border mb-2 text-[10px] ${
              isRejected
                ? 'bg-red-950/30 border-red-500/40 text-red-200'
                : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider mb-1.5 text-[9px] text-amber-300">
              <GitBranch className="w-3 h-3 text-amber-400" />
              <span>COUNTERFACTUAL SELF-CHECK DISCOVERY</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-start gap-1">
                <span className="text-slate-400 shrink-0">1. Tested solution:</span>
                <span className="font-semibold text-slate-200">
                  {step.counterfactual.testedSolution}
                </span>
              </div>
              <div className="flex items-start gap-1">
                <span className="text-amber-400 shrink-0">2. Discovered issue:</span>
                <span
                  className={`font-bold ${
                    isRejected ? 'text-red-400' : 'text-emerald-300'
                  }`}
                >
                  {step.counterfactual.discoveredProblem}
                </span>
              </div>
              <div className="flex items-start gap-1">
                <span className="text-cyan-400 shrink-0">3. Autonomous action:</span>
                <span className="font-semibold text-cyan-300">
                  {step.counterfactual.autonomousAction}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Numerical Telemetry Values Grid */}
        {step.keyValues && step.keyValues.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded bg-black/50 border border-slate-800/80 text-[10px]">
            {step.keyValues.map((kv, idx) => (
              <div key={idx} className="p-1 rounded bg-slate-900/60">
                <span className="text-[9px] text-slate-500 block truncate">
                  {kv.label}
                </span>
                <span
                  className={`font-semibold truncate block ${
                    kv.highlight === 'good'
                      ? 'text-emerald-400 font-bold'
                      : kv.highlight === 'bad'
                      ? 'text-red-400 font-bold'
                      : 'text-slate-200'
                  }`}
                >
                  {kv.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
