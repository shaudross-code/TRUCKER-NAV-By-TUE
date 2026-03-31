import { useCallback, useRef } from 'react';
import * as L from 'leaflet';

/**
 * Lane count visualization on the route polyline.
 * Infers lane count from HERE API functionalClass:
 *   FC1 (Major Highway/Interstate) → 4 lanes
 *   FC2 (Major Road) → 3 lanes
 *   FC3 (Secondary Road) → 2 lanes
 *   FC4 (Local Road) → 2 lanes
 *   FC5 (Minor Road) → 1 lane
 * 
 * Renders white dashed lane markings on top of the route polyline.
 */

interface LaneSegment {
  startIdx: number;
  endIdx: number;
  laneCount: number;
  functionalClass: number;
}

const FC_TO_LANES: Record<number, number> = {
  1: 4, // Interstate/Major Highway
  2: 3, // Major Road
  3: 2, // Secondary Road
  4: 2, // Local Road
  5: 1, // Minor Road
};

export function useLaneVisualization() {
  const laneLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const clearLanes = useCallback((map: L.Map) => {
    if (laneLayerGroupRef.current) {
      laneLayerGroupRef.current.clearLayers();
    }
  }, []);

  const drawLaneVisualization = useCallback((
    map: L.Map,
    coords: [number, number][],
    spans: any[],
    pane?: string
  ) => {
    if (!map || !coords || coords.length < 2 || !spans || spans.length === 0) return;

    // Create or clear lane layer group
    if (!laneLayerGroupRef.current) {
      laneLayerGroupRef.current = L.layerGroup().addTo(map);
    } else {
      laneLayerGroupRef.current.clearLayers();
    }

    // Build lane segments from spans
    const segments: LaneSegment[] = [];
    let currentIdx = 0;

    for (const span of spans) {
      const fc = span.functionalClass;
      if (fc !== undefined && fc >= 1 && fc <= 5) {
        const startIdx = span.offset ?? currentIdx;
        const endIdx = startIdx + (span.length || 1);
        const laneCount = FC_TO_LANES[fc] || 2;

        // Merge with previous segment if same lane count
        const last = segments[segments.length - 1];
        if (last && last.laneCount === laneCount && last.endIdx >= startIdx - 1) {
          last.endIdx = Math.min(endIdx, coords.length - 1);
        } else {
          segments.push({
            startIdx: Math.min(startIdx, coords.length - 1),
            endIdx: Math.min(endIdx, coords.length - 1),
            laneCount,
            functionalClass: fc,
          });
        }
      }
      currentIdx += (span.length || 0);
    }

    // Only render lanes on highways (FC1 and FC2) to avoid visual clutter
    const highwaySegments = segments.filter(s => s.functionalClass <= 2 && (s.endIdx - s.startIdx) > 5);

    for (const seg of highwaySegments) {
      const segCoords = coords.slice(seg.startIdx, seg.endIdx + 1);
      if (segCoords.length < 2) continue;

      const latLngs = segCoords.map(c => L.latLng(c[0], c[1]));
      const laneCount = seg.laneCount;

      // Draw lane divider lines offset from center
      // For N lanes, draw N-1 divider lines
      const routeWidth = laneCount <= 2 ? 10 : laneCount <= 3 ? 14 : 18;
      const laneWidth = routeWidth / laneCount;

      for (let lane = 1; lane < laneCount; lane++) {
        const offset = (lane - laneCount / 2) * laneWidth;
        
        // Create offset polyline using perpendicular offset approximation
        const offsetCoords = computeOffsetPolyline(segCoords, offset);
        if (offsetCoords.length < 2) continue;

        const dashLine = L.polyline(
          offsetCoords.map(c => [c[0], c[1]] as L.LatLngExpression),
          {
            color: 'rgba(255, 255, 255, 0.5)',
            weight: 1,
            dashArray: '8, 12',
            interactive: false,
            pane: pane || 'overlayPane',
          }
        );
        laneLayerGroupRef.current!.addLayer(dashLine);
      }

      // Draw lane count indicator at the start of significant segments
      if (segCoords.length > 10) {
        const midIdx = Math.floor(segCoords.length / 2);
        const midCoord = segCoords[midIdx];
        if (midCoord) {
          const icon = L.divIcon({
            className: 'lane-count-indicator counter-rotate',
            html: `<div style="
              background: rgba(0,0,0,0.7);
              backdrop-filter: blur(4px);
              border: 1px solid rgba(255,255,255,0.2);
              border-radius: 4px;
              padding: 1px 4px;
              font-size: 9px;
              color: rgba(255,255,255,0.7);
              font-weight: 600;
              white-space: nowrap;
              font-family: monospace;
            ">${laneCount}L</div>`,
            iconSize: [24, 16],
            iconAnchor: [12, 8],
          });
          L.marker([midCoord[0], midCoord[1]], { 
            icon, 
            interactive: false,
            pane: pane || 'overlayPane',
          }).addTo(laneLayerGroupRef.current!);
        }
      }
    }
  }, []);

  return { drawLaneVisualization, clearLanes, laneLayerGroupRef };
}

/**
 * Compute a polyline offset by a pixel distance using perpendicular normals.
 * This is an approximation that works well at high zoom levels.
 */
function computeOffsetPolyline(coords: [number, number][], offsetPx: number): [number, number][] {
  if (coords.length < 2) return [];
  
  // Convert pixel offset to approximate lat/lng offset at typical zoom
  // At zoom 14-15, 1 pixel ≈ 0.00001-0.00003 degrees
  const degOffset = offsetPx * 0.000015;
  
  const result: [number, number][] = [];
  
  for (let i = 0; i < coords.length; i++) {
    const prev = i > 0 ? coords[i - 1] : coords[i];
    const next = i < coords.length - 1 ? coords[i + 1] : coords[i];
    
    // Direction vector
    const dx = next[1] - prev[1];
    const dy = next[0] - prev[0];
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len === 0) {
      result.push(coords[i]);
      continue;
    }
    
    // Perpendicular normal (rotated 90 degrees)
    const nx = -dy / len;
    const ny = dx / len;
    
    result.push([
      coords[i][0] + nx * degOffset,
      coords[i][1] + ny * degOffset
    ]);
  }
  
  return result;
}
