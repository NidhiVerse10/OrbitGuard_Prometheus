import React from 'react';
import { Satellite, ShieldCheck, Gauge, Zap, Target, AlertTriangle } from 'lucide-react';

interface MissionStatsProps {
  conjunctionCount: number;
  threatenedAsset: string;
  collisionProb: number;
  missDistanceKm: number;
  riskScore: number;
}

export const MissionStats: React.FC<MissionStatsProps> = ({
  conjunctionCount,
  threatenedAsset,
  collisionProb,
  missDistanceKm,
  riskScore,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-4 py-1.5 bg-[#060913] border-b border-slate-800 text-xs font-mono">
      {/* 1. Target In Jeopardy */}
      <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/60 border border-slate-800">
        <Satellite className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <div className="truncate">
          <div className="text-[9px] text-slate-500 uppercase">PROTECTED ASSET</div>
          <div className="text-cyan-300 font-bold truncate text-[11px]">{threatenedAsset}</div>
        </div>
      </div>

      {/* 2. Active Conjunction Alert */}
      <div className="flex items-center gap-2 p-1.5 rounded bg-red-950/20 border border-red-900/40">
        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
        <div>
          <div className="text-[9px] text-red-400/80 uppercase">CONJUNCTION ALERTS</div>
          <div className="text-red-400 font-bold text-[11px]">{conjunctionCount} CRITICAL ALERT</div>
        </div>
      </div>

      {/* 3. Miss Distance */}
      <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/60 border border-slate-800">
        <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <div>
          <div className="text-[9px] text-slate-500 uppercase">MISS DISTANCE</div>
          <div className="text-amber-300 font-bold text-[11px]">{missDistanceKm} km</div>
        </div>
      </div>

      {/* 4. Collision Probability & Risk Score */}
      <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/60 border border-slate-800">
        <Gauge className="w-3.5 h-3.5 text-red-400 shrink-0" />
        <div>
          <div className="text-[9px] text-slate-500 uppercase">RISK SCORE // Pc</div>
          <div className="text-red-400 font-bold text-[11px]">{riskScore} // {collisionProb.toExponential(1)}</div>
        </div>
      </div>

      {/* 5. Autonomous Multi-Agent Latency */}
      <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/60 border border-slate-800">
        <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <div>
          <div className="text-[9px] text-slate-500 uppercase">AGENT PIPELINE</div>
          <div className="text-cyan-300 font-bold text-[11px]">6 AGENTS // 1.2s</div>
        </div>
      </div>

      {/* 6. Threshold Status */}
      <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/60 border border-slate-800">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <div>
          <div className="text-[9px] text-slate-500 uppercase">SAFETY ENVELOPE</div>
          <div className="text-emerald-400 font-bold text-[11px]">&gt; 5.0 km // SAFE</div>
        </div>
      </div>
    </div>
  );
};
