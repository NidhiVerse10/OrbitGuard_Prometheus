import type { Threat } from '../types/orbitguard';

interface HeaderProps {
  threat: Threat;
  zuluTime: string;
  isEvaluating: boolean;
  isMockMode: boolean;
  operatorApproved: boolean;
  onTriggerEvaluation: () => void;
  onReset: () => void;
  onToggleMode: () => void;
}

export default function Header({
  threat,
  zuluTime,
  isEvaluating,
  isMockMode,
  onTriggerEvaluation,
  onReset,
  onToggleMode,
}: HeaderProps) {
  const feedStatus = isMockMode
    ? 'SIMULATION FEED: CONTROLLED'
    : 'RADAR FEED: CONNECTED';

  return (
    <header className="border-b border-white/10 bg-[#070b11] px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-mono text-lg font-bold tracking-[0.28em] text-cyan-300">
            ORBITGUARD
          </div>

          <div className="mt-1 font-mono text-[10px] tracking-[0.18em] text-white/40">
            AUTONOMOUS MULTI-AGENT CONJUNCTION RESPONSE SYSTEM
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-5 font-mono text-xs">
          <div className="text-white/50">
            {feedStatus}
          </div>

          <div className="text-cyan-300">
            ZULU {zuluTime || '--:--:-- UTC'}
          </div>

          <div
            className={
              threat.severity === 'CRITICAL'
                ? 'text-red-400'
                : threat.severity === 'MODERATE'
                  ? 'text-amber-300'
                  : 'text-emerald-300'
            }
          >
            {threat.primary_object} // {threat.secondary_object}
          </div>

          <button
            type="button"
            onClick={onTriggerEvaluation}
            disabled={isEvaluating}
            className="border border-cyan-400/40 px-3 py-2 text-[10px] tracking-[0.16em] text-cyan-300 transition hover:border-cyan-300 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isEvaluating
              ? 'EVALUATING...'
              : 'RUN RESPONSE'}
          </button>

          <button
            type="button"
            onClick={onToggleMode}
            className="border border-amber-400/40 px-3 py-2 text-[10px] tracking-[0.16em] text-amber-300 transition hover:border-amber-300 hover:bg-amber-300/10"
          >
            {isMockMode
              ? 'USE LIVE API'
              : 'USE MOCK'}
          </button>

          <button
            type="button"
            onClick={onReset}
            className="border border-white/15 px-3 py-2 text-[10px] tracking-[0.16em] text-white/60 hover:border-white/30 hover:text-white"
          >
            RESET
          </button>
        </div>
      </div>
    </header>
  );
}