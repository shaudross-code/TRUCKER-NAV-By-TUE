import React from 'react';
import { Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─── Score Calculation Helpers ────────────────────────────────────────────────

export interface FacilityScoreInput {
  loading_speed: { fast: number; average: number; slow: number };
  unloading_speed: { fast: number; average: number; slow: number };
  parking_allowed: { yes: number; no: number };
  overnight_parking: { yes: number; no: number };
  total_reports: number;
}

export interface TruckStopScoreInput {
  parkingStatus: 'light' | 'medium' | 'heavy' | 'maxed' | null;
  updateCount: number;
  amenityCount?: number;
}

/** Calculate a 0-5 star rating for a facility based on crowd-sourced data */
export function calcFacilityReputation(data: FacilityScoreInput): { score: number; confidence: 'low' | 'medium' | 'high'; breakdown: { label: string; value: number }[] } {
  if (data.total_reports === 0) return { score: 0, confidence: 'low', breakdown: [] };

  const breakdown: { label: string; value: number }[] = [];

  // Loading speed weighted score (max 5)
  const loadTotal = data.loading_speed.fast + data.loading_speed.average + data.loading_speed.slow;
  let loadScore = 0;
  if (loadTotal > 0) {
    loadScore = ((data.loading_speed.fast * 5) + (data.loading_speed.average * 3) + (data.loading_speed.slow * 1)) / loadTotal;
    breakdown.push({ label: 'Loading', value: loadScore });
  }

  // Unloading speed weighted score (max 5)
  const unloadTotal = data.unloading_speed.fast + data.unloading_speed.average + data.unloading_speed.slow;
  let unloadScore = 0;
  if (unloadTotal > 0) {
    unloadScore = ((data.unloading_speed.fast * 5) + (data.unloading_speed.average * 3) + (data.unloading_speed.slow * 1)) / unloadTotal;
    breakdown.push({ label: 'Unloading', value: unloadScore });
  }

  // Parking allowed score
  const parkTotal = data.parking_allowed.yes + data.parking_allowed.no;
  let parkScore = 0;
  if (parkTotal > 0) {
    parkScore = (data.parking_allowed.yes / parkTotal) * 5;
    breakdown.push({ label: 'Parking', value: parkScore });
  }

  // Overnight parking score
  const overnightTotal = data.overnight_parking.yes + data.overnight_parking.no;
  let overnightScore = 0;
  if (overnightTotal > 0) {
    overnightScore = (data.overnight_parking.yes / overnightTotal) * 5;
    breakdown.push({ label: 'Overnight', value: overnightScore });
  }

  // Average all available scores
  const scores = breakdown.map(b => b.value);
  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const clamped = Math.max(0, Math.min(5, Math.round(avg * 10) / 10));

  const confidence: 'low' | 'medium' | 'high' =
    data.total_reports >= 10 ? 'high' :
    data.total_reports >= 3 ? 'medium' : 'low';

  return { score: clamped, confidence, breakdown };
}

/** Calculate a 0-5 star rating for a truck stop based on parking status */
export function calcTruckStopReputation(data: TruckStopScoreInput): { score: number; confidence: 'low' | 'medium' | 'high' } {
  if (!data.parkingStatus || data.updateCount === 0) return { score: 0, confidence: 'low' };

  const statusScores: Record<string, number> = { light: 4.5, medium: 3.2, heavy: 2.0, maxed: 1.0 };
  let score = statusScores[data.parkingStatus] || 0;

  // Bonus for amenities
  if (data.amenityCount && data.amenityCount > 3) score = Math.min(5, score + 0.3);

  const confidence: 'low' | 'medium' | 'high' =
    data.updateCount >= 8 ? 'high' :
    data.updateCount >= 3 ? 'medium' : 'low';

  return { score: Math.round(score * 10) / 10, confidence };
}

// ─── Star Row Component ───────────────────────────────────────────────────────

const StarDisplay: React.FC<{ score: number; size?: number }> = ({ score, size = 14 }) => {
  const fullStars = Math.floor(score);
  const partial = score - fullStars;
  const emptyStars = 5 - fullStars - (partial > 0 ? 1 : 0);

  return (
    <div className="flex items-center gap-[1px]">
      {Array.from({ length: fullStars }, (_, i) => (
        <Star key={`f${i}`} className="text-[#D4AF37] fill-[#D4AF37]" style={{ width: size, height: size }} />
      ))}
      {partial > 0 && (
        <div className="relative" style={{ width: size, height: size }}>
          <Star className="absolute text-zinc-700 fill-zinc-700" style={{ width: size, height: size }} />
          <div className="absolute overflow-hidden" style={{ width: `${partial * 100}%`, height: size }}>
            <Star className="text-[#D4AF37] fill-[#D4AF37]" style={{ width: size, height: size }} />
          </div>
        </div>
      )}
      {Array.from({ length: emptyStars }, (_, i) => (
        <Star key={`e${i}`} className="text-zinc-700 fill-zinc-700" style={{ width: size, height: size }} />
      ))}
    </div>
  );
};

// ─── Confidence Badge ─────────────────────────────────────────────────────────

const ConfidenceBadge: React.FC<{ confidence: 'low' | 'medium' | 'high'; reports: number }> = ({ confidence, reports }) => {
  const cfg = {
    low:    { bg: 'bg-zinc-700/40', text: 'text-zinc-500', label: 'Few Reports' },
    medium: { bg: 'bg-yellow-500/15', text: 'text-yellow-500', label: 'Growing' },
    high:   { bg: 'bg-[#D4AF37]/15', text: 'text-[#D4AF37]', label: 'Reliable' },
  };
  const c = cfg[confidence];
  return (
    <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      {c.label} ({reports})
    </span>
  );
};

// ─── Facility Reputation Card ─────────────────────────────────────────────────

interface FacilityReputationProps {
  crowdData: FacilityScoreInput;
  compact?: boolean;
}

export const FacilityReputation: React.FC<FacilityReputationProps> = ({ crowdData, compact = false }) => {
  const { score, confidence, breakdown } = calcFacilityReputation(crowdData);

  if (score === 0) {
    return (
      <div data-testid="facility-reputation-unrated" className="flex items-center gap-2.5 py-2">
        <StarDisplay score={0} size={compact ? 11 : 13} />
        <span className="text-[9px] text-zinc-600 font-medium">Not yet rated — submit a report</span>
      </div>
    );
  }

  const trend = score >= 4 ? 'up' : score <= 2 ? 'down' : 'flat';

  return (
    <div data-testid="facility-reputation-score" className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <StarDisplay score={score} size={compact ? 12 : 14} />
          <span className="text-sm font-black text-white tabular-nums">{score.toFixed(1)}</span>
          {trend === 'up' && <TrendingUp className="w-3 h-3 text-[#D4AF37]" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3 text-red-400" />}
          {trend === 'flat' && <Minus className="w-3 h-3 text-zinc-500" />}
        </div>
        <ConfidenceBadge confidence={confidence} reports={crowdData.total_reports} />
      </div>

      {!compact && breakdown.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {breakdown.map(b => (
            <div key={b.label} className="flex items-center justify-between">
              <span className="text-[9px] text-zinc-500">{b.label}</span>
              <span className={`text-[9px] font-bold tabular-nums ${b.value >= 4 ? 'text-[#D4AF37]' : b.value >= 2.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                {b.value.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Truck Stop Reputation Card ───────────────────────────────────────────────

interface TruckStopReputationProps {
  parkingStatus: 'light' | 'medium' | 'heavy' | 'maxed' | null;
  updateCount: number;
  amenityCount?: number;
  compact?: boolean;
}

export const TruckStopReputation: React.FC<TruckStopReputationProps> = ({ parkingStatus, updateCount, amenityCount, compact = false }) => {
  const { score, confidence } = calcTruckStopReputation({ parkingStatus, updateCount, amenityCount });

  if (score === 0) {
    return (
      <div data-testid="truckstop-reputation-unrated" className="flex items-center gap-2.5 py-2">
        <StarDisplay score={0} size={compact ? 11 : 13} />
        <span className="text-[9px] text-zinc-600 font-medium">Unrated — report parking to build score</span>
      </div>
    );
  }

  const label = score >= 4 ? 'Driver Favorite' : score >= 3 ? 'Solid Choice' : score >= 2 ? 'Use with Caution' : 'Avoid if Possible';
  const labelColor = score >= 4 ? 'text-[#D4AF37]' : score >= 3 ? 'text-yellow-400' : score >= 2 ? 'text-orange-400' : 'text-red-400';

  return (
    <div data-testid="truckstop-reputation-score" className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <StarDisplay score={score} size={compact ? 12 : 14} />
          <span className="text-sm font-black text-white tabular-nums">{score.toFixed(1)}</span>
        </div>
        <ConfidenceBadge confidence={confidence} reports={updateCount} />
      </div>
      {!compact && (
        <p className={`text-[9px] font-bold ${labelColor}`}>{label}</p>
      )}
    </div>
  );
};
