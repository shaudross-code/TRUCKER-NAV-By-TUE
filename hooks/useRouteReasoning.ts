import { useRef, useCallback } from 'react';
import { createGroup, createPolyline, createDomMarker } from '../utils/hereMapUtils';

/**
 * Route Reasoning Overlay — Visual explanation of WHY a route was chosen
 * 
 * Shows:
 * - Toll road segments (gold dashed line + "$" markers)
 * - Truck restriction zones (red striped highlights)
 * - Highway preference segments (bright gold for Interstate, white for US Route)
 * - Avoided segments with explanation badges
 */

interface RouteSpan {
  offset: number;
  length?: number;
  tollSystems?: { name: string }[];
  functionalClass?: number;
  names?: { value: string; language?: string }[];
  routeNumbers?: { value: string; direction?: string }[];
  speedLimit?: number;
  truckRestrictions?: { type: string; value?: any }[];
  typicalDuration?: number;
  currentSpeed?: number;
}

interface RouteSection {
  polyline: string;
  spans?: RouteSpan[];
  transport?: { mode: string };
  type?: string;
  tolls?: { countryCode: string; tollSystem: string; tollCollectionLocations?: any[] }[];
  notices?: { code: string; title?: string; severity?: string }[];
}

interface ReasoningSegment {
  type: 'toll' | 'restriction' | 'highway' | 'avoided';
  coords: [number, number][];
  label: string;
  detail?: string;
}

export function useRouteReasoning(
  mapInstanceRef: { current: any },
) {
  const reasoningGroupRef = useRef<any>(null);
  const enabledRef = useRef(false);

  const clearReasoning = useCallback(() => {
    if (reasoningGroupRef.current) {
      reasoningGroupRef.current.removeAll();
    }
  }, []);

  const renderReasoning = useCallback((segments: ReasoningSegment[]) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!reasoningGroupRef.current) {
      reasoningGroupRef.current = createGroup();
      map.addObject(reasoningGroupRef.current);
    }
    reasoningGroupRef.current.removeAll();

    if (!enabledRef.current) return;

    for (const seg of segments) {
      if (seg.coords.length < 2) continue;

      let color: string, width: number, opacity: number, dash: number[] | undefined;
      switch (seg.type) {
        case 'toll':
          color = '#D4AF37'; width = 6; opacity = 0.7; dash = [12, 8]; break;
        case 'restriction':
          color = '#dc2626'; width = 5; opacity = 0.6; dash = [6, 4]; break;
        case 'highway':
          color = '#D4AF37'; width = 4; opacity = 0.5; dash = undefined; break;
        case 'avoided':
          color = '#f59e0b'; width = 4; opacity = 0.5; dash = [4, 8]; break;
        default:
          color = '#fff'; width = 3; opacity = 0.4; dash = undefined;
      }

      const polyline = createPolyline(seg.coords, color, width, { opacity, dash });
      reasoningGroupRef.current!.addObject(polyline);

      if (seg.type === 'toll' && seg.coords.length >= 2) {
        const midIdx = Math.floor(seg.coords.length / 2);
        const mid = seg.coords[midIdx];
        const html = `<div style="background:#D4AF37;color:#000;font-size:10px;font-weight:900;padding:2px 6px;border-radius:10px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5)">$ TOLL</div>`;
        const badge = createDomMarker(mid[0], mid[1], html, [50, 20], [25, 10], 500);
        reasoningGroupRef.current!.addObject(badge);
      }

      if (seg.type === 'restriction' && seg.coords.length >= 2) {
        const midIdx = Math.floor(seg.coords.length / 2);
        const mid = seg.coords[midIdx];
        const html = `<div style="background:#dc2626;color:#fff;font-size:9px;font-weight:900;padding:2px 5px;border-radius:10px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5)">RESTRICTED</div>`;
        const badge = createDomMarker(mid[0], mid[1], html, [70, 18], [35, 9], 500);
        reasoningGroupRef.current!.addObject(badge);
      }
    }
  }, [mapInstanceRef]);

  const parseRouteReasoning = useCallback((
    sections: RouteSection[],
    decodedCoords: [number, number][],
  ): ReasoningSegment[] => {
    const segments: ReasoningSegment[] = [];

    for (const section of sections) {
      if (section.tolls && section.tolls.length > 0) {
        const tollNames = section.tolls.map(t => t.tollSystem).filter(Boolean).join(', ');
        segments.push({
          type: 'toll',
          coords: decodedCoords,
          label: tollNames || 'Toll Road',
          detail: `${section.tolls.length} toll collection point${section.tolls.length > 1 ? 's' : ''}`,
        });
      }

      if (section.notices) {
        for (const notice of section.notices) {
          if (notice.severity === 'critical' || notice.code?.includes('restriction')) {
            segments.push({
              type: 'restriction',
              coords: decodedCoords.slice(0, Math.min(20, decodedCoords.length)),
              label: notice.title || notice.code || 'Restriction',
              detail: `Severity: ${notice.severity || 'unknown'}`,
            });
          }
        }
      }

      if (section.spans) {
        let tollStart = -1;
        let hwStart = -1;
        let currentHwName = '';

        for (let i = 0; i < section.spans.length; i++) {
          const span = section.spans[i];
          const idx = span.offset;

          if (span.tollSystems && span.tollSystems.length > 0) {
            if (tollStart === -1) tollStart = idx;
          } else if (tollStart !== -1) {
            const end = idx;
            if (end - tollStart > 3 && end <= decodedCoords.length) {
              segments.push({
                type: 'toll',
                coords: decodedCoords.slice(tollStart, end),
                label: 'Toll Segment',
              });
            }
            tollStart = -1;
          }

          const fc = span.functionalClass;
          const routeNums = span.routeNumbers?.map(r => r.value).join('/') || '';
          if (fc && fc <= 2 && routeNums) {
            if (hwStart === -1 || routeNums !== currentHwName) {
              if (hwStart !== -1 && idx - hwStart > 5 && idx <= decodedCoords.length) {
                segments.push({
                  type: 'highway',
                  coords: decodedCoords.slice(hwStart, idx),
                  label: currentHwName,
                  detail: `Functional Class ${fc === 1 ? 'Motorway' : 'Trunk'}`,
                });
              }
              hwStart = idx;
              currentHwName = routeNums;
            }
          }

          if (span.truckRestrictions && span.truckRestrictions.length > 0) {
            const nextIdx = section.spans[i + 1]?.offset ?? decodedCoords.length;
            if (nextIdx - idx > 1 && nextIdx <= decodedCoords.length) {
              const types = span.truckRestrictions.map(r => r.type).join(', ');
              segments.push({
                type: 'restriction',
                coords: decodedCoords.slice(idx, nextIdx),
                label: types || 'Truck Restriction',
              });
            }
          }
        }

        if (hwStart !== -1 && decodedCoords.length - hwStart > 5) {
          segments.push({
            type: 'highway',
            coords: decodedCoords.slice(hwStart),
            label: currentHwName,
            detail: 'Preferred highway corridor',
          });
        }
      }
    }

    return segments;
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    if (!enabled) clearReasoning();
  }, [clearReasoning]);

  return {
    reasoningLayerRef: reasoningGroupRef,
    renderReasoning,
    parseRouteReasoning,
    clearReasoning,
    setEnabled,
    enabledRef,
  };
}
