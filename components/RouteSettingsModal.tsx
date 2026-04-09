import React from 'react';
import { Settings, X, CircleDollarSign, Wind, TrafficCone, Navigation as NavIcon } from 'lucide-react';

interface RouteSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  avoidTolls: boolean;
  setAvoidTolls: (value: boolean) => void;
  avoidFerries: boolean;
  setAvoidFerries: (value: boolean) => void;
  avoidUnpaved: boolean;
  setAvoidUnpaved: (value: boolean) => void;
  isCarPlayMode: boolean;
  setIsCarPlayMode: (value: boolean) => void;
}

export const RouteSettingsModal: React.FC<RouteSettingsModalProps> = ({
  isOpen,
  onClose,
  avoidTolls,
  setAvoidTolls,
  avoidFerries,
  setAvoidFerries,
  avoidUnpaved,
  setAvoidUnpaved,
  isCarPlayMode,
  setIsCarPlayMode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-black border border-[#D4AF37]/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="text-[#D4AF37] font-bold text-lg uppercase tracking-wider">Route Preferences</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Avoidance Options</h4>
            
            <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-zinc-800 hover:border-[#D4AF37]/30 transition-colors">
              <div className="flex items-center gap-3">
                <CircleDollarSign className="w-5 h-5 text-zinc-400" />
                <span className="text-sm font-bold text-white">Avoid Toll Roads</span>
              </div>
              <button 
                onClick={() => setAvoidTolls(!avoidTolls)}
                className={`w-12 h-6 rounded-full transition-colors relative ${avoidTolls ? 'bg-[#D4AF37]' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${avoidTolls ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-zinc-800 hover:border-[#D4AF37]/30 transition-colors">
              <div className="flex items-center gap-3">
                <Wind className="w-5 h-5 text-zinc-400" />
                <span className="text-sm font-bold text-white">Avoid Ferries</span>
              </div>
              <button 
                onClick={() => setAvoidFerries(!avoidFerries)}
                className={`w-12 h-6 rounded-full transition-colors relative ${avoidFerries ? 'bg-[#D4AF37]' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${avoidFerries ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-zinc-800 hover:border-[#D4AF37]/30 transition-colors">
              <div className="flex items-center gap-3">
                <TrafficCone className="w-5 h-5 text-zinc-400" />
                <span className="text-sm font-bold text-white">Avoid Unpaved Roads</span>
              </div>
              <button 
                onClick={() => setAvoidUnpaved(!avoidUnpaved)}
                className={`w-12 h-6 rounded-full transition-colors relative ${avoidUnpaved ? 'bg-[#D4AF37]' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${avoidUnpaved ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Display Mode</h4>
            
            <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-zinc-800 hover:border-[#D4AF37]/30 transition-colors">
              <div className="flex items-center gap-3">
                <NavIcon className="w-5 h-5 text-zinc-400" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">CarPlay Mode</span>
                  <span className="text-[10px] text-zinc-500">Simplified high-contrast UI</span>
                </div>
              </div>
              <button 
                onClick={() => setIsCarPlayMode(!isCarPlayMode)}
                className={`w-12 h-6 rounded-full transition-colors relative ${isCarPlayMode ? 'bg-[#D4AF37]' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isCarPlayMode ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full bg-[#D4AF37] text-black font-black py-4 rounded-xl hover:bg-[#D4AF37]/90 transition-all uppercase tracking-[0.2em] text-xs shadow-lg shadow-[#D4AF37]/20 active:scale-95"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
