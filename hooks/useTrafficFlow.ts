import { useRef, useCallback } from 'react';
import { createGroup, createPolyline } from '../utils/hereMapUtils';

/**
 * Real-time Traffic Flow Overlay — HERE Traffic API v7
 * Renders color-coded polylines on the map based on jam factor:
 *   Green  = freeflow (jamFactor 0–3)
 *   Gold   = moderate  (jamFactor 3–6)
 *   Red    = heavy     (jamFactor 6–10)
 */

interface FlowLink {
  points: { lat: number; lng: number }[];
  currentFlow?: {
    speed?: number;
    speedUncapped?: number;
    freeFlow?: number;
    jamFactor?: number;
    confidence?: number;
    traversability?: string;
  };
}

interface FlowResult {
  location?: {
    shape?: { links?: FlowLink[] };
    description?: string;
  };
  currentFlow?: {
    speed?: number;
    freeFlow?: number;
    jamFactor?: number;
  };
}

function jamColor(jam: number): string {
  if (jam <= 3) return '#22c55e';
  if (jam <= 6) return '#D4AF37';
  return '#dc2626';
}

function jamWeight(jam: number): number {
  if (jam <= 3) return 5;
  if (jam <= 6) return 7;
  return 9;
}

export function useTrafficFlow(
  mapInstanceRef: { current: any },
) {
  const flowGroupRef = useRef<any>(null);
  const fetchingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enabledRef = useRef(false);
  const moveListenerRef = useRef<any>(null);

  const clearFlow = useCallback(() => {
    if (flowGroupRef.current) {
      flowGroupRef.current.removeAll();
    }
  }, []);

  const fetchAndRender = useCallback(async () => {
    const map = mapInstanceRef.current;
    if (!map || fetchingRef.current || !enabledRef.current) return;

    fetchingRef.current = true;
    try {
      const viewBounds = map.getViewModel().getLookAtData().bounds;
      if (!viewBounds) { fetchingRef.current = false; return; }
      const bbox = [
        viewBounds.getLeft().toFixed(5),
        viewBounds.getBottom().toFixed(5),
        viewBounds.getRight().toFixed(5),
        viewBounds.getTop().toFixed(5),
      ];

      if (map.getZoom() < 10) {
        clearFlow();
        fetchingRef.current = false;
        return;
      }

      const baseUrl = (import.meta as any).env?.VITE_API_URL || '';
      const resp = await fetch(`${baseUrl}/api/traffic-flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bbox }),
      });

      if (!resp.ok) {
        fetchingRef.current = false;
        return;
      }

      const data = await resp.json();
      const results: FlowResult[] = data.results || [];

      if (!flowGroupRef.current) {
        flowGroupRef.current = createGroup();
        map.addObject(flowGroupRef.current);
      }
      flowGroupRef.current.removeAll();

      for (const result of results) {
        const links = result.location?.shape?.links || [];
        const parentFlow = result.currentFlow;

        for (const link of links) {
          if (!link.points || link.points.length < 2) continue;

          const flow = link.currentFlow || parentFlow;
          if (!flow) continue;

          const jam = flow.jamFactor ?? 0;
          const coords: [number, number][] = link.points.map(p => [p.lat, p.lng]);

          const polyline = createPolyline(coords, jamColor(jam), jamWeight(jam), { opacity: 0.8 });
          flowGroupRef.current!.addObject(polyline);
        }
      }
    } catch (err) {
      console.warn('Traffic flow fetch error:', err);
    }
    fetchingRef.current = false;
  }, [mapInstanceRef, clearFlow]);

  const startTrafficFlow = useCallback(() => {
    enabledRef.current = true;
    fetchAndRender();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(fetchAndRender, 60000);

    const map = mapInstanceRef.current;
    if (map) {
      moveListenerRef.current = fetchAndRender;
      map.addEventListener('mapviewchangeend', moveListenerRef.current);
    }
  }, [fetchAndRender, mapInstanceRef]);

  const stopTrafficFlow = useCallback(() => {
    enabledRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    clearFlow();

    const map = mapInstanceRef.current;
    if (map && moveListenerRef.current) {
      map.removeEventListener('mapviewchangeend', moveListenerRef.current);
      moveListenerRef.current = null;
    }
  }, [clearFlow, mapInstanceRef]);

  return {
    flowLayerRef: flowGroupRef,
    startTrafficFlow,
    stopTrafficFlow,
    refreshFlow: fetchAndRender,
    clearFlow,
  };
}
