import React from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

interface WarningBannersProps {
  error: string | null;
  setError: (e: string | null) => void;
  isOffRoute: boolean;
  hasViolation: boolean;
  isCalculating: boolean;
  handleReroute: () => void;
  autoReroute?: boolean;
  milesRemaining: number;
}

export const WarningBanners: React.FC<WarningBannersProps> = ({
  error, setError, isOffRoute, hasViolation, isCalculating, handleReroute, autoReroute, milesRemaining,
}) => {
  const topOffset = milesRemaining > 0 ? 'top-[160px] md:top-[200px]' : 'top-[calc(2rem+env(safe-area-inset-top))]';

  return (
    <>
      {error && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[4000] bg-rose-500/20 backdrop-blur-xl border border-rose-500/50 rounded-2xl p-6 flex items-center gap-4 shadow-2xl animate-in fade-in duration-300">
          <AlertTriangle className="w-8 h-8 text-rose-400" />
          <div>
            <h3 className="text-rose-400 font-black">Routing Error</h3>
            <p className="text-white/80 text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
      )}

      {isOffRoute && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-[3000] w-full max-w-[600px] px-4 md:px-6 transition-all duration-700 ${topOffset}`}>
          <div className="bg-rose-600 border-2 border-white/20 rounded-3xl p-3 md:p-4 flex items-center gap-3 md:gap-4 shadow-[0_20px_60px_rgba(225,29,72,0.4)]">
            <div className="bg-white p-1.5 md:p-2 rounded-xl text-rose-600">
              <RotateCcw className={`w-5 h-5 md:w-6 md:h-6 ${isCalculating ? 'animate-spin' : ''}`} strokeWidth={3} />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-black uppercase italic tracking-tighter text-base md:text-lg leading-none">Off Route Detected</h3>
              <p className="text-white/80 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-0.5 md:mt-1">
                {autoReroute ? 'Recalculating route...' : 'Manual recalculation required'}
              </p>
            </div>
            {!autoReroute && (
              <button onClick={handleReroute} disabled={isCalculating}
                className="px-4 py-2 bg-white text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all shadow-lg disabled:opacity-50">
                {isCalculating ? 'Recalculating...' : 'Recalculate'}
              </button>
            )}
          </div>
        </div>
      )}

      {hasViolation && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-[3000] w-full max-w-[600px] px-4 md:px-6 transition-all duration-700 ${topOffset}`}>
          <div className="bg-rose-600 border-2 border-white/20 rounded-3xl p-3 md:p-4 flex items-center gap-3 md:gap-4 shadow-[0_20px_60px_rgba(225,29,72,0.4)]">
            <div className="bg-white p-1.5 md:p-2 rounded-xl text-rose-600 animate-pulse">
              <AlertTriangle className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-black uppercase italic tracking-tighter text-base md:text-lg leading-none">HOS Violation Alert</h3>
              <p className="text-white/80 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-0.5 md:mt-1">Immediate Stop Required - Safety Protocol Active</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
