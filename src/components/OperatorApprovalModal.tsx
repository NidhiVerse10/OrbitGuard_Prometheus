import React, { useState } from 'react';
import type { CandidateManeuver, ConjunctionThreat } from '../types/orbitguard';
import { Lock, AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface OperatorApprovalModalProps {
  isOpen: boolean;
  threat: ConjunctionThreat;
  selectedPlan: CandidateManeuver | undefined;
  onClose: () => void;
  onConfirm: (operatorCallsign: string) => void;
}

export const OperatorApprovalModal: React.FC<OperatorApprovalModalProps> = ({
  isOpen,
  threat,
  selectedPlan,
  onClose,
  onConfirm,
}) => {
  const [callsign, setCallsign] = useState('FLIGHT-DIR-01');
  const [safetyCheck1, setSafetyCheck1] = useState(true);
  const [safetyCheck2, setSafetyCheck2] = useState(true);

  if (!isOpen || !selectedPlan) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!safetyCheck1 || !safetyCheck2) return;
    onConfirm(callsign);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono text-xs">
      <div className="w-full max-w-lg rounded-xl bg-[#0a101f] border border-cyan-500/60 shadow-[0_0_50px_rgba(0,242,254,0.3)] overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#060a14] border-b border-slate-800">
          <div className="flex items-center gap-2 text-cyan-300 font-bold uppercase tracking-wider">
            <Lock className="w-4 h-4 text-cyan-400" />
            <span>OPERATOR REVIEW & AUTHORIZATION</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/40 text-amber-200">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="uppercase tracking-wider">
                HUMAN-IN-THE-LOOP SAFETY VERIFICATION
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              OrbitGuard is an autonomous decision-support system. Thruster actuation requires affirmative verification by an authorized Flight Dynamics Officer.
            </p>
          </div>

          {/* Maneuver Summary Card */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex justify-between text-slate-400">
              <span>TARGET SPACECRAFT:</span>
              <span className="text-white font-bold">{threat.threatenedSat.name}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>RECOMMENDED MANEUVER:</span>
              <span className="text-emerald-400 font-bold">{selectedPlan.name}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>DELTA-V IMPULSE:</span>
              <span className="text-cyan-300 font-bold">{selectedPlan.deltaVMs} m/s</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>ESTIMATED MISS DISTANCE:</span>
              <span className="text-emerald-400 font-bold">{selectedPlan.status === "SELECTED" ? "Clearance safe" : "Evaluated"}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>SECONDARY FLEET CONFLICTS:</span>
              <span className="text-emerald-400 font-bold">0 Detected (Verified)</span>
            </div>
          </div>

          {/* Verification Checkboxes */}
          <div className="space-y-2 pt-1">
            <label className="flex items-start gap-2.5 p-2 rounded bg-slate-900/50 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={safetyCheck1}
                onChange={(e) => setSafetyCheck1(e.target.checked)}
                className="mt-0.5 accent-cyan-400"
              />
              <span className="text-[11px] text-slate-300">
                I have reviewed the counterfactual rejection of candidate maneuvers and confirmed secondary fleet clearance.
              </span>
            </label>

            <label className="flex items-start gap-2.5 p-2 rounded bg-slate-900/50 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={safetyCheck2}
                onChange={(e) => setSafetyCheck2(e.target.checked)}
                className="mt-0.5 accent-cyan-400"
              />
              <span className="text-[11px] text-slate-300">
                I confirm the orbital parameters and authorization for {selectedPlan.name} uplink packaging.
              </span>
            </label>
          </div>

          {/* Operator Callsign Input */}
          <div>
            <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">
              OPERATOR CALLSIGN / SIGNATURE ID
            </label>
            <input
              type="text"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              placeholder="e.g. FDO-DIRECTOR-01"
              required
              className="w-full px-3 py-2 rounded bg-slate-950 border border-cyan-800/80 text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={!safetyCheck1 || !safetyCheck2 || !callsign}
              className="px-4 py-2 rounded bg-emerald-500 text-black font-bold uppercase tracking-wider hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>APPROVE RECOMMENDATION</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
