import React, { useMemo } from 'react';
import { ArrowUp, ArrowRight, ArrowLeft, ArrowUpRight, ArrowUpLeft, RotateCcw, GitFork, Merge } from 'lucide-react';

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

const getDirectionIcon = (type: string, modifier: string) => {
  const cls = "w-12 h-12 text-white";
  if (type.includes('roundabout')) return <RotateCcw className={cls} strokeWidth={2.5} />;
  if (type.includes('fork')) return <GitFork className={cls} strokeWidth={2.5} style={{ transform: modifier === 'left' ? 'scaleX(-1)' : '' }} />;
  if (type.includes('merge')) return <Merge className={cls} strokeWidth={2.5} />;
  if (modifier === 'right' || modifier === 'sharp right') return <ArrowRight className={cls} strokeWidth={2.5} />;
  if (modifier === 'left' || modifier === 'sharp left') return <ArrowLeft className={cls} strokeWidth={2.5} />;
  if (modifier === 'slight right') return <ArrowUpRight className={cls} strokeWidth={2.5} />;
  if (modifier === 'slight left') return <ArrowUpLeft className={cls} strokeWidth={2.5} />;
  return <ArrowUp className={cls} strokeWidth={2.5} />;
};

const formatDistance = (mi: number) => {
  if (mi >= 10) return { value: `${Math.round(mi)}`, unit: 'mi' };
  if (mi >= 1) return { value: `${mi.toFixed(1)}`, unit: 'mi' };
  if (mi >= 0.19) return { value: `${(mi * 5280).toFixed(0)}`, unit: 'ft' };
  return { value: `${Math.round(mi * 5280)}`, unit: 'ft' };
};

const LaneArrow: React.FC<{ direction: string; active: boolean }> = ({ direction, active }) => {
  const dirs = direction.toLowerCase().split(';').map(d => d.trim()).filter(Boolean);
  const color = active ? '#D4AF37' : 'rgba(255,255,255,0.12)';
  
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
      default: return 'M12 20V6M12 6l-4 4M12 6l4 4';
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
    const rawLanes = nextInstruction?.lanes;
    if (!rawLanes || !Array.isArray(rawLanes) || rawLanes.length === 0) return null;
    return rawLanes.map((lane: any) => {
      const parsed = parseLane(lane);
      return {
        direction: lane.direction || 'straight',
        active: parsed?.active || (lane.matches || []).includes('selected'),
      };
    });
  }, [nextInstruction?.lanes, parseLane]);
  
  if (!lanes || lanes.length === 0) return null;

  const activeCount = lanes.filter((l: any) => l.active).length;
  const hasRecommendation = activeCount > 0 && activeCount < lanes.length;

  return (
    <div data-testid="lane-ribbon" className="border-t border-white/5 px-3 py-2 bg-black/30">
      {hasRecommendation && (
        <div className="text-[8px] uppercase tracking-[0.2em] text-white/25 text-center mb-1 font-black">
          Lane Guidance
        </div>
      )}
      <div className="flex justify-center gap-0.5">
        {lanes.map((lane: any, idx: number) => (
          <div key={idx} 
            data-testid={`lane-${idx}-${lane.active ? 'active' : 'inactive'}`}
            className={`flex flex-col items-center justify-center py-1 flex-1 max-w-[44px] transition-all rounded-md ${
              lane.active 
                ? 'bg-[#D4AF37]/15 ring-1 ring-[#D4AF37]/30' 
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

export const NavigationHUD: React.FC<NavigationHUDProps> = ({
  nextInstruction,
  parseLane,
  distanceToManeuverMi,
  roadName,
  exitNumber,
  maneuverType = '',
  maneuverModifier = '',
}) => {
  // ALL hooks MUST be called before any conditional returns (Rules of Hooks)
  const detailLevel = useMemo(() => {
    if (!distanceToManeuverMi || distanceToManeuverMi > 5) return 'far';
    if (distanceToManeuverMi > 2) return 'approaching';
    if (distanceToManeuverMi > 0.5) return 'close';
    return 'immediate';
  }, [distanceToManeuverMi]);

  // Conditional return AFTER hooks
  if (!nextInstruction) return null;

  const instrText = typeof nextInstruction === 'string' ? nextInstruction : (nextInstruction?.text || '');
  if (!instrText || instrText === 'Ready for Route') return null;

  const cleanInstruction = instrText.replace(/<[^>]+>/g, '').trim();
  
  const displayRoadName = roadName || (() => {
    const match = cleanInstruction.match(/(?:on|onto|toward)\s+(.+?)(?:\s+for|\s*$)/i);
    return match?.[1] || '';
  })();

  const displayExitNum = exitNumber || (() => {
    const match = cleanInstruction.match(/exit\s+(\d+[A-Z]?)/i);
    return match?.[1] || '';
  })();

  const dist = distanceToManeuverMi !== undefined ? formatDistance(distanceToManeuverMi) : null;

  return (
    <div 
      data-testid="navigation-hud" 
      className="absolute z-[3100] pointer-events-none"
      style={{
        top: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
        left: '0.75rem',
        width: 'min(340px, calc(100% - 1.5rem))',
      }}
    >
      <div className={`bg-[#1a1a2e]/92 backdrop-blur-2xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] border overflow-hidden transition-all duration-300 ${
        detailLevel === 'immediate' ? 'border-[#D4AF37]/50 shadow-[0_0_24px_rgba(212,175,55,0.25)]' : 'border-white/8'
      }`}>
        {/* Main maneuver row */}
        <div className="flex items-stretch">
          {/* Direction arrow panel */}
          <div className={`flex flex-col items-center justify-center px-5 py-4 min-w-[88px] ${
            detailLevel === 'immediate' ? 'bg-[#D4AF37]/15' : 'bg-white/[0.04]'
          }`}>
            {getDirectionIcon(maneuverType, maneuverModifier)}
            {dist && (
              <div className="flex items-baseline gap-0.5 mt-1">
                <span className={`text-2xl font-[900] tracking-tight leading-none tabular-nums ${
                  detailLevel === 'immediate' ? 'text-[#D4AF37]' : 'text-white'
                }`}>
                  {dist.value}
                </span>
                <span className="text-[10px] font-bold text-white/50 uppercase">{dist.unit}</span>
              </div>
            )}
          </div>

          {/* Road info */}
          <div className="flex-1 py-3.5 px-4 min-w-0 flex flex-col justify-center">
            {displayExitNum && (detailLevel === 'close' || detailLevel === 'immediate') && (
              <div className="inline-flex items-center self-start gap-1 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md mb-1.5 uppercase tracking-wider">
                Exit {displayExitNum}
              </div>
            )}

            <div className="text-white font-bold text-[15px] leading-snug line-clamp-2">
              {detailLevel === 'far' && displayRoadName ? (
                <>Continue on <span className="text-white/90">{displayRoadName}</span></>
              ) : (
                cleanInstruction
              )}
            </div>

            {detailLevel === 'approaching' && displayRoadName && (
              <div className="text-white/40 text-xs mt-1 truncate font-medium">
                toward {displayRoadName}
              </div>
            )}
          </div>
        </div>

        {/* Lane guidance ribbon */}
        {detailLevel !== 'far' && (
          <LaneRibbon parseLane={parseLane} nextInstruction={nextInstruction} />
        )}
      </div>
    </div>
  );
};
