import React, { useMemo } from 'react';
import { Navigation, ArrowUp, ArrowRight, ArrowLeft, ArrowUpRight, ArrowUpLeft, RotateCcw, GitFork, Merge, Zap } from 'lucide-react';

// Lane direction types from HERE API
export interface LaneData {
  direction?: string;
  directions?: string[];
  valid?: boolean;
  active?: boolean;
}

interface NavigationHUDProps {
  nextInstruction: any;
  parseLane: (step: any) => LaneData[] | null;
  distanceToManeuverMi?: number;
  roadName?: string;
  exitNumber?: string;
  maneuverType?: string;
  maneuverModifier?: string;
  speedLimit?: number;
}

const getDirectionIcon = (type: string, modifier: string, size: string = "w-10 h-10") => {
  const cls = `${size} text-white drop-shadow-md`;
  if (type.includes('roundabout')) return <RotateCcw className={cls} />;
  if (type.includes('fork')) return <GitFork className={cls} style={{ transform: modifier === 'left' ? 'scaleX(-1)' : '' }} />;
  if (type.includes('merge')) return <Merge className={cls} />;
  
  if (modifier === 'right' || modifier === 'sharp right') return <ArrowRight className={cls} />;
  if (modifier === 'left' || modifier === 'sharp left') return <ArrowLeft className={cls} />;
  if (modifier === 'slight right') return <ArrowUpRight className={cls} />;
  if (modifier === 'slight left') return <ArrowUpLeft className={cls} />;
  
  return <ArrowUp className={cls} />;
};

const formatDistance = (mi: number) => {
  if (mi >= 10) return `${Math.round(mi)} mi`;
  if (mi >= 1) return `${mi.toFixed(1)} mi`;
  if (mi >= 0.19) return `${(mi * 5280).toFixed(0)} ft`;
  return `${Math.round(mi * 5280)} ft`;
};

export const NavigationHUD: React.FC<NavigationHUDProps> = ({
  nextInstruction,
  parseLane,
  distanceToManeuverMi,
  roadName,
  exitNumber,
  maneuverType = '',
  maneuverModifier = '',
  speedLimit,
}) => {
  if (!nextInstruction) return null;

  // Handle instruction as object (from NavigationView state)
  const instrText = typeof nextInstruction === 'string' ? nextInstruction : (nextInstruction?.text || '');
  if (!instrText || instrText === 'Ready for Route') return null;

  // Parse instruction HTML to extract clean text
  const cleanInstruction = instrText.replace(/<[^>]+>/g, '').trim();
  
  // Extract road name from instruction if not provided
  const displayRoadName = roadName || (() => {
    const match = cleanInstruction.match(/(?:on|onto|toward)\s+(.+?)(?:\s+for|\s*$)/i);
    return match?.[1] || '';
  })();

  // Extract exit number from instruction if not provided
  const displayExitNum = exitNumber || (() => {
    const match = cleanInstruction.match(/exit\s+(\d+[A-Z]?)/i);
    return match?.[1] || '';
  })();

  // Detail level based on distance
  const detailLevel = useMemo(() => {
    if (!distanceToManeuverMi || distanceToManeuverMi > 5) return 'far';
    if (distanceToManeuverMi > 2) return 'approaching';
    if (distanceToManeuverMi > 0.5) return 'close';
    return 'immediate';
  }, [distanceToManeuverMi]);

  return (
    <div 
      data-testid="navigation-hud" 
      className="absolute top-14 left-3 right-3 lg:top-3 lg:left-auto lg:right-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-[480px] z-[2000] pointer-events-none"
    >
      <div className={`bg-zinc-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border overflow-hidden transition-all duration-300 ${
        detailLevel === 'immediate' ? 'border-[#D4AF37]/60 ring-1 ring-[#D4AF37]/20' : 'border-zinc-700/40'
      }`}>
        <div className="flex items-stretch">
          {/* Direction icon */}
          <div className={`flex items-center justify-center px-4 py-3 ${
            detailLevel === 'immediate' ? 'bg-[#D4AF37]/15' : 'bg-zinc-800/50'
          }`}>
            <div className="flex flex-col items-center gap-1">
              {getDirectionIcon(maneuverType, maneuverModifier)}
              {distanceToManeuverMi !== undefined && (
                <span className={`text-xs font-black ${
                  detailLevel === 'immediate' ? 'text-[#D4AF37]' : 'text-white'
                }`}>
                  {formatDistance(distanceToManeuverMi)}
                </span>
              )}
            </div>
          </div>

          {/* Instruction content */}
          <div className="flex-1 py-3 px-4 min-w-0">
            {/* Exit badge (close range) */}
            {displayExitNum && (detailLevel === 'close' || detailLevel === 'immediate') && (
              <div className="inline-flex items-center gap-1 bg-[#D4AF37] text-black text-[10px] font-black px-2 py-0.5 rounded mb-1 uppercase">
                Exit {displayExitNum}
              </div>
            )}

            {/* Primary instruction - adapts based on distance */}
            <div className="text-white font-bold text-sm leading-tight truncate">
              {detailLevel === 'far' && displayRoadName ? (
                // Far: Just show road name
                <>Continue on <span className="text-[#D4AF37]">{displayRoadName}</span></>
              ) : (
                // Closer: Full instruction
                cleanInstruction
              )}
            </div>

            {/* Road name (when approaching) */}
            {detailLevel === 'approaching' && displayRoadName && (
              <div className="text-zinc-400 text-xs mt-0.5 truncate">
                toward {displayRoadName}
              </div>
            )}

            {/* Speed limit indicator */}
            {speedLimit && speedLimit > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <Zap className="w-3 h-3 text-zinc-500" />
                <span className="text-[10px] text-zinc-500 font-mono">{speedLimit} mph</span>
              </div>
            )}
          </div>
        </div>

        {/* Lane guidance ribbon — visible at close range */}
        {detailLevel !== 'far' && (
          <LaneRibbon parseLane={parseLane} nextInstruction={nextInstruction} />
        )}
      </div>
    </div>
  );
};

const LaneRibbon: React.FC<{ parseLane: (step: any) => LaneData[] | null; nextInstruction: string }> = ({ parseLane, nextInstruction }) => {
  // Parse lanes from instruction context
  const mockStep = { maneuver: { instruction: nextInstruction } };
  let lanes: LaneData[] | null = null;
  try {
    const result = parseLane(mockStep);
    lanes = Array.isArray(result) ? result : null;
  } catch {
    lanes = null;
  }
  
  if (!lanes || lanes.length === 0) return null;

  return (
    <div className="border-t border-zinc-700/30 px-4 py-2 bg-zinc-800/30">
      <div className="flex justify-center gap-0">
        {lanes.map((lane, idx) => {
          const active = lane.valid || lane.active;
          return (
            <div key={idx} className={`flex items-center justify-center py-1.5 flex-1 max-w-[42px] transition-all ${
              active ? 'bg-[#4285F4]/20' : 'bg-white/[0.02]'
            } ${idx === 0 ? 'rounded-l-lg' : ''} ${idx === lanes.length - 1 ? 'rounded-r-lg' : ''}`}
            style={{ borderLeft: idx > 0 ? '1px dashed rgba(255,255,255,0.08)' : 'none' }}>
              {active ? (
                <div className="w-2 h-2 bg-[#4285F4] rounded-full shadow-[0_0_6px_rgba(66,133,244,0.5)]" />
              ) : (
                <div className="w-1 h-1 bg-white/10 rounded-full" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
