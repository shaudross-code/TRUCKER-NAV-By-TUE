export const safeStringify = (obj: any, replacer?: any, space?: string | number) => {
  const cache = new Set();
  try {
    return JSON.stringify(obj, (key, value) => {
      // Skip React internal properties and DOM elements
      if (key && (key.startsWith('__react') || key.startsWith('_react'))) {
        return '[React Internal]';
      }
      
      if (typeof value === 'object' && value !== null) {
        // Check if it's a DOM element
        if (value instanceof Element || value instanceof Node) {
          return '[DOM Element]';
        }
        
        // Check for circular reference
        if (cache.has(value)) {
          return '[Circular]';
        }
        cache.add(value);
      }
      if (typeof value === 'bigint') {
        return value.toString() + 'n';
      }
      if (replacer) {
        return replacer(key, value);
      }
      return value;
    }, space);
  } catch (e) {
    console.error("safeStringify failed:", e instanceof Error ? e.message : String(e));
    return null;
  }
};

export const isValidLatLng = (coords: any): coords is [number, number] => {
  if (!Array.isArray(coords) || coords.length < 2) return false;
  return typeof coords[0] === 'number' && typeof coords[1] === 'number' && !isNaN(coords[0]) && !isNaN(coords[1]);
};

export const calcDistMi = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R_mi = 3958.8; // miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R_mi * c;
};
