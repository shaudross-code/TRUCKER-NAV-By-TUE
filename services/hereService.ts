
export interface TruckPOI {
  name: string;
  type: string;
  lat: number;
  lon: number;
  entrance?: { lat: number; lon: number };
  exit?: { lat: number; lon: number };
  amenities: string[];
  address?: string;
  distance?: number;
}

export async function fetchHERETruckStops(lat: number, lon: number): Promise<TruckPOI[]> {
  const HERE_API_KEY = import.meta.env?.VITE_HERE_API_KEY;
  if (!HERE_API_KEY) {
    console.warn("HERE_API_KEY is not set, using fallback POI data");
    return [
      { name: "TA Travel Center", type: "major_chains", lat: lat + 0.002, lon: lon - 0.002, amenities: ["Showers", "Diesel", "Country Pride"] },
      { name: "Flying J Travel Center", type: "major_chains", lat: lat - 0.002, lon: lon + 0.002, amenities: ["Showers", "Diesel", "Denny's"] },
      { name: "Buc-ee's", type: "major_chains", lat: lat + 0.004, lon: lon + 0.004, amenities: ["Gas", "Food", "Clean Restrooms"] },
      { name: "Speedway", type: "major_chains", lat: lat - 0.004, lon: lon - 0.004, amenities: ["Gas", "Food"] },
      { name: "Rest Area", type: "rest_area", lat: lat + 0.006, lon: lon - 0.001, amenities: ["Restrooms", "Vending Machines", "Parking"] },
      { name: "Weigh Station", type: "weigh_station", lat: lat - 0.001, lon: lon + 0.006, amenities: ["Scales", "Inspection"] }
    ];
  }

  try {
    // Optimization: Use a single broad query for truck-related places instead of 50 individual requests
    // This significantly reduces latency and avoids rate limiting.
    const url = `https://discover.search.hereapi.com/v1/discover?at=${lat},${lon}&q=truck+stop+travel+center+weigh+station+rest+area&limit=100&apiKey=${HERE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HERE API error: ${response.status}`);
    const data = await response.json();
    
    const results = (data.items || []).map((item: any) => ({
      name: item.title,
      type: item.categories?.[0]?.name || 'Truck Stop',
      lat: Number(item.position.lat),
      lon: Number(item.position.lng),
      entrance: item.access?.[0] ? { lat: Number(item.access[0].lat), lon: Number(item.access[0].lng) } : undefined,
      exit: item.access?.[1] ? { lat: Number(item.access[1].lat), lon: Number(item.access[1].lng) } : undefined,
      amenities: item.categories?.map((c: any) => c.name) || [],
      address: item.address?.label,
      distance: item.distance
    }));

    // Deduplicate by name and position
    const seen = new Set<string>();
    return results.filter((poi: any) => {
      const id = `${poi.name}-${poi.lat.toFixed(4)}-${poi.lon.toFixed(4)}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  } catch (error) {
    console.warn("HERE POI fetch failed, using fallback data:", error);
    return [
      { name: "TA Travel Center", type: "major_chains", lat: lat + 0.002, lon: lon - 0.002, amenities: ["Showers", "Diesel", "Country Pride"] },
      { name: "Flying J Travel Center", type: "major_chains", lat: lat - 0.002, lon: lon + 0.002, amenities: ["Showers", "Diesel", "Denny's"] },
      { name: "Buc-ee's", type: "major_chains", lat: lat + 0.004, lon: lon + 0.004, amenities: ["Gas", "Food", "Clean Restrooms"] },
      { name: "Speedway", type: "major_chains", lat: lat - 0.004, lon: lon - 0.004, amenities: ["Gas", "Food"] },
      { name: "Rest Area", type: "rest_area", lat: lat + 0.006, lon: lon - 0.001, amenities: ["Restrooms", "Vending Machines", "Parking"] },
      { name: "Weigh Station", type: "weigh_station", lat: lat - 0.001, lon: lon + 0.006, amenities: ["Scales", "Inspection"] }
    ];
  }
}

export async function fetchHERERoute(origin: [number, number], destination: [number, number]): Promise<any> {
  const HERE_API_KEY = import.meta.env?.VITE_HERE_API_KEY;
  if (!HERE_API_KEY) return null;

  try {
    const url = `https://router.hereapi.com/v8/routes?transportMode=truck&origin=${origin[0]},${origin[1]}&destination=${destination[0]},${destination[1]}&return=polyline,summary&apiKey=${HERE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("HERE Route fetch failed:", error);
    return null;
  }
}

export function getHEREMapImage(lat: number, lon: number, zoom: number = 14, width: number = 600, height: number = 400): string {
  const HERE_API_KEY = import.meta.env?.VITE_HERE_API_KEY;
  if (!HERE_API_KEY) return '';
  return `https://image.maps.hereapi.com/mia/v3/base/mc/${lat},${lon}/${zoom}/${width}x${height}/png8?apiKey=${HERE_API_KEY}`;
}

export async function fetchHEREMatrix(origins: [number, number][], destinations: [number, number][]): Promise<any> {
  const HERE_API_KEY = import.meta.env?.VITE_HERE_API_KEY;
  if (!HERE_API_KEY) return null;

  try {
    const url = `https://matrix.router.hereapi.com/v8/matrix?async=false&apiKey=${HERE_API_KEY}`;
    
    const body = {
      origins: origins.map(o => ({ lat: o[0], lng: o[1] })),
      destinations: destinations.map(d => ({ lat: d[0], lng: d[1] })),
      regionDefinition: { type: "world" },
      matrixAttributes: ["distances", "travelTimes"]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("HERE Matrix fetch failed:", error);
    return null;
  }
}

export async function fetchHEREAutocomplete(query: string, lat: number, lon: number): Promise<any[]> {
  const HERE_API_KEY = import.meta.env?.VITE_HERE_API_KEY;
  if (!HERE_API_KEY) return [];

  try {
    const url = `https://autocomplete.search.hereapi.com/v1/autocomplete?q=${encodeURIComponent(query)}&at=${lat},${lon}&limit=5&apiKey=${HERE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("HERE Autocomplete fetch failed:", error);
    return [];
  }
}

export async function fetchHEREAutosuggest(query: string, lat: number, lon: number): Promise<any[]> {
  const HERE_API_KEY = import.meta.env?.VITE_HERE_API_KEY;
  if (!HERE_API_KEY) return [];

  try {
    const url = `https://autosuggest.search.hereapi.com/v1/autosuggest?q=${encodeURIComponent(query)}&at=${lat},${lon}&limit=5&apiKey=${HERE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("HERE Autosuggest fetch failed:", error);
    return [];
  }
}

export async function fetchHEREBrowse(lat: number, lon: number, categories: string, limit: number = 20): Promise<any[]> {
  const HERE_API_KEY = import.meta.env?.VITE_HERE_API_KEY;
  if (!HERE_API_KEY) return [];

  try {
    const url = `https://browse.search.hereapi.com/v1/browse?at=${lat},${lon}&categories=${encodeURIComponent(categories)}&limit=${limit}&apiKey=${HERE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("HERE Browse fetch failed:", error);
    return [];
  }
}
