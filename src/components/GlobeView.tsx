import React, { useRef, useEffect, useState } from 'react';
import type { ManeuverPlan, Threat, OrbitalObject, OrbitalPoint } from '../types/orbitguard';
import {
  Rotate3d,
  AlertCircle,
  CheckCircle2,
  Globe2,
  Radio,
  Layers,
} from 'lucide-react';
import { CesiumGlobe } from './CesiumGlobe';

interface GlobeViewProps {
  threat: Threat;
  assets?: OrbitalObject[];
  secondarySat: OrbitalObject;
  activePlan: ManeuverPlan | undefined;
  activeStepIndex: number;
  visualizationMode: 'BEFORE' | 'AFTER';
  secondaryConflictActive: boolean;
  onToggleVisualization?: () => void;
}

export const GlobeView: React.FC<GlobeViewProps> = ({
  threat,
  assets,
  secondarySat,
  activePlan,
  activeStepIndex,
  visualizationMode,
  secondaryConflictActive,
  onToggleVisualization,
}) => {
  const displayAssets: OrbitalObject[] = assets && assets.length > 0 ? assets : [
    threat.threatenedSat,
    threat.threatObject,
    secondarySat,
  ];

  const [engineMode, setEngineMode] = useState<'CESIUM' | 'TACTICAL_3D'>('CESIUM');
  const [cesiumError, setCesiumError] = useState<string | null>(null);

  // Tactical 3D Radar Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rotX, setRotX] = useState<number>(25);
  const [rotY, setRotY] = useState<number>(-50);
  const [zoom, setZoom] = useState<number>(1.0);
  const [cameraMode, setCameraMode] = useState<'CONJUNCTION' | 'PRIMARY' | 'SECONDARY' | 'GLOBAL'>('CONJUNCTION');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleCesiumError = (err: Error) => {
    setCesiumError(err.message || 'Cesium WebGL initialization failed');
    setEngineMode('TACTICAL_3D');
  };

  const setCameraPreset = (mode: 'CONJUNCTION' | 'PRIMARY' | 'SECONDARY' | 'GLOBAL') => {
    setCameraMode(mode);
    if (mode === 'CONJUNCTION') {
      setRotX(35);
      setRotY(-42);
      setZoom(1.35);
    } else if (mode === 'PRIMARY') {
      setRotX(38);
      setRotY(-40);
      setZoom(1.6);
    } else if (mode === 'SECONDARY') {
      setRotX(42);
      setRotY(-38);
      setZoom(1.5);
    } else {
      setRotX(20);
      setRotY(0);
      setZoom(0.95);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    setRotY((prev) => (prev + dx * 0.5) % 360);
    setRotX((prev) => Math.max(-85, Math.min(85, prev - dy * 0.5)));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => Math.max(0.6, Math.min(2.5, prev - e.deltaY * 0.001)));
  };

  // 3D Canvas Rendering Engine for Tactical Fallback
  useEffect(() => {
    if (engineMode !== 'TACTICAL_3D') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const earthRadius = Math.min(width, height) * 0.28 * zoom;

      const project = (lat: number, lon: number, altKm: number = 0) => {
        const radLat = (lat * Math.PI) / 180;
        const radLon = ((lon + rotY) * Math.PI) / 180;
        const radPitch = (rotX * Math.PI) / 180;

        const r = earthRadius * (1 + (altKm / 6371) * 0.6);
        const x3 = r * Math.cos(radLat) * Math.sin(radLon);
        const y3 = -r * Math.sin(radLat);
        const z3 = r * Math.cos(radLat) * Math.cos(radLon);

        const yRot = y3 * Math.cos(radPitch) - z3 * Math.sin(radPitch);
        const zRot = y3 * Math.sin(radPitch) + z3 * Math.cos(radPitch);

        return {
          x: cx + x3,
          y: cy + yRot,
          z: zRot,
          visible: zRot > -r * 0.2,
        };
      };

      // 1. Background Grid
      ctx.save();
      ctx.fillStyle = '#040711';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(0, 242, 254, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Earth Atmosphere Glow & Body
      const glowGrad = ctx.createRadialGradient(cx, cy, earthRadius * 0.8, cx, cy, earthRadius * 1.25);
      glowGrad.addColorStop(0, 'rgba(0, 180, 255, 0.25)');
      glowGrad.addColorStop(0.5, 'rgba(0, 120, 255, 0.12)');
      glowGrad.addColorStop(1, 'rgba(0, 40, 100, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, earthRadius * 1.25, 0, Math.PI * 2);
      ctx.fill();

      const earthGrad = ctx.createRadialGradient(
        cx - earthRadius * 0.35,
        cy - earthRadius * 0.35,
        earthRadius * 0.1,
        cx,
        cy,
        earthRadius
      );
      earthGrad.addColorStop(0, '#122544');
      earthGrad.addColorStop(0.6, '#0a172e');
      earthGrad.addColorStop(1, '#050c1b');

      ctx.beginPath();
      ctx.arc(cx, cy, earthRadius, 0, Math.PI * 2);
      ctx.fillStyle = earthGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Latitude Parallels
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.08)';
      ctx.lineWidth = 0.8;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let first = true;
        for (let lon = -180; lon <= 180; lon += 10) {
          const pt = project(lat, lon, 0);
          if (pt.visible) {
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }

      // Longitude Meridians
      for (let lon = -180; lon < 180; lon += 45) {
        ctx.beginPath();
        let first = true;
        for (let lat = -90; lat <= 90; lat += 10) {
          const pt = project(lat, lon, 0);
          if (pt.visible) {
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }

      const drawTrajectory = (
        points: OrbitalPoint[],
        color: string,
        dashed = false,
        width = 1.5
      ) => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        if (dashed) ctx.setLineDash([4, 4]);

        ctx.beginPath();
        let first = true;
        for (const pt of points) {
          const proj = project(pt.lat, pt.lon, pt.altKm);
          if (proj.visible) {
            if (first) {
              ctx.moveTo(proj.x, proj.y);
              first = false;
            } else {
              ctx.lineTo(proj.x, proj.y);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
        ctx.restore();
      };

      const isAfter = visualizationMode === 'AFTER';

      // 3. Dynamic Orbital Trajectories
      displayAssets.forEach((asset) => {
        const isPrimary = asset.id === threat.threatenedSat.id || asset.role === 'PRIMARY_ASSET';
        const isThreat = asset.id === threat.threatObject.id || asset.role === 'THREAT_OBJECT';

        let traj = asset.orbitTrajectory;
        let color = asset.color ? `${asset.color}88` : 'rgba(255, 183, 3, 0.4)';
        let strokeWidth = 1.2;

        if (isPrimary) {
          traj = isAfter && activePlan?.status === 'SELECTED'
            ? activePlan.projectedTrajectory
            : asset.orbitTrajectory;
          color = isAfter ? 'rgba(0, 245, 155, 0.9)' : (asset.color ? `${asset.color}cc` : 'rgba(0, 242, 254, 0.8)');
          strokeWidth = isAfter ? 2.5 : 2;
        } else if (isThreat) {
          color = asset.color ? `${asset.color}b3` : 'rgba(255, 51, 102, 0.7)';
          strokeWidth = 1.8;
        }

        if (traj && traj.length > 0) {
          drawTrajectory(traj, color, false, strokeWidth);
        }
      });

      // Active Candidate Maneuver Trajectory (if inspecting in BEFORE mode)
      if (activePlan && !isAfter) {
        const isPlanRejected = activePlan.status === 'REJECTED';
        const planColor = isPlanRejected
          ? 'rgba(255, 51, 102, 0.85)'
          : 'rgba(0, 245, 155, 0.9)';
        drawTrajectory(activePlan.projectedTrajectory, planColor, true, 2.5);
      }

      // 4. Conjunction / Keep-out Zone Reticle
      const conjLat = threat.conjunctionPoint?.lat ?? threat.threatenedSat.currentPosition.lat;
      const conjLon = threat.conjunctionPoint?.lon ?? threat.threatenedSat.currentPosition.lon;
      const conjAlt = threat.conjunctionPoint?.altKm ?? threat.threatenedSat.altitudeKm;
      const conjPos = project(conjLat, conjLon, conjAlt);
      if (conjPos.visible) {
        ctx.save();
        const pulse = (Math.sin(Date.now() * 0.005) + 1) * 0.5;
        const reticleColor = isAfter ? "rgba(0, 245, 155, 0.8)" : `rgba(255, 51, 102, ${0.4 + pulse * 0.5})`;
        ctx.strokeStyle = reticleColor;
        ctx.fillStyle = isAfter ? "rgba(0, 245, 155, 0.1)" : `rgba(255, 51, 102, ${0.15 + pulse * 0.15})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(conjPos.x, conjPos.y, 22 + (isAfter ? 0 : pulse * 6), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = isAfter ? "rgba(0, 245, 155, 0.9)" : "rgba(255, 51, 102, 0.9)";
        ctx.beginPath();
        ctx.moveTo(conjPos.x - 14, conjPos.y);
        ctx.lineTo(conjPos.x + 14, conjPos.y);
        ctx.moveTo(conjPos.x, conjPos.y - 14);
        ctx.lineTo(conjPos.x, conjPos.y + 14);
        ctx.stroke();

        ctx.font = "10px JetBrains Mono, monospace";
        ctx.fillStyle = isAfter ? "#00f59b" : "#ff4d6d";
        ctx.fillText(
          isAfter ? "SAFETY CORRIDOR CLEARED" : `CONJUNCTION ENCOUNTER (TCA ${threat.tca})`,
          conjPos.x + 26,
          conjPos.y - 4
        );
        ctx.fillStyle = isAfter ? "#a7f3d0" : "#fca5a5";
        ctx.fillText(
          isAfter
            ? "CLEARANCE VERIFIED // Pc < 1e-6"
            : `MISS: ${threat.miss_distance_km} km // Pc: ${threat.collision_probability.toExponential(1)}`,
          conjPos.x + 26,
          conjPos.y + 10
        );
        ctx.restore();
      }

      // 5. Spacecraft & Debris Markers
      const drawAssetMarker = (
        lat: number,
        lon: number,
        altKm: number,
        label: string,
        color: string,
        type: 'sat' | 'debris'
      ) => {
        const p = project(lat, lon, altKm);
        if (!p.visible) return;

        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;

        if (type === 'sat') {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - 6);
          ctx.lineTo(p.x + 6, p.y);
          ctx.moveTo(p.x, p.y + 6);
          ctx.lineTo(p.x - 6, p.y);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - 6);
          ctx.lineTo(p.x + 5, p.y + 5);
          ctx.lineTo(p.x - 5, p.y + 5);
          ctx.closePath();
          ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.fillStyle = color;
        ctx.fillText(label, p.x + 9, p.y - 6);
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillStyle = 'rgba(226, 232, 240, 0.7)';
        ctx.fillText(`${altKm} km`, p.x + 9, p.y + 6);
        ctx.restore();
      };

      displayAssets.forEach((asset) => {
        const isPrimary = asset.id === threat.threatenedSat.id || asset.role === 'PRIMARY_ASSET';
        const isThreat = asset.id === threat.threatObject.id || asset.role === 'THREAT_OBJECT';

        let label = `${asset.shortName || asset.name} (${asset.roleLabel || 'FLEET ASSET'})`;
        let color = asset.color || '#38bdf8';
        const type = asset.type === 'DEBRIS' ? 'debris' : 'sat';

        if (isPrimary) {
          label = isAfter
            ? `${asset.shortName || asset.name} [MANEUVER EXECUTED]`
            : `${asset.shortName || asset.name} [${asset.roleLabel || 'PRIMARY ASSET'}]`;
          color = isAfter ? '#00f59b' : (asset.color || '#00f2fe');
        } else if (isThreat) {
          label = `${asset.shortName || asset.name} (${asset.roleLabel || 'THREAT DEBRIS'})`;
          color = asset.color || '#ff3366';
        } else {
          color = asset.color || '#ffb703';
        }

        drawAssetMarker(
          asset.currentPosition.lat,
          asset.currentPosition.lon,
          asset.altitudeKm,
          label,
          color,
          type
        );
      });

      // 6. Secondary Conflict Highlight (The Counterfactual Moment)
      const hasSecondaryConflict =
        secondaryConflictActive ||
        Boolean(activePlan?.secondaryConflictDetected) ||
        (activePlan?.secondary_conflicts && activePlan.secondary_conflicts !== 'NONE');

      if (hasSecondaryConflict) {
        const sat05Pos = project(
          secondarySat.currentPosition.lat,
          secondarySat.currentPosition.lon,
          secondarySat.altitudeKm
        );
        if (sat05Pos.visible) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 51, 102, 0.9)';
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(sat05Pos.x, sat05Pos.y, 22, 0, Math.PI * 2);
          ctx.stroke();

          ctx.font = 'bold 10px JetBrains Mono, monospace';
          ctx.fillStyle = '#ff3366';
          ctx.fillText(`! SECONDARY CONFLICT DETECTED: ${secondarySat.shortName || secondarySat.name} !`, sat05Pos.x + 26, sat05Pos.y - 2);
          ctx.fillStyle = '#fca5a5';
          ctx.fillText(
            activePlan?.reason || `Proximity hazard with ${secondarySat.shortName || secondarySat.name}`,
            sat05Pos.x + 26,
            sat05Pos.y + 10
          );
          ctx.restore();
        }
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [engineMode, rotX, rotY, zoom, threat, displayAssets, secondarySat, activePlan, activeStepIndex, visualizationMode, secondaryConflictActive]);

  // Canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [engineMode]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full min-h-[420px] bg-[#040711] overflow-hidden select-none flex flex-col font-mono"
    >
      {/* Engine & Before/After Toggle Controls Ribbon */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        {onToggleVisualization && (
          <button
            onClick={onToggleVisualization}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase border transition-all ${
              visualizationMode === 'AFTER'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                : 'bg-amber-950 text-amber-300 border-amber-500/50'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>ORBIT: {visualizationMode}</span>
          </button>
        )}

        <div className="flex items-center gap-1 p-1 rounded bg-[#060a15]/90 border border-slate-700/80 backdrop-blur">
          <button
            onClick={() => setEngineMode('CESIUM')}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase transition-all ${
              engineMode === 'CESIUM'
                ? 'bg-cyan-500 text-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe2 className="w-3 h-3" />
            <span>CESIUM 3D</span>
          </button>
          <button
            onClick={() => setEngineMode('TACTICAL_3D')}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase transition-all ${
              engineMode === 'TACTICAL_3D'
                ? 'bg-cyan-500 text-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>TACTICAL RADAR</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Content */}
      {engineMode === 'CESIUM' ? (
        <CesiumGlobe
          threat={threat}
          assets={assets}
          secondarySat={secondarySat}
          activePlan={activePlan}
          activeStepIndex={activeStepIndex}
          visualizationMode={visualizationMode}
          secondaryConflictActive={secondaryConflictActive}
          onError={handleCesiumError}
        />
      ) : (
        <div className="relative w-full h-full">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className="w-full h-full cursor-grab active:cursor-grabbing block"
          />

          {/* Tactical Camera HUD */}
          <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none text-xs">
            <div className="p-2 rounded bg-[#060a15]/85 border border-slate-800 backdrop-blur text-[10px] pointer-events-auto">
              <div className="flex items-center gap-1.5 mb-1">
                <Rotate3d className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold text-slate-200 uppercase">
                  TACTICAL 3D ORBITAL RADAR
                </span>
                <span className="text-slate-500">//</span>
                <span
                  className={`font-bold ${
                    visualizationMode === 'AFTER' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  VIEW: {visualizationMode}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px] text-slate-400">
                <div>
                  TARGET: <span className="text-white font-semibold">{cameraMode}</span>
                </div>
                <div>
                  ZOOM: <span className="text-white font-semibold">{(zoom * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded bg-[#060a15]/85 border border-slate-800 backdrop-blur pointer-events-auto">
              <button
                onClick={() => setCameraPreset('CONJUNCTION')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                  cameraMode === 'CONJUNCTION'
                    ? 'bg-red-950 text-red-300 border border-red-500/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                CONJUNCTION
              </button>
              <button
                onClick={() => setCameraPreset('PRIMARY')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                  cameraMode === 'PRIMARY'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {threat.threatenedSat.shortName || threat.threatenedSat.name}
              </button>
              <button
                onClick={() => setCameraPreset('SECONDARY')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                  cameraMode === 'SECONDARY'
                    ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {secondarySat.shortName || secondarySat.name}
              </button>
              <button
                onClick={() => setCameraPreset('GLOBAL')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                  cameraMode === 'GLOBAL'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                GLOBAL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cesium Error Notice if fallback was triggered */}
      {cesiumError && engineMode === 'TACTICAL_3D' && (
        <div className="absolute top-14 left-3 p-2 rounded bg-amber-950/80 border border-amber-500/50 text-amber-200 text-[10px] flex items-center gap-1.5 z-20">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Notice: Operating in Tactical 3D Radar mode.</span>
        </div>
      )}

      {/* Bottom Overlays: Active Inspected Trajectory State & Legend */}
      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none z-20 text-xs">
        {activePlan && (
          <div
            className={`p-2.5 rounded backdrop-blur text-[11px] pointer-events-auto border max-w-md ${
              activePlan.status === 'SELECTED'
                ? 'bg-emerald-950/90 border-emerald-500/60'
                : 'bg-red-950/90 border-red-500/60'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-bold uppercase tracking-wider text-[11px] text-white flex items-center gap-1.5">
                {activePlan.status === 'SELECTED' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                )}
                {activePlan.name}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  activePlan.status === 'SELECTED'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-red-800 text-white'
                }`}
              >
                {activePlan.status}
              </span>
            </div>

            <p className="text-[10px] text-slate-200 leading-relaxed mb-1">
              {activePlan.reason}
            </p>

            <div className="flex items-center gap-3 text-[9px] text-slate-300 font-semibold border-t border-white/10 pt-1">
              <span>ΔV: {activePlan.delta_v_ms} m/s</span>
              <span>DELAY: {activePlan.delay_window}</span>
              <span>PRIMARY: {activePlan.primary_conflict}</span>
              <span>SECONDARY: {activePlan.secondary_conflicts}</span>
            </div>
          </div>
        )}

        <div className="p-2 rounded bg-[#060a15]/85 border border-slate-800 backdrop-blur text-[10px] pointer-events-auto">
          <div className="text-slate-400 font-bold uppercase tracking-wider mb-1 text-[9px]">
            ORBITAL LAYER LEGEND
          </div>
          <div className="space-y-1 text-slate-300 text-[9px]">
            {displayAssets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-2">
                <span
                  className="w-3 h-1 rounded"
                  style={{ backgroundColor: asset.color || '#38bdf8' }}
                />
                <span>
                  {asset.legendLabel || `${asset.shortName || asset.name} (${asset.altitudeKm} km)`}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 rounded border border-dashed border-[#00f59b] bg-[#00f59b]/40" />
              <span>Candidate / Post-Maneuver Trajectory</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
