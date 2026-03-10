import { GoogleGenAI, Modality, Type } from "@google/genai";

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
    const errorStr = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    const isBusy = 
      error?.status === 503 || 
      error?.code === 503 || 
      errorStr.includes('503') || 
      errorStr.includes('high demand') ||
      errorStr.includes('UNAVAILABLE');

    if (retries > 0 && isBusy) {
      console.warn(`Gemini API busy (503), retrying in ${delay}ms... (${retries} retries left)`);
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
        systemInstruction: "You are the TRUCKERS NAV Voice Assistant. Your goal is to help truck drivers manage their routes, fuel, and parking safety. Respond succinctly as if through a radio. Always use miles for distances.",
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
                  view: { type: Type.STRING, description: "The view to switch to (DASHBOARD, NAVIGATION, TRUCK_STOPS, LOAD_BOARD, MAINTENANCE, SETTINGS)" }
                },
                required: ["view"]
              }
            }
          ]
        }]
      }
    }));

    return response;
  } catch (error) {
    console.error("Voice command processing failed:", error);
    return { text: "I'm having trouble processing that right now." };
  }
}

export async function fetchTruckStops(lat: number, lon: number) {
  try {
    const ai = getAI();
    if (!ai) return [];
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find 4 real truck stops or travel centers near coordinates ${lat}, ${lon}. 
      For each, provide: name, location (address or exit), distance from these coordinates in miles, current estimated availability (as a percentage), and a list of 3-4 amenities.
      Also provide specific entrance and exit coordinates (entranceLat, entranceLon, exitLat, exitLon) if they can be accurately estimated.
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
    
    // Sometimes the model returns markdown code blocks, strip them
    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    return JSON.parse(jsonStr).map((stop: any) => ({
      ...stop,
      entrance: stop.entranceLat ? { lat: stop.entranceLat, lon: stop.entranceLon } : undefined,
      exit: stop.exitLat ? { lat: stop.exitLat, lon: stop.exitLon } : undefined
    }));
  } catch (e) {
    console.warn("Using fallback data for truck stops due to API error.", e);
    // Fallback data
    return [
      {
        name: "Love's Travel Stop",
        location: "Exit 42",
        distance: 2.5,
        availability: 85,
        amenities: ["Showers", "Diesel", "Subway", "CAT Scale"]
      },
      {
        name: "Pilot Travel Center",
        location: "Exit 45",
        distance: 5.1,
        availability: 40,
        amenities: ["Showers", "Diesel", "Wendy's", "Parking"]
      },
      {
        name: "TA Travel Center",
        location: "Exit 50",
        distance: 10.2,
        availability: 90,
        amenities: ["Showers", "Diesel", "Country Pride", "Service Center"]
      }
    ];
  }
}

export async function fetchMajorChains(lat: number, lon: number) {
  try {
    const ai = getAI();
    if (!ai) throw new Error("AI not initialized");
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find 100 real locations of major truck stop chains within a 1500-mile radius of coordinates ${lat}, ${lon}. 
      This is for a professional worldwide trucking application. Focus on high reliability and accurate coordinates.
      Focus EXCLUSIVELY on these brands: 
      - Love's Travel Stops
      - Pilot Travel Centers
      - Flying J Travel Centers
      - Petro Stopping Centers
      - TA (TravelCenters of America)
      - Road Ranger
      - KwikTrip / KwikStar
      - Buc-ee's
      - Speedway
      - Casey's
      - Wawa
      - Sheetz
      - QuikTrip
      - RaceTrac
      
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
    console.warn("Using fallback data for major chains due to API error.", err);
    // Fallback data
    return [
      { name: "Love's Travel Stop", type: "major_chains", lat: lat + 0.001, lon: lon + 0.001, amenities: ["Showers", "Diesel", "Subway"] },
      { name: "Pilot Travel Center", type: "major_chains", lat: lat - 0.001, lon: lon - 0.001, amenities: ["Showers", "Diesel", "Wendy's"] },
      { name: "TA Travel Center", type: "major_chains", lat: lat + 0.002, lon: lon - 0.002, amenities: ["Showers", "Diesel", "Country Pride"] },
      { name: "Flying J Travel Center", type: "major_chains", lat: lat - 0.002, lon: lon + 0.002, amenities: ["Showers", "Diesel", "Denny's"] },
      { name: "Petro Stopping Center", type: "major_chains", lat: lat + 0.003, lon: lon + 0.003, amenities: ["Showers", "Diesel", "Iron Skillet"] }
    ];
  }
}

export async function fetchTruckPOIs(lat: number, lon: number) {
  try {
    const ai = getAI();
    if (!ai) throw new Error("AI not initialized");
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find 150 real truck-related points of interest within a 1000-mile radius of coordinates ${lat}, ${lon}. 
      This is for a professional worldwide trucking application. Ensure high reliability and accurate coordinates.
      CRITICAL: You MUST perform a thorough search for these specific brands and include as many as possible: 
      - Love's Travel Stops
      - Pilot Travel Centers
      - Flying J Travel Centers
      - Petro Stopping Centers
      - TA (TravelCenters of America)
      - Road Ranger
      - KwikTrip / KwikStar
      - TA Express
      
      Also include weigh stations, rest areas, truck washes (like Blue Beacon), and major truck service centers.
      For each facility, provide the main coordinates (lat, lon) AND specific entrance and exit coordinates (entranceLat, entranceLon, exitLat, exitLon) if they are known or can be accurately estimated (e.g., slightly offset from the main location towards the nearest road).
      Return a JSON array of objects with: name, type, lat, lon, entranceLat, entranceLon, exitLat, exitLon, and amenities (a list of 3-4 key features or services).`,
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
              entranceLat: { type: Type.NUMBER },
              entranceLon: { type: Type.NUMBER },
              exitLat: { type: Type.NUMBER },
              exitLon: { type: Type.NUMBER },
              amenities: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["name", "type", "lat", "lon", "amenities"]
          }
        }
      }
    }));

    if (!response.text) throw new Error("Empty response from AI");
    
    // Sometimes the model returns markdown code blocks, strip them
    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    return JSON.parse(jsonStr).map((poi: any) => ({
      ...poi,
      lat: Number(poi.lat),
      lon: Number(poi.lon),
      entrance: poi.entranceLat ? { lat: Number(poi.entranceLat), lon: Number(poi.entranceLon) } : undefined,
      exit: poi.exitLat ? { lat: Number(poi.exitLat), lon: Number(poi.exitLon) } : undefined
    }));
  } catch (e) {
    console.warn("Using fallback data for POIs due to API error.", e);
    // Fallback data
    return [
      { name: "Love's Travel Stop", type: "major_chains", lat: lat + 0.005, lon: lon + 0.005, amenities: ["Showers", "Diesel", "Subway"] },
      { name: "Pilot Travel Center", type: "major_chains", lat: lat - 0.005, lon: lon - 0.005, amenities: ["Showers", "Diesel", "Wendy's"] },
      { name: "Rest Area", type: "rest_area", lat: lat + 0.008, lon: lon - 0.002, amenities: ["Restrooms", "Vending Machines", "Parking"] },
      { name: "Weigh Station", type: "weigh_station", lat: lat - 0.003, lon: lon + 0.007, amenities: ["Scales", "Inspection"] },
      { name: "Blue Beacon Truck Wash", type: "service", lat: lat + 0.01, lon: lon + 0.002, amenities: ["Truck Wash", "Trailer Washout"] }
    ];
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

    console.log("Gemini TTS Response received");
    
    let base64Audio: string | undefined;
    
    // Iterate through candidates and parts to find audio data
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data && part.inlineData.mimeType?.includes('audio')) {
          base64Audio = part.inlineData.data;
          break;
        }
      }
    }

    if (base64Audio) {
      console.log("Received audio data, length:", base64Audio.length);
      try {
        const audioCtx = getAudioContext();
        try {
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
        } catch (resumeErr) {
          console.error("Failed to resume AudioContext:", resumeErr);
        }
        
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        let audioBuffer: AudioBuffer;
        
        try {
          // Try native decoding first (works for WAV, MP3, etc.)
          audioBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
          console.log("Native decoding successful");
        } catch (nativeErr) {
          console.warn("Native decoding failed, attempting manual PCM decoding:", nativeErr);
          // Fallback to manual PCM decoding (16-bit, 24kHz, mono)
          const pcmData = bytes.length % 2 === 0 ? bytes : bytes.slice(0, -1);
          audioBuffer = await decodeAudioData(
            pcmData,
            audioCtx,
            24000,
            1,
          );
        }
        
        const source = audioCtx.createBufferSource();
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 1.0;
        
        source.buffer = audioBuffer;
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        console.log("Starting audio playback...");
        return new Promise<boolean>((resolve) => {
          source.onended = () => {
            console.log("Audio playback ended.");
            resolve(true);
          };
          try {
            source.start(0);
          } catch (e) {
            console.error("Failed to start audio source:", e);
            resolve(false);
          }
        });
      } catch (audioErr) {
        console.error("Audio Playback Error:", audioErr);
        return false;
      }
    } else {
      console.warn("No audio data in response parts");
    }
  } catch (error: any) {
    const errorStr = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    if (
      error?.code === 429 || 
      error?.status === 'RESOURCE_EXHAUSTED' || 
      errorStr.includes('429') || 
      errorStr.includes('RESOURCE_EXHAUSTED') ||
      errorStr.includes('quota')
    ) {
      ttsDisabled = true;
      console.warn("TTS quota exhausted, disabling TTS.");
    } else {
      console.error("TTS Error:", error);
    }
    return false;
  }
  return false;
}

const searchCache = new Map<string, any>();

export async function fetchAddressSuggestions(query: string, lat: number, lon: number, apiKey: string) {
  const cacheKey = `suggest-${query}-${lat.toFixed(2)}-${lon.toFixed(2)}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey);

  try {
    // We use both autosuggest and discover for the best results
    const [autosuggestRes, discoverRes] = await Promise.all([
      fetch(`https://autosuggest.search.hereapi.com/v1/autosuggest?q=${encodeURIComponent(query)}&at=${lat},${lon}&apiKey=${apiKey}&limit=5`),
      fetch(`https://discover.search.hereapi.com/v1/discover?q=${encodeURIComponent(query)}&at=${lat},${lon}&apiKey=${apiKey}&limit=5`)
    ]);

    const autosuggestData = autosuggestRes.ok ? await autosuggestRes.json() : { items: [] };
    const discoverData = discoverRes.ok ? await discoverRes.json() : { items: [] };
    
    const allItems = [...(autosuggestData.items || []), ...(discoverData.items || [])];
    
    const results = allItems
      .filter((item: any) => item.position || item.access?.[0]?.position)
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
    console.error("HERE Search failed:", e);
    return [];
  }
}

export async function searchPlaces(query: string, lat?: number, lon?: number, apiKey?: string) {
  const cacheKey = `search-${query}-${lat?.toFixed(2)}-${lon?.toFixed(2)}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey);

  try {
    // If HERE API key is available, we prioritize HERE results for trucking accuracy
    if (apiKey) {
      const hereResults = await fetchAddressSuggestions(query, lat || 0, lon || 0, apiKey);
      if (hereResults.length > 0) {
        searchCache.set(cacheKey, hereResults);
        return hereResults;
      }
    }

    const ai = getAI();
    if (!ai) return [];
    
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search for: "${query}". 
      ${lat && lon ? `Bias results near coordinates ${lat}, ${lon}. Prioritize the CLOSEST and most RECOMMENDED locations for professional truck drivers (e.g., major truck stops, distribution centers, rest areas).` : ''}
      Return a JSON array of up to 8 matching locations.
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
      console.warn("Gemini searchPlaces returned no text, falling back to Nominatim");
      return fallbackNominatimSearch(query, lat, lon);
    }
    
    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    try {
      const results = JSON.parse(jsonStr);
      searchCache.set(cacheKey, results);
      return results;
    } catch (parseErr) {
      console.error("Failed to parse Gemini search results:", parseErr, jsonStr);
      const fallback = await fallbackNominatimSearch(query, lat, lon);
      searchCache.set(cacheKey, fallback);
      return fallback;
    }
  } catch (e) {
    console.error("Google Search grounding failed, falling back to Nominatim:", e);
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
    console.error("Nominatim fallback failed:", e);
    return [];
  }
}

export async function reverseGeocode(lat: number, lon: number) {
  try {
    const ai = getAI();
    if (!ai) return null;
    
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Identify the road/highway at coordinates ${lat}, ${lon}.`,
      config: {
        systemInstruction: "You are a professional reverse geocoding assistant for a trucking application. Identify the road or highway at the given coordinates. You MUST return ONLY a valid JSON object with 'road' and 'ref' properties. Do not include any conversational text. Use the googleSearch tool for every request to ensure accuracy.",
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            road: { type: Type.STRING },
            ref: { type: Type.STRING }
          },
          required: ["road", "ref"]
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
    console.error("Nominatim reverse fallback failed:", e);
    return null;
  }
}
