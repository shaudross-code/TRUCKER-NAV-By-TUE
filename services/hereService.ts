
const HERE_API_KEY = import.meta.env.VITE_HERE_API_KEY;

export interface TruckPOI {
  name: string;
  type: string;
  lat: number;
  lon: number;
  amenities: string[];
  address?: string;
  distance?: number;
}

const MAJOR_CHAINS = [
  "Love's Travel Stop",
  "Pilot Travel Center",
  "Flying J Travel Center",
  "Petro Stopping Center",
  "TravelCenters of America",
  "TA Express",
  "Road Ranger",
  "Kwik Trip",
  "Kwik Star",
  "Weigh Station",
  "Rest Area",
  "Truck Wash",
  "Blue Beacon"
];

export async function fetchHERETruckStops(lat: number, lon: number): Promise<TruckPOI[]> {
  if (!HERE_API_KEY) {
    console.error("HERE_API_KEY is not set");
    return [];
  }

  try {
    // We'll perform multiple searches for better reliability or use a broad query
    // The 'discover' endpoint is good for this.
    // We can use the 'q' parameter with multiple terms or iterate.
    // To be efficient, we'll use a combined query first.
    
    const results: TruckPOI[] = [];
    
    // Search for each major chain to ensure we get them
    const searchPromises = MAJOR_CHAINS.map(async (chain) => {
      const url = `https://discover.search.hereapi.com/v1/discover?at=${lat},${lon}&q=${encodeURIComponent(chain)}&limit=20&apiKey=${HERE_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json();
      
      return (data.items || []).map((item: any) => ({
        name: item.title,
        type: item.categories?.[0]?.name || 'Truck Stop',
        lat: item.position.lat,
        lon: item.position.lng,
        amenities: item.categories?.map((c: any) => c.name) || [],
        address: item.address?.label,
        distance: item.distance
      }));
    });

    const allResults = await Promise.all(searchPromises);
    allResults.forEach(batch => results.push(...batch));

    // Deduplicate by name and position
    const seen = new Set<string>();
    return results.filter(poi => {
      const id = `${poi.name}-${poi.lat.toFixed(4)}-${poi.lon.toFixed(4)}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  } catch (error) {
    console.error("HERE POI fetch failed:", error);
    return [];
  }
}
