// ─── Types ────────────────────────────────────────────────────────────────────

export type FacilityType = 'shipper' | 'receiver' | 'both';
export type SpeedRating = 'fast' | 'average' | 'slow';

export interface FacilityCrowdData {
  type_votes:        { shipper: number; receiver: number; both: number };
  loading_speed:     { fast: number; average: number; slow: number };
  unloading_speed:   { fast: number; average: number; slow: number };
  parking_allowed:   { yes: number; no: number };
  overnight_parking: { yes: number; no: number };
  open_days:         { Mon: number; Tue: number; Wed: number; Thu: number; Fri: number; Sat: number; Sun: number };
  open_time:         Record<string, number>;
  close_time:        Record<string, number>;
  total_reports:     number;
  last_updated:      string;
}

export interface FacilityMajority {
  type:              FacilityType;
  loading_speed:     SpeedRating | null;
  unloading_speed:   SpeedRating | null;
  parking_allowed:   'yes' | 'no' | null;
  overnight_parking: 'yes' | 'no' | null;
  open_days:         string[];
  open_time:         string | null;
  close_time:        string | null;
}

export interface Facility {
  id:           string;
  name:         string;
  lat:          number;
  lon:          number;
  address:      string;
  phone:        string;
  rating?:      number;
  source:       'google' | 'manual';
  google_hours: string[];
  hours_fetched: boolean;
  crowd_data:   FacilityCrowdData;
  majority:     FacilityMajority;
}

export interface FacilityReport {
  facility_id:       string;
  type?:             FacilityType;
  loading_speed?:    SpeedRating;
  unloading_speed?:  SpeedRating;
  parking_allowed?:  boolean;
  overnight_parking?: boolean;
  open_days?:        string[];
  open_time?:        string;
  close_time?:       string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function fetchFacilities(lat: number, lon: number, radius = 80000): Promise<Facility[]> {
  try {
    const res = await fetch(`/api/facilities?lat=${lat}&lon=${lon}&radius=${radius}`);
    const data = await res.json();
    return data.facilities || [];
  } catch { return []; }
}

export async function addFacility(payload: { name: string; lat: number; lon: number; address?: string; type: FacilityType }): Promise<Facility | null> {
  try {
    const res = await fetch('/api/facilities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.facility || null;
  } catch { return null; }
}

export async function submitFacilityReport(report: FacilityReport): Promise<{ majority: FacilityMajority; total_reports: number } | null> {
  try {
    const res = await fetch('/api/facilities/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    return await res.json();
  } catch { return null; }
}

export async function fetchFacilityHours(facilityId: string): Promise<{ google_hours: string[]; phone?: string }> {
  try {
    const res = await fetch(`/api/facilities/${facilityId}/hours`);
    return await res.json();
  } catch { return { google_hours: [] }; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getTotalVotes(votes: Record<string, number>): number {
  return Object.values(votes).reduce((a, b) => a + b, 0);
}

export function getSpeedScore(votes: { fast: number; average: number; slow: number }): { label: SpeedRating | null; pct: number } {
  const total = votes.fast + votes.average + votes.slow;
  if (total === 0) return { label: null, pct: 0 };
  const winner = votes.fast >= votes.average && votes.fast >= votes.slow ? 'fast'
    : votes.average >= votes.slow ? 'average' : 'slow';
  const pct = winner === 'fast' ? 100 : winner === 'average' ? 55 : 20;
  return { label: winner, pct };
}

// Generate the warehouse SVG icon for a Leaflet DivIcon
export function facilityIconSVG(type: FacilityType, size = 36): string {
  const colors: Record<FacilityType, { body: string; roof: string }> = {
    shipper:  { body: '#1e40af', roof: '#3b82f6' },
    receiver: { body: '#15803d', roof: '#22c55e' },
    both:     { body: '#6d28d9', roof: '#a855f7' },
  };
  const label: Record<FacilityType, string> = { shipper: 'S', receiver: 'R', both: 'SR' };
  const { body, roof } = colors[type] || colors.both;
  const lbl = label[type] || '?';
  const h = Math.round(size * 1.1);
  return `<svg width="${size}" height="${h}" viewBox="0 0 36 40" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="18" cy="39" rx="7" ry="2" fill="rgba(0,0,0,0.28)"/>
  <rect x="2" y="14" width="32" height="22" rx="2" fill="${body}"/>
  <polygon points="0,14 18,3 36,14" fill="${roof}"/>
  <rect x="5" y="22" width="7" height="14" rx="1" fill="rgba(0,0,0,0.35)"/>
  <rect x="14.5" y="22" width="7" height="14" rx="1" fill="rgba(0,0,0,0.35)"/>
  <rect x="24" y="22" width="7" height="14" rx="1" fill="rgba(0,0,0,0.35)"/>
  <text x="18" y="20" text-anchor="middle" font-size="${lbl.length > 1 ? 7 : 9}" font-weight="900" fill="white" font-family="Arial,sans-serif">${lbl}</text>
</svg>`;
}
