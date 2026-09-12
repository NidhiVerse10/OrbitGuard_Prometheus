import React from 'react';
import {
  Satellite,
  ShieldCheck,
  Gauge,
  Zap,
  Target,
  AlertTriangle,
} from 'lucide-react';

interface MissionStatsProps {
  conjunctionCount: number;
  threatenedAsset: string;
  missDistanceKm: number;
  riskScore: number;
  verificationStatus?: string;
  agentCount?: number;
}

export const MissionStats: React.FC<MissionStatsProps> = ({
  conjunctionCount,
  threatenedAsset,
  missDistanceKm,
  riskScore,
  verificationStatus = 'AWAITING',
  agentCount = 6,
}) => {
  const normalizedVerification =
    verificationStatus.toUpperCase();

  const isSafe =
    normalizedVerification === 'SAFE';

  const isEvaluating =
    normalizedVerification === 'EVALUATING';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-4 py-1.5 bg-[#060913] border-b border-slate-800 text-xs font-mono">

      {/* 1. Protected Asset */}
      <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/60 border border-slate-800">
        <Satellite className="w-3.5 h-3.5 text-cyan-400 shrink-0" />

        <div className="truncate">
          <div className="text-[9px] text-slate-500 uppercase">
            PROTECTED ASSET
          </div>

          <div className="text-cyan-300 font-bold truncate text-[11px]">
            {threatenedAsset || '--'}
          </div>
        </div>
      </div>

      {/* 2. Active Conjunction */}
      <div className="flex items-center gap-2 p-1.5 rounded bg-red-950/20 border border-red-900/40">
        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />

        <div>
          <div className="text-[9px] text-red-400/80 uppercase">
            CONJUNCTION ALERTS
          </div>

          <div className="text-red-400 font-bold text-[11px]">
            {conjunctionCount}{' '}
            {conjunctionCount === 1
              ? 'ACTIVE ALERT'
              : 'ACTIVE ALERTS'}
          </div>
        </div>
      </div>

      {/* 3. Miss Distance */}
      <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/60 border border-slate-800">
        <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />

        <div>
          <div className="text-[9px] text-slate-500 uppercase">
            MISS DISTANCE
          </div>

          <div className="text-amber-300 font-bold text-[11px]">
            {Number.isFinite(missDistanceKm)
              ? `${missDistanceKm} km`
              : '--'}
          </div>
        </div>
      </div>

      {/* 4. Risk Score */}
      <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/60 border border-slate-800">
        <Gauge className="w-3.5 h-3.5 text-red-400 shrink-0" />

        <div>
          <div className="text-[9px] text-slate-500 uppercase">
            RISK SCORE
          </div>

          <div className="text-red-400 font-bold text-[11px]">
            {Number.isFinite(riskScore)
              ? riskScore.toFixed(2)
              : '--'}
          </div>
        </div>
      </div>

      {/* 5. Agent Pipeline */}
      <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/60 border border-slate-800">
        <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />

        <div>
          <div className="text-[9px] text-slate-500 uppercase">
            AGENT PIPELINE
          </div>

          <div className="text-cyan-300 font-bold text-[11px]">
            {agentCount} AGENTS
            {isEvaluating && (
              <span className="text-amber-300">
                {' // RUNNING'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 6. Verification Status */}
      <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/60 border border-slate-800">
        <ShieldCheck
          className={`w-3.5 h-3.5 shrink-0 ${
            isSafe
              ? 'text-emerald-400'
              : isEvaluating
                ? 'text-amber-400'
                : 'text-slate-500'
          }`}
        />

        <div>
          <div className="text-[9px] text-slate-500 uppercase">
            VERIFIER STATUS
          </div>

          <div
            className={`font-bold text-[11px] ${
              isSafe
                ? 'text-emerald-400'
                : isEvaluating
                  ? 'text-amber-300'
                  : 'text-slate-400'
            }`}
          >
            {normalizedVerification}
          </div>
        </div>
      </div>
    </div>
  );
};