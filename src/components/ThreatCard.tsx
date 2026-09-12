// src/components/ThreatCard.tsx

import type { Threat } from '../types/orbitguard';

interface ThreatCardProps {
  threat: Threat;
}

export default function ThreatCard({ threat }: ThreatCardProps) {
  const severityLabel =
    threat.severity === 'CRITICAL'
      ? 'CRITICAL'
      : threat.severity === 'MODERATE'
        ? 'MODERATE'
        : 'LOW';

  const severityClass =
    threat.severity === 'CRITICAL'
      ? 'text-red-400 border-red-400/30'
      : threat.severity === 'MODERATE'
        ? 'text-amber-300 border-amber-300/30'
        : 'text-emerald-300 border-emerald-300/30';

  return (
    <section className="border border-white/10 bg-[#080d14]">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="font-mono text-xs tracking-[0.16em] text-white/60">
            CONJUNCTION ASSESSMENT
          </div>

          <div
            className={`border px-2 py-1 font-mono text-[10px] tracking-widest ${severityClass}`}
          >
            {severityLabel}
          </div>
        </div>
      </div>

      <div className="grid gap-px bg-white/10 sm:grid-cols-2">
        <Telemetry
          label="PRIMARY"
          value={threat.primary_object}
        />

        <Telemetry
          label="SECONDARY"
          value={threat.secondary_object}
        />

        <Telemetry
          label="TCA"
          value={threat.tca}
        />

        <Telemetry
          label="MISS DISTANCE"
          value={`${threat.miss_distance_km.toFixed(3)} km`}
        />

        <Telemetry
          label="RELATIVE VELOCITY"
          value={`${threat.relative_velocity_km_s.toFixed(3)} km/s`}
        />

        <Telemetry
          label="RISK SCORE"
          value={threat.risk_score.toFixed(3)}
        />
      </div>
    </section>
  );
}

function Telemetry({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#080d14] px-4 py-3">
      <div className="font-mono text-[9px] tracking-[0.16em] text-white/35">
        {label}
      </div>

      <div className="mt-1 break-all font-mono text-sm text-white">
        {value}
      </div>
    </div>
  );
}