import React, { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'react';
import { CheckCircle2, Loader2, Pencil, Check, X, MapPin, Weight, DollarSign, TrendingUp, RefreshCw } from 'lucide-react';
import { AppContext, LocationContext, ViewType } from '../types';
import { useFirebase } from './FirebaseProvider';
import { getUserStorageKey, getCurrentUserId } from '../utils/userStorage';

// ─── US Cities database for dynamic load generation ─────────────────────────
const US_CITIES: { name: string; coords: [number, number]; state: string }[] = [
  { name: "Chicago, IL",        coords: [41.8781, -87.6298], state: "IL" },
  { name: "Detroit, MI",        coords: [42.3314, -83.0458], state: "MI" },
  { name: "Indianapolis, IN",   coords: [39.7684, -86.1581], state: "IN" },
  { name: "Cleveland, OH",      coords: [41.4993, -81.6944], state: "OH" },
  { name: "Columbus, OH",       coords: [39.9612, -82.9988], state: "OH" },
  { name: "Cincinnati, OH",     coords: [39.1031, -84.5120], state: "OH" },
  { name: "Milwaukee, WI",      coords: [43.0389, -87.9065], state: "WI" },
  { name: "Minneapolis, MN",    coords: [44.9778, -93.2650], state: "MN" },
  { name: "St. Louis, MO",      coords: [38.6270, -90.1994], state: "MO" },
  { name: "Kansas City, MO",    coords: [39.0997, -94.5786], state: "MO" },
  { name: "Louisville, KY",     coords: [38.2527, -85.7585], state: "KY" },
  { name: "Nashville, TN",      coords: [36.1627, -86.7816], state: "TN" },
  { name: "Memphis, TN",        coords: [35.1495, -90.0490], state: "TN" },
  { name: "Dallas, TX",         coords: [32.7767, -96.7970], state: "TX" },
  { name: "Houston, TX",        coords: [29.7604, -95.3698], state: "TX" },
  { name: "San Antonio, TX",    coords: [29.4241, -98.4936], state: "TX" },
  { name: "Atlanta, GA",        coords: [33.7490, -84.3880], state: "GA" },
  { name: "Charlotte, NC",      coords: [35.2271, -80.8431], state: "NC" },
  { name: "Jacksonville, FL",   coords: [30.3322, -81.6557], state: "FL" },
  { name: "Miami, FL",          coords: [25.7617, -80.1918], state: "FL" },
  { name: "Tampa, FL",          coords: [27.9506, -82.4572], state: "FL" },
  { name: "Philadelphia, PA",   coords: [39.9526, -75.1652], state: "PA" },
  { name: "Pittsburgh, PA",     coords: [40.4406, -79.9959], state: "PA" },
  { name: "Baltimore, MD",      coords: [39.2904, -76.6122], state: "MD" },
  { name: "New York, NY",       coords: [40.7128, -74.0060], state: "NY" },
  { name: "Boston, MA",         coords: [42.3601, -71.0589], state: "MA" },
  { name: "Denver, CO",         coords: [39.7392, -104.9903], state: "CO" },
  { name: "Phoenix, AZ",        coords: [33.4484, -112.0740], state: "AZ" },
  { name: "Las Vegas, NV",      coords: [36.1699, -115.1398], state: "NV" },
  { name: "Los Angeles, CA",    coords: [34.0522, -118.2437], state: "CA" },
  { name: "San Francisco, CA",  coords: [37.7749, -122.4194], state: "CA" },
  { name: "Seattle, WA",        coords: [47.6062, -122.3321], state: "WA" },
  { name: "Portland, OR",       coords: [45.5051, -122.6750], state: "OR" },
  { name: "Salt Lake City, UT", coords: [40.7608, -111.8910], state: "UT" },
  { name: "Albuquerque, NM",    coords: [35.0844, -106.6504], state: "NM" },
  { name: "Omaha, NE",          coords: [41.2565, -95.9345], state: "NE" },
  { name: "Des Moines, IA",     coords: [41.5868, -93.6250], state: "IA" },
  { name: "Wichita, KS",        coords: [37.6872, -97.3301], state: "KS" },
  { name: "Oklahoma City, OK",  coords: [35.4676, -97.5164], state: "OK" },
  { name: "Little Rock, AR",    coords: [34.7465, -92.2896], state: "AR" },
  { name: "Baton Rouge, LA",    coords: [30.4515, -91.1871], state: "LA" },
  { name: "New Orleans, LA",    coords: [29.9511, -90.0715], state: "LA" },
  { name: "Jackson, MS",        coords: [32.2988, -90.1848], state: "MS" },
  { name: "Birmingham, AL",     coords: [33.5186, -86.8104], state: "AL" },
  { name: "Knoxville, TN",      coords: [35.9606, -83.9207], state: "TN" },
  { name: "Lexington, KY",      coords: [38.0406, -84.5037], state: "KY" },
  { name: "Toledo, OH",         coords: [41.6639, -83.5552], state: "OH" },
  { name: "Fort Wayne, IN",     coords: [41.0793, -85.1394], state: "IN" },
  { name: "Midland, MI",        coords: [43.6156, -84.2473], state: "MI" },
  { name: "Grand Rapids, MI",   coords: [42.9634, -85.6681], state: "MI" },
  { name: "Flint, MI",          coords: [43.0125, -83.6875], state: "MI" },
  { name: "Lansing, MI",        coords: [42.7335, -84.5467], state: "MI" },
  { name: "Ann Arbor, MI",      coords: [42.2808, -83.7430], state: "MI" },
  { name: "Akron, OH",          coords: [41.0814, -81.5190], state: "OH" },
  { name: "Green Bay, WI",      coords: [44.5133, -88.0133], state: "WI" },
];

const COMMODITIES = [
  { type: "AUTO PARTS",   minRate: 2.8, maxRate: 3.8, minWeight: 15000, maxWeight: 42000 },
  { type: "ELECTRONICS",  minRate: 3.2, maxRate: 5.0, minWeight: 5000,  maxWeight: 28000 },
  { type: "PRODUCE",      minRate: 3.0, maxRate: 4.5, minWeight: 20000, maxWeight: 43000 },
  { type: "MACHINERY",    minRate: 2.5, maxRate: 3.5, minWeight: 25000, maxWeight: 44000 },
  { type: "STEEL",        minRate: 2.2, maxRate: 3.0, minWeight: 30000, maxWeight: 46000 },
  { type: "PAPER",        minRate: 2.4, maxRate: 3.2, minWeight: 20000, maxWeight: 42000 },
  { type: "FOOD GRADE",   minRate: 3.4, maxRate: 4.8, minWeight: 15000, maxWeight: 40000 },
  { type: "HAZMAT",       minRate: 3.8, maxRate: 5.5, minWeight: 10000, maxWeight: 30000 },
  { type: "TEXTILES",     minRate: 2.6, maxRate: 3.6, minWeight: 12000, maxWeight: 38000 },
  { type: "LUMBER",       minRate: 2.0, maxRate: 2.8, minWeight: 35000, maxWeight: 48000 },
  { type: "FROZEN",       minRate: 3.5, maxRate: 5.0, minWeight: 15000, maxWeight: 40000 },
  { type: "CHEMICALS",    minRate: 3.0, maxRate: 4.2, minWeight: 18000, maxWeight: 38000 },
];

const TIMES = ["READY NOW", "ASAP", "FRI 06:00", "FRI 08:00", "SAT 06:00", "SAT 10:00", "MON 07:00", "NEW"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function seededRand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateLoads(userLat: number, userLon: number, seed: number = Date.now()) {
  // Nearby cities (within 200 miles) as potential origins
  const nearbyCities = US_CITIES
    .map(c => ({ ...c, dist: haversine(userLat, userLon, c.coords[0], c.coords[1]) }))
    .filter(c => c.dist < 200)
    .sort((a, b) => a.dist - b.dist);

  // Far cities (300-2000 miles away) as destinations
  const farCities = US_CITIES
    .map(c => ({ ...c, dist: haversine(userLat, userLon, c.coords[0], c.coords[1]) }))
    .filter(c => c.dist > 300)
    .sort((a, b) => a.dist - b.dist);

  // Fallback if no nearby cities
  const origins = nearbyCities.length > 0 ? nearbyCities : US_CITIES.slice(0, 5).map(c => ({ ...c, dist: 0 }));
  const dests = farCities.length > 0 ? farCities : US_CITIES.slice(10, 30).map(c => ({ ...c, dist: 500 }));

  const loads = [];
  for (let i = 0; i < 8; i++) {
    const r = (n: number) => seededRand(seed + i * 100 + n);
    const originCity = origins[Math.floor(r(1) * origins.length)];
    const destCity   = dests[Math.floor(r(2) * Math.min(dests.length, 20))];
    const comm       = COMMODITIES[Math.floor(r(3) * COMMODITIES.length)];
    const routeDist  = Math.round(haversine(originCity.coords[0], originCity.coords[1], destCity.coords[0], destCity.coords[1]));
    const rate       = +(comm.minRate + r(4) * (comm.maxRate - comm.minRate)).toFixed(2);
    const weight     = Math.round((comm.minWeight + r(5) * (comm.maxWeight - comm.minWeight)) / 1000) * 1000;
    const total      = Math.round(routeDist * rate);
    const match      = Math.round(70 + r(6) * 30);

    loads.push({
      id: `${seed}-${i}`,
      origin: originCity.name,
      originCoords: originCity.coords,
      distFromUser: Math.round(originCity.dist),
      originTime: TIMES[Math.floor(r(7) * TIMES.length)],
      destination: destCity.name,
      distance: routeDist,
      commodity: comm.type,
      rate,
      total,
      weight,
      match,
      progress: match,
    });
  }
  return loads;
}

// ─── Inline editable field ────────────────────────────────────────────────────
const EditableField: React.FC<{
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  onSave: (v: string) => void;
  icon: React.ReactNode;
  testId: string;
}> = ({ label, value, prefix, suffix, onSave, icon, testId }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) onSave(trimmed);
    setEditing(false);
  };

  return (
    <div
      data-testid={testId}
      className="flex items-center gap-2.5 px-4 py-2.5 bg-[#0a0a0a] border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 rounded-xl cursor-pointer transition-all group"
      onClick={() => { if (!editing) setEditing(true); }}
    >
      <div className="text-[#D4AF37]/60 group-hover:text-[#D4AF37] transition-colors">{icon}</div>
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]">{label}</span>
        {editing ? (
          <div className="flex items-center gap-1 mt-0.5" onClick={e => e.stopPropagation()}>
            {prefix && <span className="text-[#D4AF37] text-sm font-black">{prefix}</span>}
            <input
              ref={inputRef}
              className="w-20 bg-transparent text-[#D4AF37] text-sm font-black outline-none border-b border-[#D4AF37]/60 focus:border-[#D4AF37]"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
            />
            {suffix && <span className="text-zinc-500 text-sm font-bold ml-0.5">{suffix}</span>}
            <button onClick={commit} className="text-emerald-400 hover:text-emerald-300 ml-1"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => setEditing(false)} className="text-zinc-600 hover:text-zinc-400"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-1 mt-0.5">
            {prefix && <span className="text-[#D4AF37] text-sm font-black">{prefix}</span>}
            <span className="text-[#D4AF37] text-sm font-black italic">{value}</span>
            {suffix && <span className="text-zinc-500 text-sm font-bold ml-0.5">{suffix}</span>}
            <Pencil className="w-2.5 h-2.5 text-zinc-700 group-hover:text-[#D4AF37]/60 ml-1 transition-colors" />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Load Card ────────────────────────────────────────────────────────────────
const LoadCard: React.FC<{
  load: ReturnType<typeof generateLoads>[number];
  onBook: () => void;
  isBooking?: boolean;
  targetRate: number;
  maxWeight: number;
}> = ({ load, onBook, isBooking, targetRate, maxWeight }) => {
  const rateColor = load.rate >= targetRate ? 'text-emerald-400' : 'text-orange-400';
  const weightOk = load.weight <= maxWeight;

  return (
    <div
      data-testid={`load-card-${load.id}`}
      className="bg-[#0a0a0a] border border-zinc-900 rounded-[1.25rem] overflow-hidden group hover:border-[#D4AF37]/40 transition-all"
    >
      <div className="p-5 flex items-center justify-between gap-6 flex-wrap lg:flex-nowrap">

        {/* Route */}
        <div className="flex gap-3 min-w-[260px]">
          <div className="flex flex-col items-center py-1">
            <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />
            <div className="w-[1.5px] h-9 bg-zinc-800 my-1" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
          </div>
          <div className="flex flex-col justify-between py-0.5 gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-black text-white uppercase italic tracking-tighter leading-none">{load.origin}</span>
              <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 text-[9px] font-black rounded uppercase tracking-widest border border-zinc-800">{load.originTime}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-black text-[#D4AF37] uppercase italic tracking-tighter leading-none">{load.destination}</span>
              <span className="text-zinc-600 text-xs font-bold">{load.distance} mi</span>
            </div>
          </div>
        </div>

        {/* Distance from user */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-lg shrink-0">
          <MapPin className="w-3 h-3 text-[#D4AF37]" />
          <span className="text-[10px] font-black text-zinc-400 whitespace-nowrap">
            {load.distFromUser} mi from you
          </span>
        </div>

        {/* Stats */}
        <div className="flex flex-1 justify-around items-center px-6 border-x border-zinc-900/50 gap-4 min-w-[260px]">
          <div className="text-center">
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">Cargo</p>
            <p className="text-xs font-black text-zinc-300 italic uppercase">{load.commodity}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">Weight</p>
            <p className={`text-xs font-black italic ${weightOk ? 'text-zinc-300' : 'text-red-400'}`}>
              {(load.weight / 1000).toFixed(0)}k lbs
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">Rate/Mi</p>
            <p className={`text-sm font-black italic ${rateColor}`}>${load.rate.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">Total</p>
            <p className="text-lg font-black text-white italic tracking-tighter">${load.total.toLocaleString()}</p>
          </div>
        </div>

        {/* Action */}
        <div className="flex flex-col items-end gap-2.5 min-w-[148px] shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 rounded-full text-[9px] font-black uppercase tracking-widest">
            <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-pulse shadow-[0_0_8px_#D4AF37]" />
            {load.match}% Match
          </div>
          <button
            data-testid={`book-load-${load.id}`}
            onClick={onBook}
            disabled={isBooking || !weightOk}
            className="w-full bg-[#D4AF37] hover:bg-[#FFD700] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-black py-3 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xl shadow-[#D4AF37]/20"
          >
            {isBooking ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Booking...</>
            ) : !weightOk ? (
              <><X className="w-3.5 h-3.5" /> Overweight</>
            ) : (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Book Now</>
            )}
          </button>
        </div>
      </div>

      {/* Match progress bar */}
      <div className="h-[3px] w-full bg-zinc-900/50">
        <div
          className="h-full rounded-r-full shadow-[0_0_10px_rgba(212,175,55,0.4)] transition-all duration-1000"
          style={{
            width: `${load.progress}%`,
            background: load.rate >= targetRate
              ? 'linear-gradient(90deg, rgba(212,175,55,0.3), #D4AF37)'
              : 'linear-gradient(90deg, rgba(251,146,60,0.3), #fb923c)',
          }}
        />
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const LoadBoard: React.FC = () => {
  const context = useContext(AppContext);
  const { userLocation } = useContext(LocationContext) || { userLocation: null };
  const { updateProfile } = useFirebase();
  const [bookingId, setBookingId] = useState<string | null>(null);

  // ── Persisted settings ──
  const uKey = (k: string) => getUserStorageKey(getCurrentUserId(), k);
  const [targetRateStr, setTargetRateStr] = useState<string>(() =>
    localStorage.getItem(uKey('truck_target_rate')) || '3.00'
  );
  const [maxWeightStr, setMaxWeightStr] = useState<string>(() =>
    localStorage.getItem(uKey('truck_max_weight')) || '42000'
  );
  const targetRate = parseFloat(targetRateStr) || 3.0;
  const maxWeight  = parseInt(maxWeightStr.replace(/[^0-9]/g, ''), 10) || 42000;

  const saveTargetRate = (v: string) => {
    const n = parseFloat(v.replace(/[^0-9.]/g, ''));
    if (!isNaN(n)) { const s = n.toFixed(2); setTargetRateStr(s); localStorage.setItem(uKey('truck_target_rate'), s); }
  };
  const saveMaxWeight = (v: string) => {
    const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(n)) { const s = String(n); setMaxWeightStr(s); localStorage.setItem(uKey('truck_max_weight'), s); }
  };

  // ── Dynamic load generation ──
  const [loadSeed, setLoadSeed] = useState(() => Math.floor(Date.now() / 60000));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const allLoads = useMemo(() => {
    const [lat, lon] = userLocation || [42.3314, -83.0458]; // default Detroit
    return generateLoads(lat, lon, loadSeed);
  }, [userLocation, loadSeed]);

  // ── Filter by target rate, max weight ──
  const filteredLoads = useMemo(() =>
    allLoads.filter(l => l.weight <= maxWeight * 1.1), // weight filter (10% buffer to show close misses)
    [allLoads, maxWeight]
  );

  const meetsRate = (l: typeof allLoads[number]) => l.rate >= targetRate;

  // ── Auto-refresh every 60s ──
  useEffect(() => {
    const interval = setInterval(() => setLoadSeed(Math.floor(Date.now() / 60000)), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => { setLoadSeed(Date.now()); setIsRefreshing(false); }, 600);
  };

  const handleBook = async (load: typeof allLoads[number]) => {
    setBookingId(load.id);
    try {
      await updateProfile({
        currentLoad: {
          origin: load.origin,
          destination: load.destination,
          commodity: load.commodity,
          rate: `$${load.rate.toFixed(2)}`,
          total: `$${load.total.toLocaleString()}`,
          bookedAt: new Date().toISOString()
        }
      });
      if (context) {
        context.setNavTarget(load.destination);
        context.setActiveView(ViewType.NAVIGATION);
      }
    } catch (error) {
      console.error("Booking error:", error);
    } finally {
      setBookingId(null);
    }
  };

  const locationLabel = userLocation
    ? US_CITIES.reduce((closest, c) => {
        const d = haversine(userLocation[0], userLocation[1], c.coords[0], c.coords[1]);
        return d < closest.dist ? { name: c.name, dist: d } : closest;
      }, { name: 'Your Location', dist: Infinity }).name
    : 'Locating...';

  const meetsRateCount = filteredLoads.filter(meetsRate).length;

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto bg-[#050505] min-h-screen">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white mb-1 uppercase italic">
            Ghost Dispatcher<span className="text-base align-top ml-0.5 text-[#D4AF37]">™</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
            <p className="text-zinc-500 font-bold text-sm uppercase tracking-widest italic">
              Near {locationLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Editable RPM Target */}
          <EditableField
            testId="target-rate-field"
            label="RPM Target"
            value={targetRateStr}
            prefix="$"
            suffix="/mi"
            onSave={saveTargetRate}
            icon={<DollarSign className="w-4 h-4" />}
          />

          {/* Editable Max Weight */}
          <EditableField
            testId="max-weight-field"
            label="Max Weight"
            value={maxWeightStr}
            suffix=" lbs"
            onSave={saveMaxWeight}
            icon={<Weight className="w-4 h-4" />}
          />

          {/* Refresh button */}
          <button
            data-testid="refresh-loads-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0a0a0a] border border-zinc-800 hover:border-[#D4AF37]/40 text-zinc-500 hover:text-[#D4AF37] rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-[#0a0a0a] border border-zinc-900 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{filteredLoads.length} loads nearby</span>
        </div>
        <div className="h-4 w-px bg-zinc-800" />
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            <span className="text-[#D4AF37]">{meetsRateCount}</span> meet your ${targetRate.toFixed(2)}/mi target
          </span>
        </div>
        <div className="h-4 w-px bg-zinc-800" />
        <div className="flex items-center gap-2">
          <Weight className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            Max {(maxWeight / 1000).toFixed(0)}k lbs capacity
          </span>
        </div>
        <div className="ml-auto text-[9px] text-zinc-700 font-bold uppercase tracking-widest">
          Auto-refreshes every 60s
        </div>
      </div>

      {/* ── Load cards ── */}
      {filteredLoads.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-zinc-600 font-black uppercase tracking-widest text-sm">No loads found near your location</p>
          <p className="text-zinc-700 text-xs mt-2">Try increasing search radius or enabling GPS</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLoads.map(load => (
            <LoadCard
              key={load.id}
              load={load}
              onBook={() => handleBook(load)}
              isBooking={bookingId === load.id}
              targetRate={targetRate}
              maxWeight={maxWeight}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LoadBoard;
