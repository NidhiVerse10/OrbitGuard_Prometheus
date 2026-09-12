import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';

import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

import type {
  ManeuverPlan,
  Threat,
  OrbitalObject,
  OrbitalPoint,
} from '../types/orbitguard';

import { Rotate3d } from 'lucide-react';

interface CesiumGlobeProps {
  threat: Threat;
  assets?: OrbitalObject[];
  secondarySat?: OrbitalObject;
  activePlan: ManeuverPlan | undefined;
  activeStepIndex: number;
  visualizationMode: 'BEFORE' | 'AFTER';
  secondaryConflictActive: boolean;
  onError: (err: Error) => void;
}

type CameraPreset =
  | 'CONJUNCTION'
  | 'PRIMARY'
  | 'SECONDARY'
  | 'GLOBAL';

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
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const viewerRef =
    useRef<Cesium.Viewer | null>(null);

  const [cameraPreset, setCameraPreset] =
    useState<CameraPreset>('CONJUNCTION');

  /*
   * Resolve objects from the current threat.
   *
   * Backend contract:
   *   primary_object
   *   secondary_object
   *
   * No spacecraft are fabricated here.
   */
  const primaryAsset = useMemo(() => {
    return assets?.find(
      (asset) =>
        asset.id === threat.primary_object ||
        asset.name === threat.primary_object ||
        asset.shortName === threat.primary_object
    );
  }, [assets, threat.primary_object]);

  const resolvedSecondarySat = useMemo(() => {
    if (secondarySat) {
      return secondarySat;
    }

    return assets?.find(
      (asset) =>
        asset.id === threat.secondary_object ||
        asset.name === threat.secondary_object ||
        asset.shortName === threat.secondary_object
    );
  }, [
    assets,
    secondarySat,
    threat.secondary_object,
  ]);

  /*
   * Display all objects supplied by the scenario.
   */
  const displayAssets = useMemo(() => {
    if (assets && assets.length > 0) {
      return assets;
    }

    return [
      primaryAsset,
      resolvedSecondarySat,
    ].filter(Boolean) as OrbitalObject[];
  }, [
    assets,
    primaryAsset,
    resolvedSecondarySat,
  ]);

  /*
   * Convert orbital points into Cesium's
   * [lon, lat, heightMeters, ...] format.
   */
  const toCesiumCoords = useCallback(
    (
      points?: OrbitalPoint[]
    ): number[] => {
      if (!points || points.length === 0) {
        return [];
      }

      const coords: number[] = [];

      for (const point of points) {
        const altitudeKm =
          point.altKm ??
          point.alt_km ??
          0;

        coords.push(
          point.lon,
          point.lat,
          altitudeKm * 1000
        );
      }

      return coords;
    },
    []
  );

  /*
   * Initialise Cesium only once.
   */
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    let viewer: Cesium.Viewer | null = null;

    try {
      const token =
        import.meta.env.VITE_CESIUM_ION_TOKEN;

      if (token) {
        Cesium.Ion.defaultAccessToken =
          token;
      }

      viewer = new Cesium.Viewer(
        containerRef.current,
        {
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
        }
      );

      viewer.scene.backgroundColor =
        Cesium.Color.fromCssColorString(
          '#040711'
        );

      viewer.scene.globe.baseColor =
        Cesium.Color.fromCssColorString(
          '#071226'
        );

      viewer.scene.globe.enableLighting =
        true;

      /*
       * Keep camera from zooming unrealistically
       * close to Earth.
       */
      viewer.scene
        .screenSpaceCameraController
        .minimumZoomDistance = 50000;

      viewerRef.current = viewer;
    } catch (err) {
      console.warn(
        'Cesium initialization failed. Tactical radar fallback will be used.',
        err
      );

      onError(
        err instanceof Error
          ? err
          : new Error(String(err))
      );
    }

    return () => {
      if (
        viewer &&
        !viewer.isDestroyed()
      ) {
        viewer.destroy();
        viewerRef.current = null;
      }
    };
  }, [onError]);

  /*
   * Update all Cesium entities whenever the
   * scenario, threat, maneuver or visualization
   * mode changes.
   */
  useEffect(() => {
    const viewer =
      viewerRef.current;

    if (
      !viewer ||
      viewer.isDestroyed()
    ) {
      return;
    }

    viewer.entities.removeAll();

    try {
      const isAfter =
        visualizationMode === 'AFTER';

      /*
       * 1. Render scenario assets.
       */
      displayAssets.forEach(
        (asset) => {
          const isPrimary =
            asset.id ===
              threat.primary_object ||
            asset.name ===
              threat.primary_object ||
            asset.shortName ===
              threat.primary_object ||
            asset.role ===
              'PRIMARY_ASSET';

          const isThreat =
            asset.id ===
              threat.secondary_object ||
            asset.name ===
              threat.secondary_object ||
            asset.shortName ===
              threat.secondary_object ||
            asset.role ===
              'THREAT_OBJECT';

          let trajectory =
            asset.orbitTrajectory;

          let strokeColor =
            asset.color ||
            '#38bdf8';

          let markerLabel =
            `${asset.shortName || asset.name} [FLEET ASSET]`;

          /*
           * Primary spacecraft.
           */
          if (isPrimary) {
            if (
              isAfter &&
              activePlan?.status ===
                'SELECTED' &&
              activePlan.projectedTrajectory
                ?.length
            ) {
              trajectory =
                activePlan.projectedTrajectory;
            }

            strokeColor = isAfter
              ? '#00f59b'
              : asset.color ||
                '#00f2fe';

            markerLabel = isAfter
              ? `${asset.shortName || asset.name} [MANEUVER EXECUTED]`
              : `${asset.shortName || asset.name} [${
                  asset.roleLabel ||
                  'PRIMARY ASSET'
                }]`;
          }

          /*
           * Threat / secondary object.
           */
          else if (isThreat) {
            strokeColor =
              asset.color ||
              '#ff3366';

            markerLabel =
              `${asset.shortName || asset.name} [${
                asset.roleLabel ||
                'THREAT OBJECT'
              }]`;
          }

          /*
           * Other fleet assets.
           */
          else {
            strokeColor =
              asset.color ||
              '#ffb703';

            markerLabel =
              `${asset.shortName || asset.name} [${
                asset.roleLabel ||
                'FLEET ASSET'
              }]`;
          }

          /*
           * Orbit trajectory.
           */
          const trajectoryCoords =
            toCesiumCoords(
              trajectory
            );

          if (
            trajectoryCoords.length >
            0
          ) {
            viewer.entities.add({
              name: `${
                asset.shortName ||
                asset.name
              } Orbit`,

              polyline: {
                positions:
                  Cesium.Cartesian3.fromDegreesArrayHeights(
                    trajectoryCoords
                  ),

                width:
                  isPrimary &&
                  isAfter
                    ? 3
                    : 2,

                material:
                  new Cesium.PolylineGlowMaterialProperty(
                    {
                      glowPower:
                        isPrimary &&
                        isAfter
                          ? 0.35
                          : 0.2,

                      color:
                        Cesium.Color.fromCssColorString(
                          strokeColor
                        ),
                    }
                  ),
              },
            });
          }

          /*
           * Current spacecraft position.
           */
          const currentPosition =
            asset.currentPosition;

          if (!currentPosition) {
            return;
          }

          const altitudeKm =
            asset.altitudeKm ??
            asset.altitude_km ??
            0;

          viewer.entities.add({
            name:
              asset.shortName ||
              asset.name,

            position:
              Cesium.Cartesian3.fromDegrees(
                currentPosition.lon,
                currentPosition.lat,
                altitudeKm * 1000
              ),

            point: {
              pixelSize:
                isPrimary ? 12 : 10,

              color:
                Cesium.Color.fromCssColorString(
                  strokeColor
                ),

              outlineColor:
                Cesium.Color.WHITE,

              outlineWidth:
                isPrimary ? 2 : 1.5,
            },

            label: {
              text: markerLabel,

              font: isPrimary
                ? '12px JetBrains Mono, monospace'
                : '11px JetBrains Mono, monospace',

              fillColor:
                Cesium.Color.fromCssColorString(
                  strokeColor
                ),

              style:
                Cesium.LabelStyle
                  .FILL_AND_OUTLINE,

              outlineWidth: 2,

              verticalOrigin:
                Cesium.VerticalOrigin
                  .BOTTOM,

              pixelOffset:
                new Cesium.Cartesian2(
                  0,
                  -9
                ),
            },
          });
        }
      );

      /*
       * 2. Conjunction location.
       *
       * Prefer explicit conjunction coordinates.
       * Otherwise fall back to the primary object's
       * current position.
       */
      const conjunctionPoint =
        threat.conjunctionPoint;

      const primaryPosition =
        primaryAsset?.currentPosition;

      const conjunctionLat =
        conjunctionPoint?.lat ??
        primaryPosition?.lat;

      const conjunctionLon =
        conjunctionPoint?.lon ??
        primaryPosition?.lon;

      const conjunctionAlt =
        conjunctionPoint?.altKm ??
        conjunctionPoint?.alt_km ??
        primaryPosition?.altKm ??
        primaryPosition?.alt_km ??
        primaryAsset?.altitudeKm ??
        primaryAsset?.altitude_km ??
        0;

      if (
        conjunctionLat !==
          undefined &&
        conjunctionLon !==
          undefined
      ) {
        const conjunctionColor =
          isAfter
            ? '#00f59b'
            : '#ff3366';

        viewer.entities.add({
          name: isAfter
            ? 'Safety Corridor'
            : 'Conjunction Hazard Zone',

          position:
            Cesium.Cartesian3.fromDegrees(
              conjunctionLon,
              conjunctionLat,
              conjunctionAlt * 1000
            ),

          /*
           * This radius is only a visual reticle.
           * It is NOT used for collision detection.
           */
          ellipsoid: {
            radii:
              new Cesium.Cartesian3(
                25000,
                25000,
                25000
              ),

            material:
              Cesium.Color.fromCssColorString(
                conjunctionColor
              ).withAlpha(
                isAfter
                  ? 0.12
                  : 0.22
              ),

            outline: true,

            outlineColor:
              Cesium.Color.fromCssColorString(
                conjunctionColor
              ).withAlpha(
                0.75
              ),
          },

          label: {
            text: isAfter
              ? 'SAFETY CORRIDOR'
              : `CONJUNCTION // ${threat.severity}`,

            font:
              '11px JetBrains Mono, monospace',

            fillColor:
              Cesium.Color.fromCssColorString(
                conjunctionColor
              ),

            style:
              Cesium.LabelStyle
                .FILL_AND_OUTLINE,

            outlineWidth: 2,

            pixelOffset:
              new Cesium.Cartesian2(
                0,
                -32
              ),
          },
        });
      }

      /*
       * 3. Candidate maneuver trajectory.
       *
       * Show rejected or candidate trajectory
       * only while inspecting BEFORE state.
       */
      if (
        activePlan &&
        !isAfter &&
        activePlan.projectedTrajectory
          ?.length
      ) {
        const planCoords =
          toCesiumCoords(
            activePlan.projectedTrajectory
          );

        if (
          planCoords.length > 0
        ) {
          const isRejected =
            activePlan.status ===
            'REJECTED';

          viewer.entities.add({
            name:
              activePlan.name,

            polyline: {
              positions:
                Cesium.Cartesian3.fromDegreesArrayHeights(
                  planCoords
                ),

              width: 3,

              material:
                new Cesium.PolylineDashMaterialProperty(
                  {
                    color:
                      Cesium.Color.fromCssColorString(
                        isRejected
                          ? '#ff3366'
                          : '#00f59b'
                      ),

                    dashLength: 16,
                  }
                ),
            },
          });
        }
      }

      /*
       * 4. Secondary conflict visualization.
       *
       * Only show it when the simulation/planner
       * actually reports a conflict or the UI
       * has activated the counterfactual state.
       */
      const hasSecondaryConflict =
        secondaryConflictActive ||
        Boolean(
          activePlan?.secondaryConflictDetected
        ) ||
        Boolean(
          activePlan?.secondary_conflicts &&
          activePlan.secondary_conflicts.length > 0
        );

      if (
        hasSecondaryConflict &&
        resolvedSecondarySat
      ) {
        const secondaryPosition =
          resolvedSecondarySat.currentPosition;

        if (
          secondaryPosition
        ) {
          const secondaryAltitude =
            resolvedSecondarySat.altitudeKm ??
            resolvedSecondarySat.altitude_km ??
            0;

          viewer.entities.add({
            name:
              'Secondary Conflict Warning',

            position:
              Cesium.Cartesian3.fromDegrees(
                secondaryPosition.lon,
                secondaryPosition.lat,
                secondaryAltitude *
                  1000
              ),

            ellipsoid: {
              /*
               * Visualization radius only.
               */
              radii:
                new Cesium.Cartesian3(
                  30000,
                  30000,
                  30000
                ),

              material:
                Cesium.Color.fromCssColorString(
                  '#ff3366'
                ).withAlpha(
                  0.18
                ),

              outline: true,

              outlineColor:
                Cesium.Color.fromCssColorString(
                  '#ff3366'
                ),
            },

            label: {
              text: `SECONDARY CONFLICT: ${
                resolvedSecondarySat.shortName ||
                resolvedSecondarySat.name
              }`,

              font:
                '11px JetBrains Mono, monospace',

              fillColor:
                Cesium.Color.fromCssColorString(
                  '#ff3366'
                ),

              style:
                Cesium.LabelStyle
                  .FILL_AND_OUTLINE,

              outlineWidth: 2,

              pixelOffset:
                new Cesium.Cartesian2(
                  0,
                  28
                ),
            },
          });
        }
      }
    } catch (err) {
      console.warn(
        'Error updating Cesium entities:',
        err
      );
    }
  }, [
    threat,
    assets,
    displayAssets,
    primaryAsset,
    resolvedSecondarySat,
    activePlan,
    visualizationMode,
    secondaryConflictActive,
    toCesiumCoords,
  ]);

  /*
   * Camera presets.
   *
   * These are presentation controls, not
   * hardcoded scenario telemetry.
   */
  const handlePreset = (
    mode: CameraPreset
  ) => {
    setCameraPreset(mode);

    const viewer =
      viewerRef.current;

    if (
      !viewer ||
      viewer.isDestroyed()
    ) {
      return;
    }

    if (
      mode === 'CONJUNCTION'
    ) {
      const lat =
        threat.conjunctionPoint?.lat ??
        primaryAsset?.currentPosition
          ?.lat;

      const lon =
        threat.conjunctionPoint?.lon ??
        primaryAsset?.currentPosition
          ?.lon;

      if (
        lat === undefined ||
        lon === undefined
      ) {
        return;
      }

      viewer.camera.flyTo({
        destination:
          Cesium.Cartesian3.fromDegrees(
            lon,
            lat,
            1800000
          ),

        duration: 1.2,
      });

      return;
    }

    if (mode === 'PRIMARY') {
      const position =
        primaryAsset?.currentPosition;

      if (!position) {
        return;
      }

      viewer.camera.flyTo({
        destination:
          Cesium.Cartesian3.fromDegrees(
            position.lon,
            position.lat,
            1800000
          ),

        duration: 1.2,
      });

      return;
    }

    if (
      mode === 'SECONDARY'
    ) {
      const position =
        resolvedSecondarySat
          ?.currentPosition;

      if (!position) {
        return;
      }

      viewer.camera.flyTo({
        destination:
          Cesium.Cartesian3.fromDegrees(
            position.lon,
            position.lat,
            1800000
          ),

        duration: 1.2,
      });

      return;
    }

    /*
     * Global view.
     *
     * 0° longitude / 20° latitude is
     * simply a neutral camera orientation.
     */
    viewer.camera.flyTo({
      destination:
        Cesium.Cartesian3.fromDegrees(
          0,
          20,
          18000000
        ),

      duration: 1.5,
    });
  };

  const primaryName =
    primaryAsset?.shortName ||
    primaryAsset?.name ||
    threat.primary_object;

  const secondaryName =
    resolvedSecondarySat?.shortName ||
    resolvedSecondarySat?.name ||
    threat.secondary_object;

  return (
    <div className="relative w-full h-full">
      {/* Cesium container */}
      <div
        ref={containerRef}
        className="w-full h-full bg-[#040711]"
      />

      {/* Camera presets HUD */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10 font-mono text-xs">
        <div className="p-2 rounded bg-[#060a15]/85 border border-slate-800 backdrop-blur text-[10px] pointer-events-auto text-slate-300 flex items-center gap-1.5">
          <Rotate3d className="w-3.5 h-3.5 text-cyan-400" />

          <span>
            CESIUM 3D ORBITAL GLOBE
          </span>

          <span className="text-slate-500">
            //
          </span>

          <span
            className={`font-bold ${
              visualizationMode ===
              'AFTER'
                ? 'text-emerald-400'
                : 'text-amber-400'
            }`}
          >
            VIEW:{' '}
            {visualizationMode}
          </span>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded bg-[#060a15]/85 border border-slate-800 backdrop-blur pointer-events-auto">
          <button
            onClick={() =>
              handlePreset(
                'CONJUNCTION'
              )
            }
            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
              cameraPreset ===
              'CONJUNCTION'
                ? 'bg-red-950 text-red-300 border border-red-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            CONJUNCTION
          </button>

          <button
            onClick={() =>
              handlePreset(
                'PRIMARY'
              )
            }
            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
              cameraPreset ===
              'PRIMARY'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {primaryName}
          </button>

          <button
            onClick={() =>
              handlePreset(
                'SECONDARY'
              )
            }
            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
              cameraPreset ===
              'SECONDARY'
                ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {secondaryName}
          </button>

          <button
            onClick={() =>
              handlePreset(
                'GLOBAL'
              )
            }
            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
              cameraPreset ===
              'GLOBAL'
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