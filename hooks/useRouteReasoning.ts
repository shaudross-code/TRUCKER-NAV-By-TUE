import { useRef, useCallback } from 'react';
import L from 'leaflet';

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
  // Toll info
  tollSystems?: { name: string }[];
  // Road attributes
  functionalClass?: number; // 1=motorway, 2=trunk, 3=primary, 4=secondary, 5=local
  names?: { value: string; language?: string }[];
  routeNumbers?: { value: string; direction?: string }[];
  speedLimit?: number;
  // Truck restrictions
  truckRestrictions?: { type: string; value?: any }[];
  // Dynamic
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
  coords: L.LatLngExpression[];
  label: string;
  detail?: string;
}

export function useRouteReasoning(
  mapInstanceRef: { current: any },
) {
  const reasoningLayerRef = useRef<L.LayerGroup | null>(null);
  const enabledRef = useRef(false);

  const clearReasoning = useCallback(() => {
    if (reasoningLayerRef.current) {
      reasoningLayerRef.current.clearLayers();
    }
  }, []);

  // Render reasoning segments on the map
  const renderReasoning = useCallback((segments: ReasoningSegment[]) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!reasoningLayerRef.current) {
      reasoningLayerRef.current = L.layerGroup().addTo(map);
    }
    reasoningLayerRef.current.clearLayers();

    if (!enabledRef.current) return;

    for (const seg of segments) {
      if (seg.coords.length < 2) continue;

      let style: L.PolylineOptions;
      switch (seg.type) {
        case 'toll':
          style = { color: '#D4AF37', weight: 6, opacity: 0.7, dashArray: '12, 8' };
          break;
        case 'restriction':
          style = { color: '#dc2626', weight: 5, opacity: 0.6, dashArray: '6, 4' };
          break;
        case 'highway':
          style = { color: '#D4AF37', weight: 4, opacity: 0.5 };
          break;
        case 'avoided':
          style = { color: '#f59e0b', weight: 4, opacity: 0.5, dashArray: '4, 8' };
          break;
        default:
          style = { color: '#fff', weight: 3, opacity: 0.4 };
      }

      const polyline = L.polyline(seg.coords, {
        ...style,
        interactive: true,
        pane: 'routePane',
      });

      // Tooltip on hover showing reason
      polyline.bindTooltip(
        `<div style="background:#111;color:#fff;padding:4px 8px;border-radius:6px;border:1px solid #D4AF37;font-size:11px;font-weight:700;max-width:200px">
          <div style="color:#D4AF37;text-transform:uppercase;font-size:9px;letter-spacing:1px;margin-bottom:2px">${seg.type === 'toll' ? 'TOLL ROAD' : seg.type === 'restriction' ? 'TRUCK RESTRICTION' : seg.type === 'highway' ? 'PREFERRED HIGHWAY' : 'AVOIDED SEGMENT'}</div>
          <div>${seg.label}</div>
          ${seg.detail ? `<div style="color:#999;font-size:10px;margin-top:2px">${seg.detail}</div>` : ''}
        </div>`,
        { sticky: true, direction: 'top', offset: [0, -10], className: 'route-reasoning-tooltip' }
      );

      reasoningLayerRef.current!.addLayer(polyline);

      // Place badges at midpoint of each segment
      if (seg.type === 'toll' && seg.coords.length >= 2) {
        const midIdx = Math.floor(seg.coords.length / 2);
        const mid = seg.coords[midIdx] as [number, number];
        const badge = L.marker(mid, {
          icon: L.divIcon({
            html: `<div style="background:#D4AF37;color:#000;font-size:10px;font-weight:900;padding:2px 6px;border-radius:10px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5)">$ TOLL</div>`,
            className: 'route-toll-badge',
            iconSize: [50, 20],
            iconAnchor: [25, 10],
          }),
          interactive: false,
          pane: 'signPane',
        });
        reasoningLayerRef.current!.addLayer(badge);
      }

      if (seg.type === 'restriction' && seg.coords.length >= 2) {
        const midIdx = Math.floor(seg.coords.length / 2);
        const mid = seg.coords[midIdx] as [number, number];
        const badge = L.marker(mid, {
          icon: L.divIcon({
            html: `<div style="background:#dc2626;color:#fff;font-size:9px;font-weight:900;padding:2px 5px;border-radius:10px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5)">RESTRICTED</div>`,
            className: 'route-restriction-badge',
            iconSize: [70, 18],
            iconAnchor: [35, 9],
          }),
          interactive: false,
          pane: 'signPane',
        });
        reasoningLayerRef.current!.addLayer(badge);
      }
    }
  }, [mapInstanceRef]);

  // Parse route sections from HERE API response to extract reasoning segments
  const parseRouteReasoning = useCallback((
    sections: RouteSection[],
    decodedCoords: [number, number][],
  ): ReasoningSegment[] => {
    const segments: ReasoningSegment[] = [];

    for (const section of sections) {
      // Toll detection
      if (section.tolls && section.tolls.length > 0) {
        const tollNames = section.tolls.map(t => t.tollSystem).filter(Boolean).join(', ');
        segments.push({
          type: 'toll',
          coords: decodedCoords,
          label: tollNames || 'Toll Road',
          detail: `${section.tolls.length} toll collection point${section.tolls.length > 1 ? 's' : ''}`,
        });
      }

      // Restriction notices
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

      // Span-based analysis
      if (section.spans) {
        let tollStart = -1;
        let hwStart = -1;
        let currentHwName = '';

        for (let i = 0; i < section.spans.length; i++) {
          const span = section.spans[i];
          const idx = span.offset;

          // Toll spans
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

          // Highway classification
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

          // Truck restrictions
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

        // Close any open highway segment
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
    reasoningLayerRef,
    renderReasoning,
    parseRouteReasoning,
    clearReasoning,
    setEnabled,
    enabledRef,
  };
}
