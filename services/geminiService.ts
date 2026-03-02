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

export async function processVoiceCommand(text: string) {
  try {
    const ai = getAI();
    if (!ai) return { text: 'API key not configured' };
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
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
    });

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
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: `Find 4 real truck stops or travel centers near coordinates ${lat}, ${lon}. 
      For each, provide: name, location (address or exit), distance from these coordinates in miles, current estimated availability (as a percentage), and a list of 3-4 amenities.
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
              amenities: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["name", "location", "distance", "availability", "amenities"]
          }
        }
      }
    });

    if (!response.text) return [];
    
    // Sometimes the model returns markdown code blocks, strip them
    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to fetch/parse truck stops", e);
    return [];
  }
}

export async function fetchMajorChains(lat: number, lon: number) {
  try {
    const ai = getAI();
    if (!ai) return [];
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
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
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (err) {
    console.error("Failed to fetch major chains:", err);
    return [];
  }
}

export async function fetchTruckPOIs(lat: number, lon: number) {
  try {
    const ai = getAI();
    if (!ai) return [];
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
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
      Return a JSON array of objects with: name, type, lat, lon, and amenities (a list of 3-4 key features or services).`,
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
            required: ["name", "type", "lat", "lon", "amenities"]
          }
        }
      }
    });

    if (!response.text) return [];
    
    // Sometimes the model returns markdown code blocks, strip them
    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to fetch/parse POIs", e);
    return [];
  }
}

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return audioContext;
};

export async function textToSpeech(text: string, voice: 'Kore' | 'Puck' | 'Zephyr' = 'Zephyr') {
  try {
    const ai = getAI();
    if (!ai) return false;
    console.log("Synthesizing speech:", text);
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
  } catch (error) {
    console.error("TTS Error:", error);
    return false;
  }
  return false;
}