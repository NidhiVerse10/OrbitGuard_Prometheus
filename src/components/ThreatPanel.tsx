import React from 'react';
import type { Threat, OrbitalObject } from '../types/orbitguard';
import { ThreatCard } from './ThreatCard';
import { StatusBadge } from './StatusBadge';
import { Satellite, Radio, ShieldCheck, AlertOctagon, Info } from 'lucide-react';

interface ThreatPanelProps {
  threat: Threat;
  assets: OrbitalObject[];
  secondarySat: OrbitalObject;
}

export const ThreatPanel: React.FC<ThreatPanelProps> = ({
  threat,
  assets,
  secondarySat,
}) => {
  return (
    <aside className="w-full lg:w-96 flex flex-col gap-3 p-3 bg-[#060913] border-r border-slate-800 overflow-y-auto max-h-full font-mono text-xs">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 font-bold tracking-widest text-slate-300 uppercase text-xs">
          <AlertOctagon className="w-4 h-4 text-red-500" />
          <span>THREAT & MISSION ALERTS</span>
        </div>
        <span className="text-[10px] text-cyan-400 bg-slate-900 px-1.5 py-0.5 rounded border border-cyan-800/40">
          CONJUNCTION EVENT #1
        </span>
      </div>

      {/* Main Threat Conjunction Card */}
      <ThreatCard threat={threat} />

      {/* Primary Asset Telemetry */}
      <div className="p-3 rounded bg-slate-900/60 border border-slate-800 text-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
            <Satellite className="w-3.5 h-3.5 text-cyan-400" />
            <span>PRIMARY ASSET: {threat.primary_object}</span>
          </div>
          <StatusBadge status="THREATENED" />
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-300">
          <div className="p-1.5 rounded bg-slate-950/80 border border-slate-800/60">
            <span className="text-slate-500 text-[8px] block uppercase">ORBIT ALTITUDE</span>
            <span className="font-semibold text-slate-200">{threat.threatenedSat.altitude_km} km LEO</span>
          </div>
          <div className="p-1.5 rounded bg-slate-950/80 border border-slate-800/60">
            <span className="text-slate-500 text-[8px] block uppercase">INCLINATION</span>
            <span className="font-semibold text-slate-200">{threat.threatenedSat.inclination_deg}° SSO</span>
          </div>
          <div className="p-1.5 rounded bg-slate-950/80 border border-slate-800/60">
            <span className="text-slate-500 text-[8px] block uppercase">ORBIT VELOCITY</span>
            <span className="font-semibold text-slate-200">{threat.threatenedSat.velocity_km_s} km/s</span>
          </div>
          <div className="p-1.5 rounded bg-slate-950/80 border border-slate-800/60">
            <span className="text-slate-500 text-[8px] block uppercase">PROPULSION BUDGET</span>
            <span className="font-semibold text-amber-300">25.0 m/s max</span>
          </div>
        </div>
      </div>

      {/* Sister Fleet Asset (Counterfactual Collision Risk Reference) */}
      <div className="p-3 rounded bg-amber-950/15 border border-amber-900/40 text-xs">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-amber-300 font-bold">
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>SISTER ASSET: {secondarySat.name}</span>
          </div>
          <StatusBadge status={secondarySat.status} />
        </div>

        <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">
          Operating in adjacent {secondarySat.altitude_km} km orbital plane. Monitored continuously by autonomous counterfactual safety checker.
        </p>

        {secondarySat.counterfactualNotice && (
          <div className="p-2 rounded bg-black/60 border border-amber-900/40 text-[10px] text-amber-300 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
            <span>
              <strong>COUNTERFACTUAL CHECK:</strong> {secondarySat.counterfactualNotice}
            </span>
          </div>
        )}
      </div>

      {/* Fleet Constellation Overview */}
      <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800 text-[11px] mt-auto">
        <div className="flex items-center gap-1.5 text-slate-400 mb-2 font-bold uppercase tracking-wider text-[9px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>CONSTELLATION EPHEMERIS TRACKING</span>
        </div>
        <div className="space-y-1.5">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center justify-between p-1.5 rounded bg-slate-950/70 border border-slate-800/60"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: asset.color }}
                />
                <span className="text-slate-300 font-medium text-[10px]">{asset.name}</span>
              </div>
              <span className="text-[9px] text-slate-400">{asset.altitude_km} km</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
