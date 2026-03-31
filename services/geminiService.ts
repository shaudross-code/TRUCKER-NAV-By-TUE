import { GoogleGenAI, Modality, Type } from "@google/genai";
import { safeStringify } from '../utils';

let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set. Please add it to your .env file.');
      return null;
    }
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
};

const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
  // Use byteOffset and length to handle slices correctly
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = error?.message || (typeof error === 'object' ? (error?.toString() || String(error)) : String(error));
    const isBusy = 
      error?.status === 503 || 
      error?.code === 503 || 
      error?.status === 429 ||
      error?.code === 429 ||
      errorStr.includes('503') || 
      errorStr.includes('429') ||
      errorStr.includes('high demand') ||
      errorStr.includes('UNAVAILABLE') ||
      errorStr.includes('RESOURCE_EXHAUSTED');

    if (retries > 0 && isBusy) {
      console.warn(`Gemini API busy or rate limited, retrying in ${delay}ms... (${retries} retries left)`);
      await sleep(delay);
      return withRetry(fn, retries - 1, Math.min(delay * 2, 10000));
    }
    throw error;
  }
}

export async function processVoiceCommand(text: string) {
  try {
    const ai = getAI();
    if (!ai) return { text: 'API key not configured' };
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The user said: "${text}". 
      You are an AI co-pilot for a professional truck driver using the TRUCKERS NAV System By TUE.
      Based on their request, suggest a relevant action or piece of information.
      CRITICAL: Always use miles for distances, never meters.
      Keep it concise and safety-focused.`,
      config: {
        systemInstruction: "You are the TRUCKERS NAV Voice Assistant. Your goal is to help truck drivers manage their routes, fuel, and parking safety. Respond succinctly as if through a radio. Always use miles for distances. You have tools to navigate, switch views, find truck stops, and check loads.",
        tools: [{
          functionDeclarations: [
            {
              name: "navigate_to",
              description: "Start navigation to a specific destination",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  destination: { type: Type.STRING, description: "The name or address of the destination" }
                },
                required: ["destination"]
              }
            },
            {
              name: "switch_view",
              description: "Switch the application view",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  view: { type: Type.STRING, description: "The view to switch to (DASHBOARD, NAVIGATION, TRUCK_STOPS, LOAD_BOARD, MAINTENANCE, SETTINGS, ROUTE_HISTORY)" }
                },
                required: ["view"]
              }
            },
            {
              name: "find_truck_stops",
              description: "Find truck stops near the current location or a specific place",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  location: { type: Type.STRING, description: "Optional location to search near" }
                }
              }
            },
            {
              name: "get_load_info",
              description: "Get information about the current active load or earnings",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  query: { type: Type.STRING, description: "What the user wants to know about their loads" }
                }
              }
            }
          ]
        }]
      }
    }));

    return response;
  } catch (error) {
    console.error("Voice command processing failed:", error instanceof Error ? error.message : String(error));
    return { text: "I'm having trouble processing that right now." };
  }
}

export async function fetchTruckStops(lat: number, lon: number) {
  try {
    const ai = getAI();
    if (!ai) return [];
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find 5 real truck stops or travel centers near coordinates ${lat}, ${lon}. 
      For each, provide: name, location (address or exit), distance from these coordinates in miles, current estimated availability (as a percentage), and a list of 4-5 key amenities (e.g., showers, diesel, parking, food).
      Also provide specific entrance and exit coordinates (entranceLat, entranceLon, exitLat, exitLon) for the truck-specific access points.
      Return the data in a clean JSON array format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              location: { type: Type.STRING },
              distance: { type: Type.NUMBER },
              availability: { type: Type.NUMBER },
              entranceLat: { type: Type.NUMBER },
              entranceLon: { type: Type.NUMBER },
              exitLat: { type: Type.NUMBER },
              exitLon: { type: Type.NUMBER },
              amenities: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["name", "location", "distance", "availability", "amenities"]
          }
        }
      }
    }));

    if (!response.text) return [];
    
    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    const data = JSON.parse(jsonStr);
    return data.map((stop: any) => ({
      ...stop,
      entrance: stop.entranceLat && stop.entranceLon ? { lat: Number(stop.entranceLat), lon: Number(stop.entranceLon) } : undefined,
      exit: stop.exitLat && stop.exitLon ? { lat: Number(stop.exitLat), lon: Number(stop.exitLon) } : undefined
    }));
  } catch (e) {
    console.warn("API error fetching truck stops, returning empty array to prevent inaccurate POIs.", e instanceof Error ? e.message : String(e));
    return [];
  }
}

export async function fetchMajorChains(lat: number, lon: number) {
  try {
    const ai = getAI();
    if (!ai) throw new Error("AI not initialized");
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find 100 real locations of major TRUCK STOP PLAZAS and TRAVEL CENTERS within a 1500-mile radius of coordinates ${lat}, ${lon}. 
      This is for a professional trucking application. Focus on high reliability and accurate coordinates.
      Focus EXCLUSIVELY on these truck stop plaza brands (NOT regular gas stations or convenience stores): 
      - Love's Travel Stops
      - Pilot Travel Centers
      - Flying J Travel Centers
      - Petro Stopping Centers
      - TA (TravelCenters of America)
      - Road Ranger
      - Buc-ee's
      - Sapp Bros Travel Centers
      - Ambest
      
      DO NOT include regular gas stations like Shell, BP, Exxon, Speedway, Casey's, Wawa, Sheetz, QuikTrip, RaceTrac, Circle K, 7-Eleven, Conoco, Marathon, or Chevron.
      Only include locations that are actual truck stop plazas with diesel islands, truck parking, and trucker amenities.
      
      Return a JSON array of objects with: name, type, lat, lon, and amenities.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              type: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lon: { type: Type.NUMBER },
              amenities: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["name", "type", "lat", "lon"]
          }
        }
      }
    }));

    let text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    text = text.trim();
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    return JSON.parse(text).map((poi: any) => ({
      ...poi,
      lat: Number(poi.lat),
      lon: Number(poi.lon)
    }));
  } catch (err) {
    console.warn("API error fetching major chains, returning empty array to prevent inaccurate POIs.", err instanceof Error ? err.message : String(err));
    return [];
  }
}

export async function fetchTruckPOIs(lat: number, lon: number) {
  try {
    // Fetch multiple types of truck-related POIs in parallel using HERE APIs
    const [generalPOIs, truckStopPOIs, ...brandResults] = await Promise.all([
      // Weigh stations and rest areas via Browse (NO general fueling — removes random gas stations)
      fetch('/api/browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeStringify({ 
          lat, 
          lon, 
          categories: '700-7600-0117,700-7600-0322'
        })
      }).then(r => r.ok ? r.json() : { items: [] }),
      
      // Truck stops specifically via Discover API (most accurate)
      fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeStringify({ q: 'truck stop travel plaza', lat, lon, radius: 80000 })
      }).then(r => r.ok ? r.json() : { items: [] }),
      
      // Major truck stop plaza brands + DOT weigh stations + certified scales
      ...["Love's Travel Stop", "Pilot Flying J", "Petro Stopping Centers", "TA TravelCenters", "Cat Scale certified truck scale", "Blue Beacon Truck Wash", "DOT weigh station", "Sapp Bros Travel Center"].map(brand =>
        fetch('/api/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: safeStringify({ q: brand, lat, lon, radius: 80000 })
        }).then(r => r.ok ? r.json() : { items: [] })
      )
    ]);
    
    // Combine all results
    const allItems = [
      ...(generalPOIs.items || []),
      ...(truckStopPOIs.items || []),
      ...brandResults.flatMap((r: any) => r.items || [])
    ];
    
    if (allItems.length === 0) {
      console.warn("HERE API returned no results, falling back to Overpass API");
      return fetchTruckPOIsFromOverpass(lat, lon);
    }
    
    // Deduplicate by position (round to 4 decimal places ~11m precision)
    const seen = new Set<string>();
    const deduped = allItems.filter((item: any) => {
      const pos = item.access?.[0]?.position || item.position;
      if (!pos) return false;
      const key = `${pos.lat.toFixed(4)}_${pos.lng.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    // Map HERE results to our POI format
    return deduped.map((item: any) => {
      // Prefer access point (road-accessible entry) over center position for accurate map placement
      const position = item.access?.[0]?.position || item.position;
      if (!position) return null;
      
      const itemName = (item.title || "").toLowerCase();
      const catIds = (item.categories || []).map((c: any) => c.id);
      const catNames = (item.categories || []).map((c: any) => (c.name || '').toLowerCase());
      
      // ── Determine type based on categories, name, and HERE category IDs ──
      let type = "fuel";
      
      // Known truck service brands
      const isTruckService = itemName.includes('speedco') || itemName.includes('southern tire') ||
                             itemName.includes('rush truck') || itemName.includes('ryder') ||
                             itemName.includes('penske') || itemName.includes('freightliner') ||
                             itemName.includes('cummins') || itemName.includes('peterbilt') ||
                             itemName.includes('volvo') || itemName.includes('truck wash') ||
                             itemName.includes('blue beacon') || itemName.includes('cat scale');
      
      // Known truck stop / travel center brands  
      const isTruckStop = itemName.includes('travel stop') || itemName.includes('travel center') ||
                          itemName.includes('travel plaza') || itemName.includes('truck stop') ||
                          itemName.includes("love's") || itemName.includes('loves ') ||
                          itemName.includes('pilot') || itemName.includes('flying j') ||
                          itemName.includes('petro stopping') || itemName.includes('ta ') ||
                          (itemName.startsWith('ta ') || itemName === 'ta') ||
                          itemName.includes('ambest') || itemName.includes('sapp bros') ||
                          itemName.includes('buc-ee') || itemName.includes('bucees') ||
                          itemName.includes('road ranger');
      
      const isWalmart = itemName.includes('walmart') || itemName.includes('wal-mart');
      const isRetail = itemName.includes("lowe's") || itemName.includes('lowes') || itemName.includes('home depot');
      const isLowClearance = itemName.includes('low clearance') || itemName.includes('low bridge');
      // DOT weigh station detection
      const isDOTWeighStation = itemName.includes('weigh station') || itemName.includes('inspection station') ||
                                itemName.includes('port of entry') || itemName.includes('dot station');

      // EV charging / Tesla — not trucking-relevant, skip entirely
      const isEVCharging = itemName.includes('tesla') || itemName.includes('supercharger') ||
                           itemName.includes('ev charging') || itemName.includes('chargepoint') ||
                           itemName.includes('electrify america') || itemName.includes('ev station') ||
                           itemName.includes('electric vehicle') || itemName.includes('blink charging') ||
                           itemName.includes('evgo') || itemName.includes('flo charging') ||
                           catIds.some((id: string) => id === '700-7600-0325' || id === '700-7600-0330');
      
      // Regular gas stations / convenience stores — NOT truck stop plazas, skip
      const isRegularGasStation = (
        itemName.includes('exxon') || itemName.includes('shell') ||
        itemName.includes('marathon') || itemName.includes('circle k') ||
        itemName.includes('7-eleven') || itemName.includes('seven eleven') ||
        itemName.includes(' bp ') || itemName.startsWith('bp ') || itemName === 'bp' ||
        itemName.includes('chevron') || itemName.includes('sinclair') ||
        itemName.includes('conoco') || itemName.includes('phillips 66') ||
        itemName.includes('casey') || itemName.includes('kwik') ||
        itemName.includes('quiktrip') || itemName.includes('wawa') ||
        itemName.includes('sheetz') || itemName.includes('racetrac') ||
        itemName.includes('speedway') || itemName.includes('sunoco') ||
        itemName.includes('valero') || itemName.includes('citgo') ||
        itemName.includes('mobil') || itemName.includes('texaco') ||
        itemName.includes('arco') || itemName.includes('amoco') ||
        itemName.includes('murphy usa') || itemName.includes('thorntons')
      ) && !isTruckStop; // Only exclude if not also a truck stop
      
      // CAT Scales are separate from weigh stations
      const isCatScale = itemName.includes('cat scale') || itemName.includes('catscale') ||
                         itemName.includes('certified scale') || itemName.includes('truck scale');
      
      if (isEVCharging) {
        return null; // Remove non-trucking EV POIs entirely
      } else if (isRegularGasStation) {
        return null; // Remove regular gas stations — only truck stop plazas allowed
      } else if (isTruckStop) {
        type = "major_chains"; // Full-service truck stops
      } else if (isCatScale) {
        type = "cat_scale"; // Certified truck weighing (distinct from DOT weigh stations)
      } else if (isTruckService) {
        type = "service"; // Truck service/repair
      } else if (isWalmart || isRetail) {
        type = "distribution"; // Retail/Distribution
      } else if (isLowClearance) {
        type = "low_clearance"; // Warning/Hazard
      } else if (isDOTWeighStation || catIds.includes('700-7600-0322')) {
        type = "weigh_station";
      } else if (catIds.includes('700-7900-0132')) {
        type = "service"; // HERE truck-related services
      } else if (catIds.includes('700-7600-0117') || catNames.some((n: string) => n.includes('rest area'))) {
        type = "rest_area";
      } else if (catIds.some((id: string) => id?.startsWith('600-6'))) {
        type = "service";
      } else if (catIds.includes('700-7600-0116')) {
        type = "fuel"; // Only generic fuel if no brand matched — rare after filtering
      }
      
      // Extract amenities from categories and name
      const amenities: string[] = [];
      
      // Truck stop / travel center brands — full amenity sets
      if (itemName.includes("love's") || itemName.includes('loves ')) {
        amenities.push("Diesel", "DEF", "Showers", "Laundry", "Truck Parking", "Scales", "WiFi", "Food");
      } else if (itemName.includes('pilot') || itemName.includes('flying j')) {
        amenities.push("Diesel", "DEF", "Showers", "Laundry", "Truck Parking", "Scales", "WiFi", "Food");
      } else if (itemName.includes('petro') && itemName.includes('stop')) {
        amenities.push("Diesel", "DEF", "Showers", "Truck Parking", "Iron Skillet", "Scales");
      } else if (itemName.startsWith('ta ') || itemName === 'ta' || itemName.includes('travelcenters')) {
        amenities.push("Diesel", "DEF", "Showers", "Truck Parking", "Food", "Scales");
      } else if (itemName.includes('buc-ee') || itemName.includes('bucees')) {
        amenities.push("Diesel", "DEF", "Food", "Shopping", "Clean Restrooms", "Large Parking");
      } else if (itemName.includes('sapp bros')) {
        amenities.push("Diesel", "DEF", "Showers", "Truck Parking", "Food");
      } else if (itemName.includes('cat scale')) {
        amenities.push("Certified Scale", "Truck Weighing", "Reweigh Guarantee");
      } else if (itemName.includes('speedco')) {
        amenities.push("Truck Repair", "Maintenance", "Oil Change", "Inspection");
      } else if (itemName.includes('southern tire')) {
        amenities.push("Tires", "Tire Repair", "Tire Sales", "Road Service");
      } else if (itemName.includes('rush truck')) {
        amenities.push("Truck Repair", "Parts", "Service", "Leasing");
      } else if (itemName.includes('ryder')) {
        amenities.push("Truck Rental", "Leasing", "Maintenance", "Fleet Services");
      } else if (itemName.includes('penske')) {
        amenities.push("Truck Rental", "Leasing", "Maintenance", "Fleet Services");
      } else if (itemName.includes('freightliner')) {
        amenities.push("Truck Sales", "Parts", "Service", "Warranty");
      } else if (itemName.includes('cummins')) {
        amenities.push("Engine Service", "Parts", "Repair", "Diagnostics");
      } else if (itemName.includes('peterbilt')) {
        amenities.push("Truck Sales", "Parts", "Service", "Warranty");
      } else if (itemName.includes('volvo')) {
        amenities.push("Truck Sales", "Parts", "Service", "Warranty");
      } else if (itemName.includes('walmart') || itemName.includes('wal-mart')) {
        amenities.push("Parking", "Restrooms", "Shopping", "Food");
      } else if (itemName.includes("lowe's") || itemName.includes('lowes')) {
        amenities.push("Large Lot Parking", "Hardware", "Building Materials", "Contractor Access");
      } else if (itemName.includes('home depot')) {
        amenities.push("Large Lot Parking", "Hardware", "Building Materials", "Pro Desk");
      } else if (itemName.includes('truck wash') || itemName.includes('blue beacon')) {
        amenities.push("Truck Wash", "Detailing", "Fleet Service");
      } else if (itemName.includes('low clearance') || itemName.includes('low bridge')) {
        amenities.push("Warning", "Height Restriction");
      } else if (itemName.includes('travel center') || itemName.includes('travel plaza') || itemName.includes('truck stop')) {
        amenities.push("Diesel", "Truck Parking", "Food");
      } else if (itemName.includes('rest area')) {
        amenities.push("Restrooms", "Parking", "Picnic Area");
      }
      
      if (item.contacts?.phone) amenities.push("Phone");
      if (item.categories?.some((c: any) => c.name?.toLowerCase().includes('fuel') || c.name?.toLowerCase().includes('gas'))) {
        amenities.push("Diesel");
      }
      if (item.categories?.some((c: any) => c.name?.toLowerCase().includes('restaurant') || c.name?.toLowerCase().includes('food'))) {
        amenities.push("Food");
      }
      if (item.categories?.some((c: any) => c.name?.toLowerCase().includes('parking'))) {
        amenities.push("Truck Parking");
      }
      if (item.categories?.some((c: any) => c.name?.toLowerCase().includes('repair') || c.name?.toLowerCase().includes('service'))) {
        if (!amenities.includes("Truck Repair")) amenities.push("Truck Repair");
      }
      if (item.categories?.some((c: any) => c.name?.toLowerCase().includes('tire'))) {
        if (!amenities.includes("Tires")) amenities.push("Tires");
      }
      
      if (amenities.length === 0) amenities.push("Diesel");
      
      return {
        name: item.title || "Truck Stop",
        type,
        lat: position.lat,
        lon: position.lng,
        amenities: [...new Set(amenities)], // Deduplicate amenities
        address: item.address?.label,
        distance: item.distance,
        phone: item.contacts?.phone?.[0]?.value,
        place_id: item.id, // HERE place ID for lookup
        id: item.id,
      };
    }).filter(Boolean).filter((poi: any) => {
      // Remove generic "service" type POIs (wrench icons)
      if (poi.type === 'service') return false;
      // Remove fuel stations without diesel that aren't truck stops/plazas
      if (poi.type === 'fuel' && !poi.amenities.includes('Diesel')) return false;
      return true;
    });
  } catch (e) {
    console.warn("HERE API error, falling back to Overpass API:", e instanceof Error ? e.message : String(e));
    return fetchTruckPOIsFromOverpass(lat, lon);
  }
}

// ─── Corridor-Based POI Search ────────────────────────────────────────────────
// Samples points every ~25 miles along the route and fetches POIs within a
// tight 16km (~10mi) corridor using HERE Discover API.
export async function fetchCorridorPOIs(
  routeCoords: [number, number][],  // [lng, lat] from route geometry
  totalDistMiles: number
): Promise<any[]> {
  if (!routeCoords || routeCoords.length < 2) return [];

  // Sample points every ~25 miles along the route
  const sampleIntervalMi = 25;
  const numSamples = Math.max(2, Math.ceil(totalDistMiles / sampleIntervalMi));
  const samplePoints: [number, number][] = []; // [lat, lng]
  
  for (let i = 0; i <= numSamples; i++) {
    const idx = Math.min(
      Math.floor((i / numSamples) * (routeCoords.length - 1)),
      routeCoords.length - 1
    );
    const coord = routeCoords[idx];
    samplePoints.push([coord[1], coord[0]]); // Convert [lng,lat] → [lat,lng]
  }

  // Deduplicate sample points that are too close (< 10 miles apart)
  const dedupedSamples: [number, number][] = [samplePoints[0]];
  for (let i = 1; i < samplePoints.length; i++) {
    const prev = dedupedSamples[dedupedSamples.length - 1];
    const dlat = samplePoints[i][0] - prev[0];
    const dlng = samplePoints[i][1] - prev[1];
    const approxMiles = Math.sqrt(dlat * dlat + dlng * dlng) * 69; // Rough conversion
    if (approxMiles > 10) dedupedSamples.push(samplePoints[i]);
  }
  // Always include the last point
  const lastSample = samplePoints[samplePoints.length - 1];
  const lastDeduped = dedupedSamples[dedupedSamples.length - 1];
  if (lastSample[0] !== lastDeduped[0] || lastSample[1] !== lastDeduped[1]) {
    dedupedSamples.push(lastSample);
  }

  console.log(`[Corridor] Sampling ${dedupedSamples.length} points along ${totalDistMiles.toFixed(0)}mi route`);

  const corridorRadius = 16000; // 16km ≈ 10 miles
  const allItems: any[] = [];

  // Process in batches of 3 to avoid rate limiting
  for (let i = 0; i < dedupedSamples.length; i += 3) {
    const batch = dedupedSamples.slice(i, i + 3);
    
    const batchPromises = batch.flatMap(([lat, lng]) => [
      // Discover: truck stop plazas (NOT regular gas stations)
      fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeStringify({ q: 'truck stop travel plaza', lat, lon: lng, radius: corridorRadius })
      }).then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
      
      // Browse: rest areas + weigh stations within corridor (NO general fueling 700-7600-0116)
      fetch('/api/browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeStringify({ 
          lat, lon: lng, 
          categories: '700-7600-0117,700-7600-0322'
        })
      }).then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),

      // Discover: DOT weigh stations and certified scales
      fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeStringify({ q: 'DOT weigh station certified scale', lat, lon: lng, radius: corridorRadius })
      }).then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] }))
    ]);

    const results = await Promise.all(batchPromises);
    results.forEach(r => {
      if (r.items) allItems.push(...r.items);
    });

    // Rate limit between batches
    if (i + 3 < dedupedSamples.length) {
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  }

  // Deduplicate by position (4 decimal places ≈ 11m precision)
  const seen = new Set<string>();
  const deduped = allItems.filter((item: any) => {
    const pos = item.access?.[0]?.position || item.position;
    if (!pos) return false;
    const key = `${pos.lat.toFixed(4)}_${pos.lng.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[Corridor] Found ${deduped.length} unique POIs (from ${allItems.length} raw)`);

  // Map to POI format (reuse the same mapping logic)
  return deduped.map((item: any) => {
    // Prefer access point for accurate road-level placement
    const position = item.access?.[0]?.position || item.position;
    if (!position) return null;

    const itemName = (item.title || "").toLowerCase();
    const catIds = (item.categories || []).map((c: any) => c.id);

    let type = "fuel";
    const isTruckStop = itemName.includes('travel stop') || itemName.includes('travel center') ||
                        itemName.includes('truck stop') || itemName.includes("love's") ||
                        itemName.includes('pilot') || itemName.includes('flying j') ||
                        itemName.includes('petro stopping') || itemName.includes('sapp bros') ||
                        itemName.includes('buc-ee') || itemName.includes('travel plaza') ||
                        itemName.includes('ambest') || itemName.includes('road ranger');
    const isTruckService = itemName.includes('speedco') ||
                           itemName.includes('blue beacon') || itemName.includes('rush truck');
    const isCatScale = itemName.includes('cat scale') || itemName.includes('catscale') ||
                       itemName.includes('certified scale') || itemName.includes('truck scale');
    const isEVCharging = itemName.includes('tesla') || itemName.includes('supercharger') ||
                         itemName.includes('ev charging') || itemName.includes('chargepoint') ||
                         itemName.includes('electrify america') || itemName.includes('ev station') ||
                         itemName.includes('electric vehicle') || itemName.includes('blink charging') ||
                         itemName.includes('evgo') || itemName.includes('flo charging') ||
                         catIds.some((id: string) => id === '700-7600-0325' || id === '700-7600-0330');
    const isDOTWeighStation = itemName.includes('weigh station') || itemName.includes('inspection station') ||
                              itemName.includes('port of entry') || itemName.includes('dot station');
    // Regular gas stations — NOT truck stop plazas
    const isRegularGasStation = (
      itemName.includes('exxon') || itemName.includes('shell') ||
      itemName.includes('marathon') || itemName.includes('circle k') ||
      itemName.includes('7-eleven') || itemName.includes('seven eleven') ||
      itemName.includes(' bp ') || itemName.startsWith('bp ') || itemName === 'bp' ||
      itemName.includes('chevron') || itemName.includes('sinclair') ||
      itemName.includes('conoco') || itemName.includes('phillips 66') ||
      itemName.includes('casey') || itemName.includes('kwik') ||
      itemName.includes('quiktrip') || itemName.includes('wawa') ||
      itemName.includes('sheetz') || itemName.includes('racetrac') ||
      itemName.includes('speedway') || itemName.includes('sunoco') ||
      itemName.includes('valero') || itemName.includes('citgo') ||
      itemName.includes('mobil') || itemName.includes('texaco') ||
      itemName.includes('murphy usa')
    ) && !isTruckStop;

    if (isEVCharging) return null; // Remove EV POIs
    if (isRegularGasStation) return null; // Remove regular gas stations
    if (isTruckStop) type = "major_chains";
    else if (isCatScale) type = "cat_scale";
    else if (isDOTWeighStation || catIds.includes('700-7600-0322')) type = "weigh_station";
    else if (isTruckService || catIds.includes('700-7900-0132')) type = "service";
    else if (catIds.includes('700-7600-0117')) type = "rest_area";

    const amenities: string[] = [];
    if (isTruckStop) amenities.push("Diesel", "DEF", "Truck Parking", "Food");
    else if (type === "rest_area") amenities.push("Restrooms", "Parking");
    else amenities.push("Diesel");

    return {
      name: item.title || "Truck Stop",
      type,
      lat: position.lat,
      lon: position.lng,
      amenities,
      address: item.address?.label,
      distance: item.distance,
      phone: item.contacts?.phone?.[0]?.value,
      place_id: item.id,
      id: item.id,
      corridorPoi: true, // Flag for corridor-sourced POIs
    };
  }).filter(Boolean).filter((poi: any) => {
    // Remove generic "service" type POIs
    if (poi.type === 'service') return false;
    // Remove fuel stations without diesel that aren't truck stops/plazas
    if (poi.type === 'fuel' && !poi.amenities.includes('Diesel')) return false;
    return true;
  });
}


// Fallback to OpenStreetMap Overpass API
async function fetchTruckPOIsFromOverpass(lat: number, lon: number) {
  try {
    const radius = 50000; // 50km radius
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="fuel"]["hgv"="yes"](around:${radius},${lat},${lon});
        way["amenity"="fuel"]["hgv"="yes"](around:${radius},${lat},${lon});
        node["highway"="weigh_station"](around:${radius},${lat},${lon});
        way["highway"="weigh_station"](around:${radius},${lat},${lon});
        node["highway"="rest_area"](around:${radius},${lat},${lon});
        way["highway"="rest_area"](around:${radius},${lat},${lon});
        node["brand"~"Love's|Pilot|Flying J|Petro|TravelCenters of America|TA Express|Walmart|Blue Beacon|Exxon|Shell|BP|Marathon|Circle K|7-Eleven",i](around:${radius},${lat},${lon});
        way["brand"~"Love's|Pilot|Flying J|Petro|TravelCenters of America|TA Express|Walmart|Blue Beacon|Exxon|Shell|BP|Marathon|Circle K|7-Eleven",i](around:${radius},${lat},${lon});
        node["name"~"Walmart|Truck Wash|Blue Beacon|Low Clearance|Low Bridge|Exxon|Shell|Marathon|Circle K|7-Eleven",i](around:${radius},${lat},${lon});
        way["name"~"Walmart|Truck Wash|Blue Beacon|Low Clearance|Low Bridge|Exxon|Shell|Marathon|Circle K|7-Eleven",i](around:${radius},${lat},${lon});
        node["brand"~"Lowe's|Home Depot",i]["hgv"!="no"]["access"!="no"]["access"!="private"](around:${radius},${lat},${lon});
        way["brand"~"Lowe's|Home Depot",i]["hgv"!="no"]["access"!="no"]["access"!="private"](around:${radius},${lat},${lon});
        node["name"~"Lowes|Lowe's|Home Depot",i]["hgv"!="no"]["access"!="no"]["access"!="private"](around:${radius},${lat},${lon});
        way["name"~"Lowes|Lowe's|Home Depot",i]["hgv"!="no"]["access"!="no"]["access"!="private"](around:${radius},${lat},${lon});
        node["shop"="tyres"]["hgv"="yes"](around:${radius},${lat},${lon});
        way["shop"="tyres"]["hgv"="yes"](around:${radius},${lat},${lon});
      );
      out center;
    `;
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query
    });
    
    if (!response.ok) {
      throw new Error("Overpass API error");
    }
    
    const data = await response.json();
    
    return data.elements.map((el: any) => {
      const elLat = el.lat || el.center?.lat;
      const elLon = el.lon || el.center?.lon;
      const tags = el.tags || {};
      
      const name = tags.name || tags.operator || tags.brand || "Truck Stop";
      const lName = name.toLowerCase();
      const isSpeedco = lName.includes('speedco');
      const isSouthernTire = lName.includes('southern tire');
      const isRushTruck = lName.includes('rush truck');
      const isRyder = lName.includes('ryder');
      const isPenske = lName.includes('penske');
      const isFreightliner = lName.includes('freightliner');
      const isCummins = lName.includes('cummins');
      const isPeterbilt = lName.includes('peterbilt');
      const isVolvo = lName.includes('volvo');
      const isWalmart = lName.includes('walmart') || lName.includes('wal-mart');
      const isLowes = lName.includes("lowe's") || lName.includes('lowes');
      const isHomeDepot = lName.includes('home depot');
      const isTruckWash = lName.includes('truck wash') || lName.includes('blue beacon');
      const isLowClearance = lName.includes('low clearance') || lName.includes('low bridge');
      const isFuelBrand = lName.includes('exxon') || lName.includes('shell') ||
                          lName.includes('marathon') || lName.includes('circle k') ||
                          lName.includes('7-eleven') || lName.includes('seven eleven') ||
                          lName === 'bp' || lName.startsWith('bp ') || lName.includes(' bp ');
      
      let type = "other";
      if (isSpeedco || isSouthernTire || isRushTruck || isRyder || isPenske || 
          isFreightliner || isCummins || isPeterbilt || isVolvo || isTruckWash || tags.shop === "tyres") {
        type = "service";
      } else if (isWalmart || isLowes || isHomeDepot) {
        type = "distribution";
      } else if (isFuelBrand) {
        type = "fuel";
      } else if (isLowClearance) {
        type = "low_clearance";
      } else if (tags.highway === "weigh_station") {
        type = "weigh_station";
      } else if (tags.highway === "rest_area" || tags.highway === "services") {
        type = "rest_area";
      } else if (tags.amenity === "fuel" || tags.brand) {
        type = "major_chains";
      }
      
      const amenities = [];
      
      if (isSpeedco) {
        amenities.push("Truck Repair", "Maintenance", "Oil Change", "Inspection");
      } else if (isSouthernTire) {
        amenities.push("Tires", "Tire Repair", "Tire Sales", "Road Service");
      } else if (isRushTruck) {
        amenities.push("Truck Repair", "Parts", "Service", "Leasing");
      } else if (isRyder) {
        amenities.push("Truck Rental", "Leasing", "Maintenance", "Fleet Services");
      } else if (isPenske) {
        amenities.push("Truck Rental", "Leasing", "Maintenance", "Fleet Services");
      } else if (isFreightliner) {
        amenities.push("Truck Sales", "Parts", "Service", "Warranty");
      } else if (isCummins) {
        amenities.push("Engine Service", "Parts", "Repair", "Diagnostics");
      } else if (isPeterbilt) {
        amenities.push("Truck Sales", "Parts", "Service", "Warranty");
      } else if (isVolvo) {
        amenities.push("Truck Sales", "Parts", "Service", "Warranty");
      } else if (isWalmart) {
        amenities.push("Parking", "Restrooms", "Shopping", "Food");
      } else if (isLowes) {
        amenities.push("Large Lot Parking", "Hardware", "Building Materials", "Contractor Access");
      } else if (isHomeDepot) {
        amenities.push("Large Lot Parking", "Hardware", "Building Materials", "Pro Desk");
      } else if (isFuelBrand) {
        amenities.push("Diesel", "Fuel", "Truck Stop");
      } else if (isTruckWash) {
        amenities.push("Truck Wash", "Detailing", "Fleet Service");
      } else if (isLowClearance) {
        amenities.push("Warning", "Height Restriction");
      }
      
      if (tags.fuel === "yes" || tags["fuel:diesel"] === "yes") amenities.push("Diesel");
      if (tags.toilets === "yes") amenities.push("Restrooms");
      if (tags.shower === "yes") amenities.push("Showers");
      if (tags.food === "yes" || tags.restaurant === "yes" || tags.fast_food === "yes") amenities.push("Food");
      if (tags.shop === "tyres" && !amenities.includes("Tires")) amenities.push("Tires");
      if (amenities.length === 0) amenities.push("Truck Parking");
      
      return {
        name,
        type,
        lat: elLat,
        lon: elLon,
        amenities
      };
    }).filter((poi: any) => {
      if (!poi.lat || !poi.lon) return false;
      // Remove generic "service" type POIs
      if (poi.type === 'service') return false;
      // Remove fuel stations without diesel
      if (poi.type === 'fuel' && !poi.amenities.includes('Diesel')) return false;
      return true;
    });
  } catch (e) {
    console.warn("Overpass API error, returning empty array:", e instanceof Error ? e.message : String(e));
    return [];
  }
}

let audioContext: AudioContext | null = null;
let ttsDisabled = false;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return audioContext;
};

export async function textToSpeech(text: string, voice: 'Kore' | 'Puck' | 'Zephyr' = 'Zephyr') {
  if (ttsDisabled) return false;
  try {
    const ai = getAI();
    if (!ai) return false;
    console.log("Synthesizing speech:", text);
    
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    }));

    let base64Audio: string | undefined;
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data && part.inlineData.mimeType?.includes('audio')) {
          base64Audio = part.inlineData.data;
          break;
        }
      }
    }

    if (!base64Audio) {
      console.warn("No audio data in response parts");
      return false;
    }

    const audioCtx = getAudioContext();
    console.log("Speech Service: AudioContext state:", audioCtx.state);
    if (audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
        console.log("Speech Service: AudioContext resumed successfully");
      } catch (e) {
        console.error("Speech Service: Failed to resume AudioContext", e);
      }
    }
    
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
    } catch (_error) {
      console.warn("Speech Service: Native decoding failed, attempting manual PCM decoding");
      const pcmData = bytes.length % 2 === 0 ? bytes : bytes.slice(0, -1);
      audioBuffer = await decodeAudioData(pcmData, audioCtx, 24000, 1);
    }
    
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    
    return new Promise<boolean>((resolve) => {
      source.onended = () => {
        console.log("Speech Service: Audio playback finished");
        resolve(true);
      };
      source.start(0);
      console.log("Speech Service: Audio playback started");
    });
  } catch (error: any) {
    const errorStr = String(error?.message || error);
    if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('quota')) {
      ttsDisabled = true;
      console.warn("TTS quota exhausted, disabling TTS.");
    } else {
      console.error("TTS Error:", error);
    }
    return false;
  }
}

const searchCache = new Map<string, any>();

export async function fetchAddressSuggestions(query: string, lat: number, lon: number) {
  const cacheKey = `suggest-${query}-${lat.toFixed(2)}-${lon.toFixed(2)}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey);

  console.log(`Fetching suggestions for: ${query}`);

  try {
    console.log(`Calling /api/search for query: ${query}`);
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: safeStringify({ query, lat, lon })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Search API error:", response.status, errorData);
      return [];
    }

    const data = await response.json();
    console.log(`[fetchAddressSuggestions] Search results for ${query}:`, data.items?.length || 0, "items");
    if (data.items) {
      console.log(`[fetchAddressSuggestions] First item:`, safeStringify(data.items[0]));
    }
    
    const items = data.items || [];
    
    const results = items
      .filter((item: any) => {
        const hasPos = item.position || item.access?.[0]?.position;
        if (!hasPos) console.warn(`[fetchAddressSuggestions] Item missing position:`, item.title);
        return hasPos;
      })
      .map((item: any) => ({
        display_name: item.title + (item.address?.label ? `, ${item.address.label}` : ''),
        lat: item.position?.lat || item.access?.[0]?.position?.lat,
        lon: item.position?.lng || item.access?.[0]?.position?.lng,
        place_id: item.id,
        type: item.resultType,
        isTruckFriendly: item.categories?.some((c: any) => 
          c.id.startsWith('700-7600') || // Truck/Transport
          c.id.startsWith('600-6300') || // Industrial
          c.id.startsWith('700-7850')    // Cargo/Freight
        )
      }));
    
    searchCache.set(cacheKey, results);
    return results;
  } catch (e) {
    console.error("Search failed:", e instanceof Error ? e.message : String(e));
    return [];
  }
}

export async function browsePlaces(lat: number, lon: number, categories?: string) {
  try {
    const response = await fetch('/api/browse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: safeStringify({ lat, lon, categories })
    });
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Browse error:", error);
    return [];
  }
}

export async function geocodeAddress(q: string) {
  try {
    const response = await fetch('/api/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: safeStringify({ q })
    });
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Geocode error:", error);
    return [];
  }
}

export async function discoverPlaces(lat: number, lon: number, q?: string) {
  try {
    const response = await fetch('/api/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: safeStringify({ lat, lon, q })
    });
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Discover error:", error);
    return [];
  }
}

export async function lookupPlace(id: string) {
  try {
    const response = await fetch('/api/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: safeStringify({ id })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Lookup error:", error);
    return null;
  }
}

export async function reverseGeocode(lat: number, lon: number) {
  try {
    const response = await fetch('/api/revgeocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: safeStringify({ lat, lon })
    });
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Reverse Geocode error:", error);
    return [];
  }
}

export async function fetchTrafficFlow(bbox: string) {
  try {
    const response = await fetch('/api/traffic-flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: safeStringify({ bbox })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Traffic Flow error:", error);
    return null;
  }
}

export async function fetchTrafficIncidents(bbox: string) {
  try {
    const response = await fetch('/api/traffic-incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: safeStringify({ bbox })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Traffic Incidents error:", error);
    return null;
  }
}

export async function optimizeWaypointSequence(start: string, destination: string[], end?: string) {
  try {
    const response = await fetch('/api/waypoint-sequence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: safeStringify({ start, end, destination })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Waypoint Sequence error:", error);
    return null;
  }
}

export async function searchPlaces(query: string, lat?: number, lon?: number) {
  const cacheKey = `search-${query}-${lat?.toFixed(2)}-${lon?.toFixed(2)}`;
  if (searchCache.has(cacheKey)) {
    console.log(`[searchPlaces] Cache hit for: ${query}`);
    return searchCache.get(cacheKey);
  }

  console.log(`[searchPlaces] Searching for: ${query} near ${lat}, ${lon}`);

  try {
    // If HERE API key is available, we prioritize HERE results for trucking accuracy
    console.log(`[searchPlaces] Attempting HERE API search...`);
    let hereResults = await fetchAddressSuggestions(query, lat || 0, lon || 0);
    
    // Fallback to geocode API if autosuggest returns nothing
    if (hereResults.length === 0) {
      console.log(`[searchPlaces] HERE autosuggest returned no results, trying geocode...`);
      const geocodeResults = await geocodeAddress(query);
      if (geocodeResults.length > 0) {
        hereResults = geocodeResults.map((item: any) => ({
          display_name: item.title || item.address?.label || 'Unknown Location',
          lat: item.position?.lat,
          lon: item.position?.lng,
          place_id: item.id,
          type: item.resultType
        })).filter(item => item.lat && item.lon);
      }
    }

    if (hereResults.length > 0) {
      console.log(`[searchPlaces] HERE API found ${hereResults.length} results.`);
      searchCache.set(cacheKey, hereResults);
      return hereResults;
    }
    console.log(`[searchPlaces] HERE API returned no results.`);

    const ai = getAI();
    if (!ai) {
      console.warn(`[searchPlaces] AI not initialized, falling back to Nominatim.`);
      return fallbackNominatimSearch(query, lat, lon);
    }
    
    console.log(`[searchPlaces] Attempting Gemini API search...`);
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search for: "${query}". 
      ${lat && lon ? `Bias results near coordinates ${lat}, ${lon}. Prioritize the CLOSEST and most RECOMMENDED locations for professional truck drivers (e.g., major truck stops, distribution centers, rest areas, warehouses).` : ''}
      Return a JSON array of up to 10 matching locations.
      Format: [{"display_name": "Full Address", "lat": 0.0, "lon": 0.0, "place_id": "unique_id"}]
      Use the googleSearch tool to find the most accurate, real-time information.`,
      config: {
        systemInstruction: "You are a professional geocoding assistant for a trucking application. Your goal is to provide precise coordinates and full addresses for search queries. You MUST return ONLY a valid JSON array of objects. Do not include any conversational text. Use the googleSearch tool for every request to ensure accuracy and to find the most relevant locations for heavy-duty trucks.",
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              display_name: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lon: { type: Type.NUMBER },
              place_id: { type: Type.STRING }
            },
            required: ["display_name", "lat", "lon", "place_id"]
          }
        }
      }
    }));

    if (!response.text) {
      console.warn("[searchPlaces] Gemini searchPlaces returned no text, falling back to Nominatim");
      return fallbackNominatimSearch(query, lat, lon);
    }
    
    console.log(`[searchPlaces] Gemini API returned text: ${response.text.substring(0, 100)}...`);
    
    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    try {
      const results = JSON.parse(jsonStr);
      console.log(`[searchPlaces] Gemini API successfully parsed ${results.length} results.`);
      searchCache.set(cacheKey, results);
      return results;
    } catch (parseError) {
      console.error("[searchPlaces] Failed to parse Gemini search results, falling back to Nominatim", parseError);
      const fallback = await fallbackNominatimSearch(query, lat, lon);
      searchCache.set(cacheKey, fallback);
      return fallback;
    }
  } catch (e) {
    console.error("[searchPlaces] Search failed, falling back to Nominatim:", e);
    const fallback = await fallbackNominatimSearch(query, lat, lon);
    searchCache.set(cacheKey, fallback);
    return fallback;
  }
}

async function fallbackNominatimSearch(query: string, lat?: number, lon?: number) {
  try {
    const viewbox = lat && lon ? `${lon - 5},${lat + 5},${lon + 5},${lat - 5}` : '';
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=5${lat && lon ? `&lat=${lat}&lon=${lon}&viewbox=${viewbox}` : ''}`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'TruckersNav-Professional-Navigation-App/1.0'
      }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((item: any) => ({
      display_name: item.display_name || 'Unknown Location',
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      place_id: (item.place_id || Math.random()).toString()
    }));
  } catch (e) {
    console.error("Nominatim fallback failed:", e instanceof Error ? e.message : String(e));
    return [];
  }
}

export async function reverseGeocodeGemini(lat: number, lon: number) {
  try {
    const ai = getAI();
    if (!ai) return null;
    
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Identify the road/highway and nearest address at coordinates ${lat}, ${lon}.`,
      config: {
        systemInstruction: "You are a professional reverse geocoding assistant for a trucking application. Identify the road or highway at the given coordinates. You MUST return ONLY a valid JSON object with 'road', 'ref', and 'address' properties. Do not include any conversational text. Use the googleSearch tool for every request to ensure accuracy.",
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            road: { type: Type.STRING },
            ref: { type: Type.STRING },
            address: { type: Type.STRING }
          },
          required: ["road", "ref", "address"]
        }
      }
    }));

    if (!response.text) return fallbackNominatimReverseGeocode(lat, lon);
    
    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Reverse geocoding failed, falling back to Nominatim:", e);
    return fallbackNominatimReverseGeocode(lat, lon);
  }
}

async function fallbackNominatimReverseGeocode(lat: number, lon: number) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'TruckersNav-Professional-Navigation-App/1.0'
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      road: data.address?.road || data.address?.suburb || data.address?.city || 'Unknown Road',
      ref: data.address?.ref || ''
    };
  } catch (e) {
    console.error("Nominatim reverse fallback failed:", e instanceof Error ? e.message : String(e));
    return null;
  }
}
