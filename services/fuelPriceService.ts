// ── Fuel Price Service ──────────────────────────────────────────────────────
// Fetches real-time diesel fuel prices from HERE Fuel Prices API

export interface FuelStation {
  id: string;
  name: string;
  brand: string;
  lat: number;
  lng: number;
  distance: number;
  dieselPrice: number | null;
  currency: string;
  unit: string;
  lastUpdated: string;
  address: string;
  phone?: string;
  open24x7: boolean;
}

// Cache fuel prices for 15 minutes to avoid excessive API calls
const fuelCache: Map<string, { data: FuelStation[]; timestamp: number }> = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)}_${lon.toFixed(2)}`;
}

/** Fetch diesel fuel prices near a location */
export async function fetchFuelPrices(lat: number, lon: number, radius = 50000): Promise<FuelStation[]> {
  const key = cacheKey(lat, lon);
  const cached = fuelCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const res = await fetch('/api/fuel-prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lon, radius }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const stations: FuelStation[] = data.stations || [];
    fuelCache.set(key, { data: stations, timestamp: Date.now() });
    return stations;
  } catch {
    return [];
  }
}

/** Fetch diesel prices along a route corridor */
export async function fetchCorridorFuelPrices(
  routeCoords: [number, number][], // [lng, lat]
  totalDistMiles: number
): Promise<FuelStation[]> {
  if (!routeCoords || routeCoords.length < 2) return [];

  // Sample every ~50 miles (fuel stops are less frequent than POIs)
  const sampleInterval = 50;
  const numSamples = Math.max(2, Math.ceil(totalDistMiles / sampleInterval));
  const samplePoints: [number, number][] = [];

  for (let i = 0; i <= numSamples; i++) {
    const idx = Math.min(
      Math.floor((i / numSamples) * (routeCoords.length - 1)),
      routeCoords.length - 1
    );
    const coord = routeCoords[idx];
    samplePoints.push([coord[1], coord[0]]); // [lat, lng]
  }

  // Dedupe samples too close together
  const deduped: [number, number][] = [samplePoints[0]];
  for (let i = 1; i < samplePoints.length; i++) {
    const prev = deduped[deduped.length - 1];
    const dist = Math.sqrt(
      Math.pow(samplePoints[i][0] - prev[0], 2) + Math.pow(samplePoints[i][1] - prev[1], 2)
    ) * 69;
    if (dist > 20) deduped.push(samplePoints[i]);
  }

  console.log(`[Fuel] Sampling ${deduped.length} points for fuel prices along ${totalDistMiles.toFixed(0)}mi route`);

  const corridorRadius = 50000; // 50km for wider fuel coverage
  const allStations: FuelStation[] = [];

  // Batch 3 at a time
  for (let i = 0; i < deduped.length; i += 3) {
    const batch = deduped.slice(i, i + 3);
    const results = await Promise.all(
      batch.map(([lat, lng]) => fetchFuelPrices(lat, lng, corridorRadius)) // 50km per sample
    );
    allStations.push(...results.flat());

    if (i + 3 < deduped.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Deduplicate by station ID
  const seen = new Set<string>();
  const unique = allStations.filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  console.log(`[Fuel] Found ${unique.length} unique stations with prices along route`);
  return unique;
}

/** Find the cheapest diesel price from a list of stations */
export function findCheapestDiesel(stations: FuelStation[]): FuelStation | null {
  const withPrices = stations.filter(s => s.dieselPrice !== null && s.dieselPrice > 0);
  if (withPrices.length === 0) return null;
  return withPrices.reduce((min, s) => (s.dieselPrice! < min.dieselPrice! ? s : min));
}

/** Match a fuel station to a POI by proximity (within 500m) */
export function matchFuelStationToPoi(station: FuelStation, poiLat: number, poiLon: number): boolean {
  const dlat = station.lat - poiLat;
  const dlng = station.lng - poiLon;
  const distKm = Math.sqrt(dlat * dlat + dlng * dlng) * 111; // Rough km
  return distKm < 0.5; // Within 500m
}
