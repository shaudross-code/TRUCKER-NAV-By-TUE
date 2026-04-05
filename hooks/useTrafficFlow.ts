import { useRef, useCallback } from 'react';
import L from 'leaflet';

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
  if (jam <= 3) return '#22c55e';   // green — freeflow
  if (jam <= 6) return '#D4AF37';   // gold — moderate
  return '#dc2626';                  // red — heavy
}

function jamWeight(jam: number): number {
  if (jam <= 3) return 5;
  if (jam <= 6) return 7;
  return 9;
}

export function useTrafficFlow(
  mapInstanceRef: { current: any },
) {
  const flowLayerRef = useRef<L.LayerGroup | null>(null);
  const fetchingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enabledRef = useRef(false);

  const clearFlow = useCallback(() => {
    if (flowLayerRef.current) {
      flowLayerRef.current.clearLayers();
    }
  }, []);

  const fetchAndRender = useCallback(async () => {
    const map = mapInstanceRef.current;
    if (!map || fetchingRef.current || !enabledRef.current) return;

    fetchingRef.current = true;
    try {
      const bounds = map.getBounds();
      const bbox = [
        bounds.getWest().toFixed(5),
        bounds.getSouth().toFixed(5),
        bounds.getEast().toFixed(5),
        bounds.getNorth().toFixed(5),
      ];

      // Only fetch at zoom >= 10 (highway level)
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

      if (!flowLayerRef.current) {
        flowLayerRef.current = L.layerGroup().addTo(map);
      }
      flowLayerRef.current.clearLayers();

      for (const result of results) {
        const links = result.location?.shape?.links || [];
        const parentFlow = result.currentFlow;

        for (const link of links) {
          if (!link.points || link.points.length < 2) continue;

          const flow = link.currentFlow || parentFlow;
          if (!flow) continue;

          const jam = flow.jamFactor ?? 0;
          const latlngs: L.LatLngExpression[] = link.points.map(p => [p.lat, p.lng]);

          const polyline = L.polyline(latlngs, {
            color: jamColor(jam),
            weight: jamWeight(jam),
            opacity: 0.8,
            smoothFactor: 2,
            interactive: false,
          });

          flowLayerRef.current!.addLayer(polyline);
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

    // Auto-refresh every 60s
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(fetchAndRender, 60000);

    // Re-fetch when map moves
    const map = mapInstanceRef.current;
    if (map) {
      map.on('moveend', fetchAndRender);
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
    if (map) {
      map.off('moveend', fetchAndRender);
    }
  }, [clearFlow, fetchAndRender, mapInstanceRef]);

  return {
    flowLayerRef,
    startTrafficFlow,
    stopTrafficFlow,
    refreshFlow: fetchAndRender,
    clearFlow,
  };
}
