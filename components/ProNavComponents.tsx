import React, { useMemo } from 'react';
import { ArrowUp, ArrowRight, ArrowLeft, ArrowUpRight, ArrowUpLeft, RotateCcw, GitFork, Merge, CornerUpRight, CornerUpLeft, AlertTriangle, MapPin } from 'lucide-react';

// ── Maneuver Icon (compact) ──────────────────────────────────────────
const getIcon = (type: string, modifier: string, size = 16) => {
  const cls = `text-[#D4AF37]`;
  const s = { width: size, height: size };
  if (type.includes('roundabout')) return <RotateCcw className={cls} style={s} strokeWidth={2.5} />;
  if (type.includes('fork')) return <GitFork className={cls} style={s} strokeWidth={2.5} />;
  if (type.includes('merge')) return <Merge className={cls} style={s} strokeWidth={2.5} />;
  if (type.includes('arrive') || type.includes('destination')) return <MapPin className={cls} style={s} strokeWidth={2.5} />;
  if (modifier === 'right' || modifier === 'sharp right') return <ArrowRight className={cls} style={s} strokeWidth={2.5} />;
  if (modifier === 'left' || modifier === 'sharp left') return <ArrowLeft className={cls} style={s} strokeWidth={2.5} />;
  if (modifier === 'slight right') return <ArrowUpRight className={cls} style={s} strokeWidth={2.5} />;
  if (modifier === 'slight left') return <ArrowUpLeft className={cls} style={s} strokeWidth={2.5} />;
  if (modifier === 'uturn') return <RotateCcw className={cls} style={s} strokeWidth={2.5} />;
  return <ArrowUp className={cls} style={s} strokeWidth={2.5} />;
};

const fmtDist = (mi: number): string => {
  if (mi >= 10) return `${Math.round(mi)} mi`;
  if (mi >= 1) return `${mi.toFixed(1)} mi`;
  const ft = Math.round(mi * 5280);
  if (ft >= 1000) return `${(ft / 5280).toFixed(1)} mi`;
  return `${ft} ft`;
};

interface Step {
  maneuver?: { type?: string; modifier?: string; instruction?: string };
  distance?: number; // meters
  name?: string;
}

interface NextManeuverPreviewProps {
  steps: Step[];
  currentStepIndex: number;
  visible: boolean;
}

const NextManeuverPreview: React.FC<NextManeuverPreviewProps> = ({ steps, currentStepIndex, visible }) => {
  const upcoming = useMemo(() => {
    if (!steps || steps.length === 0) return [];
    // Show next 3 steps after current
    const start = Math.max(0, currentStepIndex + 1);
    return steps.slice(start, start + 3).map((step, i) => {
      const type = step.maneuver?.type || '';
      const modifier = step.maneuver?.modifier || '';
      const instruction = (step.maneuver?.instruction || '').replace(/<[^>]+>/g, '').trim();
      const distMi = (step.distance || 0) / 1609.34;
      const roadName = step.name || instruction.match(/(?:on|onto)\s+(.+?)(?:\s+for|\.|$)/i)?.[1] || '';
      return { type, modifier, instruction, distMi, roadName, idx: start + i };
    });
  }, [steps, currentStepIndex]);

  if (!visible || upcoming.length === 0) return null;

  return (
    <div data-testid="next-maneuver-preview" className="flex flex-col gap-0.5">
      <div className="text-[7px] font-black text-[#D4AF37]/40 uppercase tracking-[0.2em] px-2 mb-0.5">Upcoming</div>
      {upcoming.map((step, i) => (
        <div key={step.idx} className="flex items-center gap-2 px-2 py-1.5 bg-white/[0.02] rounded-lg border border-white/[0.04]">
          <div className="shrink-0 w-7 h-7 flex items-center justify-center bg-[#D4AF37]/10 rounded-md">
            {getIcon(step.type, step.modifier, 14)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-white/80 font-bold truncate leading-tight">
              {step.roadName || step.instruction.substring(0, 40)}
            </div>
            <div className="text-[8px] text-zinc-500 font-medium truncate">
              {step.instruction.substring(0, 50)}
            </div>
          </div>
          <div className="shrink-0 text-[10px] font-black text-[#D4AF37]/70 tabular-nums whitespace-nowrap">
            {fmtDist(step.distMi)}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Speed Warning Overlay (fullscreen red flash) ─────────────────────
interface SpeedWarningOverlayProps {
  isActive: boolean;
  currentSpeed: number;
  speedLimit: number;
  unitSystem?: string;
}

const SpeedWarningOverlay: React.FC<SpeedWarningOverlayProps> = ({ isActive, currentSpeed, speedLimit, unitSystem }) => {
  if (!isActive) return null;
  const isMetric = unitSystem === 'metric';
  const displaySpeed = isMetric ? Math.round(currentSpeed * 1.60934) : currentSpeed;
  const displayLimit = isMetric ? Math.round(speedLimit * 1.60934) : speedLimit;
  const over = displaySpeed - displayLimit;

  return (
    <div data-testid="speed-warning-overlay" className="absolute inset-0 z-[4000] pointer-events-none animate-pulse" style={{ animationDuration: '1.5s' }}>
      {/* Red border flash */}
      <div className="absolute inset-0 border-[4px] md:border-[6px] border-red-600 rounded-none opacity-80" />
      {/* Top bar warning */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-center gap-3 py-2 bg-red-600/90 backdrop-blur-sm">
        <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2.5} />
        <span className="text-white text-sm md:text-base font-black uppercase tracking-wider">
          REDUCE SPEED — {over > 0 ? `${over} ${isMetric ? 'km/h' : 'mph'} over limit` : 'Over Limit'}
        </span>
        <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2.5} />
      </div>
    </div>
  );
};

// ── Arrival Countdown ────────────────────────────────────────────────
interface ArrivalCountdownProps {
  milesRemaining: number;
  destinationName: string;
  visible: boolean;
}

const ArrivalCountdown: React.FC<ArrivalCountdownProps> = ({ milesRemaining, destinationName, visible }) => {
  if (!visible || milesRemaining > 1 || milesRemaining <= 0) return null;
  
  const ft = Math.round(milesRemaining * 5280);
  const progress = Math.max(0, Math.min(100, (1 - milesRemaining) * 100));
  
  return (
    <div data-testid="arrival-countdown" className="absolute top-20 left-1/2 -translate-x-1/2 z-[3200] pointer-events-none">
      <div className="bg-black/95 backdrop-blur-xl border border-[#D4AF37]/40 rounded-2xl px-6 py-3 shadow-[0_0_30px_rgba(212,175,55,0.3)] flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#D4AF37]" />
          <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em]">Arriving</span>
        </div>
        <span className="text-3xl font-[900] text-white tabular-nums tracking-tight">{ft.toLocaleString()} <span className="text-base text-zinc-400">ft</span></span>
        <div className="w-48 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-[#D4AF37] rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[9px] text-zinc-400 font-bold truncate max-w-[200px]">{destinationName}</span>
      </div>
    </div>
  );
};

// ── Grade Warning Banner ─────────────────────────────────────────────
interface GradeWarningBannerProps {
  message: string | null;
}

const GradeWarningBanner: React.FC<GradeWarningBannerProps> = ({ message }) => {
  if (!message) return null;
  const isDowngrade = message.toLowerCase().includes('downgrade');
  
  return (
    <div data-testid="grade-warning-banner" className="absolute top-[70px] md:top-[80px] left-1/2 -translate-x-1/2 z-[3150] pointer-events-none animate-in slide-in-from-top duration-300">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border shadow-lg backdrop-blur-xl ${
        isDowngrade 
          ? 'bg-red-900/90 border-red-500/50 shadow-red-500/20' 
          : 'bg-amber-900/90 border-amber-500/50 shadow-amber-500/20'
      }`}>
        <AlertTriangle className={`w-4 h-4 ${isDowngrade ? 'text-red-400' : 'text-amber-400'}`} strokeWidth={2.5} />
        <span className={`text-xs md:text-sm font-black uppercase tracking-wider ${isDowngrade ? 'text-red-300' : 'text-amber-300'}`}>
          {message}
        </span>
      </div>
    </div>
  );
};

// ── Bridge Height Warning (Fullscreen proximity alert) ───────────────
interface BridgeHeightWarningProps {
  distanceFt: number; // distance to bridge in feet
  clearanceFt: number; // bridge clearance in feet
  truckHeightFt: number; // truck height in feet
  bridgeName: string;
  visible: boolean;
}

const BridgeHeightWarning: React.FC<BridgeHeightWarningProps> = ({ distanceFt, clearanceFt, truckHeightFt, bridgeName, visible }) => {
  if (!visible) return null;
  const marginFt = clearanceFt - truckHeightFt;
  const isCritical = marginFt < 0;
  const isTight = marginFt >= 0 && marginFt < 1;
  
  const distMi = distanceFt / 5280;
  const distStr = distMi >= 0.1 ? `${distMi.toFixed(1)} mi` : `${Math.round(distanceFt)} ft`;

  return (
    <div data-testid="bridge-height-warning" className="absolute top-16 left-1/2 -translate-x-1/2 z-[4100] pointer-events-none animate-in slide-in-from-top duration-300">
      <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 shadow-2xl backdrop-blur-xl ${
        isCritical ? 'bg-red-900/95 border-red-500 shadow-red-500/40' 
        : isTight ? 'bg-amber-900/95 border-amber-500 shadow-amber-500/30'
        : 'bg-amber-900/90 border-amber-500/50 shadow-amber-500/20'
      }`}>
        {/* Height diagram */}
        <div className="relative w-12 h-14 flex flex-col items-center justify-end shrink-0">
          <div className={`absolute top-0 w-full h-[3px] rounded ${isCritical ? 'bg-red-500' : 'bg-amber-400'}`} />
          <div className={`text-[8px] font-black absolute top-1 ${isCritical ? 'text-red-400' : 'text-amber-300'}`}>{clearanceFt}'</div>
          <div className="w-6 h-8 rounded-t-sm bg-zinc-700 border border-zinc-500 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={isCritical ? 'text-red-400' : 'text-amber-300'}>
              <rect x="1" y="3" width="15" height="13" rx="2" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
          <div className="text-[8px] font-black text-zinc-400">{truckHeightFt}'</div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${isCritical ? 'text-red-400 animate-pulse' : 'text-amber-400'}`} strokeWidth={2.5} />
            <span className={`text-sm md:text-base font-black uppercase tracking-wider ${isCritical ? 'text-red-300' : 'text-amber-300'}`}>
              {isCritical ? 'CLEARANCE VIOLATION' : 'LOW CLEARANCE'}
            </span>
          </div>
          <span className="text-xs text-white/80 font-bold mt-0.5">
            Bridge: {clearanceFt}' — Truck: {truckHeightFt}' — {isCritical ? `${Math.abs(marginFt).toFixed(1)}' TOO TALL` : `${marginFt.toFixed(1)}' margin`}
          </span>
          <span className="text-[10px] text-zinc-400 font-medium mt-0.5">
            {distStr} ahead{bridgeName ? ` — ${bridgeName}` : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Weight Limit Warning ─────────────────────────────────────────────
interface WeightLimitWarningProps {
  distanceFt: number;
  limitLbs: number;
  truckWeightLbs: number;
  roadName: string;
  visible: boolean;
}

const WeightLimitWarning: React.FC<WeightLimitWarningProps> = ({ distanceFt, limitLbs, truckWeightLbs, roadName, visible }) => {
  if (!visible) return null;
  const isOverweight = truckWeightLbs > limitLbs;
  
  const distMi = distanceFt / 5280;
  const distStr = distMi >= 0.1 ? `${distMi.toFixed(1)} mi` : `${Math.round(distanceFt)} ft`;

  return (
    <div data-testid="weight-limit-warning" className="absolute top-16 left-1/2 -translate-x-1/2 z-[4100] pointer-events-none animate-in slide-in-from-top duration-300">
      <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 shadow-2xl backdrop-blur-xl ${
        isOverweight ? 'bg-red-900/95 border-red-500 shadow-red-500/40' 
        : 'bg-orange-900/90 border-orange-500/50 shadow-orange-500/20'
      }`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isOverweight ? 'bg-red-500/20' : 'bg-orange-500/20'}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isOverweight ? 'text-red-400' : 'text-orange-400'}>
            <path d="M12 3v18M3 12h18M5 5l14 14M19 5L5 19" strokeLinecap="round" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={`text-sm md:text-base font-black uppercase tracking-wider ${isOverweight ? 'text-red-300' : 'text-orange-300'}`}>
              {isOverweight ? 'WEIGHT VIOLATION' : 'WEIGHT LIMIT'}
            </span>
          </div>
          <span className="text-xs text-white/80 font-bold mt-0.5">
            Limit: {limitLbs.toLocaleString()} lbs — Truck: {truckWeightLbs.toLocaleString()} lbs
            {isOverweight ? ` — ${(truckWeightLbs - limitLbs).toLocaleString()} lbs OVER` : ''}
          </span>
          <span className="text-[10px] text-zinc-400 font-medium mt-0.5">
            {distStr} ahead{roadName ? ` — ${roadName}` : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

export { NextManeuverPreview, SpeedWarningOverlay, ArrivalCountdown, GradeWarningBanner, BridgeHeightWarning, WeightLimitWarning };
export type { Step };
