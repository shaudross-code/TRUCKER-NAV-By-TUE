import React, { useEffect, useRef, useState, useContext, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { TelemetryContext } from '../types';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';
const MAPTILER_KEY = process.env.MAPTILER_API_KEY || '';

if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN;

interface Navigation3DViewProps {
  userLocation: [number, number] | null;
  route?: { coordinates: [number, number][] };
  heading?: number;
  nextTurnDistance?: number;
  nextTurnDirection?: string;
  speedLimit?: number;
  currentSpeed?: number;
  trafficSigns?: any[];
  eta?: string;
  milesRemaining?: number;
  timeRemaining?: number;
  streetName?: string;
}

// ─── Truck SVG for Map Marker ─────────────────────────────────────────────────
const TRUCK_SVG = `<svg width="48" height="64" viewBox="0 0 48 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow"><feGaussianBlur stdDeviation="2" result="c"/><feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="truckGold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F5D76E"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#AA8B2F"/>
    </linearGradient>
  </defs>
  <g filter="url(#glow)">
    <!-- Truck body shadow -->
    <ellipse cx="24" cy="58" rx="12" ry="3" fill="rgba(0,0,0,0.5)"/>
    <!-- Trailer -->
    <rect x="10" y="20" width="28" height="34" rx="2" fill="url(#truckGold)" stroke="#AA8B2F" stroke-width="1"/>
    <!-- Cab -->
    <rect x="12" y="8" width="24" height="16" rx="3" fill="url(#truckGold)" stroke="#AA8B2F" stroke-width="1"/>
    <!-- Windshield -->
    <rect x="14" y="10" width="20" height="8" rx="2" fill="#1a1a1a" opacity="0.7"/>
    <!-- Cab top lights -->
    <rect x="16" y="7" width="3" height="2" rx="1" fill="#F5D76E" opacity="0.9"/>
    <rect x="22" y="7" width="4" height="2" rx="1" fill="#F5D76E" opacity="0.9"/>
    <rect x="29" y="7" width="3" height="2" rx="1" fill="#F5D76E" opacity="0.9"/>
    <!-- Wheels left -->
    <rect x="8" y="46" width="5" height="8" rx="2" fill="#222"/>
    <rect x="8" y="28" width="5" height="8" rx="2" fill="#222"/>
    <!-- Wheels right -->
    <rect x="35" y="46" width="5" height="8" rx="2" fill="#222"/>
    <rect x="35" y="28" width="5" height="8" rx="2" fill="#222"/>
    <!-- Center stripe -->
    <line x1="24" y1="24" x2="24" y2="50" stroke="#AA8B2F" stroke-width="0.5" opacity="0.4"/>
  </g>
</svg>`;

// ─── Turn Arrow SVGs ──────────────────────────────────────────────────────────
function getTurnArrowSVG(direction: string): string {
  const d = direction.toLowerCase();
  if (d.includes('right') || d.includes('exit')) {
    return `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 52 L20 24 Q20 12 32 12 L44 12" stroke="#D4AF37" stroke-width="6" stroke-linecap="round" fill="none"/>
      <path d="M36 4 L48 12 L36 20" stroke="#D4AF37" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`;
  }
  if (d.includes('left')) {
    return `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M44 52 L44 24 Q44 12 32 12 L20 12" stroke="#D4AF37" stroke-width="6" stroke-linecap="round" fill="none"/>
      <path d="M28 4 L16 12 L28 20" stroke="#D4AF37" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`;
  }
  if (d.includes('u-turn') || d.includes('uturn')) {
    return `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M40 52 L40 24 Q40 8 24 8 Q8 8 8 24 L8 32" stroke="#D4AF37" stroke-width="6" stroke-linecap="round" fill="none"/>
      <path d="M0 24 L8 32 L16 24" stroke="#D4AF37" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`;
  }
  // Straight / continue
  return `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 56 L32 12" stroke="#D4AF37" stroke-width="6" stroke-linecap="round"/>
    <path d="M22 22 L32 8 L42 22" stroke="#D4AF37" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`;
}

// ─── Format distance ──────────────────────────────────────────────────────────
function formatDist(miles: number | undefined): string {
  if (miles === undefined || miles <= 0) return '';
  if (miles < 0.1) return `${Math.round(miles * 5280)} ft`;
  return `${miles.toFixed(1)} mi`;
}

function formatTime(mins: number | undefined): string {
  if (!mins || mins <= 0) return '--';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const Navigation3DView: React.FC<Navigation3DViewProps> = ({
  userLocation,
  route,
  heading = 0,
  nextTurnDistance,
  nextTurnDirection,
  speedLimit,
  currentSpeed,
  trafficSigns = [],
  eta,
  milesRemaining,
  timeRemaining,
  streetName,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const truckMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const telemetry = useContext(TelemetryContext);
  const userLocationRef = useRef(userLocation);
  const animFrameRef = useRef<number>(0);

  // Initialize 3D map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const lngLat = userLocation
      ? [userLocation[1], userLocation[0]] as [number, number]
      : [-83.0458, 42.3314] as [number, number];

    // Use Mapbox navigation-night style for realistic road rendering
    // Falls back to MapTiler dark style if Mapbox styles are blocked
    const style = MAPBOX_TOKEN
      ? 'mapbox://styles/mapbox/navigation-night-v1'
      : MAPTILER_KEY
        ? `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`
        : 'mapbox://styles/mapbox/dark-v11';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style,
      center: lngLat,
      zoom: 17.5,
      pitch: 70,
      bearing: heading,
      antialias: true,
      fadeDuration: 0,
      dragRotate: true,
      touchZoomRotate: true,
      touchPitch: true,
    });

    // Handle style load error — fallback to MapTiler
    map.current.on('error', (e: any) => {
      if (e?.error?.status === 403 || e?.error?.message?.includes('style')) {
        console.warn('Mapbox style blocked, falling back to MapTiler');
        if (MAPTILER_KEY && map.current) {
          map.current.setStyle(
            `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`
          );
        }
      }
    });

    map.current.on('load', () => {
      setMapLoaded(true);

      // Add 3D buildings
      try {
        const layers = map.current!.getStyle().layers;
        const labelLayerId = layers?.find(
          (l) => l.type === 'symbol' && l.layout && (l.layout as any)['text-field']
        )?.id;

        map.current!.addLayer({
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': '#111111',
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 14.5, ['get', 'height']],
            'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 14, 0, 14.5, ['get', 'min_height']],
            'fill-extrusion-opacity': 0.7,
          },
        }, labelLayerId);
      } catch {
        // Buildings source not available
      }

      // Add sky/atmosphere
      try {
        map.current!.setFog({
          color: '#0a0a0a',
          'high-color': '#111827',
          'horizon-blend': 0.04,
          'space-color': '#000000',
          'star-intensity': 0.2,
        } as any);
      } catch {
        // Fog not supported
      }
    });

    // Create truck marker
    const truckEl = document.createElement('div');
    truckEl.innerHTML = TRUCK_SVG;
    truckEl.style.cssText = 'width:48px;height:64px;cursor:pointer;transition:transform 0.3s ease;';

    truckMarker.current = new mapboxgl.Marker({
      element: truckEl,
      anchor: 'center',
      rotationAlignment: 'map',
      pitchAlignment: 'map',
    })
      .setLngLat(lngLat)
      .addTo(map.current);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      truckMarker.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Keep ref in sync
  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  // Update camera + truck position when location/heading changes
  useEffect(() => {
    if (!map.current || !userLocation) return;
    const speed = telemetry?.speedRef.current || currentSpeed || 0;
    const zoom = speed > 55 ? 16.2 : speed > 25 ? 17 : 17.5;
    const h = telemetry?.headingRef.current ?? heading;

    map.current.easeTo({
      center: [userLocation[1], userLocation[0]],
      bearing: h,
      pitch: 70,
      zoom,
      duration: 800,
    });

    truckMarker.current?.setLngLat([userLocation[1], userLocation[0]]);
  }, [userLocation, heading]);

  // Subscribe to telemetry for smooth heading updates
  useEffect(() => {
    if (!telemetry) return;
    const unsub = telemetry.subscribe(() => {
      if (!map.current || !userLocationRef.current) return;
      const h = telemetry.headingRef.current || 0;
      const speed = telemetry.speedRef.current || 0;
      const zoom = speed > 55 ? 16.2 : speed > 25 ? 17 : 17.5;
      map.current.easeTo({ bearing: h, zoom, pitch: 70, duration: 400 });
    });
    return unsub;
  }, [telemetry]);

  // Add glowing route line
  useEffect(() => {
    if (!map.current || !mapLoaded || !route?.coordinates?.length) return;

    // Remove old route layers
    ['route-glow', 'route-line', 'route-arrows'].forEach(id => {
      if (map.current!.getLayer(id)) map.current!.removeLayer(id);
    });
    if (map.current.getSource('route')) map.current.removeSource('route');

    map.current.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: route.coordinates },
      },
    });

    // Outer glow layer
    map.current.addLayer({
      id: 'route-glow',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#1e90ff',
        'line-width': 18,
        'line-opacity': 0.25,
        'line-blur': 8,
      },
    });

    // Main bright route line
    map.current.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#4da6ff',
        'line-width': 8,
        'line-opacity': 0.9,
      },
    });

    // Inner bright center
    map.current.addLayer({
      id: 'route-arrows',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#a0d4ff',
        'line-width': 3,
        'line-opacity': 0.7,
      },
    });
  }, [route, mapLoaded]);

  // Determine if a turn is approaching
  const isUpcomingTurn = nextTurnDirection && nextTurnDistance !== undefined && nextTurnDistance > 0;
  const speed = currentSpeed ?? telemetry?.speedRef.current ?? 0;

  // Closest traffic sign
  const closestSign = trafficSigns.length > 0 ? trafficSigns[0] : null;
  const isStopSign = closestSign?.type === 'stop_sign' || closestSign?.type === 'stop';

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* 3D Map */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* ─── Top Turn Instruction Banner ─── */}
      {isUpcomingTurn && (
        <div data-testid="3d-turn-banner" className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
          <div className="mx-3 mt-3 md:mx-6 md:mt-4" style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.95) 0%, rgba(170,139,47,0.95) 100%)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(212,175,55,0.3)',
          }}>
            <div className="flex items-center gap-4 p-4 md:p-5">
              {/* Turn Arrow */}
              <div className="w-14 h-14 md:w-16 md:h-16 flex-shrink-0 bg-black/30 rounded-xl flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: getTurnArrowSVG(nextTurnDirection || 'straight') }}
              />
              {/* Distance + Instruction */}
              <div className="flex-1 min-w-0">
                <div className="text-3xl md:text-4xl font-black text-black tracking-tight">
                  {formatDist(nextTurnDistance)}
                </div>
                <div className="text-sm md:text-base font-bold text-black/70 truncate">
                  {nextTurnDirection}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Traffic Sign Alert (Stop Sign etc.) ─── */}
      {isStopSign && (
        <div data-testid="3d-stop-sign" className="absolute top-1/3 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in zoom-in-75 duration-500">
          <div className="flex flex-col items-center">
            {/* Stop Sign */}
            <div className="relative">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <polygon points="60,5 100,20 115,60 100,100 60,115 20,100 5,60 20,20"
                  fill="#CC0000" stroke="white" strokeWidth="6"/>
                <text x="60" y="68" textAnchor="middle" fill="white" fontWeight="900" fontSize="28" fontFamily="Arial,sans-serif">STOP</text>
              </svg>
              {/* Pole */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-2 h-8 bg-zinc-400 rounded-b" />
            </div>
            {/* Distance Badge */}
            <div className="mt-8 px-5 py-2 rounded-full font-black text-sm text-black"
              style={{ background: 'linear-gradient(135deg, #F5D76E, #D4AF37)' }}>
              Stop Sign Ahead — {closestSign?.distance || '?'}m
            </div>
          </div>
        </div>
      )}

      {/* ─── Speed Limit Sign (Right Side) ─── */}
      {speedLimit && (
        <div data-testid="3d-speed-limit" className="absolute top-28 left-4 md:left-6 z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-1">
            <div className="bg-white rounded-lg border-[3px] border-black w-14 h-[4.5rem] flex flex-col items-center justify-center shadow-xl">
              <span className="text-[7px] font-black text-black leading-none tracking-tight">SPEED</span>
              <span className="text-[7px] font-black text-black leading-none tracking-tight">LIMIT</span>
              <span className="text-2xl font-black text-black leading-none mt-0.5">{speedLimit}</span>
            </div>
            <span className="text-[8px] font-bold text-zinc-500">mph</span>
          </div>
        </div>
      )}

      {/* ─── Current Speed Display (Left Side) ─── */}
      <div data-testid="3d-current-speed" className="absolute bottom-24 left-4 md:left-6 z-10 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-md rounded-2xl border border-[#D4AF37]/30 px-4 py-3 shadow-xl flex flex-col items-center"
          style={{ boxShadow: '0 0 20px rgba(212,175,55,0.15)' }}>
          <span className={`text-4xl font-black tabular-nums ${
            speedLimit && speed > speedLimit ? 'text-red-400' : 'text-[#D4AF37]'
          }`}>
            {Math.round(speed)}
          </span>
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">mph</span>
        </div>
      </div>

      {/* ─── Bottom Navigation Bar ─── */}
      <div data-testid="3d-nav-bar" className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
        <div className="mx-2 mb-2 md:mx-4 md:mb-3 rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(10,10,10,0.92) 0%, rgba(0,0,0,0.96) 100%)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(212,175,55,0.2)',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
          }}>
          <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
            {/* Speed */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#D4AF37]/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                  <path d="M12 6v6l4 2" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="text-lg font-black text-white tabular-nums">{Math.round(speed)}<span className="text-[9px] text-zinc-500 ml-1">mph</span></div>
              </div>
            </div>

            {/* Distance Remaining */}
            <div className="text-center">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Distance</div>
              <div className="text-lg font-black text-white tabular-nums">
                {milesRemaining !== undefined && milesRemaining > 0 ? `${milesRemaining.toFixed(1)}` : '--'}
                <span className="text-[9px] text-zinc-500 ml-1">mi</span>
              </div>
            </div>

            {/* Time Remaining */}
            <div className="text-center">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Time</div>
              <div className="text-lg font-black text-white tabular-nums">
                {formatTime(timeRemaining)}
              </div>
            </div>

            {/* ETA */}
            <div className="text-right">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">ETA</div>
              <div className="text-lg font-black text-[#D4AF37] tabular-nums">
                {eta || '--:--'}
              </div>
            </div>
          </div>

          {/* Street Name */}
          {streetName && (
            <div className="px-4 pb-2 md:px-6 md:pb-3 -mt-1">
              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] truncate">
                {streetName}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── 3D Label ─── */}
      <div className="absolute bottom-2 right-2 z-10 pointer-events-auto">
        <div className="bg-black/60 backdrop-blur-sm text-[#D4AF37] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-[#D4AF37]/20">
          3D
        </div>
      </div>
    </div>
  );
};
