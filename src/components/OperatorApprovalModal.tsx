// src/components/OperatorApprovalModal.tsx

import type {
  ManeuverPlan,
  Threat,
  VerificationResult,
} from '../types/orbitguard';

interface OperatorApprovalModalProps {
  threat: Threat;
  selectedPlan?: ManeuverPlan;
  verification?: VerificationResult;
  onApprove: () => void;
  onClose: () => void;
}

export default function OperatorApprovalModal({
  threat,
  selectedPlan,
  verification,
  onApprove,
  onClose,
}: OperatorApprovalModalProps) {
  const safe =
    verification?.verification_status === 'SAFE' ||
    verification?.status === 'SAFE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-lg border border-white/15 bg-[#080d14]">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="font-mono text-xs tracking-[0.2em] text-white/50">
            HUMAN APPROVAL REQUIRED
          </div>

          <div className="mt-2 font-mono text-lg text-white">
            VERIFY MANEUVER BEFORE EXECUTION
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-white/10 p-3">
              <div className="font-mono text-[9px] text-white/35">
                PROTECTED OBJECT
              </div>

              <div className="mt-1 font-mono text-sm font-bold text-white">
                {threat.primary_object}
              </div>
            </div>

            <div className="border border-white/10 p-3">
              <div className="font-mono text-[9px] text-white/35">
                CONJUNCTION OBJECT
              </div>

              <div className="mt-1 font-mono text-sm font-bold text-amber-300">
                {threat.secondary_object}
              </div>
            </div>
          </div>

          {selectedPlan && (
            <div className="border border-cyan-400/20 p-4">
              <div className="font-mono text-[9px] tracking-[0.16em] text-white/35">
                SELECTED MANEUVER
              </div>

              <div className="mt-1 font-mono text-sm text-cyan-300">
                {selectedPlan.name}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-white/35">ΔV </span>

                  <span className="font-mono">
                    {selectedPlan.delta_v_ms.toFixed(3)} m/s
                  </span>
                </div>

                <div>
                  <span className="text-white/35">STATUS </span>

                  <span className="font-mono">
                    {selectedPlan.status ?? 'PENDING'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div
            className={`border p-4 ${
              safe
                ? 'border-emerald-400/30'
                : 'border-red-400/30'
            }`}
          >
            <div className="font-mono text-[9px] tracking-[0.16em] text-white/35">
              VERIFIER
            </div>

            <div
              className={`mt-1 font-mono text-sm ${
                safe
                  ? 'text-emerald-300'
                  : 'text-red-400'
              }`}
            >
              {verification?.verification_status ??
                verification?.status ??
                'NOT VERIFIED'}
            </div>

            {typeof verification?.closest_approach_km === 'number' && (
              <div className="mt-2 font-mono text-xs text-white/60">
                CLOSEST APPROACH:{' '}
                {verification.closest_approach_km.toFixed(3)} km
              </div>
            )}

            {verification?.verification_notes && (
              <div className="mt-2 font-mono text-xs leading-relaxed text-white/45">
                {verification.verification_notes}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="border border-white/15 px-4 py-2 font-mono text-[10px] tracking-[0.16em] text-white/60 hover:text-white"
          >
            CANCEL
          </button>

          <button
            type="button"
            onClick={onApprove}
            disabled={!safe}
            className="border border-emerald-400/40 px-4 py-2 font-mono text-[10px] tracking-[0.16em] text-emerald-300 hover:bg-emerald-300/10 disabled:cursor-not-allowed disabled:opacity-30"
          >
            APPROVE MANEUVER
          </button>
        </div>
      </div>
    </div>
  );
}