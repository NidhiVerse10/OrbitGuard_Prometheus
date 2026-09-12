import React from 'react';
import type { Threat } from '../types/orbitguard';
import { Play, RotateCcw, ShieldAlert, Cpu, Radio, Activity, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  threat: Threat;
  zuluTime: string;
  isEvaluating: boolean;
  isMockMode: boolean;
  operatorApproved: boolean;
  onTriggerEvaluation: () => void;
  onReset: () => void;
  onToggleMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  threat,
  zuluTime,
  isEvaluating,
  isMockMode,
  operatorApproved,
  onTriggerEvaluation,
  onReset,
  onToggleMode,
}) => {
  return (
    <header className="border-b border-slate-800 bg-[#060913] px-4 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2 z-20 select-none">
      {/* Left: System Identification & Mission Console */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-slate-900 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Radio className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-widest text-slate-100 uppercase font-mono">
                ORBITGUARD
              </h1>
              <span className="text-[9px] bg-cyan-950 text-cyan-300 font-mono px-1.5 py-0.2 rounded border border-cyan-800">
                MULTI-AGENT SSA
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wider uppercase font-mono">
              Autonomous Conjunction Response Console
            </p>
          </div>
        </div>

        {/* Controlled Simulation Prototype Tag */}
        <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-slate-800 text-[10px] font-mono text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span className="text-slate-300 font-semibold tracking-wider uppercase">
            CONTROLLED SIMULATION SCENARIO
          </span>
          <span className="text-slate-500">//</span>
          <span className="text-slate-500 uppercase">
            DECISION-SUPPORT PROTOTYPE — NOT FLIGHT-CERTIFIED
          </span>
        </div>
      </div>

      {/* Center: Real-time Conjunction Threat Indicator */}
      <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="text-red-400 font-semibold">CONJUNCTION:</span>
          <span className="text-slate-200">{threat.primary_object} // {threat.secondary_object}</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>RADAR FEED:</span>
          <span className="text-emerald-400">LOCKED</span>
        </div>

        {operatorApproved ? (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>MANEUVER APPROVED // SIMULATION ACTIVE</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-950/30 border border-amber-500/30 text-amber-300 text-[11px]">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>AWAITING OPERATOR APPROVAL</span>
          </div>
        )}
      </div>

      {/* Right: Controls, Mode Toggle & Zulu Clock */}
      <div className="flex items-center gap-3">
        {/* Source Mode Switcher */}
        <button
          onClick={onToggleMode}
          title="Click to toggle REST API vs. Mock Scenario"
          className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <Cpu className="w-3 h-3 text-cyan-400" />
          <span>{isMockMode ? 'MOCK SCENARIO' : 'LIVE REST API'}</span>
        </button>

        {/* Action Buttons */}
        <button
          onClick={onTriggerEvaluation}
          disabled={isEvaluating}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-bold tracking-wider uppercase border transition-all ${
            isEvaluating
              ? 'bg-cyan-950 text-cyan-300 border-cyan-700 cursor-wait'
              : 'bg-cyan-500 text-black border-cyan-400 hover:bg-cyan-400'
          }`}
        >
          <Play className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : 'fill-black'}`} />
          <span>{isEvaluating ? 'SIMULATING...' : 'RUN AI DECISION'}</span>
        </button>

        <button
          onClick={onReset}
          disabled={isEvaluating}
          title="Reset Conjunction Scenario"
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono text-slate-300 border border-slate-800 bg-slate-900 hover:bg-slate-800 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">RESET</span>
        </button>

        {/* Zulu Clock */}
        <div className="pl-3 border-l border-slate-800 text-right font-mono">
          <div className="text-xs font-bold text-cyan-400 tracking-wider">
            {zuluTime || '00:00:00 UTC'}
          </div>
          <div className="text-[9px] text-slate-500 tracking-widest uppercase">
            ZULU TIME
          </div>
        </div>
      </div>
    </header>
  );
};
