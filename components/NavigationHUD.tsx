import React from 'react';
import { ArrowUp } from 'lucide-react';
import { HighwayShield } from './HighwayShield';

interface NavigationHUDProps {
  nextInstruction: { icon: any; distance: string; text: string; lanes?: string[] };
  parseLane: (lane: string) => { rotation: number; active: boolean };
}

export const NavigationHUD: React.FC<NavigationHUDProps> = ({ nextInstruction, parseLane }) => {
  return (
    <div className="absolute top-0 left-0 right-0 z-[2100] transition-all duration-700 ease-in-out translate-y-0 opacity-100">
      <div className="bg-gradient-to-b from-black/95 to-black/60 backdrop-blur-3xl border-b border-[#D4AF37]/20 p-2 md:p-6 landscape:p-2 landscape:md:p-4 pt-[calc(0.5rem+env(safe-area-inset-top))] md:pt-[calc(1rem+env(safe-area-inset-top))] landscape:pt-[calc(0.25rem+env(safe-area-inset-top))] shadow-2xl">
        <div className="flex flex-col md:flex-row landscape:flex-row items-start md:items-center landscape:items-center justify-between gap-2 md:gap-4 landscape:gap-2">
          <div className="flex items-center gap-2 md:gap-10 landscape:gap-4 w-full md:w-auto landscape:w-auto">
            <div className="bg-[#D4AF37] p-2 md:p-6 landscape:p-3 rounded-xl md:rounded-2xl landscape:rounded-xl shadow-[0_0_30px_rgba(212,175,55,0.4)] shrink-0">
              <nextInstruction.icon className="w-8 h-8 md:w-20 md:h-20 landscape:w-10 landscape:h-10 text-black" strokeWidth={4} />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-baseline gap-2 md:gap-4 landscape:gap-2">
                <span className="text-4xl md:text-8xl landscape:text-5xl font-[1000] text-white tracking-tighter leading-none drop-shadow-2xl">{nextInstruction.distance}</span>
                <span className="text-xl md:text-4xl landscape:text-2xl font-black text-[#D4AF37] uppercase tracking-tighter">mi</span>
              </div>
              <div className="flex items-center gap-2 md:gap-4 landscape:gap-2 mt-1 md:mt-2 landscape:mt-1 truncate">
                {(() => {
                  const highwayMatch = nextInstruction.text.match(/(I-|US-|SR-|Hwy|Route|State Route)\s*(\d+[A-Z]?)/i);
                  const exitMatch = nextInstruction.text.match(/exit\s+(\d+[A-Z]?)/i);
                  if (highwayMatch || exitMatch) {
                    return (
                      <div className="flex gap-2 scale-75 md:scale-100 origin-left shrink-0">
                        {highwayMatch && <HighwayShield roadName={highwayMatch[0]} />}
                        {exitMatch && (
                          <div className="bg-[#D4AF37] text-black font-black px-2 py-1 rounded-lg text-sm md:text-2xl uppercase tracking-tight shrink-0">Exit {exitMatch[1]}</div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
                <span className="text-lg md:text-4xl landscape:text-2xl font-black text-white italic uppercase tracking-tight truncate drop-shadow-lg">{nextInstruction.text}</span>
              </div>
            </div>
          </div>

          {nextInstruction.lanes && nextInstruction.lanes.length > 0 && (
            <div className="flex gap-2 md:gap-4 overflow-x-auto no-scrollbar py-2">
              {nextInstruction.lanes.map((lane, idx) => {
                const { rotation, active } = parseLane(lane);
                return (
                  <div key={idx} className={`p-2 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all duration-500 shrink-0 flex items-center justify-center ${active ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-white shadow-[0_0_20px_rgba(212,175,55,0.4)]' : 'bg-white/5 border-white/10 text-white/20'}`}>
                    <ArrowUp className="w-6 h-6 md:w-12 md:h-12" strokeWidth={active ? 5 : 3} style={{ transform: `rotate(${rotation}deg)` }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
