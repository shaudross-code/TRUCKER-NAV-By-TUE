import React, { useMemo } from 'react';
import { ArrowUp, ArrowUpRight, ArrowUpLeft, ArrowRight, ArrowLeft, RotateCcw, GitFork, Merge, Navigation } from 'lucide-react';

interface ManeuverPreviewProps {
  instruction: string;
  maneuverType: string;
  modifier: string;
  distanceMi: number;
  lanes?: any[];
  roadName?: string;
  exitNumber?: string;
  isComplex?: boolean; // highway interchange, roundabout, etc.
}

const getManeuverVisual = (type: string, modifier: string) => {
  const iconClass = "w-12 h-12 text-white drop-shadow-lg";
  
  if (type.includes('roundabout')) return <RotateCcw className={iconClass} />;
  if (type.includes('fork')) return <GitFork className={iconClass} style={{ transform: modifier === 'left' ? 'scaleX(-1)' : '' }} />;
  if (type.includes('merge')) return <Merge className={iconClass} />;
  
  if (modifier === 'right') return <ArrowRight className={iconClass} />;
  if (modifier === 'left') return <ArrowLeft className={iconClass} />;
  if (modifier === 'slight right') return <ArrowUpRight className={iconClass} />;
  if (modifier === 'slight left') return <ArrowUpLeft className={iconClass} />;
  if (modifier === 'sharp right') return <ArrowRight className={`${iconClass}`} style={{ transform: 'rotate(45deg)' }} />;
  if (modifier === 'sharp left') return <ArrowLeft className={`${iconClass}`} style={{ transform: 'rotate(-45deg)' }} />;
  
  return <ArrowUp className={iconClass} />;
};

export const ManeuverPreview: React.FC<ManeuverPreviewProps> = ({
  instruction,
  maneuverType,
  modifier,
  distanceMi,
  lanes,
  roadName,
  exitNumber,
  isComplex,
}) => {
  // Only show preview for complex maneuvers within 2 miles
  if (!isComplex || distanceMi > 2) return null;

  const cleanInstruction = instruction.replace(/<[^>]+>/g, '').trim();

  // Determine detail level based on distance
  const detailLevel = useMemo(() => {
    if (distanceMi <= 0.25) return 'immediate'; // Show everything
    if (distanceMi <= 0.5) return 'close';       // Lane guidance + exit
    if (distanceMi <= 1) return 'approaching';    // Exit number + road name
    return 'preview';                              // Road name only
  }, [distanceMi]);

  return (
    <div data-testid="maneuver-preview" className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/40 rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-top-2 duration-300">
      {/* Top bar with distance indicator */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/60 border-b border-zinc-700/30">
        <div className={`w-2 h-2 rounded-full ${
          detailLevel === 'immediate' ? 'bg-red-500 animate-pulse' :
          detailLevel === 'close' ? 'bg-amber-500' :
          'bg-emerald-500'
        }`} />
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
          {detailLevel === 'immediate' ? 'Now' :
           detailLevel === 'close' ? 'Approaching' :
           'Upcoming'} Maneuver
        </span>
      </div>

      <div className="p-3 flex items-center gap-3">
        {/* Maneuver icon */}
        <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${
          detailLevel === 'immediate' ? 'bg-[#D4AF37]/20 border-2 border-[#D4AF37]/50' :
          'bg-zinc-800 border border-zinc-700/50'
        }`}>
          {getManeuverVisual(maneuverType, modifier)}
        </div>

        <div className="flex-1 min-w-0">
          {/* Exit number badge */}
          {exitNumber && (detailLevel === 'close' || detailLevel === 'immediate' || detailLevel === 'approaching') && (
            <div className="inline-flex items-center gap-1 bg-[#D4AF37] text-black text-xs font-black px-2 py-0.5 rounded-md mb-1 uppercase">
              Exit {exitNumber}
            </div>
          )}

          {/* Road name */}
          {roadName && (
            <div className="text-white font-bold text-sm truncate">{roadName}</div>
          )}

          {/* Full instruction at close range */}
          {(detailLevel === 'close' || detailLevel === 'immediate') && (
            <div className="text-zinc-400 text-xs truncate mt-0.5">{cleanInstruction}</div>
          )}
        </div>
      </div>

      {/* Lane guidance at very close range */}
      {lanes && lanes.length > 0 && (detailLevel === 'close' || detailLevel === 'immediate') && (
        <div className="px-3 pb-3 pt-1 border-t border-zinc-700/30">
          <div className="flex justify-center gap-0">
            {lanes.map((lane: any, idx: number) => {
              const active = lane.valid || lane.active;
              return (
                <div key={idx} className={`flex items-center justify-center py-1.5 flex-1 max-w-[40px] ${
                  active ? 'bg-[#4285F4]/20' : 'bg-white/[0.03]'
                } ${idx === 0 ? 'rounded-l-lg' : ''} ${idx === lanes.length - 1 ? 'rounded-r-lg' : ''}`}
                style={{ borderLeft: idx > 0 ? '1px dashed rgba(255,255,255,0.1)' : 'none' }}>
                  {active && <div className="w-1.5 h-1.5 bg-[#4285F4] rounded-full" />}
                  {!active && <div className="w-1 h-1 bg-white/10 rounded-full" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
