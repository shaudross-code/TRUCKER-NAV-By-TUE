import { useCallback, useRef } from 'react';
import { createGroup, createPolyline, createDomMarker } from '../utils/hereMapUtils';

/**
 * Lane count visualization on the route polyline.
 * Infers lane count from HERE API functionalClass:
 *   FC1 (Major Highway/Interstate) -> 4 lanes
 *   FC2 (Major Road) -> 3 lanes
 *   FC3 (Secondary Road) -> 2 lanes
 *   FC4 (Local Road) -> 2 lanes
 *   FC5 (Minor Road) -> 1 lane
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
  1: 4,
  2: 3,
  3: 2,
  4: 2,
  5: 1,
};

export function useLaneVisualization() {
  const laneGroupRef = useRef<any>(null);

  const clearLanes = useCallback((map: any) => {
    if (laneGroupRef.current) {
      laneGroupRef.current.removeAll();
    }
  }, []);

  const drawLaneVisualization = useCallback((
    map: any,
    coords: [number, number][],
    spans: any[],
    _pane?: string
  ) => {
    if (!map || !coords || coords.length < 2 || !spans || spans.length === 0) return;

    if (!laneGroupRef.current) {
      laneGroupRef.current = createGroup();
      map.addObject(laneGroupRef.current);
    } else {
      laneGroupRef.current.removeAll();
    }

    const segments: LaneSegment[] = [];
    let currentIdx = 0;

    for (const span of spans) {
      const fc = span.functionalClass;
      if (fc !== undefined && fc >= 1 && fc <= 5) {
        const startIdx = span.offset ?? currentIdx;
        const endIdx = startIdx + (span.length || 1);
        const laneCount = FC_TO_LANES[fc] || 2;

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

    const highwaySegments = segments.filter(s => s.functionalClass <= 2 && (s.endIdx - s.startIdx) > 5);

    for (const seg of highwaySegments) {
      const segCoords = coords.slice(seg.startIdx, seg.endIdx + 1);
      if (segCoords.length < 2) continue;

      const laneCount = seg.laneCount;
      const routeWidth = laneCount <= 2 ? 10 : laneCount <= 3 ? 14 : 18;
      const laneWidth = routeWidth / laneCount;

      for (let lane = 1; lane < laneCount; lane++) {
        const offset = (lane - laneCount / 2) * laneWidth;
        const offsetCoords = computeOffsetPolyline(segCoords, offset);
        if (offsetCoords.length < 2) continue;

        const dashLine = createPolyline(offsetCoords, 'rgba(255, 255, 255, 0.5)', 1, { dash: [8, 12] });
        laneGroupRef.current!.addObject(dashLine);
      }

      if (segCoords.length > 10) {
        const midIdx = Math.floor(segCoords.length / 2);
        const midCoord = segCoords[midIdx];
        if (midCoord) {
          const html = `<div style="
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
          ">${laneCount}L</div>`;
          const { marker: badge } = createDomMarker(midCoord[0], midCoord[1], html, [24, 16], [12, 8]);
          laneGroupRef.current!.addObject(badge);
        }
      }
    }
  }, []);

  return { drawLaneVisualization, clearLanes, laneLayerGroupRef: laneGroupRef };
}

function computeOffsetPolyline(coords: [number, number][], offsetPx: number): [number, number][] {
  if (coords.length < 2) return [];
  const degOffset = offsetPx * 0.000015;
  const result: [number, number][] = [];
  
  for (let i = 0; i < coords.length; i++) {
    const prev = i > 0 ? coords[i - 1] : coords[i];
    const next = i < coords.length - 1 ? coords[i + 1] : coords[i];
    const dx = next[1] - prev[1];
    const dy = next[0] - prev[0];
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len === 0) {
      result.push(coords[i]);
      continue;
    }
    
    const nx = -dy / len;
    const ny = dx / len;
    
    result.push([
      coords[i][0] + nx * degOffset,
      coords[i][1] + ny * degOffset
    ]);
  }
  
  return result;
}
