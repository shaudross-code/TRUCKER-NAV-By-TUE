import { useCallback, useRef } from 'react';
import { speak } from '../services/speechService';

interface GradeWarning {
  startIdx: number;
  endIdx: number;
  grade: number; // percentage
  lat: number;
  lon: number;
  type: 'steep_downhill' | 'steep_uphill';
}

interface TruckIntelAlert {
  type: string;
  message: string;
  lat: number;
  lon: number;
  distanceMi: number;
}

/**
 * Analyze route elevation data to detect steep grades and generate proactive warnings.
 * Uses 3D polyline data (lat, lng, elevation) from HERE API.
 */
export function useTruckIntelligence() {
  const announcedGradesRef = useRef<Set<string>>(new Set());
  const lastGradeCheckRef = useRef<number>(0);

  /**
   * Analyze route for steep grades from elevation data in coords.
   * coords: [lat, lng, elevation?][]
   */
  const analyzeRouteGrades = useCallback((coords: [number, number, number?][]): GradeWarning[] => {
    const warnings: GradeWarning[] = [];
    if (!coords || coords.length < 10) return warnings;

    // Sample every 10 points (~500m segments)
    const sampleInterval = 10;
    
    for (let i = sampleInterval; i < coords.length; i += sampleInterval) {
      const prev = coords[i - sampleInterval];
      const curr = coords[i];
      
      if (prev[2] === undefined || curr[2] === undefined) continue;
      
      const elevChange = curr[2] - prev[2]; // meters
      
      // Calculate horizontal distance using Haversine approximation
      const dLat = (curr[0] - prev[0]) * Math.PI / 180;
      const dLon = (curr[1] - prev[1]) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
                Math.cos(prev[0] * Math.PI / 180) * Math.cos(curr[0] * Math.PI / 180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const horizDist = 2 * 6371000 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // meters
      
      if (horizDist < 50) continue; // Skip very short segments
      
      const gradePercent = (elevChange / horizDist) * 100;
      
      // Steep grade thresholds for trucks
      if (gradePercent < -5) {
        warnings.push({
          startIdx: i - sampleInterval,
          endIdx: i,
          grade: gradePercent,
          lat: curr[0],
          lon: curr[1],
          type: 'steep_downhill'
        });
      } else if (gradePercent > 6) {
        warnings.push({
          startIdx: i - sampleInterval,
          endIdx: i,
          grade: gradePercent,
          lat: curr[0],
          lon: curr[1],
          type: 'steep_uphill'
        });
      }
    }
    
    // Merge consecutive warnings of same type
    const merged: GradeWarning[] = [];
    for (const w of warnings) {
      const last = merged[merged.length - 1];
      if (last && last.type === w.type && w.startIdx - last.endIdx <= sampleInterval * 2) {
        last.endIdx = w.endIdx;
        last.grade = Math.min(last.grade, w.grade); // Keep the steepest
      } else {
        merged.push({ ...w });
      }
    }
    
    return merged;
  }, []);

  /**
   * Check proximity to grade warnings and announce when approaching.
   */
  const checkGradeProximity = useCallback((
    userLat: number,
    userLon: number,
    gradeWarnings: GradeWarning[],
    routeCoords: [number, number][]
  ): TruckIntelAlert[] => {
    const alerts: TruckIntelAlert[] = [];
    const now = Date.now();
    
    // Throttle checks to every 10 seconds
    if (now - lastGradeCheckRef.current < 10000) return alerts;
    lastGradeCheckRef.current = now;

    for (const warning of gradeWarnings) {
      const wLat = warning.lat;
      const wLon = warning.lon;
      
      // Calculate distance to warning point
      const dLat = (wLat - userLat) * Math.PI / 180;
      const dLon = (wLon - userLon) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(userLat * Math.PI / 180) * Math.cos(wLat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const distMeters = 2 * 6371000 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distMi = distMeters / 1609.34;
      
      const key = `${warning.type}_${warning.startIdx}`;
      
      if (distMi <= 2 && distMi > 0.1 && !announcedGradesRef.current.has(key)) {
        const gradeAbs = Math.abs(warning.grade).toFixed(0);
        
        if (warning.type === 'steep_downhill') {
          alerts.push({
            type: 'steep_downhill',
            message: `Steep ${gradeAbs}% downgrade ahead. Reduce speed, use lower gear.`,
            lat: wLat,
            lon: wLon,
            distanceMi: distMi,
          });
          speak(`Attention. Steep ${gradeAbs} percent downgrade ahead in ${distMi.toFixed(1)} miles. Reduce speed and use lower gear.`);
        } else {
          alerts.push({
            type: 'steep_uphill',
            message: `Steep ${gradeAbs}% upgrade ahead. Maintain momentum.`,
            lat: wLat,
            lon: wLon,
            distanceMi: distMi,
          });
          speak(`Steep ${gradeAbs} percent upgrade ahead in ${distMi.toFixed(1)} miles. Maintain momentum.`);
        }
        
        announcedGradesRef.current.add(key);
      }
    }
    
    return alerts;
  }, []);

  const clearGradeData = useCallback(() => {
    announcedGradesRef.current.clear();
    lastGradeCheckRef.current = 0;
  }, []);

  return { analyzeRouteGrades, checkGradeProximity, clearGradeData };
}
