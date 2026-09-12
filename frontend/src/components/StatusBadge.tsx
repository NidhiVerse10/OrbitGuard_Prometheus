import React from 'react';
import type { PlanStatus, ThreatSeverity } from '../types/orbitguard';

interface StatusBadgeProps {
  status?: PlanStatus | ThreatSeverity | string;
  variant?: 'threat' | 'plan' | 'system';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  if (!status) return null;

  let bgClass = 'bg-slate-800/80 text-slate-300 border-slate-700';

  if (status === 'CRITICAL' || status === 'REJECTED' || status === 'CONFLICT_RISK') {
    bgClass = 'bg-red-950/70 text-red-300 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.25)]';
  } else if (status === 'HIGH' || status === 'THREATENED') {
    bgClass = 'bg-amber-950/70 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
  } else if (status === 'SELECTED' || status === 'APPROVED' || status === 'SAFE' || status === 'OPERATIONAL') {
    bgClass = 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
  } else if (status === 'SIMULATING' || status === 'RUNNING' || status === 'EVALUATING') {
    bgClass = 'bg-cyan-950/70 text-cyan-300 border-cyan-500/50 animate-pulse';
  } else if (status === 'PENDING' || status === 'QUEUED') {
    bgClass = 'bg-slate-900/80 text-slate-400 border-slate-700/60';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold tracking-wider uppercase border ${bgClass} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status.replace(/_/g, ' ')}
    </span>
  );
};
