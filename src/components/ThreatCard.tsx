import React from 'react';
import type { Threat } from '../types/orbitguard';
import { StatusBadge } from './StatusBadge';
import { AlertTriangle, Clock, Crosshair, Zap, Compass, Shield } from 'lucide-react';

interface ThreatCardProps {
  threat: Threat;
}

export const ThreatCard: React.FC<ThreatCardProps> = ({ threat }) => {
  return (
    <div className="bg-[#070b16] rounded border border-red-500/50 p-3 font-mono text-xs shadow-[0_0_15px_rgba(239,68,68,0.1)] relative">
      {/* Top Threat Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="font-bold text-red-400 uppercase tracking-widest text-xs">
            CONJUNCTION ALERT
          </span>
        </div>
        <StatusBadge status={threat.severity} />
      </div>

      {/* Target & Interceptor Pair Matrix */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80">
          <span className="text-[10px] text-slate-500 block uppercase">THREAT ID</span>
          <span className="text-slate-100 font-bold text-sm block">{threat.id}</span>
        </div>

        <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80">
          <span className="text-[10px] text-slate-500 block uppercase">STATUS</span>
          <span className="text-red-400 font-bold text-xs block">{threat.status}</span>
        </div>

        <div className="p-2 rounded bg-slate-950/80 border border-cyan-950">
          <span className="text-[10px] text-cyan-400/80 block uppercase">PRIMARY OBJECT</span>
          <span className="text-cyan-300 font-bold text-sm block">{threat.primary_object}</span>
          <span className="text-[9px] text-slate-400 block">{threat.threatenedSat.name}</span>
        </div>

        <div className="p-2 rounded bg-slate-950/80 border border-red-950">
          <span className="text-[10px] text-red-400/80 block uppercase">SECONDARY OBJECT</span>
          <span className="text-red-400 font-bold text-sm block">{threat.secondary_object}</span>
          <span className="text-[9px] text-slate-400 block">{threat.threatObject.name}</span>
        </div>
      </div>

      {/* Numerical Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* TCA */}
        <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>TCA (UTC)</span>
          </div>
          <div className="text-sm font-bold text-cyan-300 mt-0.5">
            {threat.tca}
          </div>
          <div className="text-[9px] text-slate-500">T-minus 14m 34s</div>
        </div>

        {/* Miss Distance */}
        <div className="p-2 rounded bg-slate-900/60 border border-red-900/40">
          <div className="flex items-center gap-1 text-[10px] text-red-400 uppercase">
            <Crosshair className="w-3 h-3 text-red-400" />
            <span>MISS DISTANCE</span>
          </div>
          <div className="text-sm font-bold text-red-400 mt-0.5">
            {threat.miss_distance_km} km
          </div>
          <div className="text-[9px] text-slate-500">Envelope: &gt; 5.0 km</div>
        </div>

        {/* Relative Velocity */}
        <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>RELATIVE VELOCITY</span>
          </div>
          <div className="text-sm font-bold text-amber-300 mt-0.5">
            {threat.relative_velocity_km_s} km/s
          </div>
          <div className="text-[9px] text-slate-500">Hypervelocity Close Approach</div>
        </div>

        {/* Risk Score */}
        <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase">
            <Shield className="w-3 h-3 text-red-400" />
            <span>RISK SCORE</span>
          </div>
          <div className="text-sm font-bold text-red-400 mt-0.5">
            {threat.risk_score.toFixed(2)} / 1.00
          </div>
          <div className="text-[9px] text-red-400/80">Pc = {threat.collision_probability.toExponential(1)}</div>
        </div>
      </div>

      {/* RIC Encounter Geometry */}
      <div className="p-2 rounded bg-slate-950/90 border border-slate-800 text-[10px]">
        <div className="flex items-center gap-1.5 text-slate-400 mb-1 font-bold uppercase tracking-wider">
          <Compass className="w-3 h-3 text-cyan-400" />
          <span>RIC ENCOUNTER FRAME</span>
        </div>
        <div className="grid grid-cols-3 gap-1 text-center">
          <div className="p-1 rounded bg-slate-900">
            <span className="text-[8px] text-slate-500 block">RADIAL (R)</span>
            <span className="text-slate-200 font-semibold">{threat.encounterGeometry.radialMissKm} km</span>
          </div>
          <div className="p-1 rounded bg-slate-900">
            <span className="text-[8px] text-slate-500 block">IN-TRACK (I)</span>
            <span className="text-slate-200 font-semibold">{threat.encounterGeometry.inTrackMissKm} km</span>
          </div>
          <div className="p-1 rounded bg-slate-900">
            <span className="text-[8px] text-slate-500 block">CROSS (C)</span>
            <span className="text-slate-200 font-semibold">{threat.encounterGeometry.crossTrackMissKm} km</span>
          </div>
        </div>
      </div>
    </div>
  );
};
