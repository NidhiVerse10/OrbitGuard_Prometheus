import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import type { ManeuverPlan, Threat, OrbitalObject } from '../types/orbitguard';
import { Rotate3d } from 'lucide-react';

interface CesiumGlobeProps {
  threat: Threat;
  assets?: OrbitalObject[];
  secondarySat: OrbitalObject;
  activePlan: ManeuverPlan | undefined;
  activeStepIndex: number;
  visualizationMode: 'BEFORE' | 'AFTER';
  secondaryConflictActive: boolean;
  onError: (err: Error) => void;
}

export const CesiumGlobe: React.FC<CesiumGlobeProps> = ({
  threat,
  assets,
  secondarySat,
  activePlan,
  activeStepIndex: _activeStepIndex,
  visualizationMode,
  secondaryConflictActive,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [cameraPreset, setCameraPreset] = useState<'CONJUNCTION' | 'PRIMARY' | 'SECONDARY' | 'GLOBAL'>('CONJUNCTION');

  // Convert OrbitalPoint array to flat array for Cesium: [lon1, lat1, altM1, lon2, lat2, altM2, ...]
  const toCesiumCoords = useCallback((pts: { lat: number; lon: number; altKm: number }[]) => {
    const coords: number[] = [];
    for (const p of pts) {
      coords.push(p.lon, p.lat, p.altKm * 1000);
    }
    return coords;
  }, []);

  // Initialize Cesium Viewer
  useEffect(() => {
    if (!containerRef.current) return;

    let viewer: Cesium.Viewer | null = null;

    try {
      if (import.meta.env.VITE_CESIUM_ION_TOKEN) {
        Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
      }

      viewer = new Cesium.Viewer(containerRef.current, {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        scene3DOnly: true,
        orderIndependentTranslucency: false,
        contextOptions: {
          webgl: {
            alpha: false,
            preserveDrawingBuffer: true,
          },
        },
      });

      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#040711');
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#071226');
      viewer.scene.globe.enableLighting = true;
      viewer.scene.screenSpaceCameraController.minimumZoomDistance = 50000; // 50 km

      viewerRef.current = viewer;

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          threat.threatenedSat.currentPosition.lon,
          threat.threatenedSat.currentPosition.lat,
          2500000
        ),
        duration: 1.5,
      });
    } catch (err: any) {
      console.warn('Cesium initialization failed, falling back to 3D tactical radar:', err);
      onError(err instanceof Error ? err : new Error(String(err)));
    }

    return () => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
        viewerRef.current = null;
      }
    };
  }, [onError]);

  // Update Entities & Trajectories dynamically
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    viewer.entities.removeAll();

    try {
      const isAfter = visualizationMode === 'AFTER';
      const displayAssets = assets && assets.length > 0 ? assets : [
        threat.threatenedSat,
        threat.threatObject,
        secondarySat,
      ];

      // 1. Render all asset orbital trajectories and spacecraft markers dynamically
      displayAssets.forEach((asset) => {
        const isPrimary = asset.id === threat.threatenedSat.id || asset.role === 'PRIMARY_ASSET';
        const isThreat = asset.id === threat.threatObject.id || asset.role === 'THREAT_OBJECT';

        let trajCoords: number[] = [];
        let strokeColor = asset.color || '#00f2fe';
        let markerLabel = `  ${asset.shortName || asset.name} [${asset.roleLabel || 'FLEET ASSET'}]`;

        if (isPrimary) {
          const trajectoryPoints = isAfter && activePlan?.status === 'SELECTED'
            ? activePlan.projectedTrajectory
            : asset.orbitTrajectory;
          trajCoords = toCesiumCoords(trajectoryPoints);
          strokeColor = isAfter ? '#00f59b' : (asset.color || '#00f2fe');
          markerLabel = isAfter
            ? `  ${asset.shortName || asset.name} [MANEUVER EXECUTED]`
            : `  ${asset.shortName || asset.name} [${asset.roleLabel || 'PRIMARY ASSET'}]`;
        } else if (isThreat) {
          trajCoords = toCesiumCoords(asset.orbitTrajectory);
          strokeColor = asset.color || '#ff3366';
          markerLabel = `  ${asset.shortName || asset.name} (${asset.roleLabel || 'THREAT DEBRIS'})`;
        } else {
          trajCoords = toCesiumCoords(asset.orbitTrajectory);
          strokeColor = asset.color || '#ffb703';
          markerLabel = `  ${asset.shortName || asset.name} (${asset.roleLabel || 'FLEET ASSET'})`;
        }

        // Add orbit trajectory polyline if coordinates exist
        if (trajCoords.length > 0) {
          viewer.entities.add({
            name: `${asset.shortName || asset.name} Orbit`,
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights(trajCoords),
              width: isPrimary && isAfter ? 3 : 2,
              material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: isPrimary && isAfter ? 0.35 : 0.2,
                color: Cesium.Color.fromCssColorString(strokeColor),
              }),
            },
          });
        }

        // Add asset point marker & HUD label
        viewer.entities.add({
          name: asset.shortName || asset.name,
          position: Cesium.Cartesian3.fromDegrees(
            asset.currentPosition.lon,
            asset.currentPosition.lat,
            asset.altitudeKm * 1000
          ),
          point: {
            pixelSize: isPrimary ? 12 : 10,
            color: Cesium.Color.fromCssColorString(strokeColor),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: isPrimary ? 2 : 1.5,
          },
          label: {
            text: markerLabel,
            font: isPrimary ? '12px JetBrains Mono, monospace' : '11px JetBrains Mono, monospace',
            fillColor: Cesium.Color.fromCssColorString(strokeColor),
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -9),
          },
        });
      });

      // 2. Conjunction Keep-out Zone (Changes to Safe when AFTER)
      const conjLat = threat.conjunctionPoint?.lat ?? threat.threatenedSat.currentPosition.lat;
      const conjLon = threat.conjunctionPoint?.lon ?? threat.threatenedSat.currentPosition.lon;
      const conjAlt = threat.conjunctionPoint?.altKm ?? threat.threatenedSat.altitudeKm;

      viewer.entities.add({
        name: isAfter ? 'Cleared Safety Corridor' : 'Conjunction Hazard Zone',
        position: Cesium.Cartesian3.fromDegrees(
          conjLon,
          conjLat,
          conjAlt * 1000
        ),
        ellipsoid: {
          radii: new Cesium.Cartesian3(25000, 25000, 25000),
          material: Cesium.Color.fromCssColorString(isAfter ? '#00f59b' : '#ff3366').withAlpha(isAfter ? 0.15 : 0.25),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(isAfter ? '#00f59b' : '#ff3366').withAlpha(0.7),
        },
      });

      // 3. Candidate Maneuver Trajectory (if present and inspecting in BEFORE mode)
      if (activePlan && !isAfter) {
        const planCoords = toCesiumCoords(activePlan.projectedTrajectory);
        const isRejected = activePlan.status === 'REJECTED';

        viewer.entities.add({
          name: activePlan.name,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(planCoords),
            width: 3,
            material: new Cesium.PolylineDashMaterialProperty({
              color: isRejected
                ? Cesium.Color.fromCssColorString('#ff3366')
                : Cesium.Color.fromCssColorString('#00f59b'),
              dashLength: 16.0,
            }),
          },
        });
      }

      // 4. Secondary Conflict Warning in Cesium (When secondary conflict is active or candidate plan triggers it)
      const hasSecondaryConflict =
        secondaryConflictActive ||
        Boolean(activePlan?.secondaryConflictDetected) ||
        (activePlan?.secondary_conflicts && activePlan.secondary_conflicts !== 'NONE');

      if (hasSecondaryConflict) {
        viewer.entities.add({
          name: 'Secondary Conflict Warning',
          position: Cesium.Cartesian3.fromDegrees(
            secondarySat.currentPosition.lon,
            secondarySat.currentPosition.lat,
            secondarySat.altitudeKm * 1000
          ),
          ellipsoid: {
            radii: new Cesium.Cartesian3(30000, 30000, 30000),
            material: Cesium.Color.YELLOW.withAlpha(0.25),
            outline: true,
            outlineColor: Cesium.Color.YELLOW,
          },
          label: {
            text: `! SECONDARY CONFLICT DETECTED: ${secondarySat.shortName || secondarySat.name} !`,
            font: '12px JetBrains Mono, monospace',
            fillColor: Cesium.Color.YELLOW,
            pixelOffset: new Cesium.Cartesian2(0, 18),
          },
        });
      }
    } catch (e) {
      console.warn('Error updating Cesium entities:', e);
    }
  }, [threat, assets, secondarySat, activePlan, visualizationMode, secondaryConflictActive, toCesiumCoords]);

  // Camera preset handler
  const handlePreset = (mode: 'CONJUNCTION' | 'PRIMARY' | 'SECONDARY' | 'GLOBAL') => {
    setCameraPreset(mode);
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (mode === 'CONJUNCTION') {
      const conjLat = threat.conjunctionPoint?.lat ?? threat.threatenedSat.currentPosition.lat;
      const conjLon = threat.conjunctionPoint?.lon ?? threat.threatenedSat.currentPosition.lon;
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(conjLon, conjLat, 1800000),
        duration: 1.2,
      });
    } else if (mode === 'PRIMARY') {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          threat.threatenedSat.currentPosition.lon,
          threat.threatenedSat.currentPosition.lat,
          1800000
        ),
        duration: 1.2,
      });
    } else if (mode === 'SECONDARY') {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          secondarySat.currentPosition.lon,
          secondarySat.currentPosition.lat,
          1800000
        ),
        duration: 1.2,
      });
    } else {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(0, 20, 18000000),
        duration: 1.5,
      });
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Cesium Container */}
      <div ref={containerRef} className="w-full h-full bg-[#040711]" />

      {/* Camera Presets HUD */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10 font-mono text-xs">
        <div className="p-2 rounded bg-[#060a15]/85 border border-slate-800 backdrop-blur text-[10px] pointer-events-auto text-slate-300 flex items-center gap-1.5">
          <Rotate3d className="w-3.5 h-3.5 text-cyan-400" />
          <span>CESIUM 3D ORBITAL GLOBE</span>
          <span className="text-slate-500">//</span>
          <span
            className={`font-bold ${
              visualizationMode === 'AFTER' ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            VIEW: {visualizationMode}
          </span>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded bg-[#060a15]/85 border border-slate-800 backdrop-blur pointer-events-auto">
          <button
            onClick={() => handlePreset('CONJUNCTION')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
              cameraPreset === 'CONJUNCTION'
                ? 'bg-red-950 text-red-300 border border-red-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            CONJUNCTION
          </button>
          <button
            onClick={() => handlePreset('PRIMARY')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
              cameraPreset === 'PRIMARY'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {threat.threatenedSat.shortName || threat.threatenedSat.name}
          </button>
          <button
            onClick={() => handlePreset('SECONDARY')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
              cameraPreset === 'SECONDARY'
                ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {secondarySat.shortName || secondarySat.name}
          </button>
          <button
            onClick={() => handlePreset('GLOBAL')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
              cameraPreset === 'GLOBAL'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            GLOBAL
          </button>
        </div>
      </div>
    </div>
  );
};
