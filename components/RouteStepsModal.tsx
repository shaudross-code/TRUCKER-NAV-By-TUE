import React from 'react';
import { X, List } from 'lucide-react';

interface RouteStepsModalProps {
  showSteps: boolean;
  onClose: () => void;
  routeSteps: any[];
  maneuverIndex: number;
  getManeuverIcon: (type: string, modifier?: string) => any;
}

export const RouteStepsModal: React.FC<RouteStepsModalProps> = ({
  showSteps, onClose, routeSteps, maneuverIndex, getManeuverIcon,
}) => {
  if (!showSteps) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-[#D4AF37]/30 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.15)] animate-in zoom-in duration-300">
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D4AF37]/20 rounded-xl">
              <List className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white italic uppercase tracking-tight">Turn-by-Turn</h2>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{routeSteps.length} Steps to Destination</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-zinc-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {routeSteps.map((step, idx) => {
            const Icon = getManeuverIcon(step.maneuver.type, step.maneuver.modifier);
            const isCurrent = idx === maneuverIndex;
            
            return (
              <div key={idx} className={`p-4 rounded-2xl border transition-all duration-300 ${isCurrent ? 'bg-[#D4AF37]/10 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.1)]' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl shrink-0 ${isCurrent ? 'bg-[#D4AF37] text-black' : 'bg-zinc-800 text-[#D4AF37]'}`}>
                    <Icon className="w-6 h-6" strokeWidth={3} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-black uppercase tracking-widest ${isCurrent ? 'text-[#D4AF37]' : 'text-zinc-500'}`}>Step {idx + 1}</span>
                      <span className="text-xs font-bold text-zinc-400">{step.distance}</span>
                    </div>
                    <p className="text-sm font-bold text-white leading-snug">{step.instruction}</p>
                    {step.roadName && <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">{step.roadName}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="p-6 border-t border-white/10 flex justify-center bg-zinc-900/50">
          <button onClick={onClose} className="px-8 py-3 bg-[#D4AF37] text-black font-black uppercase italic tracking-widest rounded-xl hover:scale-105 transition-transform shadow-lg shadow-[#D4AF37]/20">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
