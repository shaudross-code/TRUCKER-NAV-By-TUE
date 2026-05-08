// Pure utility helpers extracted from NavigationView.tsx
// These functions have no dependencies on component state and are safe to use anywhere.

const R_EARTH = 6371e3; // Earth radius in meters
const toRad = (val: number) => val * Math.PI / 180;

/**
 * Haversine distance between two lat/lng pairs in meters.
 */
export const calcDist = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);
  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R_EARTH * c;
};

/**
 * Fast (non-spherical) Euclidean distance approximation. Useful for relative
 * comparisons over short distances where precision is not required.
 */
export const calcEuclideanDist = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2));
};

/**
 * Convert metric references in instruction text to imperial (miles/feet).
 */
export const convertInstructionToImperial = (instruction: string): string => {
  // Convert "X.X km" to "X.X mi"
  let result = instruction.replace(/(\d+(?:\.\d+)?)\s*km\b/gi, (_match, num) => {
    const miles = parseFloat(num) * 0.621371;
    if (miles < 0.1) return `${Math.round(miles * 5280)} feet`;
    if (miles < 0.5) return `quarter mile`;
    if (miles < 0.8) return `half a mile`;
    if (miles < 1.2) return `1 mile`;
    return `${miles.toFixed(1)} miles`;
  });
  // Convert "X meters" or "X metres" to feet/miles
  result = result.replace(/(\d+(?:\.\d+)?)\s*(?:meters?|metres?)\b/gi, (_match, num) => {
    const meters = parseFloat(num);
    const miles = meters / 1609.34;
    if (miles >= 1) return `${miles.toFixed(1)} miles`;
    if (miles >= 0.4) return `half a mile`;
    if (miles >= 0.2) return `quarter mile`;
    return `${Math.round(meters * 3.28084)} feet`;
  });
  // Convert standalone "X m" (meters) — match "X m" not followed by letters (avoids "mi", "min" etc.)
  result = result.replace(/(\d+)\s*m(?=[,.\s)]|$)/gi, (_match, num) => {
    const meters = parseInt(num);
    const miles = meters / 1609.34;
    if (miles >= 1) return `${miles.toFixed(1)} miles`;
    if (miles >= 0.4) return `half a mile`;
    if (miles >= 0.2) return `quarter mile`;
    return `${Math.round(meters * 3.28084)} feet`;
  });
  return result;
};

/**
 * Synthesizes lane guidance data from HERE API action type + direction.
 * Professional truck GPS units generate lane views from road geometry data.
 * Since the HERE REST API doesn't provide per-lane data, we derive it from:
 *   - action type: enterHighway, exit, keep, continueHighway, turn, fork, roundabout
 *   - direction: left, right, middle
 *   - severity: light, quite, heavy
 */
export const synthesizeLanes = (actionType: string, direction: string | undefined, severity?: string): any[] => {
  if (!actionType || actionType === 'depart' || actionType === 'arrive') return [];

  const dir = (direction || '').toLowerCase();
  const act = actionType.toLowerCase();

  // Helper to build a lane object
  const lane = (dirs: string, active: boolean) => ({
    direction: dirs,
    matches: active ? ['selected'] : []
  });

  // Highway entrance: 3-4 lanes, ramp lane highlighted
  if (act === 'enterhighway') {
    if (dir === 'left') {
      return [lane('slight left', true), lane('straight', false), lane('straight', false)];
    } else if (dir === 'right') {
      return [lane('straight', false), lane('straight', false), lane('slight right', true)];
    } else {
      // middle
      return [lane('straight', false), lane('straight', true), lane('straight', false)];
    }
  }

  // Highway exit: 3-4 lanes, exit lane highlighted
  if (act === 'exit') {
    if (dir === 'right') {
      return [lane('straight', false), lane('straight', false), lane('straight', false), lane('right', true)];
    } else {
      return [lane('left', true), lane('straight', false), lane('straight', false), lane('straight', false)];
    }
  }

  // Keep: highway fork/split, stay in indicated lanes
  if (act === 'keep') {
    if (dir === 'right') {
      return [lane('slight left', false), lane('straight;slight right', true), lane('slight right', true)];
    } else if (dir === 'left') {
      return [lane('slight left', true), lane('straight;slight left', true), lane('slight right', false)];
    } else {
      return [lane('slight left', false), lane('straight', true), lane('slight right', false)];
    }
  }

  // Continue highway: stay in flow lanes
  if (act === 'continuehighway') {
    if (dir === 'left') {
      return [lane('straight', true), lane('straight', true), lane('straight', false)];
    } else if (dir === 'right') {
      return [lane('straight', false), lane('straight', true), lane('straight', true)];
    } else {
      return [lane('straight', true), lane('straight', true), lane('straight', true)];
    }
  }

  // Fork: split lanes
  if (act === 'fork') {
    if (dir === 'right') {
      return [lane('slight left', false), lane('slight right', true), lane('slight right', true)];
    } else {
      return [lane('slight left', true), lane('slight left', true), lane('slight right', false)];
    }
  }

  // Turn at intersection: 2-3 lanes based on severity
  if (act === 'turn') {
    const isLight = severity === 'light' || severity === 'quite';
    if (dir === 'left') {
      return isLight
        ? [lane('left', true), lane('straight', false)]
        : [lane('left', true), lane('straight', false), lane('straight', false)];
    } else if (dir === 'right') {
      return isLight
        ? [lane('straight', false), lane('right', true)]
        : [lane('straight', false), lane('straight', false), lane('right', true)];
    }
  }

  // Roundabout
  if (act === 'roundabout' || act.includes('roundabout')) {
    if (dir === 'left' || dir === 'sharp left') {
      return [lane('left', true), lane('straight', false)];
    } else if (dir === 'right' || dir === 'sharp right') {
      return [lane('straight', false), lane('right', true)];
    } else {
      return [lane('straight', true), lane('straight', false)];
    }
  }

  // Default: no lane guidance for simple straight segments
  return [];
};
