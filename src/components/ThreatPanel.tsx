// src/components/ThreatPanel.tsx

import type {
  OrbitalObject,
  Threat,
} from '../types/orbitguard';

import ThreatCard from './ThreatCard';

interface ThreatPanelProps {
  threat: Threat;
  assets: OrbitalObject[];
  secondarySat?: OrbitalObject;
}

export default function ThreatPanel({
  threat,
  assets,
  secondarySat,
}: ThreatPanelProps) {
  const primaryAsset =
    assets.find(
      (asset) =>
        asset.id === threat.primary_object ||
        asset.name === threat.primary_object ||
        String(asset.norad_id) === threat.primary_object
    );

  const secondaryAsset =
    secondarySat ??
    assets.find(
      (asset) =>
        asset.id === threat.secondary_object ||
        asset.name === threat.secondary_object ||
        String(asset.norad_id) === threat.secondary_object
    );

  const primaryName =
    primaryAsset?.name ??
    threat.primary_object ??
    '--';

  const secondaryName =
    secondaryAsset?.name ??
    threat.secondary_object ??
    '--';

  return (
    <aside className="space-y-4">

      {/* Active conjunction */}
      <ThreatCard threat={threat} />

      {/* Protected asset */}
      <section className="border border-white/10 bg-[#080d14]">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="font-mono text-xs tracking-[0.16em] text-white/60">
            PROTECTED ASSET
          </div>
        </div>

        <div className="space-y-3 p-4">

          <div>
            <div className="font-mono text-[9px] tracking-[0.16em] text-white/35">
              OBJECT
            </div>

            <div className="mt-1 font-mono text-sm text-cyan-300">
              {primaryName}
            </div>
          </div>

          {primaryAsset?.norad_id && (
            <div>
              <div className="font-mono text-[9px] tracking-[0.16em] text-white/35">
                NORAD ID
              </div>

              <div className="mt-1 font-mono text-sm">
                {primaryAsset.norad_id}
              </div>
            </div>
          )}

          {typeof primaryAsset?.altitude_km === 'number' && (
            <div>
              <div className="font-mono text-[9px] tracking-[0.16em] text-white/35">
                ALTITUDE
              </div>

              <div className="mt-1 font-mono text-sm">
                {primaryAsset.altitude_km.toFixed(1)} km
              </div>
            </div>
          )}

          {typeof primaryAsset?.inclination_deg === 'number' && (
            <div>
              <div className="font-mono text-[9px] tracking-[0.16em] text-white/35">
                INCLINATION
              </div>

              <div className="mt-1 font-mono text-sm">
                {primaryAsset.inclination_deg.toFixed(2)}°
              </div>
            </div>
          )}

          {!primaryAsset && (
            <div className="font-mono text-[10px] text-amber-300/70">
              ASSET TELEMETRY UNAVAILABLE
            </div>
          )}
        </div>
      </section>

      {/* Conjunction object */}
      <section className="border border-white/10 bg-[#080d14]">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="font-mono text-xs tracking-[0.16em] text-white/60">
            CONJUNCTION OBJECT
          </div>
        </div>

        <div className="space-y-3 p-4">

          <div>
            <div className="font-mono text-[9px] tracking-[0.16em] text-white/35">
              OBJECT
            </div>

            <div className="mt-1 font-mono text-sm text-amber-300">
              {secondaryName}
            </div>
          </div>

          {secondaryAsset?.norad_id && (
            <div>
              <div className="font-mono text-[9px] tracking-[0.16em] text-white/35">
                NORAD ID
              </div>

              <div className="mt-1 font-mono text-sm">
                {secondaryAsset.norad_id}
              </div>
            </div>
          )}

          {!secondaryAsset && (
            <div className="font-mono text-[10px] text-amber-300/70">
              OBJECT TELEMETRY UNAVAILABLE
            </div>
          )}
        </div>
      </section>

      {/* Tracked objects */}
      <section className="border border-white/10 bg-[#080d14]">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-mono text-[10px] tracking-[0.16em] text-white/40">
            TRACKED OBJECTS
          </span>

          <span className="font-mono text-sm text-white">
            {assets.length}
          </span>
        </div>
      </section>

    </aside>
  );
}