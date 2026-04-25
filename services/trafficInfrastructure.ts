import { safeStringify } from '../utils';

export interface TrafficLight {
  id: string;
  position: [number, number];
  type: 'traffic_light';
  name: string;
  intersection?: string;
}

export interface TrafficSign {
  id: string;
  position: [number, number];
  type: 'traffic_sign';
  signType: string; // 'stop', 'yield', 'speed_limit', 'warning', etc.
  value?: string; // For speed limits, etc.
  name: string;
}

export interface RoadSignage {
  id: string;
  position: [number, number];
  type: 'road_signage';
  signageType: string; // 'exit', 'direction', 'information', etc.
  text: string;
  name: string;
}

export type TrafficInfrastructure = TrafficLight | TrafficSign | RoadSignage;

/**
 * Fetch traffic lights, signs, and road signage near a location
 */
export async function fetchTrafficInfrastructure(
  lat: number,
  lon: number,
  radius: number = 2000
): Promise<TrafficInfrastructure[]> {
  const results: TrafficInfrastructure[] = [];

  try {
    // Smaller radius, no way queries — only actual sign/signal nodes
    const overpassQuery = `
      [out:json][timeout:15];
      (
        node["highway"="traffic_signals"](around:${radius},${lat},${lon});
        node["highway"="stop"](around:${radius},${lat},${lon});
        node["highway"="give_way"](around:${radius},${lat},${lon});
        node["traffic_sign"~"."](around:${radius},${lat},${lon});
      );
      out body qt;
    `;

    const response = await fetch('/api/overpass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: overpassQuery })
    });
    
    if (!response.ok) {
      console.warn('Overpass API request failed:', response.statusText);
      return results;
    }

    const data = await response.json();
    
    if (data.elements) {
      for (const element of data.elements) {
        if (element.type !== 'node' || !element.lat || !element.lon) continue;
        
        const tags = element.tags || {};
        
        // Traffic Lights
        if (tags.highway === 'traffic_signals') {
          results.push({
            id: `light-${element.id}`,
            position: [element.lat, element.lon],
            type: 'traffic_light',
            name: tags.name || 'Traffic Light',
            intersection: tags.name || undefined
          });
        }
        
        // Stop Signs
        if (tags.highway === 'stop' || tags.traffic_sign === 'stop' || tags['traffic_sign:forward'] === 'stop') {
          results.push({
            id: `sign-${element.id}`,
            position: [element.lat, element.lon],
            type: 'traffic_sign',
            signType: 'stop',
            name: 'Stop Sign'
          });
        }
        
        // Yield/Give Way Signs
        if (tags.highway === 'give_way' || tags.traffic_sign === 'give_way') {
          results.push({
            id: `sign-${element.id}`,
            position: [element.lat, element.lon],
            type: 'traffic_sign',
            signType: 'yield',
            name: 'Yield Sign'
          });
        }
        
        // Speed Limit Signs
        if (tags.maxspeed || tags['maxspeed:forward'] || tags['traffic_sign:forward']?.includes('maxspeed')) {
          const speedLimit = tags.maxspeed || tags['maxspeed:forward'] || '';
          results.push({
            id: `sign-${element.id}`,
            position: [element.lat, element.lon],
            type: 'traffic_sign',
            signType: 'speed_limit',
            value: speedLimit,
            name: `Speed Limit ${speedLimit}`
          });
        }
        
        // Warning Signs
        if (tags.warning || tags.traffic_sign?.includes('warning')) {
          results.push({
            id: `sign-${element.id}`,
            position: [element.lat, element.lon],
            type: 'traffic_sign',
            signType: 'warning',
            name: tags.name || 'Warning Sign'
          });
        }
      }
    }
    
    console.log(`Found ${results.length} traffic infrastructure items`);
  } catch (error) {
    console.error('Error fetching traffic infrastructure:', error);
  }

  return results;
}

/**
 * Play audio alert for traffic infrastructure
 */
export function playTrafficAlert(infrastructure: TrafficInfrastructure, distance: number) {
  try {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

    let message = '';
    
    switch (infrastructure.type) {
      case 'traffic_light':
        if (distance < 300) {
          message = `Traffic light ahead in ${Math.round(distance)} meters`;
        }
        break;
      
      case 'traffic_sign':
        if (distance < 200) {
          if (infrastructure.signType === 'stop') {
            message = `Stop sign ahead in ${Math.round(distance)} meters`;
          } else if (infrastructure.signType === 'yield') {
            message = `Yield sign ahead in ${Math.round(distance)} meters`;
          } else if (infrastructure.signType === 'speed_limit' && infrastructure.value) {
            message = `Speed limit ${infrastructure.value} ahead`;
          } else if (infrastructure.signType === 'warning') {
            message = `Warning sign ahead in ${Math.round(distance)} meters`;
          }
        }
        break;
      
      case 'road_signage':
        if (distance < 500) {
          message = `${infrastructure.text}`;
        }
        break;
    }

    if (message) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  } catch (error) {
    console.error('Error playing traffic alert:', error);
  }
}
