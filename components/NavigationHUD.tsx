import React, { useContext, useMemo } from 'react';
import { ArrowUp, ChevronUp } from 'lucide-react';
import { HighwayShield } from './MapUI';
import { AppContext } from '../types';

interface LaneData {
  direction: string;
  matches: string[];
}

interface NavigationHUDProps {
  nextInstruction: { icon: any; distance: string; text: string; lanes?: LaneData[]; maneuver?: any; followingStep?: { text: string; icon: any } | null };
  parseLane: (lane: LaneData) => { rotation: number; active: boolean; isStraight: boolean };
}

export const NavigationHUD: React.FC<NavigationHUDProps> = ({ nextInstruction, parseLane }) => {
  const context = useContext(AppContext);
  const isMetric = context?.unitSystem === 'metric';
  const distVal = parseFloat(nextInstruction.distance);
  const showLanes = nextInstruction.lanes && nextInstruction.lanes.length > 0 && distVal <= 2.0;

  const formatDistance = (distStr: string) => {
    const val = parseFloat(distStr);
    if (isNaN(val)) return distStr;
    if (isMetric) {
      const km = val * 1.60934;
      return km < 1 ? `${Math.round(km * 1000)}` : km.toFixed(1);
    }
    return distStr;
  };

  const distUnit = isMetric ? (distVal * 1.60934 < 1 ? 'm' : 'km') : 'mi';

  const { activeLanes, totalLanes, laneRangeLabel } = useMemo(() => {
    const active: number[] = [];
    const total = nextInstruction.lanes?.length || 0;
    nextInstruction.lanes?.forEach((lane, idx) => {
      const { active: isActive } = parseLane(lane);
      if (isActive) active.push(idx + 1);
    });
    let label = '';
    if (active.length > 0 && active.length < total) {
      if (active.length === 1) label = `LANE ${active[0]}`;
      else if (active[active.length - 1] - active[0] === active.length - 1) label = `LANES ${active[0]}–${active[active.length - 1]}`;
      else label = `LANES ${active.join(', ')}`;
    }
    return { activeLanes: active, totalLanes: total, laneRangeLabel: label };
  }, [nextInstruction.lanes, parseLane]);

  return (
    <div className="absolute top-0 left-0 right-0 z-[2100] transition-all duration-700 ease-in-out translate-y-0 opacity-100">
      <div className="bg-gradient-to-b from-black/95 to-black/60 backdrop-blur-3xl border-b border-[#D4AF37]/20 p-2 md:p-6 landscape:p-2 landscape:md:p-4 pt-[calc(0.5rem+env(safe-area-inset-top))] md:pt-[calc(1rem+env(safe-area-inset-top))] landscape:pt-[calc(0.25rem+env(safe-area-inset-top))] shadow-2xl">
        <div className="flex flex-col gap-0">
          {/* Main instruction row */}
          <div className="flex items-center gap-2 md:gap-10 landscape:gap-4 w-full">
            <div className="bg-[#D4AF37] p-2 md:p-6 landscape:p-3 rounded-xl md:rounded-2xl landscape:rounded-xl shadow-[0_0_30px_rgba(212,175,55,0.4)] shrink-0">
              <nextInstruction.icon className="w-8 h-8 md:w-20 md:h-20 landscape:w-10 landscape:h-10 text-black" strokeWidth={4} />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-baseline gap-2 md:gap-4 landscape:gap-2">
                <span data-testid="nav-hud-distance" className="text-4xl md:text-8xl landscape:text-5xl font-[1000] text-white tracking-tighter leading-none drop-shadow-2xl">
                  {formatDistance(nextInstruction.distance)}
                </span>
                <span data-testid="nav-hud-unit" className="text-xl md:text-4xl landscape:text-2xl font-black text-[#D4AF37] uppercase tracking-tighter">{distUnit}</span>
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

          {/* Lane Guidance Panel — shown when within 2 miles of maneuver */}
          {showLanes && (
            <div data-testid="lane-guidance-panel" className="mt-2 pt-2 border-t border-white/10 animate-in slide-in-from-top-2 fade-in duration-500">
              <div className="flex items-center justify-between">
                {/* Lane label */}
                {laneRangeLabel && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-px w-3 bg-[#4285F4]/60" />
                    <span data-testid="lane-guidance-label" className="text-[9px] md:text-xs font-black text-[#4285F4] uppercase tracking-[0.2em]">
                      Use {laneRangeLabel}
                    </span>
                    <div className="h-px w-3 bg-[#4285F4]/60" />
                  </div>
                )}
                <span className="text-[8px] md:text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                  {totalLanes} lane{totalLanes !== 1 ? 's' : ''}
                </span>
              </div>
              {/* Lane arrows — road-style visualization */}
              <div className="flex justify-center gap-0">
                {nextInstruction.lanes!.map((lane, idx) => {
                  const { rotation, active, isStraight } = parseLane(lane);
                  const isFirst = idx === 0;
                  const isLast = idx === (nextInstruction.lanes!.length - 1);
                  return (
                    <div key={idx} className={`relative flex flex-col items-center py-2 md:py-3 flex-1 max-w-[64px] md:max-w-[80px] transition-all duration-300 ${
                      active 
                        ? 'bg-[#4285F4]/20 z-10' 
                        : 'bg-white/[0.03]'
                    } ${isFirst ? 'rounded-l-xl' : ''} ${isLast ? 'rounded-r-xl' : ''}`}
                    style={{ borderLeft: idx > 0 ? '1px dashed rgba(255,255,255,0.1)' : 'none' }}
                    >
                      {/* Active indicator bar */}
                      {active && (
                        <div className="absolute top-0 left-1 right-1 h-[3px] bg-[#4285F4] rounded-full shadow-[0_0_8px_rgba(66,133,244,0.6)]" />
                      )}
                      <ArrowUp 
                        className={`w-5 h-5 md:w-8 md:h-8 transition-colors ${active ? 'text-white' : 'text-white/15'}`}
                        strokeWidth={active ? 4 : 2} 
                        style={{ transform: `rotate(${rotation}deg)` }} 
                      />
                      {active && (
                        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 md:w-2 md:h-2 bg-[#4285F4] rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
