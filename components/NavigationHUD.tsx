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
      className="absolute z-[3100] pointer-events-none"
      style={{
        top: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(480px, calc(100% - 1.5rem))',
      }}
    >
      <div className={`bg-black/95 backdrop-blur-xl rounded-2xl shadow-2xl border overflow-hidden transition-all duration-300 ${
        detailLevel === 'immediate' ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/30' : 'border-[#D4AF37]/40'
      }`}>
        <div className="flex items-stretch">
          {/* Direction icon */}
          <div className={`flex items-center justify-center px-4 py-3 ${
            detailLevel === 'immediate' ? 'bg-[#D4AF37]/20' : 'bg-[#D4AF37]/10'
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

const LaneArrow: React.FC<{ direction: string; active: boolean }> = ({ direction, active }) => {
  const dirs = direction.toLowerCase().split(';').map(d => d.trim()).filter(Boolean);
  const color = active ? '#D4AF37' : 'rgba(255,255,255,0.2)';
  
  const getArrowPath = (dir: string): string => {
    switch (dir) {
      case 'straight': return 'M12 20V6M12 6l-4 4M12 6l4 4';
      case 'left': return 'M20 12H6M6 12l4-4M6 12l4 4';
      case 'right': return 'M4 12h14M18 12l-4-4M18 12l-4 4';
      case 'slight left': return 'M18 18L8 8M8 8v6M8 8h6';
      case 'slight right': return 'M6 18l10-10M16 8v6M16 8h-6';
      case 'sharp left': return 'M18 6L6 18M6 18V12M6 18h6';
      case 'sharp right': return 'M6 6l12 12M18 18v-6M18 18h-6';
      case 'uturn':
      case 'u-turn': return 'M7 18V10a5 5 0 0 1 10 0v1M17 11l-3-3M17 11l3-3';
      default: return 'M12 20V6M12 6l-4 4M12 6l4 4'; // default straight
    }
  };

  if (dirs.length === 0) dirs.push('straight');

  return (
    <div className="relative flex items-center justify-center" style={{ width: 28, height: 28 }}>
      {dirs.map((dir, i) => (
        <svg key={i} width="24" height="24" viewBox="0 0 24 24" fill="none" 
          className="absolute" style={{ opacity: dirs.length > 1 ? 0.9 : 1 }}>
          <path d={getArrowPath(dir)} stroke={color} strokeWidth={active ? 2.5 : 1.5} 
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  );
};

const LaneRibbon: React.FC<{ parseLane: (step: any) => any; nextInstruction: any }> = ({ parseLane, nextInstruction }) => {
  const lanes = useMemo(() => {
    // Get lanes directly from the instruction object
    const rawLanes = nextInstruction?.lanes;
    if (!rawLanes || !Array.isArray(rawLanes) || rawLanes.length === 0) return null;
    
    return rawLanes.map((lane: any) => {
      const parsed = parseLane(lane);
      return {
        direction: lane.direction || 'straight',
        active: parsed?.active || (lane.matches || []).includes('selected'),
        rotation: parsed?.rotation || 0,
      };
    });
  }, [nextInstruction?.lanes, parseLane]);
  
  if (!lanes || lanes.length === 0) return null;

  const activeCount = lanes.filter((l: any) => l.active).length;
  const hasRecommendation = activeCount > 0 && activeCount < lanes.length;

  return (
    <div data-testid="lane-ribbon" className="border-t border-[#D4AF37]/30 px-3 py-2 bg-black/60">
      {hasRecommendation && (
        <div className="text-[9px] uppercase tracking-wider text-[#D4AF37] text-center mb-1 font-bold">
          Lane Guidance
        </div>
      )}
      <div className="flex justify-center gap-0.5">
        {lanes.map((lane: any, idx: number) => (
          <div key={idx} 
            data-testid={`lane-${idx}-${lane.active ? 'active' : 'inactive'}`}
            className={`flex flex-col items-center justify-center py-1 flex-1 max-w-[44px] transition-all rounded-md ${
              lane.active 
                ? 'bg-[#D4AF37]/15 ring-1 ring-[#D4AF37]/40' 
                : 'bg-white/[0.02]'
            }`}>
            <LaneArrow direction={lane.direction} active={lane.active} />
            {lane.active && (
              <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full mt-0.5 shadow-[0_0_4px_rgba(212,175,55,0.6)]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

