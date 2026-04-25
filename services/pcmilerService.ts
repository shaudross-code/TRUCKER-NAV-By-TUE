/**
 * PC*MILER Integration Service
 * Provides truck-specific mileage, routing, and cost data via Trimble Maps REST API.
 * Requires a Trimble Maps API key (https://developer.trimblemaps.com).
 */

export interface PCMilerRouteReport {
  totalMiles: number;
  totalHours: number;
  totalCost: number;
  tolls: number;
  legs: PCMilerLeg[];
  stateBreakdown: { state: string; miles: number }[];
}

export interface PCMilerLeg {
  origin: string;
  destination: string;
  miles: number;
  hours: number;
  tollCost: number;
}

const TRIMBLE_BASE_URL = 'https://pcmiler.alk.com/apis/rest/v1.0';

/**
 * Fetch a PC*MILER mileage report for a truck route.
 * @param apiKey Trimble Maps API key
 * @param stops Array of stop coordinates [[lat,lon], ...]
 * @param truckProfile Truck dimensions for routing
 */
export async function fetchPCMilerRoute(
  apiKey: string,
  stops: [number, number][],
  truckProfile?: {
    height?: number; // feet
    weight?: number; // lbs
    length?: number; // feet
    width?: number;  // feet
    hazmat?: boolean;
  }
): Promise<PCMilerRouteReport | null> {
  if (!apiKey) {
    console.warn('[PC*MILER] No API key provided');
    return null;
  }
  
  if (stops.length < 2) {
    console.warn('[PC*MILER] Need at least 2 stops');
    return null;
  }

  try {
    // Format stops as "longitude,latitude" (PC*MILER uses lon,lat order)
    const stopsStr = stops.map(([lat, lon]) => `${lon},${lat}`).join(';');
    
    const params = new URLSearchParams({
      authToken: apiKey,
      stops: stopsStr,
      reports: 'Mileage,State',
      dataVersion: 'Current',
      vehicleType: '0', // 0=Truck
      routeType: 'Practical',
      distUnits: 'Miles',
    });

    // Add truck dimensions if provided
    if (truckProfile) {
      if (truckProfile.height) params.append('height', String(Math.round(truckProfile.height * 12))); // feet to inches
      if (truckProfile.weight) params.append('weight', String(truckProfile.weight));
      if (truckProfile.length) params.append('length', String(Math.round(truckProfile.length * 12)));
      if (truckProfile.width) params.append('width', String(Math.round((truckProfile.width || 8.5) * 12)));
      if (truckProfile.hazmat) params.append('hazMatType', '1'); // General
    }

    const url = `${TRIMBLE_BASE_URL}/Service.svc/route/routeReports?${params.toString()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error('[PC*MILER] API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    // Parse mileage report
    const mileageReport = data?.[0]; // First report type (Mileage)
    const stateReport = data?.[1]; // Second report type (State)
    
    if (!mileageReport?.ReportLines) {
      console.warn('[PC*MILER] No report data returned');
      return null;
    }

    // Parse leg data from mileage report
    const legs: PCMilerLeg[] = [];
    let totalMiles = 0;
    let totalHours = 0;
    let totalCost = 0;
    let tolls = 0;

    for (const line of mileageReport.ReportLines) {
      if (line.LMiles !== undefined) {
        const leg: PCMilerLeg = {
          origin: line.Origin || '',
          destination: line.Destination || '',
          miles: line.LMiles || 0,
          hours: line.LHours || 0,
          tollCost: line.LToll || 0,
        };
        legs.push(leg);
        totalMiles = line.TMiles || totalMiles;
        totalHours = line.THours || totalHours;
        totalCost = line.LCost || totalCost;
        tolls += leg.tollCost;
      }
    }

    // Parse state breakdown
    const stateBreakdown: { state: string; miles: number }[] = [];
    if (stateReport?.ReportLines) {
      for (const line of stateReport.ReportLines) {
        if (line.StCountry && line.Miles) {
          stateBreakdown.push({
            state: line.StCountry,
            miles: line.Miles,
          });
        }
      }
    }

    console.log(`[PC*MILER] Route: ${totalMiles.toFixed(1)} mi, ${totalHours.toFixed(1)} hrs, $${tolls.toFixed(2)} tolls`);

    return {
      totalMiles,
      totalHours,
      totalCost,
      tolls,
      legs,
      stateBreakdown,
    };
  } catch (error: any) {
    console.error('[PC*MILER] Fetch error:', error.message);
    return null;
  }
}

/**
 * Check if PC*MILER API key is configured and valid.
 */
export async function validatePCMilerKey(apiKey: string): Promise<boolean> {
  try {
    const url = `${TRIMBLE_BASE_URL}/Service.svc/route/routeReports?authToken=${apiKey}&stops=-74.17,40.69;-87.63,41.87&reports=Mileage&dataVersion=Current`;
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}
