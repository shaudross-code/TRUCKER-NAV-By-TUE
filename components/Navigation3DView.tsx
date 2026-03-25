import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';
const MAPTILER_KEY = process.env.MAPTILER_API_KEY || '';

// Set Mapbox access token
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN;

interface Navigation3DViewProps {
  userLocation: [number, number] | null;
  route?: any;
  heading?: number;
  nextTurnDistance?: number;
  nextTurnDirection?: string;
  speedLimit?: number;
  currentSpeed?: number;
  trafficSigns?: any[];
}

export const Navigation3DView: React.FC<Navigation3DViewProps> = ({
  userLocation,
  route,
  heading = 0,
  nextTurnDistance,
  nextTurnDirection,
  speedLimit,
  currentSpeed,
  trafficSigns = []
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize 3D map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // userLocation is [lat, lon] from Leaflet — Mapbox needs [lon, lat]
    const lngLat = userLocation ? [userLocation[1], userLocation[0]] as [number, number] : null;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPTILER_KEY
        ? `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`
        : 'mapbox://styles/mapbox/dark-v11',
      center: lngLat || [-83.0458, 42.3314],
      zoom: 17,
      pitch: 60,
      bearing: heading,
      antialias: true
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      
      // Add 3D buildings if composite source is available (Mapbox styles only)
      try {
        const layers = map.current!.getStyle().layers;
        const labelLayerId = layers?.find(
          (layer) => layer.type === 'symbol' && layer.layout && (layer.layout as any)['text-field']
        )?.id;

        map.current!.addLayer({
          'id': '3d-buildings',
          'source': 'composite',
          'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'],
          'type': 'fill-extrusion',
          'minzoom': 15,
          'paint': {
            'fill-extrusion-color': '#1a1a1a',
            'fill-extrusion-height': [
              'interpolate', ['linear'], ['zoom'],
              15, 0, 15.05, ['get', 'height']
            ],
            'fill-extrusion-base': [
              'interpolate', ['linear'], ['zoom'],
              15, 0, 15.05, ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.6
          }
        }, labelLayerId);
      } catch {
        // 3D buildings not available with this map style — skip silently
      }
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update camera position and bearing
  useEffect(() => {
    if (!map.current || !userLocation) return;
    // userLocation is [lat, lon] — Mapbox needs [lon, lat]
    map.current.easeTo({
      center: [userLocation[1], userLocation[0]],
      bearing: heading,
      pitch: 60,
      zoom: 17.5,
      duration: 1000
    });
  }, [userLocation, heading]);

  // Add route line in 3D
  useEffect(() => {
    if (!map.current || !mapLoaded || !route) return;

    if (map.current.getSource('route')) {
      map.current.removeLayer('route-line');
      map.current.removeSource('route');
    }

    map.current.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: route.coordinates || []
        }
      }
    });

    map.current.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 8,
        'line-opacity': 0.8
      }
    });
  }, [route, mapLoaded]);

  return (
    <div className="relative w-full h-full">
      {/* 3D Mapbox Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* HUD Overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        {/* Turn Instruction Banner */}
        {nextTurnDirection && nextTurnDistance !== undefined && (
          <div className="mx-4 mt-4 bg-black/80 backdrop-blur-sm rounded-2xl p-6 border border-[#D4AF37]/30">
            <div className="flex items-center gap-4">
              {/* Turn Arrow */}
              <div className="w-20 h-20 flex items-center justify-center bg-[#D4AF37] rounded-xl">
                <TurnArrow direction={nextTurnDirection} className="w-12 h-12 text-black" />
              </div>
              
              {/* Distance and Street */}
              <div className="flex-1">
                <div className="text-4xl font-black text-white">
                  {nextTurnDistance < 0.1 ? '500 ft' : `${nextTurnDistance.toFixed(1)} mi`}
                </div>
                <div className="text-lg text-zinc-400 font-bold">
                  {nextTurnDirection} on I-95 North
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Speed Display */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {/* Speed Limit */}
          {speedLimit && (
            <div className="bg-white rounded-lg p-2 border-4 border-black w-16 h-16 flex flex-col items-center justify-center">
              <div className="text-[10px] font-black text-black">SPEED</div>
              <div className="text-[10px] font-black text-black">LIMIT</div>
              <div className="text-2xl font-black text-black">{speedLimit}</div>
            </div>
          )}
          
          {/* Current Speed */}
          {currentSpeed !== undefined && (
            <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-[#D4AF37]/30">
              <div className="text-3xl font-black text-[#D4AF37]">{Math.round(currentSpeed)}</div>
              <div className="text-xs text-zinc-400 font-bold">mph</div>
            </div>
          )}
        </div>
      </div>

      {/* Traffic Sign Overlays */}
      {trafficSigns && trafficSigns.length > 0 && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          {trafficSigns[0]?.type === 'stop' && (
            <div className="flex flex-col items-center animate-pulse">
              <div className="w-32 h-32 flex items-center justify-center bg-red-600 rounded-full border-8 border-white shadow-2xl">
                <span className="text-white font-black text-3xl">STOP</span>
              </div>
              <div className="mt-4 bg-[#D4AF37] text-black px-6 py-2 rounded-full font-bold text-lg">
                Stop Sign Ahead - {trafficSigns[0].distance}m
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2D/3D Toggle */}
      <div className="absolute bottom-4 right-4 z-10">
        <button className="bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg border border-[#D4AF37]/30 font-bold hover:bg-[#D4AF37]/20 transition-all pointer-events-auto">
          3D View
        </button>
      </div>
    </div>
  );
};

// Turn Arrow Component
const TurnArrow: React.FC<{ direction: string; className?: string }> = ({ direction, className }) => {
  const getArrowPath = () => {
    switch (direction.toLowerCase()) {
      case 'right':
        return 'M4 12h16m0 0l-6-6m6 6l-6 6';
      case 'left':
        return 'M20 12H4m0 0l6 6m-6-6l6-6';
      case 'straight':
        return 'M12 4v16m0 0l6-6m-6 6l-6-6';
      default:
        return 'M12 4v16m0 0l6-6m-6 6l-6-6';
    }
  };

  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={getArrowPath()} />
    </svg>
  );
};
