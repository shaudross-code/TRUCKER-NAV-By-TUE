import { GoogleGenAI, Modality } from "@google/genai";

const decode = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
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

export async function processVoiceCommand(text: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `The user said: "${text}". 
    You are an AI co-pilot for a professional truck driver using the TRUCKERS NAV System By TUE.
    Based on their request, suggest a relevant action or piece of information.
    Keep it concise and safety-focused.`,
    config: {
      systemInstruction: "You are the TRUCKERS NAV Voice Assistant. Your goal is to help truck drivers manage their routes, fuel, and parking safety. Respond succinctly as if through a radio.",
    }
  });

  return response.text;
}

export async function fetchTruckStops(lat: number, lon: number) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Find 4 real truck stops or travel centers near coordinates ${lat}, ${lon}. 
    For each, provide: name, location (address or exit), distance from these coordinates, current estimated availability (as a percentage), and a list of 3-4 amenities.
    Return the data in a clean JSON array format.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            location: { type: "STRING" },
            distance: { type: "STRING" },
            status: { type: "STRING", description: "One of: LIKELY OPEN, FULL SOON, FILLING UP" },
            available: { type: "NUMBER" },
            total: { type: "NUMBER" },
            amenities: { type: "ARRAY", items: { type: "STRING" } }
          },
          required: ["name", "location", "distance", "status", "available", "total", "amenities"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse truck stops", e);
    return [];
  }
}

export async function fetchTruckPOIs(lat: number, lon: number) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Find 10 real truck-related points of interest (truck stops, weigh stations, rest areas, service centers) near coordinates ${lat}, ${lon}. 
    Return a JSON array of objects with: name, type, lat, lon.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            type: { type: "STRING" },
            lat: { type: "NUMBER" },
            lon: { type: "NUMBER" }
          },
          required: ["name", "type", "lat", "lon"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse POIs", e);
    return [];
  }
}

export async function textToSpeech(text: string, voice: 'Kore' | 'Puck' | 'Zephyr' = 'Kore') {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
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
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        audioCtx,
        24000,
        1,
      );
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start();
      return true;
    }
  } catch (error) {
    console.error("TTS Error:", error);
    return false;
  }
  return false;
}