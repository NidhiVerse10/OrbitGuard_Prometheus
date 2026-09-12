import React from 'react';
import type { ManeuverPlan } from '../types/orbitguard';
import { StatusBadge } from './StatusBadge';
import { Eye, AlertCircle } from 'lucide-react';

interface ManeuverCardProps {
  maneuver: ManeuverPlan;
  isSelected: boolean;
  onInspect: (id: string) => void;
}

export const ManeuverCard: React.FC<ManeuverCardProps> = ({
  maneuver,
  isSelected,
  onInspect,
}) => {
  const isSelectedPlan = maneuver.status === 'SELECTED';
  const isRejected = maneuver.status === 'REJECTED';

  const hasSecondaryConflicts =
    Array.isArray(maneuver.secondary_conflicts) &&
    maneuver.secondary_conflicts.length > 0;

  return (
    <div
      onClick={() => onInspect(maneuver.id)}
      className={`p-3 rounded border font-mono text-xs cursor-pointer transition-all ${
        isSelected
          ? 'bg-[#0a1224] border-cyan-400 shadow-[0_0_12px_rgba(0,242,254,0.2)]'
          : isSelectedPlan
          ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500/70'
          : isRejected
          ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 opacity-85 hover:opacity-100'
          : 'bg-slate-900/50 border-slate-800'
      }`}
    >
      {/* Header: Plan ID & Name */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-[10px] text-slate-500 block uppercase font-bold">
            {maneuver.id}
          </span>

          <span className="font-bold text-slate-200 text-xs tracking-wider">
            {maneuver.name.replace(/PLAN-\d\s*—\s*/, '')}
          </span>
        </div>

        <StatusBadge status={maneuver.status} />
      </div>

      {/* Telemetry Breakdown: ΔV & Delay */}
      <div className="grid grid-cols-2 gap-2 mb-2 p-1.5 rounded bg-slate-950/70 border border-slate-800/70 text-[10px]">
        <div>
          <span className="text-slate-500 block uppercase">ΔV</span>
          <span className="font-bold text-slate-200">
            {maneuver.delta_v_ms} m/s
          </span>
        </div>

        <div>
          <span className="text-slate-500 block uppercase">DELAY</span>
          <span className="font-bold text-slate-200">
            {maneuver.delay_window}
          </span>
        </div>
      </div>

      {/* Primary & Secondary Conflicts */}
      <div className="space-y-1 text-[11px] mb-2">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 uppercase text-[10px]">
            PRIMARY CONFLICT:
          </span>

          <span
            className={`font-bold ${
              maneuver.primary_conflict === 'RESOLVED'
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}
          >
            {maneuver.primary_conflict}
          </span>
        </div>

        {maneuver.secondary_conflicts && (
          <div className="flex justify-between items-center">
            <span className="text-slate-500 uppercase text-[10px]">
              SECONDARY CONFLICTS:
            </span>

            <span
              className={`font-bold ${
                hasSecondaryConflicts
                  ? 'text-red-400'
                  : 'text-emerald-400'
              }`}
            >
              {hasSecondaryConflicts
                ? maneuver.secondary_conflicts.join(', ')
                : 'NONE'}
            </span>
          </div>
        )}
      </div>

      {/* Counterfactual Secondary Warning Notice */}
      {maneuver.secondaryConflictDetected && (
        <div className="p-2 rounded bg-red-950/40 border border-red-800/50 mb-2 text-[10px] text-red-300 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />

          <div>
            <span className="font-bold text-red-400 uppercase block text-[9px]">
              SECONDARY CONFLICT DETECTED:{' '}
              {maneuver.secondary_conflicts.join(', ')}
            </span>

            <span>{maneuver.reason}</span>
          </div>
        </div>
      )}

      {/* Rejection / Selection Reason */}
      {!maneuver.secondaryConflictDetected && maneuver.reason && (
        <div
          className={`text-[10px] border-l-2 pl-2 py-0.5 mb-2 leading-relaxed ${
            isRejected
              ? 'text-slate-400 border-red-500/60'
              : 'text-emerald-300 border-emerald-500'
          }`}
        >
          <span className="text-slate-500 uppercase block text-[9px]">
            REASON:
          </span>

          {maneuver.reason}
        </div>
      )}

      {/* Card Action Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
        <span className="text-slate-500">
          PROPELLANT: {maneuver.propellant_kg} kg
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onInspect(maneuver.id);
          }}
          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
        >
          <Eye className="w-3 h-3" />

          <span>
            {isSelected ? 'INSPECTING' : 'VIEW TRAJECTORY'}
          </span>
        </button>
      </div>
    </div>
  );
};