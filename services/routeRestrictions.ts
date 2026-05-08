/**
 * Bridge Height & Weight Limit Service
 * Fetches low-clearance bridges and weight-restricted roads along a route corridor
 * using OpenStreetMap Overpass API.
 */

export interface BridgeClearance {
  lat: number;
  lon: number;
  maxheight: number; // meters
  maxheightFt: number; // feet
  name: string;
  road: string;
  type: 'bridge' | 'tunnel';
}

export interface WeightLimit {
  lat: number;
  lon: number;
  maxweight: number; // metric tons
  maxweightLbs: number; // pounds
  name: string;
  road: string;
}

export interface NoTruckZone {
  lat: number;
  lon: number;
  name: string;
  road: string;
  restriction: string; // e.g. "No HGV", "No trucks", "Weight restricted"
  tags: Record<string, string>;
}

export interface WeighStation {
  lat: number;
  lon: number;
  name: string;
  operator: string;
  direction: string; // e.g. "northbound", "both"
  isOpen: boolean; // default true, we can't query real-time status
}

export interface RouteRestrictions {
  bridges: BridgeClearance[];
  weightLimits: WeightLimit[];
  noTruckZones: NoTruckZone[];
  weighStations: WeighStation[];
}

// Sample route points to Overpass poly format
function routeToPolyFilter(routeCoords: [number, number][], bufferKm: number = 0.5): string {
  // Sample every Nth point to keep the query manageable
  const step = Math.max(1, Math.floor(routeCoords.length / 30));
  const sampled: [number, number][] = [];
  for (let i = 0; i < routeCoords.length; i += step) {
    sampled.push(routeCoords[i]);
  }
  if (sampled[sampled.length - 1] !== routeCoords[routeCoords.length - 1]) {
    sampled.push(routeCoords[routeCoords.length - 1]);
  }

  // Build a bounding box from sampled points + buffer
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for (const [lat, lon] of sampled) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }
  const latBuf = bufferKm / 111;
  const lonBuf = bufferKm / (111 * Math.cos(((minLat + maxLat) / 2) * Math.PI / 180));

  return `${(minLat - latBuf).toFixed(5)},${(minLon - lonBuf).toFixed(5)},${(maxLat + latBuf).toFixed(5)},${(maxLon + lonBuf).toFixed(5)}`;
}

// Distance in meters between two [lat, lon] points
function distM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLon = (b[1] - a[1]) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// Filter to only keep restrictions within corridor of the route
function filterNearRoute(items: { lat: number; lon: number }[], routeCoords: [number, number][], corridorM: number = 150): typeof items {
  // Sample route points for faster distance checks
  const step = Math.max(1, Math.floor(routeCoords.length / 100));
  const sampled: [number, number][] = [];
  for (let i = 0; i < routeCoords.length; i += step) {
    sampled.push(routeCoords[i]);
  }

  return items.filter(item => {
    const pos: [number, number] = [item.lat, item.lon];
    return sampled.some(rp => distM(pos, rp) <= corridorM);
  });
}

export async function fetchRouteRestrictions(routeCoords: [number, number][]): Promise<RouteRestrictions> {
  const result: RouteRestrictions = { bridges: [], weightLimits: [], noTruckZones: [], weighStations: [] };
  if (routeCoords.length < 2) return result;

  const bbox = routeToPolyFilter(routeCoords, 0.8);

  const query = `
    [out:json][timeout:25][bbox:${bbox}];
    (
      way["maxheight"](${bbox});
      node["maxheight"](${bbox});
      way["maxweight"](${bbox});
      node["maxweight"](${bbox});
      way["bridge"="yes"]["maxheight"](${bbox});
      way["tunnel"="yes"]["maxheight"](${bbox});
      way["hgv"="no"](${bbox});
      way["hgv"="delivery"](${bbox});
      way["hgv:conditional"](${bbox});
      way["motor_vehicle"="no"]["highway"](${bbox});
      node["highway"="weigh_station"](${bbox});
      way["highway"="weigh_station"](${bbox});
    );
    out center;
  `;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch('/api/overpass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn('Overpass API returned', response.status);
      return result;
    }

    const data = await response.json();
    const elements = data.elements || [];

    for (const el of elements) {
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      if (!lat || !lon) continue;
      const tags = el.tags || {};

      // Parse maxheight
      if (tags.maxheight) {
        const mh = parseHeight(tags.maxheight);
        if (mh > 0) {
          result.bridges.push({
            lat, lon,
            maxheight: mh,
            maxheightFt: +(mh * 3.28084).toFixed(1),
            name: tags.name || '',
            road: tags['addr:street'] || tags.ref || tags.name || '',
            type: tags.tunnel === 'yes' ? 'tunnel' : 'bridge',
          });
        }
      }

      // Parse maxweight
      if (tags.maxweight) {
        const mw = parseWeight(tags.maxweight);
        if (mw > 0) {
          result.weightLimits.push({
            lat, lon,
            maxweight: mw,
            maxweightLbs: Math.round(mw * 2204.62),
            name: tags.name || '',
            road: tags['addr:street'] || tags.ref || tags.name || '',
          });
        }
      }

      // Parse no-truck zones (hgv=no, motor_vehicle=no, hgv=delivery)
      if (tags.hgv === 'no' || tags.hgv === 'delivery' || tags['hgv:conditional'] || 
          (tags.motor_vehicle === 'no' && tags.highway)) {
        let restriction = 'No trucks';
        if (tags.hgv === 'delivery') restriction = 'Delivery trucks only';
        if (tags['hgv:conditional']) restriction = `Conditional: ${tags['hgv:conditional']}`;
        if (tags.motor_vehicle === 'no') restriction = 'No motor vehicles';
        
        result.noTruckZones.push({
          lat, lon,
          name: tags.name || '',
          road: tags.ref || tags['addr:street'] || tags.name || '',
          restriction,
          tags,
        });
      }

      // Parse weigh stations (DOT only — NOT Cat Scales / commercial weighbridges)
      if (tags.highway === 'weigh_station') {
        // Exclude Cat Scales and commercial weighbridges
        const name = (tags.name || '').toLowerCase();
        const isCatScale = name.includes('cat scale') || name.includes('catscale') || 
                           tags.brand?.toLowerCase().includes('cat scale') ||
                           tags.operator?.toLowerCase().includes('cat scale');
        if (!isCatScale) {
          result.weighStations.push({
            lat, lon,
            name: tags.name || 'Weigh Station',
            operator: tags.operator || '',
            direction: tags.direction || tags['traffic_sign:direction'] || 'both',
            isOpen: true,
          });
        }
      }
    }

    // Filter to only restrictions near the route corridor (250m buffer for OSM data precision)
    result.bridges = filterNearRoute(result.bridges, routeCoords, 250) as BridgeClearance[];
    result.weightLimits = filterNearRoute(result.weightLimits, routeCoords, 250) as WeightLimit[];
    result.noTruckZones = filterNearRoute(result.noTruckZones, routeCoords, 200) as NoTruckZone[];
    result.weighStations = filterNearRoute(result.weighStations, routeCoords, 500) as WeighStation[]; // Wider for weigh stations (off-ramp)

    console.log(`[RouteRestrictions] Found ${result.bridges.length} bridges, ${result.weightLimits.length} weight limits, ${result.noTruckZones.length} no-truck zones, ${result.weighStations.length} weigh stations near route`);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn('[RouteRestrictions] Overpass query timed out');
    } else {
      console.error('[RouteRestrictions] Overpass fetch error:', err.message);
    }
  }

  return result;
}

// Parse OSM maxheight tag (e.g., "4.2", "14'6\"", "14'6\"", "14 ft 6 in")
function parseHeight(val: string): number {
  if (!val) return 0;
  // Feet + inches: 14'6" or 14' 6"
  const ftIn = val.match(/(\d+)'\s*(\d+)?/);
  if (ftIn) {
    return (parseInt(ftIn[1]) * 12 + parseInt(ftIn[2] || '0')) * 0.0254;
  }
  // "X ft Y in"
  const ftInAlt = val.match(/(\d+)\s*ft\s*(\d+)?\s*in/i);
  if (ftInAlt) {
    return (parseInt(ftInAlt[1]) * 12 + parseInt(ftInAlt[2] || '0')) * 0.0254;
  }
  // Metric (meters)
  const m = parseFloat(val);
  if (!isNaN(m)) return m;
  return 0;
}

// Parse OSM maxweight tag (e.g., "10", "10 t", "20000 lbs")
function parseWeight(val: string): number {
  if (!val) return 0;
  const lbs = val.match(/([\d,.]+)\s*(?:lbs?|pounds?)/i);
  if (lbs) return parseFloat(lbs[1].replace(',', '')) * 0.000453592;
  const tons = val.match(/([\d.]+)\s*(?:st|tons?)/i);
  if (tons) return parseFloat(tons[1]) * 0.907185; // short tons to metric
  const t = parseFloat(val);
  if (!isNaN(t)) return t;
  return 0;
}
