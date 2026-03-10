import React, { useEffect, useRef, useState, useContext, useMemo } from 'react';
import * as L from 'leaflet';
import 'leaflet-rotate';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { renderToStaticMarkup } from 'react-dom/server';
import { 
  Plus, 
  Minus, 
  X, 
  Search,
  Navigation as NavIcon,
  Loader2,
  RotateCcw,
  Wind,
  CloudSun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Sun,
  Eye,
  ArrowUp,
  AlertTriangle,
  Zap,
  Map as MapIcon,
  Layers,
  ArrowLeft,
  ArrowRight,
  Undo2,
  GitMerge,
  CornerUpLeft,
  CornerUpRight,
  CornerDownLeft,
  CornerDownRight,
  Shield,
  Truck,
  CircleDollarSign,
  Trash2,
  Filter,
  Check,
  Compass,
  Star,
  RotateCw,
  TrafficCone,
  Scale,
  Fuel,
  ParkingSquare,
  UtensilsCrossed,
  Wrench,
  Box,
  Settings,
  Route,
  MapPin
} from 'lucide-react';

interface Waypoint {
  id: string;
  address: string;
  lat: number;
  lon: number;
  type: 'DEADHEAD' | 'PAID';
}
import { STATIC_POIS } from '../src/constants/staticPois';
import { AppContext } from '../types';
import { RouteHistoryItem } from '../types';
import { fetchTruckPOIs, fetchMajorChains, searchPlaces, reverseGeocode, fetchAddressSuggestions } from '../services/geminiService';
import { fetchHERETruckStops } from '../services/hereService';
import { speak } from '../services/speechService';
import { getPoiIcon, getPoiCategory, getEntranceIcon, getExitIcon } from './PoiIcon';
import { decode } from '@here/flexpolyline';

interface NavigationViewProps {
  initialTarget?: string | null;
  isSidebarCollapsed?: boolean;
}

type MapStyle = 'TUE_GOLD' | 'MAPTILER' | 'CUSTOM' | 'SATELLITE';

const FALLBACK_LOCATION: [number, number] = [41.8781, -87.6298];

const isValidLatLng = (coords: any): coords is [number, number] => {
  if (!Array.isArray(coords) || coords.length < 2) return false;
  return typeof coords[0] === 'number' && typeof coords[1] === 'number' && !isNaN(coords[0]) && !isNaN(coords[1]);
};

const SpeedLimitSign: React.FC<{ limit: number | null; currentSpeed?: number; compact?: boolean }> = ({ limit, currentSpeed, compact }) => {
  if (!limit) return null;
  const isSpeeding = currentSpeed !== undefined && currentSpeed > limit;
  
  if (compact) {
    return (
      <div className={`bg-white border ${isSpeeding ? 'border-red-600 ring-1 ring-red-600/50' : 'border-black'} rounded-sm w-7 h-9 flex flex-col items-center justify-center shadow-sm ml-2 overflow-hidden transition-colors duration-300`}>
        <div className="w-full bg-white flex flex-col items-center pt-0.5">
          <span className={`text-black text-[4px] font-bold uppercase tracking-tighter leading-none ${isSpeeding ? 'text-red-600' : ''}`}>Speed</span>
          <span className={`text-black text-[4px] font-bold uppercase tracking-tighter leading-none ${isSpeeding ? 'text-red-600' : ''}`}>Limit</span>
        </div>
        <span className={`text-black text-[10px] font-black leading-none py-0.5 ${isSpeeding ? 'text-red-600 scale-110' : ''} transition-transform`}>{limit}</span>
      </div>
    );
  }
  return (
    <div className={`bg-white border-[2px] md:border-[3px] ${isSpeeding ? 'border-red-600 ring-2 ring-red-600/30 animate-pulse' : 'border-black'} rounded-lg md:rounded-xl w-12 h-16 md:w-16 md:h-20 flex flex-col items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.4)] ring-1 ring-white/20 transition-all duration-300`}>
      <div className="w-full flex flex-col items-center pt-1 md:pt-2">
        <span className={`text-black text-[7px] md:text-[9px] font-black uppercase tracking-tighter leading-none ${isSpeeding ? 'text-red-600' : ''}`}>Speed</span>
        <span className={`text-black text-[7px] md:text-[9px] font-black uppercase tracking-tighter leading-none mb-0.5 ${isSpeeding ? 'text-red-600' : ''}`}>Limit</span>
      </div>
      <span className={`text-black text-xl md:text-3xl font-black leading-none pb-1 md:pb-2 tracking-tighter ${isSpeeding ? 'text-red-600 scale-110' : ''} transition-transform`}>{limit}</span>
    </div>
  );
};

const HighwayShield: React.FC<{ roadName: string | null }> = ({ roadName }) => {
  if (!roadName) return null;
  
  // Normalize road name for better matching
  const normalized = roadName
    .replace(/Interstate\s+/i, 'I-')
    .replace(/U\.?S\.?\s*(?:Highway|Hwy|Route)?\s*/i, 'US-')
    .replace(/(?:State\s+Route|State\s+Highway|SR|Hwy|Route)\s+/i, 'SR-')
    .replace(/County\s+(?:Road|Hwy|Route)\s+/i, 'CR-');

  const isInterstate = normalized.match(/I\s*[- ]?\s*(\d+[A-Z]?)/i);
  const isUSHighway = normalized.match(/US\s*[- ]?\s*(\d+[A-Z]?)/i);
  const isStateHighway = normalized.match(/(?:SR|CR|CA|TX|FL|NY|IL|PA|OH|MI|GA|NC|NJ|VA|WA|AZ|MA|TN|IN|MO|MD|WI|CO|MN|SC|AL|LA|KY|OR|OK|CT|UT|IA|NV|AR|MS|KS|NM|NE|ID|WV|HI|NH|ME|MT|RI|DE|SD|ND|AK|VT|WY)\s*[- ]?\s*(\d+[A-Z]?)/i);

  if (isInterstate) {
    return (
      <div className="relative w-12 h-12 md:w-16 md:h-16 flex items-center justify-center drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <path d="M50 5 L90 20 L90 60 C90 80 50 95 50 95 C50 95 10 80 10 60 L10 20 Z" fill="#003f87" stroke="white" strokeWidth="4" />
          <path d="M10 20 L90 20 L50 5 Z" fill="#cf142b" />
          <path d="M50 5 L90 20 L90 60 C90 80 50 95 50 95 C50 95 10 80 10 60 L10 20 Z" fill="none" stroke="white" strokeWidth="2" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center mt-1">
          <span className="text-white text-[6px] md:text-[9px] font-black uppercase tracking-tighter leading-none mb-0.5">Interstate</span>
          <span className="text-white text-lg md:text-2xl font-[1000] leading-none">{isInterstate[1]}</span>
        </div>
      </div>
    );
  }

  if (isUSHighway) {
    return (
      <div className="relative w-10 h-12 md:w-14 md:h-16 flex items-center justify-center drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <rect x="5" y="5" width="90" height="90" fill="white" stroke="black" strokeWidth="2" />
          <path d="M10 10 L90 10 L90 60 C90 85 50 95 50 95 C50 95 10 85 10 60 Z" fill="white" stroke="black" strokeWidth="4" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-black text-lg md:text-2xl font-[1000] mt-1 md:mt-2">{isUSHighway[1]}</span>
      </div>
    );
  }

  if (isStateHighway) {
    return (
      <div className="relative w-10 h-10 md:w-14 md:h-14 flex items-center justify-center drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">
        <div className="absolute inset-0 bg-white border-2 border-black rounded-full" />
        <span className="absolute inset-0 flex items-center justify-center text-black text-base md:text-xl font-[1000]">{isStateHighway[1]}</span>
      </div>
    );
  }

  return (
    <div className="bg-black/80 backdrop-blur-md border border-[#D4AF37]/30 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg">
      <Shield className="w-3 h-3 text-[#D4AF37]" />
      <span className="text-[10px] font-black text-white uppercase tracking-tight">{roadName}</span>
    </div>
  );
};

const NavigationView: React.FC<NavigationViewProps> = ({ initialTarget, isSidebarCollapsed }) => {
  const HERE_API_KEY = import.meta.env?.VITE_HERE_API_KEY || '7H8x56rMSf986iahRnBQnS0j0Edm2OLiscMx7JFwYO0';
  const context = useContext(AppContext);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const moveTimerRef = useRef<any>(null);
  const routeGroupRef = useRef<any>(null);
  const baseLayerGroupRef = useRef<any>(null);
  const poiLayerGroupRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const speedLimitMarkerRef = useRef<any>(null);

  useEffect(() => {
    (window as any).L = L;
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current) {
      const timer = setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isSidebarCollapsed]);
  const userLocation = context?.userLocation || FALLBACK_LOCATION; 
  const truckProfile = context?.truckProfile || { height: 13.5, weight: 78500, length: 53, hazmat: false };

  const routeCoordsRef = useRef<[number, number][]>([]);
  const routeDistancesRef = useRef<number[]>([]);
  const routeLineRef = useRef<any>(null);
  const currentSegmentLineRef = useRef<any>(null);
  const totalRouteDistanceRef = useRef(0);
  const lastSimIdxRef = useRef(-1);
  const routeDurationRef = useRef<number>(0);
  const routeSavedRef = useRef<boolean>(false);

  const [searchQuery, setSearchQuery] = useState('');
  
  const [showTraffic, setShowTraffic] = useState(true);
  const [showWeather, setShowWeather] = useState(true);
  const trafficLayerGroupRef = useRef<any>(null);
  const weatherLayerGroupRef = useRef<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(userLocation);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const isDriving = context?.isDriving || false;
  const setIsDriving = context?.setIsDriving || (() => {});
  const setUserLocation = context?.setUserLocation || (() => {});
  const eldStatus = context?.eldStatus;
  const setEldStatus = context?.setEldStatus;
  const hasViolation = context?.hasViolation || false;

  const [currentDestination, setCurrentDestination] = useState(() => localStorage.getItem('nav_current_destination') || 'Standby');
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(() => {
    const saved = localStorage.getItem('nav_destination_coords');
    return saved ? JSON.parse(saved) : null;
  });
  const [milesRemaining, setMilesRemaining] = useState(0);
  const [initialMiles, setInitialMiles] = useState(0);
  const [eta, setEta] = useState('--:-- --');
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [isOverviewMode, setIsOverviewMode] = useState(false);
  const [isFollowMode, setIsFollowMode] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>('MAPTILER');
  const [customTileUrl, setCustomTileUrl] = useState<string>(() => {
    return localStorage.getItem('custom_tile_url') || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  });
  const [customMapShowRoads, setCustomMapShowRoads] = useState<boolean>(() => {
    return localStorage.getItem('custom_map_show_roads') !== 'false';
  });
  const [isCustomLayerModalOpen, setIsCustomLayerModalOpen] = useState(false);
  const [isNorthUp, setIsNorthUp] = useState(() => localStorage.getItem('nav_north_up') === 'true');
  const [mapBearing, setMapBearing] = useState(0);
  
  const [avoidTolls, setAvoidTolls] = useState(() => localStorage.getItem('nav_avoid_tolls') === 'true');
  const [avoidFerries, setAvoidFerries] = useState(() => localStorage.getItem('nav_avoid_ferries') === 'true');
  const [avoidUnpaved, setAvoidUnpaved] = useState(() => localStorage.getItem('nav_avoid_unpaved') === 'true');

  const [alternativeRoutes, setAlternativeRoutes] = useState<any[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isCarPlayMode, setIsCarPlayMode] = useState(() => localStorage.getItem('nav_carplay_mode') === 'true');
  const [isRouteSettingsOpen, setIsRouteSettingsOpen] = useState(false);
  const [isRoutePreview, setIsRoutePreview] = useState(false);
  const [isExploreMode, setIsExploreMode] = useState(false);

  const bearingAnimationRef = useRef<number | null>(null);

  // Animate map bearing
  const animateBearing = useCallback((targetBearing: number) => {
    if (!mapInstanceRef.current) return;
    
    if (bearingAnimationRef.current !== null) {
      cancelAnimationFrame(bearingAnimationRef.current);
      bearingAnimationRef.current = null;
    }
    
    const map = mapInstanceRef.current as any;
    const currentBearing = map.getBearing() || 0;
    
    // Calculate shortest path
    let diff = targetBearing - currentBearing;
    diff = ((diff + 180) % 360) - 180;
    
    // If difference is very small, just set it
    if (Math.abs(diff) < 1) {
      map.setBearing(targetBearing);
      return;
    }
    
    const duration = 500; // ms
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const newBearing = currentBearing + (diff * easeProgress);
      map.setBearing(newBearing);
      
      if (progress < 1) {
        bearingAnimationRef.current = requestAnimationFrame(animate);
      } else {
        bearingAnimationRef.current = null;
      }
    };
    
    bearingAnimationRef.current = requestAnimationFrame(animate);
  }, []);
  const [trafficCams, setTrafficCams] = useState<any[]>([]);
  const [zoom, setZoom] = useState(15);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [pois, setPois] = useState<any[]>(() => {
    const saved = localStorage.getItem('truck_pois');
    const savedPois = saved ? JSON.parse(saved) : [];
    const dynamicPois = savedPois
      .filter((p: any) => !STATIC_POIS.some(sp => sp.id === p.id))
      .map((p: any) => ({ ...p, lat: Number(p.lat), lon: Number(p.lon) }));
    return [...STATIC_POIS, ...dynamicPois];
  });
  const [isFetchingPois, setIsFetchingPois] = useState(false);

  useEffect(() => {
    const dynamicPois = pois.filter(p => !STATIC_POIS.some(sp => sp.id === p.id));
    localStorage.setItem('truck_pois', JSON.stringify(dynamicPois));
  }, [pois]);
  const isFetchingPoisRef = useRef(false);
  const lastPoiFetchRef = useRef<{ time: number, lat: number, lon: number } | null>(null);
  const [showPois, setShowPois] = useState(() => localStorage.getItem('nav_show_pois') !== 'false');
  const [showHighways, setShowHighways] = useState(() => localStorage.getItem('nav_show_highways') !== 'false');
  const [showRoadOverlay, setShowRoadOverlay] = useState(() => localStorage.getItem('nav_show_road_overlay') !== 'false');
  const [poiFilters, setPoiFilters] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('poi_filters');
    return saved ? new Set(JSON.parse(saved)) : new Set(['major_chains', 'fuel', 'parking', 'rest_area', 'weigh_station', 'food', 'service', 'distribution', 'other']);
  });

  useEffect(() => {
    localStorage.setItem('poi_filters', JSON.stringify(Array.from(poiFilters)));
  }, [poiFilters]);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeSteps, setRouteSteps] = useState<any[]>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>(() => {
    const saved = localStorage.getItem('nav_waypoints');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedPoi, setSelectedPoi] = useState<any | null>(null);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('nav_waypoints', JSON.stringify(waypoints));
  }, [waypoints]);

  useEffect(() => {
    localStorage.setItem('nav_destination_coords', JSON.stringify(destinationCoords));
  }, [destinationCoords]);

  useEffect(() => {
    localStorage.setItem('nav_current_destination', currentDestination);
  }, [currentDestination]);

  useEffect(() => {
    localStorage.setItem('nav_map_style', mapStyle);
  }, [mapStyle]);

  useEffect(() => {
    localStorage.setItem('nav_north_up', isNorthUp.toString());
  }, [isNorthUp]);

  useEffect(() => {
    localStorage.setItem('nav_avoid_tolls', avoidTolls.toString());
  }, [avoidTolls]);

  useEffect(() => {
    localStorage.setItem('nav_avoid_ferries', avoidFerries.toString());
  }, [avoidFerries]);

  useEffect(() => {
    localStorage.setItem('nav_avoid_unpaved', avoidUnpaved.toString());
  }, [avoidUnpaved]);

  useEffect(() => {
    localStorage.setItem('nav_carplay_mode', isCarPlayMode.toString());
  }, [isCarPlayMode]);

  useEffect(() => {
    localStorage.setItem('nav_show_pois', showPois.toString());
  }, [showPois]);

  useEffect(() => {
    localStorage.setItem('nav_show_highways', showHighways.toString());
  }, [showHighways]);

  useEffect(() => {
    localStorage.setItem('nav_show_road_overlay', showRoadOverlay.toString());
  }, [showRoadOverlay]);
  
  const [nextInstruction, setNextInstruction] = useState({ 
    text: 'Ready for Route', 
    distance: '0.0', 
    icon: ArrowUp as React.ElementType, 
    lanes: [] as any[],
    maneuver: null as any
  });
  const [weather, setWeather] = useState({ 
    temp: '--°', 
    condition: 'Loading...', 
    wind: '-- MPH', 
    visibility: '-- MI',
    icon: CloudSun,
    forecast: [] as { day: string, max: number, min: number, icon: any }[]
  });
  const [routeWeatherForecast, setRouteWeatherForecast] = useState<any[]>([]);
  const [weatherAlerts, setWeatherAlerts] = useState<any[]>([]);
  const weatherAlertGroupRef = useRef<any>(null);
  const [weighStationAlert, setWeighStationAlert] = useState<{ distance: number, status: 'OPEN' | 'CLOSED' | 'BYPASS' } | null>(null);
  
  const [currentRoad, setCurrentRoad] = useState<string | null>(null);
  const [currentSpeedLimit, setCurrentSpeedLimit] = useState<number | null>(null);
  const routeSpansRef = useRef<any[]>([]);

  const lastViolationRef = useRef(false);
  const playedAlertsRef = useRef<Record<string, Set<number>>>({});

  useEffect(() => {
    if (hasViolation && !lastViolationRef.current) {
      speak("Attention: Hours of Service violation detected. Immediate stop required.");
    }
    lastViolationRef.current = hasViolation;
  }, [hasViolation]);

  useEffect(() => {
    const fetchRoadName = async () => {
      if (!isDriving || !userLocation) return;

      try {
        const [lat, lon] = userLocation;
        const data = await reverseGeocode(lat, lon);
        if (data) {
          setCurrentRoad(data.ref || data.road);
        }
      } catch (error) {
        console.warn('Could not fetch road name:', error);
        setCurrentRoad(null);
      }
    };

    const interval = setInterval(fetchRoadName, 10000); // Fetch every 10 seconds while driving
    return () => clearInterval(interval);
  }, [isDriving, userLocation]);

  useEffect(() => {
    if (!eldStatus || eldStatus.status === 'OFF' || eldStatus.status === 'SB') {
      playedAlertsRef.current = {};
      return;
    }

    eldStatus.timers.forEach(timer => {
      const { label, seconds } = timer;
      if (!playedAlertsRef.current[label]) {
        playedAlertsRef.current[label] = new Set();
      }

      const thresholds = [3600, 1800, 900];
      thresholds.forEach(threshold => {
        if (seconds <= threshold && seconds > 0 && !playedAlertsRef.current[label].has(threshold)) {
          const minutes = threshold / 60;
          const timeText = minutes >= 60 ? "1 hour" : `${minutes} minutes`;
          speak(`HOS Warning: ${timeText} remaining for ${label}.`);
          playedAlertsRef.current[label].add(threshold);
        }
      });

      if (seconds > 3600) playedAlertsRef.current[label].delete(3600);
      if (seconds > 1800) playedAlertsRef.current[label].delete(1800);
      if (seconds > 900) playedAlertsRef.current[label].delete(900);
    });
  }, [eldStatus]);

  useEffect(() => {
    if (!mapInstanceRef.current || !baseLayerGroupRef.current) return;
    baseLayerGroupRef.current.clearLayers();
    
    const tileOptions = {
      tileSize: 256,
      maxZoom: 20,
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 4
    };

    let fallbackTriggered = false;

    if (mapStyle === 'TUE_GOLD') {
      // Use the custom HERE style HRN provided by the user
      const customStyleHrn = 'hrn:here:data::org675124033:03a188-df4d962e9';
      
      const layer = L.tileLayer(`https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/png8?apiKey=${HERE_API_KEY}&style=${customStyleHrn}`, {
        ...tileOptions,
        attribution: '&copy; <a href="https://legal.here.com/en-gb/privacy">HERE</a>'
      }).addTo(baseLayerGroupRef.current);
      
      layer.on('tileerror', () => {
        if (!fallbackTriggered && baseLayerGroupRef.current) {
          fallbackTriggered = true;
          baseLayerGroupRef.current.clearLayers();
          L.tileLayer('https://{s}.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}', { 
            maxZoom: 22,
            maxNativeZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
          }).addTo(baseLayerGroupRef.current);
        }
      });
    } else if (mapStyle === 'MAPTILER') {
      const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY || '4D6H6eQaS6oyaQmgNGly';
      // Use the user's specific MapTiler style
      const layer = L.tileLayer(`https://api.maptiler.com/maps/019cd5fd-dec5-7287-b677-66a58dc4ff50/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`, {
        ...tileOptions,
        attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(baseLayerGroupRef.current);
      
      layer.on('tileerror', () => {
        if (!fallbackTriggered && baseLayerGroupRef.current) {
          fallbackTriggered = true;
          baseLayerGroupRef.current.clearLayers();
          L.tileLayer('https://{s}.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}', { 
            maxZoom: 22,
            maxNativeZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
          }).addTo(baseLayerGroupRef.current);
        }
      });
    } else if (mapStyle === 'CUSTOM') {
      if (customTileUrl) {
        L.tileLayer(customTileUrl, {
          ...tileOptions,
          attribution: 'Custom Layer'
        }).addTo(baseLayerGroupRef.current);
      }
      
      if (customMapShowRoads) {
        L.tileLayer(`https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/png8?features=truck_restrictions&apiKey=${HERE_API_KEY}`, {
          ...tileOptions,
          opacity: 0.6,
          className: 'glow-overlay'
        }).addTo(baseLayerGroupRef.current);
      }
    } else if (mapStyle === 'SATELLITE') {
      L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&hl=en&x={x}&y={y}&z={z}', { 
        maxZoom: 22,
        maxNativeZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps'
      }).addTo(baseLayerGroupRef.current);
    }
  }, [mapStyle, customTileUrl, customMapShowRoads, showHighways, isMapReady]);

  useEffect(() => {
    if (!mapRef.current) return;
    const mapContainer = mapRef.current;

    if (!isNorthUp) {
      mapContainer.classList.add('map-heading-up');
    } else {
      mapContainer.classList.remove('map-heading-up');
    }
  }, [isNorthUp]);

  useEffect(() => {
    const getNearbyPois = () => {
      if (!pois || pois.length === 0) return [];
      const seen = new Set();
      return pois
        .filter(poi => {
          if (typeof poi.lat !== 'number' || typeof poi.lon !== 'number' || isNaN(poi.lat) || isNaN(poi.lon)) return false;
          const category = getPoiCategory(poi.type, poi.name);
          return poiFilters.has(category);
        })
        .map(p => {
          // Calculate rough distance for sorting
          const dist = Math.pow(p.lat - userLocation[0], 2) + Math.pow(p.lon - userLocation[1], 2);
          return { ...p, dist };
        })
        .sort((a, b) => a.dist - b.dist)
        .filter(p => {
          const id = `${p.lat}-${p.lon}-${p.name}`;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        })
        .slice(0, 5)
        .map(p => ({
          display_name: `${p.name}, ${p.type}`,
          lat: p.lat,
          lon: p.lon,
          place_id: `rec-${p.lat}-${p.lon}-${p.name}`,
          isRecommended: true
        }));
    };

    if (searchQuery.trim().length < 2) {
      if (isSearchFocused) {
        setSuggestions(getNearbyPois());
      } else {
        setSuggestions([]);
      }
      return;
    }

    const handler = setTimeout(async () => {
      try {
        const [lat, lon] = userLocation;
        
        // Optimization: Remove Gemini search from live suggestions to reduce latency and cost.
        // HERE autosuggest is much faster for typing.
        const hereSuggestions = HERE_API_KEY ? await fetchAddressSuggestions(searchQuery, lat, lon, HERE_API_KEY) : [];
        
        // Combine and deduplicate
        const combined = [...hereSuggestions];
        const seen = new Set();
        
        // Add nearby POIs as recommendations at the top
        const nearby = getNearbyPois().slice(0, 3);
        nearby.forEach(p => {
          seen.add(`${p.lat.toFixed(4)}-${p.lon.toFixed(4)}`);
        });

        const uniqueResults = combined.filter(s => {
          const key = `${s.lat.toFixed(4)}-${s.lon.toFixed(4)}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        
        const finalResults = [...nearby, ...uniqueResults.slice(0, 10)];
        setSuggestions(finalResults);
      } catch (error) {
        console.error('Failed to fetch suggestions', error);
        setSuggestions(getNearbyPois().slice(0, 3));
      }
    }, 300); // Reduced debounce for snappier feel
    return () => clearTimeout(handler);
  }, [searchQuery, userLocation, isSearchFocused, pois, poiFilters]);

  const getManeuverIcon = (type: string, modifier?: string): React.ElementType => {
    if (type === 'depart') return ArrowUp;

    if (modifier) {
        if (modifier.includes('uturn')) return Undo2;
        if (modifier.includes('sharp right')) return CornerDownRight;
        if (modifier.includes('right')) return ArrowRight;
        if (modifier.includes('slight right')) return CornerUpRight;
        if (modifier.includes('straight')) return ArrowUp;
        if (modifier.includes('slight left')) return CornerUpLeft;
        if (modifier.includes('left')) return ArrowLeft;
        if (modifier.includes('sharp left')) return CornerDownLeft;
    }

    if (type.includes('roundabout')) return RotateCw;
    if (type.includes('merge')) return GitMerge;
    
    return ArrowUp;
  };

  const parseLane = (lane: any) => {
    const direction = lane.direction.toLowerCase();
    const isStraight = direction.includes('straight');
    const isLeft = direction.includes('left');
    const isRight = direction.includes('right');
    const isSlightLeft = direction.includes('slight left');
    const isSlightRight = direction.includes('slight right');
    const isSharpLeft = direction.includes('sharp left');
    const isSharpRight = direction.includes('sharp right');
    const isUTurn = direction.includes('uturn');

    let rotation = 0;
    if (isSlightLeft) rotation = -25;
    else if (isLeft) rotation = -45;
    else if (isSharpLeft) rotation = -65;
    else if (isSlightRight) rotation = 25;
    else if (isRight) rotation = 45;
    else if (isSharpRight) rotation = 65;
    else if (isUTurn) rotation = 180;

    return {
      rotation,
      active: lane.matches.includes('selected'),
      isStraight
    };
  };

  const lastSpokenRef = useRef('');
  const spokenDistancesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isDriving || nextInstruction.text === 'Ready for Route') return;

    const dist = parseFloat(nextInstruction.distance);
    if (isNaN(dist)) return;
    let shouldSpeak = false;
    let phrase = "";

    if (nextInstruction.text !== lastSpokenRef.current) {
      lastSpokenRef.current = nextInstruction.text;
      spokenDistancesRef.current.clear();
      
      shouldSpeak = true;
      if (dist > 2) {
        phrase = `Continue for ${dist} miles, then ${nextInstruction.text}`;
      } else {
        phrase = `In ${dist} miles, ${nextInstruction.text}`;
        if (dist <= 2) spokenDistancesRef.current.add('2');
        if (dist <= 1) spokenDistancesRef.current.add('1');
        if (dist <= 0.2) spokenDistancesRef.current.add('0.2');
      }
    }

    if (dist <= 2.0 && dist > 1.9 && !spokenDistancesRef.current.has('2')) {
      shouldSpeak = true;
      phrase = `In 2 miles, ${nextInstruction.text}`;
      spokenDistancesRef.current.add('2');
    } else if (dist <= 1.0 && dist > 0.9 && !spokenDistancesRef.current.has('1')) {
      shouldSpeak = true;
      phrase = `In 1 mile, ${nextInstruction.text}`;
      spokenDistancesRef.current.add('1');
    } else if (dist <= 0.2 && !spokenDistancesRef.current.has('0.2')) {
      shouldSpeak = true;
      phrase = `Now, ${nextInstruction.text}`;
      spokenDistancesRef.current.add('0.2');
    }

    if (shouldSpeak && phrase) {
      speak(phrase);
    }
  }, [nextInstruction.distance, nextInstruction.text, isDriving]);

  const [isOffRoute, setIsOffRoute] = useState(false);
  const offRouteCountRef = useRef(0);
  const lastRerouteTimeRef = useRef(0);

  const handleReroute = async () => {
    const now = Date.now();
    if (now - lastRerouteTimeRef.current < 10000) return; // Prevent spamming reroutes (10s cooldown)
    lastRerouteTimeRef.current = now;
    
    console.log("Rerouting initiated...");
    offRouteCountRef.current = 0;
    
    // Call handleNavigate without a target to use existing destination/waypoints
    try {
      await handleNavigate();
      setIsOffRoute(false);
    } catch (e) {
      console.error("Reroute failed:", e);
    }
  };

  const updateNavigationState = async (currentLocation: [number, number]) => {
    if (!currentLocation || isNaN(currentLocation[0]) || isNaN(currentLocation[1])) return;
    if (!routeSteps.length || !routeCoordsRef.current || routeCoordsRef.current.length < 2) return;

    // Manual distance calculation to avoid turf.js overhead
    const R = 6371e3; // Earth radius in meters
    const toRad = (val: number) => val * Math.PI / 180;
    const calcDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const phi1 = toRad(lat1);
      const phi2 = toRad(lat2);
      const deltaPhi = toRad(lat2 - lat1);
      const deltaLambda = toRad(lon2 - lon1);
      const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                Math.cos(phi1) * Math.cos(phi2) *
                Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Find nearest point on route line manually
    let minDistance = Infinity;
    let nearestIndex = 0;
    let distOnSegment = 0;

    // Optimization: only search a window around the last known index to improve performance
    let startIndex = 0;
    let endIndex = routeCoordsRef.current.length - 1;
    if (lastSimIdxRef.current !== -1) {
      startIndex = Math.max(0, lastSimIdxRef.current - 50);
      endIndex = Math.min(routeCoordsRef.current.length - 1, lastSimIdxRef.current + 200);
    }

    for (let i = startIndex; i < endIndex; i++) {
      const p1 = routeCoordsRef.current[i];
      const p2 = routeCoordsRef.current[i+1];
      if (!p1 || !p2) continue;
      
      // Calculate distance from point to line segment
      const l2 = Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2);
      let t = 0;
      if (l2 !== 0) {
        t = Math.max(0, Math.min(1, ((currentLocation[0] - p1[0]) * (p2[0] - p1[0]) + (currentLocation[1] - p1[1]) * (p2[1] - p1[1])) / l2));
      }
      const proj = [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
      const dist = calcDist(currentLocation[0], currentLocation[1], proj[0], proj[1]);

      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
        distOnSegment = calcDist(p1[0], p1[1], proj[0], proj[1]);
      }
    }

    // If we get off route, we might need to search the whole route again
    if (minDistance > 500 && lastSimIdxRef.current !== -1) {
      // Fallback: search the whole route if we lost track
      for (let i = 0; i < routeCoordsRef.current.length - 1; i++) {
        if (i >= startIndex && i < endIndex) continue; // Already checked
        const p1 = routeCoordsRef.current[i];
        const p2 = routeCoordsRef.current[i+1];
        if (!p1 || !p2) continue;
        const l2 = Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2);
        let t = 0;
        if (l2 !== 0) {
          t = Math.max(0, Math.min(1, ((currentLocation[0] - p1[0]) * (p2[0] - p1[0]) + (currentLocation[1] - p1[1]) * (p2[1] - p1[1])) / l2));
        }
        const proj = [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
        const dist = calcDist(currentLocation[0], currentLocation[1], proj[0], proj[1]);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIndex = i;
          distOnSegment = calcDist(p1[0], p1[1], proj[0], proj[1]);
        }
      }
    }

    lastSimIdxRef.current = nearestIndex;

    if (routeLineRef.current && routeCoordsRef.current.length > nearestIndex) {
      const remainingCoords = [currentLocation, ...routeCoordsRef.current.slice(nearestIndex + 1)];
      routeLineRef.current.setLatLngs(remainingCoords);
    }

    if (routeGroupRef.current && routeCoordsRef.current.length > nearestIndex + 1) {
      const segmentCoords = [currentLocation, routeCoordsRef.current[nearestIndex + 1]];
      if (!currentSegmentLineRef.current) {
        currentSegmentLineRef.current = L.polyline(segmentCoords, {
          color: '#ffffff',
          weight: 12,
          opacity: 0.8,
          lineCap: 'round',
          lineJoin: 'round',
          className: 'animate-pulse'
        }).addTo(routeGroupRef.current);
      } else {
        currentSegmentLineRef.current.setLatLngs(segmentCoords);
      }
    }

    const distanceFromRoute = minDistance;
    
    // Check if off-route
    if (distanceFromRoute > 300) { // Increased from 150m to 300m to reduce recalculations
        offRouteCountRef.current += 1;
        if (offRouteCountRef.current >= 5) { // Increased from 3 to 5 consecutive updates
            if (!isOffRoute && !isCalculating) {
                setIsOffRoute(true);
                speak("Off route.");
                if (context?.autoReroute) {
                  speak("Recalculating.");
                  handleReroute();
                }
            }
        }
    } else {
        offRouteCountRef.current = 0;
        if (isOffRoute) setIsOffRoute(false);
    }

    let traveledDistance = 0;
    if (nearestIndex > 0 && routeDistancesRef.current.length > nearestIndex) {
        traveledDistance = routeDistancesRef.current[nearestIndex];
    }
    
    traveledDistance += distOnSegment;

    const remainingDist = totalRouteDistanceRef.current - traveledDistance;
    if (!isNaN(remainingDist)) {
      const remainingMiles = remainingDist / 1609.34;
      setMilesRemaining(remainingMiles);
      
      // Weigh Station Alert Simulation
      if (initialMiles > 5 && poiFilters.has('weigh_station')) {
        const weighStationPoint = initialMiles * 0.5; // Halfway point
        const distToWeighStation = remainingMiles - weighStationPoint;
        
        if (distToWeighStation > 0 && distToWeighStation <= 2) {
          if (!weighStationAlert || weighStationAlert.distance !== distToWeighStation) {
            // Determine status randomly once when it first appears, or just set it to BYPASS/OPEN
            const status = weighStationAlert?.status || (Math.random() > 0.3 ? 'BYPASS' : 'OPEN');
            setWeighStationAlert({ distance: distToWeighStation, status });
            
            if (distToWeighStation <= 2 && distToWeighStation > 1.9 && !spokenDistancesRef.current.has('ws_2')) {
              speak(`Weigh station ahead in 2 miles. Status is ${status}.`);
              spokenDistancesRef.current.add('ws_2');
            } else if (distToWeighStation <= 0.5 && distToWeighStation > 0.4 && !spokenDistancesRef.current.has('ws_0.5')) {
              speak(`Weigh station in half a mile. ${status === 'BYPASS' ? 'Bypass granted.' : 'Pull in.'}`);
              spokenDistancesRef.current.add('ws_0.5');
            }
          }
        } else if (distToWeighStation <= 0 && weighStationAlert) {
          setWeighStationAlert(null); // Clear alert after passing
        }
      } else if (weighStationAlert) {
        setWeighStationAlert(null); // Clear alert if filter disabled
      }

      if (remainingMiles <= 1.0 && remainingMiles > 0.9 && !spokenDistancesRef.current.has('dest_1')) {
        speak(`You are 1 mile away from your destination.`);
        spokenDistancesRef.current.add('dest_1');
      } else if (remainingMiles <= 0.1 && !spokenDistancesRef.current.has('dest_0.1')) {
        speak(`You have arrived at your destination.`);
        spokenDistancesRef.current.add('dest_0.1');
        saveRouteToHistory('COMPLETED');
      }
    }

    let maneuverIndex = -1;
    let traveledForStep = 0;
    for (let i = 0; i < routeSteps.length; i++) {
      traveledForStep += routeSteps[i].distance;
      if (traveledForStep > traveledDistance) {
        maneuverIndex = i;
        break;
      }
    }

    if (maneuverIndex !== -1) {
      const distanceToManeuver = traveledForStep - traveledDistance;
      if (!isNaN(distanceToManeuver)) {
        const currentStep = routeSteps[maneuverIndex];
        if (currentStep && currentStep.maneuver && currentStep.maneuver.instruction) {
          const instruction = currentStep.maneuver.instruction;
          const roadNameMatch = instruction.match(/on (.+?) for/);
          const roadName = roadNameMatch ? roadNameMatch[1] : (instruction.split(' on ')[1] || '');
          setCurrentRoad(roadName.replace(/\u003c/g, '<').replace(/\u003e/g, '>'));
          setNextInstruction({
            text: instruction.replace(/\u003c/g, '<').replace(/\u003e/g, '>'),
            distance: (distanceToManeuver / 1609.34).toFixed(1), // Convert to miles string
            icon: getManeuverIcon(currentStep.maneuver.type, currentStep.maneuver.modifier),
            lanes: currentStep.lanes || [],
            maneuver: currentStep.maneuver
          });

          // Update ETA based on remaining steps
          let remainingDuration = 0;
          for (let i = maneuverIndex; i < routeSteps.length; i++) {
            remainingDuration += routeSteps[i].duration || 0;
          }
          
          // Adjust for distance already traveled in current step
          if (currentStep && currentStep.distance > 0) {
            const stepTraveledRatio = Math.min(1, Math.max(0, (currentStep.distance - distanceToManeuver) / currentStep.distance));
            remainingDuration -= (currentStep.duration || 0) * stepTraveledRatio;
          }

          if (remainingDuration > 0) {
            const arrival = new Date();
            arrival.setSeconds(arrival.getSeconds() + remainingDuration);
            setEta(arrival.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
          }
        }
      }
    }

    if (routeSpansRef.current && routeSpansRef.current.length > 0) {
      let spanDist = 0;
      let foundLimit = false;
      for (const span of routeSpansRef.current) {
        if (span.length) {
          spanDist += span.length;
          if (spanDist >= traveledDistance) {
            if (span.speedLimit !== undefined && span.speedLimit > 0) {
              // Convert m/s to mph
              const mph = Math.round(span.speedLimit * 2.23694);
              setCurrentSpeedLimit(mph);
              foundLimit = true;
            }
            break;
          }
        }
      }
      
      // Fallback if no speed limit in span
      if (!foundLimit && maneuverIndex !== -1) {
        const currentStep = routeSteps[maneuverIndex];
        if (currentStep && currentStep.maneuver && currentStep.maneuver.instruction) {
          const instruction = currentStep.maneuver.instruction;
          const roadNameMatch = instruction.match(/on (.+?) for/);
          const roadName = roadNameMatch ? roadNameMatch[1] : (instruction.split(' on ')[1] || '');
          if (roadName.match(/^I\s*[- ]/i)) setCurrentSpeedLimit(70);
          else if (roadName.match(/^US\s*[- ]/i)) setCurrentSpeedLimit(65);
          else if (roadName.match(/^(?:State Route|SR|CA|TX|FL|NY|IL|PA|OH|MI|GA|NC|NJ|VA|WA|AZ|MA|TN|IN|MO|MD|WI|CO|MN|SC|AL|LA|KY|OR|OK|CT|UT|IA|NV|AR|MS|KS|NM|NE|ID|WV|HI|NH|ME|MT|RI|DE|SD|ND|AK|VT|WY)\s*[- ]/i)) setCurrentSpeedLimit(60);
          else setCurrentSpeedLimit(45);
        }
      }
    } else if (maneuverIndex !== -1) {
      const currentStep = routeSteps[maneuverIndex];
      if (currentStep && currentStep.maneuver && currentStep.maneuver.instruction) {
        const instruction = currentStep.maneuver.instruction;
        const roadNameMatch = instruction.match(/on (.+?) for/);
        const roadName = roadNameMatch ? roadNameMatch[1] : (instruction.split(' on ')[1] || '');
        if (roadName.match(/^I\s*[- ]/i)) setCurrentSpeedLimit(70);
        else if (roadName.match(/^US\s*[- ]/i)) setCurrentSpeedLimit(65);
        else if (roadName.match(/^(?:State Route|SR|CA|TX|FL|NY|IL|PA|OH|MI|GA|NC|NJ|VA|WA|AZ|MA|TN|IN|MO|MD|WI|CO|MN|SC|AL|LA|KY|OR|OK|CT|UT|IA|NV|AR|MS|KS|NM|NE|ID|WV|HI|NH|ME|MT|RI|DE|SD|ND|AK|VT|WY)\s*[- ]/i)) setCurrentSpeedLimit(60);
        else setCurrentSpeedLimit(45);
      }
    }
  };

  const lastWeatherFetchPos = useRef<[number, number] | null>(null);
  const userLocationRef = useRef(userLocation);
  const setUserLocationRef = useRef(setUserLocation);
  const setWaypointsRef = useRef(setWaypoints);

  useEffect(() => {
    userLocationRef.current = userLocation;
    setUserLocationRef.current = setUserLocation;
    setWaypointsRef.current = setWaypoints;
  }, [userLocation, setUserLocation, setWaypoints]);

  useEffect(() => {
    const fetchWeather = async (force = false) => {
      const loc = userLocationRef.current;
      if (!loc) return;
      const [lat, lon] = loc;
      
      if (!force && lastWeatherFetchPos.current) {
        const [lastLat, lastLon] = lastWeatherFetchPos.current;
        const dist = Math.sqrt(Math.pow(lat - lastLat, 2) + Math.pow(lon - lastLon, 2));
        if (dist < 0.08) return;
      }
      
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`, {
          headers: { 'User-Agent': 'TruckersNav/1.0' }
        });

        if (!res.ok) {
          throw new Error(`Weather API request failed: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        
        if (data.error) {
          console.error("Weather API error:", data.reason || data.error);
          throw new Error(`Weather API error: ${data.reason || data.error}`);
        }
        
        if (data && data.current && data.daily && data.daily.time && data.daily.temperature_2m_max && data.daily.temperature_2m_min) {
          lastWeatherFetchPos.current = [lat, lon];
          const current = data.current;
          
          const getWeatherDetails = (code: number) => {
            if (code === 0) return { condition: 'Clear', icon: Sun };
            if (code >= 1 && code <= 3) return { condition: 'Cloudy', icon: Cloud };
            if (code === 45 || code === 48) return { condition: 'Fog', icon: Cloud };
            if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { condition: 'Rain', icon: CloudRain };
            if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { condition: 'Snow', icon: CloudSnow };
            if (code >= 95 && code <= 99) return { condition: 'Storm', icon: CloudLightning };
            return { condition: 'Clear', icon: Sun };
          };

          const currentDetails = getWeatherDetails(current.weather_code);
          
          const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
          const dirIdx = Math.round((current.wind_direction_10m || 0) / 22.5) % 16;
          const windDir = dirs[dirIdx];
          
          const visMiles = ((current.visibility || 0) / 1609.34).toFixed(1);
          
          const forecast = [];
          if (data.daily.time.length > 3) {
            for (let i = 1; i <= 3; i++) {
              const dateStr = data.daily.time[i];
              if (!dateStr || data.daily.temperature_2m_max[i] === undefined || data.daily.temperature_2m_min[i] === undefined) continue;
              
              const date = new Date(dateStr + 'T12:00:00');
              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
              forecast.push({
                day: dayName,
                max: Math.round(data.daily.temperature_2m_max[i]),
                min: Math.round(data.daily.temperature_2m_min[i]),
                icon: getWeatherDetails(data.daily.weather_code[i]).icon
              });
            }
          }
          
          setWeather({
            temp: `${Math.round(current.temperature_2m)}°`,
            condition: currentDetails.condition,
            wind: `${Math.round(current.wind_speed_10m || 0)} MPH ${windDir}`,
            visibility: `${visMiles} MI`,
            icon: currentDetails.icon,
            forecast
          });
        } else {
            console.error("Invalid weather data received: Missing 'current' or 'daily' data.");
            throw new Error("Invalid weather data format.");
        }
      } catch (err) {
        console.error("Weather fetch failed:", err);
        setWeather(prev => ({ ...prev, condition: 'Unavailable' }));
      }
    };

    fetchWeather().catch(err => console.error("Nav weather fetch failed:", err));
    
    let ticks = 0;
    const interval = setInterval(() => {
      ticks++;
      fetchWeather(ticks % 5 === 0).catch(err => console.error("Nav interval weather fetch failed:", err));
    }, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [userLocation]);

  useEffect(() => {
    if (destinationCoords && !isCalculating) {
      // Re-calculate route when waypoints change and we have a destination
      handleNavigate().catch(err => console.error("Auto re-route failed:", err));
    }
  }, [waypoints]);

  const addWaypoint = (s: any, type: 'DEADHEAD' | 'PAID' = 'DEADHEAD') => {
    const newWaypoint: Waypoint = {
      id: Math.random().toString(36).substr(2, 9),
      address: (s.display_name || s.name).split(',')[0],
      lat: parseFloat(s.lat),
      lon: parseFloat(s.lon),
      type
    };
    setWaypoints(prev => [...prev, newWaypoint]);
    setSearchQuery('');
    setSuggestions([]);
    setIsSuggestionsVisible(false);
    setIsSearchFocused(false);
  };

  const removeWaypoint = (id: string) => {
    setWaypoints(prev => prev.filter(wp => wp.id !== id));
  };

  const moveWaypoint = (index: number, direction: 'up' | 'down') => {
    setWaypoints(prev => {
      const newWaypoints = [...prev];
      if (direction === 'up' && index > 0) {
        [newWaypoints[index], newWaypoints[index - 1]] = [newWaypoints[index - 1], newWaypoints[index]];
      } else if (direction === 'down' && index < newWaypoints.length - 1) {
        [newWaypoints[index], newWaypoints[index + 1]] = [newWaypoints[index + 1], newWaypoints[index]];
      }
      return newWaypoints;
    });
  };

  const saveRouteToHistory = (status: 'COMPLETED' | 'CANCELLED') => {
    if (currentDestination === 'Standby' || routeSavedRef.current) return;

    const historyItem: RouteHistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      origin: waypoints.length > 0 ? waypoints[0].address : 'Current Location',
      destination: currentDestination,
      distance: totalRouteDistanceRef.current / 1609.34,
      duration: routeDurationRef.current,
      date: new Date().toISOString(),
      status
    };

    const saved = localStorage.getItem('trucker_route_history');
    const history = saved ? JSON.parse(saved) : [];
    localStorage.setItem('trucker_route_history', JSON.stringify([historyItem, ...history]));
    routeSavedRef.current = true;
  };

  const clearRoute = () => {
    if (currentDestination !== 'Standby') {
      saveRouteToHistory('CANCELLED');
    }
    setWaypoints([]);
    setDestinationCoords(null);
    setCurrentDestination('Standby');
    setRoutePoints([]);
    routeDistancesRef.current = [];
    setMilesRemaining(0);
    setEta('--:-- --');
    setWeatherAlerts([]);
    setRouteWeatherForecast([]);
    if (routeGroupRef.current) {
      routeGroupRef.current.clearLayers();
      currentSegmentLineRef.current = null;
    }
    if (context) context.setNavTarget(null);
  };

  const fetchRouteWeather = async (coords: [number, number][], distMi: number) => {
    try {
      if (coords.length < 10) return;
      
      // Sample points every ~50 miles for better coverage
      const sampleInterval = Math.max(1, Math.floor(coords.length / (distMi / 50)));
      const sampledPoints: { lat: number, lon: number, dist: number }[] = [];
      
      for (let i = sampleInterval; i < coords.length; i += sampleInterval) {
        sampledPoints.push({
          lat: coords[i][0],
          lon: coords[i][1],
          dist: (i / coords.length) * distMi
        });
      }
      
      // Always include the destination
      if (sampledPoints.length === 0 || sampledPoints[sampledPoints.length - 1].dist < distMi - 5) {
        sampledPoints.push({
          lat: coords[coords.length - 1][0],
          lon: coords[coords.length - 1][1],
          dist: distMi
        });
      }
      
      const forecasts = await Promise.all(sampledPoints.map(async (p) => {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,weather_code,wind_speed_10m,visibility&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.current) return null;
        
        const getWeatherDetails = (code: number) => {
          if (code === 0) return { condition: 'Clear', icon: Sun };
          if (code >= 1 && code <= 3) return { condition: 'Cloudy', icon: Cloud };
          if (code === 45 || code === 48) return { condition: 'Fog', icon: Cloud };
          if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { condition: 'Rain', icon: CloudRain };
          if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { condition: 'Snow', icon: CloudSnow };
          if (code >= 95 && code <= 99) return { condition: 'Storm', icon: CloudLightning };
          return { condition: 'Clear', icon: Sun };
        };
        
        const details = getWeatherDetails(data.current.weather_code);
        const hoursToPoint = p.dist / 65; 
        const eta = new Date(Date.now() + hoursToPoint * 3600000);
        const timeStr = eta.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        
        // Detect alerts
        const alerts = [];
        const windSpeed = data.current.wind_speed_10m;
        const temp = data.current.temperature_2m;
        const visibility = data.current.visibility;
        const code = data.current.weather_code;

        if (windSpeed > 35) {
          alerts.push({ 
            type: 'HIGH WINDS', 
            severity: windSpeed > 50 ? 'SEVERE' : 'WARNING', 
            value: `${Math.round(windSpeed)} MPH`,
            icon: Wind
          });
        }
        
        if (visibility < 1609) { // Less than 1 mile
          alerts.push({ 
            type: 'FOG / LOW VIS', 
            severity: visibility < 800 ? 'SEVERE' : 'WARNING', 
            value: `${(visibility / 1609).toFixed(1)} MI`,
            icon: Cloud
          });
        }

        const isIcyCode = [66, 67].includes(code);
        const isPrecipitation = (code >= 51 && code <= 65) || (code >= 80 && code <= 82) || (code >= 45 && code <= 48);
        if (isIcyCode || (temp < 32 && isPrecipitation)) {
          alerts.push({ 
            type: 'ICY ROADS', 
            severity: 'SEVERE', 
            value: 'Freezing Conditions',
            icon: CloudSnow
          });
        }

        if ([65, 82].includes(code)) {
          alerts.push({ 
            type: 'HEAVY RAIN', 
            severity: 'WARNING', 
            value: 'Reduced Traction',
            icon: CloudRain
          });
        }

        if ([75, 86].includes(code)) {
          alerts.push({ 
            type: 'HEAVY SNOW', 
            severity: 'SEVERE', 
            value: 'Low Visibility',
            icon: CloudSnow
          });
        }

        if (code >= 95 && code <= 99) {
          alerts.push({ 
            type: 'THUNDERSTORM', 
            severity: 'SEVERE', 
            value: 'Severe Weather',
            icon: CloudLightning
          });
        }

        return {
          time: timeStr,
          temp: Math.round(temp),
          icon: details.icon,
          condition: details.condition,
          lat: p.lat,
          lon: p.lon,
          alerts
        };
      }));
      
      const validForecasts = forecasts.filter(f => f !== null);
      if (validForecasts.length > 0) {
        setRouteWeatherForecast(validForecasts);
        
        const allAlerts = validForecasts.flatMap(f => f?.alerts.map(a => ({ ...a, time: f.time, lat: f.lat, lon: f.lon, condition: f.condition })) || []);
        setWeatherAlerts(allAlerts);
        
        if (allAlerts.length > 0) {
          const severeAlert = allAlerts.find(a => a.severity === 'SEVERE');
          if (severeAlert) {
            speak(`Severe weather alert: ${severeAlert.type} hazards detected along your route near ${severeAlert.time}.`);
          } else {
            speak(`Weather advisory: Potential hazards detected along your route.`);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch route weather", e);
    }
  };

  const geocodeDestination = async (
    target?: string,
    coords?: { lat: number; lon: number }
  ): Promise<{ lat: number; lon: number; name: string } | null> => {
    const query = target || searchQuery;

    if (coords) {
      return { lat: coords.lat, lon: coords.lon, name: target || "Selected Location" };
    }

    if (query && query.trim()) {
      const [lat, lon] = userLocation;
      const geoData = await searchPlaces(query, lat, lon, HERE_API_KEY || undefined);

      if (!geoData || geoData.length === 0) {
        throw new Error("Geocoding failed: Location not found.");
      }

      return {
        lat: parseFloat(geoData[0].lat),
        lon: parseFloat(geoData[0].lon),
        name: geoData[0].display_name.split(',')[0],
      };
    }

    if (destinationCoords) {
      return { lat: destinationCoords[0], lon: destinationCoords[1], name: currentDestination };
    }

    if (waypoints.length > 0) {
      const lastWp = waypoints[waypoints.length - 1];
      return { lat: lastWp.lat, lon: lastWp.lon, name: lastWp.address };
    }

    return null;
  };

  const calculateTruckRoute = async (
    destLat: number,
    destLon: number
  ): Promise<{ coords: [number, number][]; distMi: number; durationSec: number; steps: any[] } | null> => {
    if (!HERE_API_KEY) return null;

    const heightCm = Math.round(truckProfile.height * 30.48);
    const weightKg = Math.round(truckProfile.weight * 0.453592);
    const lengthCm = Math.round(truckProfile.length * 30.48);
    const widthCm = Math.round(truckProfile.width * 30.48);
    const axleWeightKg = Math.round(truckProfile.axleWeight * 0.453592);
    
    const hereUrl = new URL('https://router.hereapi.com/v8/routes');
    hereUrl.searchParams.append('transportMode', 'truck');
    hereUrl.searchParams.append('origin', `${userLocation[0]},${userLocation[1]}`);
    
    waypoints.forEach(wp => {
      hereUrl.searchParams.append('via', `${wp.lat},${wp.lon}`);
    });
    
    hereUrl.searchParams.append('destination', `${destLat},${destLon}`);
    hereUrl.searchParams.append('return', 'summary,actions,instructions,incidents,polyline,turnByTurnActions');
    hereUrl.searchParams.append('spans', 'length,truckAttributes,incidents,speedLimit,laneInfo');
    hereUrl.searchParams.append('vehicle[height]', heightCm.toString());
    hereUrl.searchParams.append('vehicle[grossWeight]', weightKg.toString());
    hereUrl.searchParams.append('vehicle[length]', lengthCm.toString());
    hereUrl.searchParams.append('vehicle[width]', widthCm.toString());
    hereUrl.searchParams.append('vehicle[axleCount]', truckProfile.axleCount.toString());
    hereUrl.searchParams.append('vehicle[weightPerAxle]', axleWeightKg.toString());
    hereUrl.searchParams.append('vehicle[trailerCount]', truckProfile.trailerCount.toString());
    
    if (truckProfile.tunnelCategory && truckProfile.tunnelCategory !== 'NONE') {
      hereUrl.searchParams.append('vehicle[tunnelCategory]', truckProfile.tunnelCategory);
    }

    if (truckProfile.hazmat) {
      const classes = truckProfile.hazmatClasses.length > 0 
        ? truckProfile.hazmatClasses.join(',') 
        : 'explosive,gas,flammable,combustible,organic,poison,radioactive,corrosive,poisonousInhalation,harmfulToWater,other';
      hereUrl.searchParams.append('shippedHazardousGoods', classes);
    }

    // Avoidance preferences
    const avoidList: string[] = [];
    if (avoidTolls) avoidList.push('tollRoad');
    if (avoidFerries) avoidList.push('ferry');
    if (avoidUnpaved) avoidList.push('dirtRoad');
    if (avoidList.length > 0) {
      hereUrl.searchParams.append('avoid[features]', avoidList.join(','));
    }

    // Alternative routes
    hereUrl.searchParams.append('alternatives', '2');

    hereUrl.searchParams.append('apiKey', HERE_API_KEY);

    const hereRouteRes = await fetch(hereUrl.toString());
    if (!hereRouteRes.ok) return null;
    
    const hereRouteData = await hereRouteRes.json();
    if (!hereRouteData.routes || hereRouteData.routes.length === 0) return null;
    
    // Process all routes
    const processedRoutes = hereRouteData.routes.map((route: any) => {
      const summary = route.sections[0].summary;
      if (!summary || isNaN(summary.length) || isNaN(summary.duration)) return null;

      const distMi = summary.length / 1609.34;
      const durationSec = summary.duration;
      
      const steps = route.sections[0].actions.map((action: any) => {
        const instruction = (action.instruction || '').replace(/\u003c/g, '<').replace(/\u003e/g, '>');
        const hasTrafficLight = instruction.toLowerCase().includes('traffic light');
        return {
          maneuver: { 
            instruction, 
            type: action.action, 
            modifier: action.direction,
            hasTrafficLight
          },
          distance: action.length,
          duration: summary.length > 0 ? (action.length / summary.length) * summary.duration : 0,
          offset: action.offset,
          lanes: (action.lanes || []).map((lane: any) => ({
            direction: (lane.directions || lane.indications || []).join(';'),
            matches: (lane.isRecommended || lane.recommendation === 'recommended') ? ['selected'] : []
          }))
        };
      });

      const coords = decode(route.sections[0].polyline).map((c: any) => [c.lat, c.lng]);

      const allIncidents = route.sections[0].incidents || [];
      const alerts = allIncidents.map((incident: any) => {
        const progress = incident.from.offset / summary.length;
        let type = 'INFO';
        let message = incident.description.value;
        let icon = Zap;
        let color = 'text-orange-400';
        let bg = 'bg-orange-400/10';

        if (incident.type === 'Congestion') {
          type = 'TRAFFIC';
          message = `Congestion: ${incident.description.value}`;
          icon = Zap;
          color = 'text-orange-400';
          bg = 'bg-orange-400/10';
        } else if (incident.type === 'Construction') {
          type = 'HAZARD';
          message = `Construction: ${incident.description.value}`;
          icon = AlertTriangle;
          color = 'text-yellow-400';
          bg = 'bg-yellow-400/10';
        } else if (incident.criticality.value === 'critical') {
          type = 'HAZARD';
          message = `Critical: ${incident.description.value}`;
          icon = AlertTriangle;
          color = 'text-red-400';
          bg = 'bg-red-400/10';
        }

        return { type, message, icon, color, bg, id: incident.id, progress };
      });

      return { coords, distMi, durationSec, steps, alerts, spans: route.sections[0].spans };
    }).filter(Boolean);

    if (processedRoutes.length === 0) return null;

    // For now, return the first one as primary, but we'll store others in state
    const primaryRoute = processedRoutes[0];
    setWeatherAlerts(primaryRoute.alerts.sort((a: any, b: any) => a.progress - b.progress));
    if (primaryRoute.spans) {
      routeSpansRef.current = primaryRoute.spans;
    }

    // Store alternative routes in state if needed
    setAlternativeRoutes(processedRoutes);
    setSelectedRouteIndex(0);
    
    return processedRoutes[0];
  };

  const calculateFallbackRoute = async (
    destLat: number,
    destLon: number
  ): Promise<{ coords: [number, number][]; distMi: number; durationSec: number; steps: any[] } | null> => {
    const waypointCoords = waypoints.map(wp => `${wp.lon},${wp.lat}`).join(';');
    
    // Try OSRM
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${userLocation[1]},${userLocation[0]};${waypointCoords ? waypointCoords + ';' : ''}${destLon},${destLat}?overview=full&geometries=geojson&steps=true`;
      const routeRes = await fetch(osrmUrl);
      if (routeRes.ok) {
        const routeData = await routeRes.json();
        if (routeData.routes && routeData.routes.length > 0) {
          const route = routeData.routes[0];
          const coords = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);
          const distMi = route.distance / 1609.34;
          const durationSec = route.duration;
          const steps = route.legs.flatMap((leg: any) => leg.steps).map((step: any) => ({
            maneuver: { instruction: step.maneuver.instruction, type: step.maneuver.type },
            distance: step.distance,
            duration: step.duration
          }));
          totalRouteDistanceRef.current = route.distance;
          return { coords, distMi, durationSec, steps };
        }
      }
    } catch (e) {
      console.error("OSRM fallback failed", e);
    }

    // Try OpenStreetMap.de
    try {
      const osrmUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${userLocation[1]},${userLocation[0]};${waypointCoords ? waypointCoords + ';' : ''}${destLon},${destLat}?overview=full&geometries=geojson&steps=true`;
      const routeRes = await fetch(osrmUrl);
      if (!routeRes.ok) throw new Error(`Routing failed: ${routeRes.status}`);
      const routeData = await routeRes.json();
      if (!routeData.routes || routeData.routes.length === 0) {
        throw new Error("No route found in OpenStreetMap.de fallback.");
      }
      const route = routeData.routes[0];
      const coords = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);
      const distMi = route.distance / 1609.34;
      const durationSec = route.duration;
      const steps = route.legs.flatMap((leg: any) => leg.steps).map((step: any) => ({
        maneuver: { instruction: step.maneuver.instruction, type: step.maneuver.type },
        distance: step.distance,
        duration: step.duration
      }));
      totalRouteDistanceRef.current = route.distance;
      return { coords, distMi, durationSec, steps };
    } catch (e) {
      console.error("OSM fallback failed", e);
    }

    return null;
  };

  const calculateOfflineRoute = (
    destLat: number,
    destLon: number
  ): { coords: [number, number][]; distMi: number; durationSec: number; steps: any[] } => {
    const R = 6371e3; // Earth radius in meters
    const toRad = (val: number) => val * Math.PI / 180;
    const lat1 = toRad(userLocation[0]);
    const lon1 = toRad(userLocation[1]);
    const lat2 = toRad(destLat);
    const lon2 = toRad(destLon);
    
    const deltaPhi = lat2 - lat1;
    const deltaLambda = lon2 - lon1;
    
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMeters = R * c;
    
    const distMi = distanceMeters / 1609.34;
    const durationSec = (distMi / 60) * 3600; // Assume 60mph
    
    const coords: [number, number][] = [userLocation, [destLat, destLon]];
    
    const steps = [{
      maneuver: { instruction: `Head straight to destination (Offline Mode)`, type: 'straight', modifier: '' },
      distance: distanceMeters,
      duration: durationSec,
      lanes: []
    }];
    
    speak("Network unavailable. Using offline straight-line routing.");
    
    return { coords, distMi, durationSec, steps };
  };

  const fetchTrafficCams = async (routeCoords: [number, number][], totalMiles: number) => {
    // Mock traffic cams along the route
    const cams = [];
    if (routeCoords.length > 0) {
      const step = Math.max(100, Math.floor(routeCoords.length / 10));
      for (let i = 0; i < routeCoords.length; i += step) {
        cams.push({
          id: `cam-${i}`,
          lat: routeCoords[i][0],
          lon: routeCoords[i][1],
          url: `https://picsum.photos/seed/cam-${i}/320/240`,
          name: `Traffic Cam ${Math.floor(i/step) + 1} - Mile ${((i / routeCoords.length) * totalMiles).toFixed(1)}`
        });
      }
    }
    setTrafficCams(cams);
  };

  const handleNavigate = async (target?: string, targetCoords?: { lat: number, lon: number }) => {
    if (context) context.setNavTarget(null);
    setError(null);
    
    if (isCalculating) return;

    if (!userLocation || isNaN(userLocation[0]) || isNaN(userLocation[1])) {
      setError("Waiting for valid GPS signal...");
      return;
    }

    let distMi = 0;
    let durationSec = 0;
    let steps: any[] = [];
    let coords: [number, number][] = [];
    setSuggestions([]);
    setIsSuggestionsVisible(false);
    setIsCalculating(true);
    setIsOffRoute(false);
    setIsSearchFocused(false);
    setIsDriving(false);
    try {
      const destination = await geocodeDestination(target, targetCoords);
      
      if (!destination) {
        setIsCalculating(false);
        return;
      }

      const { lat: destLat, lon: destLon, name: destName } = destination;
      
      if (isNaN(destLat) || isNaN(destLon)) {
        throw new Error("Invalid destination coordinates received from geocoding.");
      }
      
      setDestinationCoords([destLat, destLon]);
      setCurrentDestination(destName);
      
      let routeData = await calculateTruckRoute(destLat, destLon);
      
      if (!routeData) {
        routeData = await calculateFallbackRoute(destLat, destLon);
      }
      
      if (!routeData) {
        routeData = calculateOfflineRoute(destLat, destLon);
      }

      const { coords: routeCoords, distMi: rDistMi, durationSec: rDurationSec, steps: rSteps } = routeData;
      
      routeCoordsRef.current = routeCoords;
      setRoutePoints(routeCoords);
      setRouteSteps(rSteps);
      setMilesRemaining(rDistMi);
      setInitialMiles(rDistMi);
      setEta(new Date(Date.now() + rDurationSec * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      
      // Update map
      if (routeGroupRef.current) {
        routeGroupRef.current.clearLayers();
        currentSegmentLineRef.current = null;
      }
      
      // ... (map update logic) ...
      
      setIsCalculating(false);
      setIsDriving(true);

      let isTruckRoute = false;

      if (HERE_API_KEY) {
        try {
          const heightCm = Math.round(truckProfile.height * 30.48);
          const weightKg = Math.round(truckProfile.weight * 0.453592);
          const lengthCm = Math.round(truckProfile.length * 30.48);
          const widthCm = Math.round(truckProfile.width * 30.48);
          const axleWeightKg = Math.round(truckProfile.axleWeight * 0.453592);
          
          const hereUrl = new URL('https://router.hereapi.com/v8/routes');
          hereUrl.searchParams.append('transportMode', 'truck');
          hereUrl.searchParams.append('origin', `${userLocation[0]},${userLocation[1]}`);
          
          // Add waypoints as 'via' parameters
          waypoints.forEach(wp => {
            hereUrl.searchParams.append('via', `${wp.lat},${wp.lon}`);
          });
          
          hereUrl.searchParams.append('destination', `${destLat},${destLon}`);
          hereUrl.searchParams.append('return', 'summary,actions,instructions,incidents,polyline,turnByTurnActions');
          hereUrl.searchParams.append('spans', 'length,truckAttributes,incidents,speedLimit,laneInfo');
          hereUrl.searchParams.append('vehicle[height]', heightCm.toString());
          hereUrl.searchParams.append('vehicle[grossWeight]', weightKg.toString());
          hereUrl.searchParams.append('vehicle[length]', lengthCm.toString());
          hereUrl.searchParams.append('vehicle[width]', widthCm.toString());
          hereUrl.searchParams.append('vehicle[axleCount]', truckProfile.axleCount.toString());
          hereUrl.searchParams.append('vehicle[weightPerAxle]', axleWeightKg.toString());
          hereUrl.searchParams.append('vehicle[trailerCount]', truckProfile.trailerCount.toString());
          
          if (truckProfile.tunnelCategory && truckProfile.tunnelCategory !== 'NONE') {
            hereUrl.searchParams.append('vehicle[tunnelCategory]', truckProfile.tunnelCategory);
          }

          if (truckProfile.hazmat) {
            const classes = truckProfile.hazmatClasses.length > 0 
              ? truckProfile.hazmatClasses.join(',') 
              : 'explosive,gas,flammable,combustible,organic,poison,radioactive,corrosive,poisonousInhalation,harmfulToWater,other';
            hereUrl.searchParams.append('shippedHazardousGoods', classes);
          }
          hereUrl.searchParams.append('apiKey', HERE_API_KEY);

          const hereRouteRes = await fetch(hereUrl.toString());
          if (hereRouteRes.ok) {
            const hereRouteData = await hereRouteRes.json();
            if (hereRouteData.routes && hereRouteData.routes.length > 0) {
              const route = hereRouteData.routes[0];
              const summary = route.sections[0].summary;
              
              if (!summary || isNaN(summary.length) || isNaN(summary.duration)) {
                throw new Error("Invalid route summary data received.");
              }
              
              distMi = summary.length / 1609.34;
              totalRouteDistanceRef.current = summary.length;
              durationSec = summary.duration;
              routeDurationRef.current = durationSec;
              routeSavedRef.current = false;
              steps = route.sections[0].actions.map((action: any) => {
                const instruction = (action.instruction || '').replace(/\u003c/g, '<').replace(/\u003e/g, '>');
                const hasTrafficLight = instruction.toLowerCase().includes('traffic light');
                return {
                  maneuver: { 
                    instruction, 
                    type: action.action, 
                    modifier: action.direction,
                    hasTrafficLight
                  },
                  distance: action.length,
                  duration: summary.length > 0 ? (action.length / summary.length) * summary.duration : 0,
                  offset: action.offset,
                  lanes: (action.lanes || []).map((lane: any) => ({
                    direction: (lane.directions || lane.indications || []).join(';'),
                    matches: (lane.isRecommended || lane.recommendation === 'recommended') ? ['selected'] : []
                  }))
                };
              });

              const allIncidents = route.sections[0].incidents || [];
              const alerts = allIncidents.map((incident: any) => {
                const progress = incident.from.offset / summary.length;
                let type = 'INFO';
                let message = incident.description.value;
                let icon = Zap;
                let color = 'text-orange-400';
                let bg = 'bg-orange-400/10';

                if (incident.type === 'Congestion') {
                  type = 'TRAFFIC';
                  message = `Congestion: ${incident.description.value}`;
                  icon = Zap;
                  color = 'text-orange-400';
                  bg = 'bg-orange-400/10';
                } else if (incident.type === 'Construction') {
                  type = 'HAZARD';
                  message = `Construction: ${incident.description.value}`;
                  icon = AlertTriangle;
                  color = 'text-yellow-400';
                  bg = 'bg-yellow-400/10';
                } else if (incident.criticality.value === 'critical') {
                  type = 'HAZARD';
                  message = `Critical: ${incident.description.value}`;
                  icon = AlertTriangle;
                  color = 'text-red-400';
                  bg = 'bg-red-400/10';
                }

                return { type, message, icon, color, bg, id: incident.id, progress };
              });
              setWeatherAlerts(alerts.sort((a, b) => a.progress - b.progress));

              // Store spans for speed limits
              if (route.sections[0].spans) {
                routeSpansRef.current = route.sections[0].spans;
              }

              // Decode polyline
              if (route.sections[0].polyline) {
                const decoded = decode(route.sections[0].polyline);
                coords = decoded.polyline.map((p: any) => [p[0], p[1]]);
                routeCoordsRef.current = coords;
              }

              isTruckRoute = true;
            }
          }
        } catch (e) {
          console.warn("HERE API truck routing failed, falling back to OSRM.", e);
        }
      }

      if (!isTruckRoute) {
        // Fallback 1: Project OSRM
        try {
          const waypointCoords = waypoints.map(wp => `${wp.lon},${wp.lat}`).join(';');
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${userLocation[1]},${userLocation[0]};${waypointCoords ? waypointCoords + ';' : ''}${destLon},${destLat}?overview=full&geometries=geojson&steps=true`;
          
          const routeRes = await fetch(osrmUrl);
          if (routeRes.ok) {
            const routeData = await routeRes.json();
            if (routeData.routes && routeData.routes.length > 0) {
              const route = routeData.routes[0];
              coords = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);
              routeCoordsRef.current = coords;
              
              if (!isNaN(route.distance) && !isNaN(route.duration)) {
                distMi = route.distance / 1609.34;
                totalRouteDistanceRef.current = route.distance;
                durationSec = route.duration;
                steps = route.legs.flatMap((leg: any) => leg.steps).map((step: any) => {
                  const maneuverModifier = step.maneuver.modifier || '';
                  const osrmLanes = step.intersections?.[0]?.lanes || [];
                  
                  const hereLanes = osrmLanes.map((lane: any) => {
                      const direction = lane.indications.join(';');
                      const isSelected = lane.valid && lane.indications.some((indication: string) => maneuverModifier.includes(indication));
                      return {
                          direction: direction,
                          matches: isSelected ? ['selected'] : [],
                      };
                  });

                  return {
                      maneuver: step.maneuver,
                      distance: step.distance,
                      duration: step.duration,
                      lanes: hereLanes,
                  };
                });
                isTruckRoute = true;
              }
            }
          }
        } catch (e) {
          console.warn("Project OSRM routing failed, trying OpenStreetMap.de fallback.", e);
        }
      }

      if (!isTruckRoute) {
        // Fallback 2: OpenStreetMap.de OSRM
        try {
          const waypointCoords = waypoints.map(wp => `${wp.lon},${wp.lat}`).join(';');
          const osrmUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${userLocation[1]},${userLocation[0]};${waypointCoords ? waypointCoords + ';' : ''}${destLon},${destLat}?overview=full&geometries=geojson&steps=true`;
          
          const routeRes = await fetch(osrmUrl);
          if (!routeRes.ok) throw new Error(`Routing failed: ${routeRes.status}`);
          
          const routeData = await routeRes.json();
          if (!routeData.routes || routeData.routes.length === 0) { 
            throw new Error("No route found in OpenStreetMap.de fallback.");
          }
          
          const route = routeData.routes[0];
          coords = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);
          routeCoordsRef.current = coords;
          
          if (isNaN(route.distance) || isNaN(route.duration)) {
            throw new Error("Invalid route data from OpenStreetMap.de fallback.");
          }
          
          distMi = route.distance / 1609.34;
          totalRouteDistanceRef.current = route.distance;
          durationSec = route.duration;
          steps = route.legs.flatMap((leg: any) => leg.steps).map((step: any) => {
            const maneuverModifier = step.maneuver.modifier || '';
            const osrmLanes = step.intersections?.[0]?.lanes || [];
            
            const hereLanes = osrmLanes.map((lane: any) => {
                const direction = lane.indications.join(';');
                const isSelected = lane.valid && lane.indications.some((indication: string) => maneuverModifier.includes(indication));
                return {
                    direction: direction,
                    matches: isSelected ? ['selected'] : [],
                };
            });

            return {
                maneuver: step.maneuver,
                distance: step.distance,
                lanes: hereLanes,
            };
          });
          isTruckRoute = true;
        } catch (e) {
          console.error("All routing fallbacks failed:", e);
          
          // Offline Fallback: Straight line routing
          console.warn("Attempting offline straight-line routing fallback.");
          const R = 6371e3; // Earth radius in meters
          const toRad = (val: number) => val * Math.PI / 180;
          const lat1 = toRad(userLocation[0]);
          const lon1 = toRad(userLocation[1]);
          const lat2 = toRad(destLat);
          const lon2 = toRad(destLon);
          
          const deltaPhi = lat2 - lat1;
          const deltaLambda = lon2 - lon1;
          
          const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                    Math.cos(lat1) * Math.cos(lat2) *
                    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distanceMeters = R * c;
          
          distMi = distanceMeters / 1609.34;
          totalRouteDistanceRef.current = distanceMeters;
          durationSec = (distMi / 60) * 3600; // Assume 60mph
          
          coords = [userLocation, [destLat, destLon]];
          routeCoordsRef.current = coords;
          
          steps = [{
            maneuver: { instruction: `Head straight to destination (Offline Mode)`, type: 'straight', modifier: '' },
            distance: distanceMeters,
            duration: durationSec,
            lanes: []
          }];
          
          isTruckRoute = true;
          speak("Network unavailable. Using offline straight-line routing.");
        }
      }

      steps = steps.map((s: any) => {
        if (s.maneuver && s.maneuver.instruction) {
          s.maneuver.instruction = s.maneuver.instruction.replace(/<[^>]*>?/gm, '');
        }
        return s;
      });
      setRouteSteps(steps);

      let firstManeuver = "Head towards route";
      let firstDist = "0.0";
      let maneuverIcon: React.ElementType = ArrowUp;
      if (steps[0]) {
        const step = steps[0];
        firstManeuver = step.maneuver.instruction || "Proceed to the highlighted road";
        firstDist = (step.distance / 1609.34).toFixed(1);
        maneuverIcon = getManeuverIcon(step.maneuver.type, step.maneuver.modifier);
      }
      setNextInstruction({ text: firstManeuver, distance: firstDist, icon: maneuverIcon, lanes: steps[0]?.lanes || [] });
      if (routeGroupRef.current) {
        routeGroupRef.current.clearLayers();
        currentSegmentLineRef.current = null;
      }
      const destIcon = L.divIcon({
        className: 'dest-marker',
        html: `<div class="counter-rotate flex flex-col items-center">
            <div class="bg-black text-[#D4AF37] px-3 py-1.5 rounded-xl shadow-2xl border border-[#D4AF37]/30 mb-2 whitespace-nowrap">
               <span class="text-[10px] font-black uppercase tracking-tighter">${destName}</span>
            </div>
            <div class="w-10 h-10 bg-[#D4AF37] rounded-full shadow-[0_0_30px_rgba(212,175,55,0.5)] flex items-center justify-center border-[3px] border-black animate-bounce">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="black" stroke-width="4" fill="none"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
            </div>
          </div>`,
        iconSize: [120, 80],
        iconAnchor: [60, 80]
      });
      L.marker([destLat, destLon], { icon: destIcon }).addTo(routeGroupRef.current);

      // Add waypoint markers
      waypoints.forEach((wp, index) => {
        const wpIcon = L.divIcon({
          className: 'waypoint-marker',
          html: `<div class="counter-rotate flex flex-col items-center">
              <div class="bg-black text-white px-2 py-1 rounded-lg border border-white/20 mb-1 whitespace-nowrap">
                 <span class="text-[8px] font-black uppercase tracking-tighter">${wp.type} ${index + 1}</span>
              </div>
              <div class="w-6 h-6 ${wp.type === 'PAID' ? 'bg-[#D4AF37]' : 'bg-zinc-700'} rounded-full shadow-lg flex items-center justify-center border-2 border-black">
                ${wp.type === 'PAID' ? '<svg viewBox="0 0 24 24" width="12" height="12" stroke="black" stroke-width="4" fill="none"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><path d="M12 18V6"></path></svg>' : '<svg viewBox="0 0 24 24" width="12" height="12" stroke="white" stroke-width="4" fill="none"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>'}
              </div>
            </div>`,
          iconSize: [80, 50],
          iconAnchor: [40, 50]
        });
        L.marker([wp.lat, wp.lon], { icon: wpIcon }).addTo(routeGroupRef.current);
      });

      L.polyline(coords, { color: 'black', weight: 18, opacity: 0.8, lineCap: 'round', lineJoin: 'round' }).addTo(routeGroupRef.current);
      const mainRouteLine = L.polyline(coords, { color: '#D4AF37', weight: 12, opacity: 1, lineCap: 'round', lineJoin: 'round', className: 'route-line-glow' }).addTo(routeGroupRef.current);
      routeLineRef.current = mainRouteLine;
      
      // Add direction arrows along the route
      if (coords.length > 1 && routeDistancesRef.current.length > 0) {
        const totalDist = routeDistancesRef.current[routeDistancesRef.current.length - 1];
        // Place arrows every 300 meters
        const arrowInterval = 300; 
        for (let d = arrowInterval; d < totalDist; d += arrowInterval) {
          // Find the point at distance d
          const idx = routeDistancesRef.current.findIndex(dist => dist >= d);
          if (idx > 0) {
            const p1 = coords[idx - 1];
            const p2 = coords[idx];
            
            // Calculate angle (heading) from North
            const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180 / Math.PI;
            
            const arrowIcon = L.divIcon({
              className: 'route-arrow-marker',
              html: `<div style="transform: rotate(${angle}deg)">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="#2a2205" stroke="#D4AF37" stroke-width="1.5">
                        <path d="M12 3l7 14-7-3-7 3z" />
                      </svg>
                    </div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });
            L.marker(p2, { 
              icon: arrowIcon, 
              interactive: false,
              zIndexOffset: 500
            }).addTo(routeGroupRef.current);
          }
        }
      }
      
      // Add markers for traffic lights, roundabouts, and road names
      steps.forEach((step: any) => {
        if (step.offset !== undefined && coords[step.offset]) {
          const coord = coords[step.offset];
          
          // Road Name Markers
          const instruction = step.maneuver.instruction || '';
          const roadNameMatch = instruction.match(/on (.+?) for/);
          const roadName = roadNameMatch ? roadNameMatch[1] : (instruction.split(' on ')[1] || '');
          
          if (roadName && step.distance > 8000) { // Only for steps > 5 miles
            const roadIcon = L.divIcon({
              className: 'road-name-marker',
              html: renderToStaticMarkup(<HighwayShield roadName={roadName} />),
              iconSize: [64, 64],
              iconAnchor: [32, 32]
            });
            L.marker(coord, { icon: roadIcon, zIndexOffset: 400 }).addTo(routeGroupRef.current);
          }

          if (step.maneuver.hasTrafficLight) {
            const tlIcon = L.divIcon({
              className: 'traffic-light-marker',
              html: `<div class="w-4 h-4 bg-black rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                      <div class="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
                     </div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            });
            L.marker(coord, { icon: tlIcon }).addTo(routeGroupRef.current);
          } else if (step.maneuver.instruction.toLowerCase().includes('roundabout')) {
            const raIcon = L.divIcon({
              className: 'roundabout-marker',
              html: `<div class="w-5 h-5 bg-black rounded-full border-2 border-[#D4AF37] flex items-center justify-center shadow-lg">
                      <svg viewBox="0 0 24 24" width="12" height="12" stroke="#D4AF37" stroke-width="3" fill="none"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg>
                     </div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });
            L.marker(coord, { icon: raIcon }).addTo(routeGroupRef.current);
          }
        }
      });

      setRoutePoints(coords);
      
      if (coords.length > 0) {
        const distances = [0];
        let currentDist = 0;
        const R = 6371e3; // Earth radius in meters
        for (let i = 1; i < coords.length; i++) {
          const lat1 = coords[i-1][0];
          const lon1 = coords[i-1][1];
          const lat2 = coords[i][0];
          const lon2 = coords[i][1];
          
          const phi1 = lat1 * Math.PI / 180;
          const phi2 = lat2 * Math.PI / 180;
          const deltaPhi = (lat2 - lat1) * Math.PI / 180;
          const deltaLambda = (lon2 - lon1) * Math.PI / 180;

          const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                    Math.cos(phi1) * Math.cos(phi2) *
                    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          currentDist += R * c;
          distances.push(currentDist);
        }
        routeDistancesRef.current = distances;
      } else {
        routeDistancesRef.current = [];
      }

      routeLineRef.current = null; // Reset pre-calculated line
      currentSegmentLineRef.current = null;
      lastSimIdxRef.current = -1;

      // Add road labels and highway shields along the route
      if (coords.length > 0 && routeDistancesRef.current.length > 0) {
        let lastRoadName = '';
        let lastLabelDist = -10000; // meters

        // Use spans if available for better precision, otherwise fallback to steps
        const sourceData = (routeSpansRef.current && routeSpansRef.current.length > 0)
          ? routeSpansRef.current
          : steps.map((s: any) => ({
              name: s.maneuver?.instruction?.match(/on (.+?) for/i)?.[1] || s.maneuver?.instruction?.match(/onto (.+?)(?:$|\s)/i)?.[1],
              offset: s.offset,
              length: s.distance
            }));

        let accumulatedDist = 0;
        sourceData.forEach((item: any) => {
          const roadName = (item.name || '').replace(/<[^>]*>?/gm, '').trim();
          const offset = item.offset !== undefined ? item.offset : -1;

          if (roadName && offset !== -1 && coords[offset]) {
            const currentDist = routeDistancesRef.current[offset] || accumulatedDist;
            const distSinceLast = currentDist - lastLabelDist;

            // Place label if road name changed OR every 10km (approx 6 miles)
            if (roadName !== lastRoadName || distSinceLast > 10000) {
              const shieldMarkup = renderToStaticMarkup(<HighwayShield roadName={roadName} />);
              const labelIcon = L.divIcon({
                className: 'route-label-marker',
                html: `<div class="counter-rotate flex items-center justify-center scale-50 md:scale-75 hover:scale-100 transition-transform duration-300 drop-shadow-2xl">
                        ${shieldMarkup}
                      </div>`,
                iconSize: [100, 40],
                iconAnchor: [50, 20]
              });
              L.marker(coords[offset], {
                icon: labelIcon,
                zIndexOffset: 1000,
                interactive: false
              }).addTo(routeGroupRef.current);

              lastRoadName = roadName;
              lastLabelDist = currentDist;
            }
          }
          accumulatedDist += (item.length || 0);
        });
      }
      
      // Fetch POIs along the route
      const fetchRoutePOIs = async (points: [number, number][], totalDistMi: number) => {
        if (points.length < 2) return;
        
        const allRoutePois: any[] = [];

        if (HERE_API_KEY) {
          try {
            // Sample every ~50 miles for HERE API to get dense coverage along the route
            const hereSampledPoints: [number, number][] = [];
            hereSampledPoints.push(points[0]);
            if (totalDistMi > 50) {
              const numSamples = Math.floor(totalDistMi / 50);
              for (let i = 1; i <= numSamples; i++) {
                const idx = Math.floor((i / (numSamples + 1)) * (points.length - 1));
                hereSampledPoints.push(points[idx]);
              }
            } else if (points.length > 20) {
              hereSampledPoints.push(points[Math.floor(points.length / 2)]);
            }
            hereSampledPoints.push(points[points.length - 1]);

            // Fetch in batches of 5
            for (let i = 0; i < hereSampledPoints.length; i += 5) {
              const batch = hereSampledPoints.slice(i, i + 5);
              const promises = batch.map(async (p) => {
                // Categories: 700-7600-0116 (Truck Stop), 700-7600-0115 (Weigh Station), 700-7600-0224 (Rest Area)
                const url = `https://browse.search.hereapi.com/v1/browse?at=${p[0]},${p[1]}&categories=700-7600-0116,700-7600-0115,700-7600-0224&limit=50&apiKey=${HERE_API_KEY}`;
                const res = await fetch(url);
                if (!res.ok) return [];
                const data = await res.json();
                return data.items.map((item: any) => {
                  let type = 'Truck Stop';
                  if (item.categories?.some((c: any) => c.id === '700-7600-0115')) type = 'Weigh Station';
                  else if (item.categories?.some((c: any) => c.id === '700-7600-0224')) type = 'Rest Area';
                  return {
                    name: item.title,
                    lat: item.position.lat,
                    lon: item.position.lng,
                    type
                  };
                });
              });
              const results = await Promise.all(promises);
              allRoutePois.push(...results.flat());
            }
          } catch (e) {
            console.warn("HERE API POI fetch failed, falling back to Gemini", e);
          }
        }

        if (allRoutePois.length === 0) {
          // Fallback to Gemini
          const sampledPoints: [number, number][] = [];
          sampledPoints.push(points[0]); // Start
          
          // Sample every ~100 miles along the entire route
          if (totalDistMi > 100) {
            const numSamples = Math.floor(totalDistMi / 100);
            for (let i = 1; i <= numSamples; i++) {
              const idx = Math.floor((i / (numSamples + 1)) * (points.length - 1));
              sampledPoints.push(points[idx]);
            }
          } else if (points.length > 20) {
            sampledPoints.push(points[Math.floor(points.length / 2)]); // Mid
          }
          
          sampledPoints.push(points[points.length - 1]); // End
          
          // Fetch in batches of 3 to avoid rate limits while remaining fast
          for (let i = 0; i < sampledPoints.length; i += 3) {
            const batch = sampledPoints.slice(i, i + 3);
            const promises = batch.map(p => fetchTruckPOIs(p[0], p[1]).catch(e => {
              console.warn("Failed to fetch POIs for route point", p, e);
              return [];
            }));
            const results = await Promise.all(promises);
            allRoutePois.push(...results.flat());
          }
        }
        
        // Filter duplicates by name and location
        const uniquePois = Array.from(new Map(allRoutePois.map(item => [item.name + item.lat + item.lon, item])).values());
        setPois(prev => {
          const combined = [...prev, ...uniquePois];
          return Array.from(new Map(combined.map(item => [item.name + item.lat + item.lon, item])).values());
        });
      };
      
      fetchRoutePOIs(coords, distMi).catch(err => console.error("Fetch route POIs failed:", err));
      fetchRouteWeather(coords, distMi).catch(err => console.error("Fetch route weather failed:", err));

      setMilesRemaining(parseFloat(distMi.toFixed(1)));
      setInitialMiles(distMi);
      fetchTrafficCams(coords, distMi);
      setCurrentDestination(destName);
      setSearchQuery('');
      const arrival = new Date();
      arrival.setSeconds(arrival.getSeconds() + durationSec);
      setEta(arrival.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
      const bounds = routeGroupRef.current.getBounds();
      if (bounds.isValid()) { 
        try {
          // First, provide a smooth overview of the entire route
          mapInstanceRef.current.fitBounds(bounds, { 
            padding: [100, 100], 
            animate: true, 
            duration: 1.5 
          });

          // After a short delay to appreciate the route, zoom into the starting position
          setTimeout(() => {
            if (isValidLatLng(userLocation) && mapInstanceRef.current) {
              const center = L.latLng(userLocation[0], userLocation[1]);
              mapInstanceRef.current.flyTo(center, 17, { 
                animate: true, 
                duration: 1.5,
                easeLinearity: 0.25
              }); 
            }
          }, 2000);
        } catch (e) {
          console.error("Map transition error in handleNavigate:", e);
        }
      }
      setIsCalculating(false);

      const firstManeuverText = steps[0] ? (steps[0].maneuver.instruction || "Proceed to the highlighted road") : "Head towards route";
      const firstDistNum = steps[0] ? parseFloat((steps[0].distance / 1609.34).toFixed(1)) : 0;

      let initialPhrase = `Starting route to ${destName}. `;
      if (firstDistNum > 0) {
        if (firstDistNum > 2) {
          initialPhrase += `Continue for ${firstDistNum} miles, then ${firstManeuverText}`;
        } else {
          initialPhrase += `In ${firstDistNum} miles, ${firstManeuverText}`;
        }
      } else {
        initialPhrase += firstManeuverText;
      }
      
      speak(initialPhrase);
      
      // Prevent the useEffect from speaking this again
      lastSpokenRef.current = firstManeuverText;
      spokenDistancesRef.current.clear();
      if (firstDistNum <= 2) spokenDistancesRef.current.add('2');
      if (firstDistNum <= 1) spokenDistancesRef.current.add('1');
      if (firstDistNum <= 0.2) spokenDistancesRef.current.add('0.2');

      if (alternativeRoutes.length > 1) {
        setIsRoutePreview(true);
        setIsDriving(false);
      } else if (!isDriving) {
        toggleDriving();
      }
            } catch (err: any) { 
      console.error("Routing Error:", err); 
      let errorMessage = 'Failed to calculate route. Please check destination or network.';
      const errMessage = (err && typeof err === 'object' && 'message' in err) ? (err as any).message : '';
      
      if (errMessage.includes('Geocoding failed')) {
        errorMessage = 'Could not find the specified location. Please try a different search term.';
      } else if (errMessage.includes('Routing failed')) {
        errorMessage = 'Could not find a route to the specified location.';
      } else if (errMessage.includes('No route found')) {
        errorMessage = 'No route found to the destination.';
      }
      setError(errorMessage);
      setIsCalculating(false); 
    }
  };

  useEffect(() => {
    if (isMapReady) {
      if (initialTarget) {
        handleNavigate(initialTarget).catch(err => console.error("Initial navigation failed:", err));
      } else if (destinationCoords && routePoints.length === 0 && !isCalculating) {
        // Resume navigation if we have a persisted destination but no active route
        handleNavigate().catch(err => console.error("Resuming navigation failed:", err));
      }
    }
  }, [initialTarget, isMapReady]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    
    try {
      const initialPos = userLocation || FALLBACK_LOCATION;
      const map = L.map(mapRef.current, { 
        center: initialPos, 
        zoom: 15, 
        rotate: true,
        bearing: 0,
        zoomControl: false, 
        attributionControl: false,
        preferCanvas: true,
        wheelPxPerZoomLevel: 120,
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true
      } as any);
      mapInstanceRef.current = map;
      map.on('moveend', () => {
        if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
        moveTimerRef.current = setTimeout(() => {
          const center = map.getCenter();
          setMapCenter([center.lat, center.lng]);
        }, 300);
      });
      map.on('zoomend', () => setZoom(map.getZoom()));
      baseLayerGroupRef.current = L.layerGroup().addTo(map);
      trafficLayerGroupRef.current = L.layerGroup().addTo(map);
      weatherLayerGroupRef.current = L.layerGroup().addTo(map);
      const tileOptions = {
        tileSize: 256,
        maxZoom: 20,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 4
      };

      if (mapStyle === 'SATELLITE') {
        L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&hl=en&x={x}&y={y}&z={z}', { 
          maxZoom: 22,
          maxNativeZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '&copy; Google Maps'
        }).addTo(baseLayerGroupRef.current);
      } else if (mapStyle === 'MAPTILER') {
        const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY || '4D6H6eQaS6oyaQmgNGly';
        const layer = L.tileLayer(`https://api.maptiler.com/maps/019cd5fd-dec5-7287-b677-66a58dc4ff50/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`, {
          maxZoom: 22,
          maxNativeZoom: 20,
          attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(baseLayerGroupRef.current);
        
        let initialFallbackTriggered = false;
        layer.on('tileerror', () => {
          if (!initialFallbackTriggered && baseLayerGroupRef.current) {
            initialFallbackTriggered = true;
            baseLayerGroupRef.current.clearLayers();
            L.tileLayer('https://{s}.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}', { 
              maxZoom: 22,
              maxNativeZoom: 20,
              subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            }).addTo(baseLayerGroupRef.current);
          }
        });
      } else if (HERE_API_KEY) {
        let initialFallbackTriggered = false;
        const customStyleHrn = 'hrn:here:data::org675124033:03a188-df4d962e9';
        const hereBase = L.tileLayer(`https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/png8?apiKey=${HERE_API_KEY}&style=${customStyleHrn}`, {
          ...tileOptions
        }).addTo(baseLayerGroupRef.current);
        
        // Fallback to Google Maps if HERE API key is invalid or fails
        hereBase.on('tileerror', () => {
          if (!initialFallbackTriggered && baseLayerGroupRef.current) {
            initialFallbackTriggered = true;
            baseLayerGroupRef.current.clearLayers();
            L.tileLayer('https://{s}.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}', { 
              maxZoom: 22,
              maxNativeZoom: 20,
              subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            }).addTo(baseLayerGroupRef.current);
          }
        });
      } else {
        L.tileLayer('https://{s}.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}', { 
          maxZoom: 22,
          maxNativeZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        }).addTo(baseLayerGroupRef.current);
      }
      routeGroupRef.current = L.featureGroup().addTo(map);
      weatherAlertGroupRef.current = L.featureGroup().addTo(map);
      poiLayerGroupRef.current = L.layerGroup().addTo(map);
      
      const userIcon = L.divIcon({
        className: 'user-marker transition-transform duration-500 ease-linear',
        html: `<div class="relative flex items-center justify-center w-full h-full">
            <div class="absolute w-14 h-14 bg-[#D4AF37]/10 rounded-full animate-ping"></div>
            <div class="absolute w-10 h-10 bg-[#D4AF37]/20 rounded-full animate-pulse"></div>
            <div class="w-10 h-10 bg-black rounded-full shadow-[0_0_25px_rgba(212,175,55,0.8)] flex items-center justify-center border-[2.5px] border-[#D4AF37] z-10 overflow-visible">
              <div class="relative w-full h-full flex items-center justify-center vehicle-pointer transition-transform duration-300">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#D4AF37" class="drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]">
                  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                </svg>
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-[#D4AF37]/30 blur-md rounded-full"></div>
              </div>
            </div>
          </div>`,
        iconSize: [60, 60],
        iconAnchor: [30, 30]
      });
      
      map.on('dragstart', () => {
        setIsFollowMode(false);
      });
      
      map.on('rotatestart', () => {
        setIsFollowMode(false);
      });
      
      map.on('rotate', () => {
        setMapBearing((map as any).getBearing() || 0);
      });

      map.on('click', () => {
        setIsNorthUp(prev => !prev);
      });

      map.on('contextmenu', (e: any) => {
        const { lat, lng } = e.latlng;
        L.popup()
          .setLatLng(e.latlng)
          .setContent(`
            <div class="flex flex-col gap-2 p-1">
              <button class="set-location-btn bg-[#D4AF37] text-black px-3 py-1.5 rounded font-bold text-xs uppercase tracking-wider" data-lat="${lat}" data-lng="${lng}">
                Set as Current Location
              </button>
              <button class="add-waypoint-btn bg-zinc-800 text-white px-3 py-1.5 rounded font-bold text-xs uppercase tracking-wider border border-zinc-700" data-lat="${lat}" data-lng="${lng}">
                Add as Stop
              </button>
            </div>
          `)
          .openOn(map);
      });

      const handleMapPopupClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('set-location-btn')) {
          const lat = parseFloat(target.getAttribute('data-lat') || '0');
          const lng = parseFloat(target.getAttribute('data-lng') || '0');
          if (setUserLocationRef.current) {
            setUserLocationRef.current([lat, lng]);
            map.closePopup();
            setIsFollowMode(true);
          }
        }
        if (target.classList.contains('add-waypoint-btn')) {
          const lat = parseFloat(target.getAttribute('data-lat') || '0');
          const lng = parseFloat(target.getAttribute('data-lng') || '0');
          const newWaypoint = {
            id: `wp-${Date.now()}`,
            address: `Custom Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            lat,
            lon: lng,
            type: 'PAID' as const
          };
          if (setWaypointsRef.current) {
            setWaypointsRef.current(prev => [...prev, newWaypoint]);
            map.closePopup();
          }
        }
      };
      
      document.addEventListener('click', handleMapPopupClick);

      let moveEndTimeout: any = null;
      map.on('moveend', () => {
        if (moveEndTimeout) clearTimeout(moveEndTimeout);
        moveEndTimeout = setTimeout(() => {
          if (!mapInstanceRef.current) return;
          const center = mapInstanceRef.current.getCenter();
          
          const shouldFetchPois = (lat: number, lon: number) => {
            if (!lastPoiFetchRef.current) return true;
            const { time, lat: lastLat, lon: lastLon } = lastPoiFetchRef.current;
            const now = Date.now();
            if (now - time > 15 * 60 * 1000) return true; // 15 minutes
            
            // Calculate distance
            const R = 3958.8; // miles
            const dLat = (lat - lastLat) * Math.PI / 180;
            const dLon = (lon - lastLon) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lastLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distance = R * c;
            
            return distance >= 10;
          };

          if (!isFetchingPoisRef.current && shouldFetchPois(center.lat, center.lng)) {
            isFetchingPoisRef.current = true;
            setIsFetchingPois(true);
            lastPoiFetchRef.current = { time: Date.now(), lat: center.lat, lon: center.lng };
            
            Promise.all([
              fetchTruckPOIs(center.lat, center.lng),
              fetchMajorChains(center.lat, center.lng),
              fetchHERETruckStops(center.lat, center.lng)
            ])
              .then(([poiData, chainData, hereData]) => {
                const combinedRaw = [...poiData, ...chainData, ...hereData];
                const seenInBatch = new Set();
                const combined = combinedRaw.filter(p => {
                  const id = `${p.lat}-${p.lon}-${p.name}`;
                  if (seenInBatch.has(id)) return false;
                  seenInBatch.add(id);
                  return true;
                });

                if (combined.length > 0) {
                  setPois(prev => {
                    const existingIds = new Set(prev.map(p => `${p.lat}-${p.lon}-${p.name}`));
                    const newPois = combined.filter(p => !existingIds.has(`${p.lat}-${p.lon}-${p.name}`));
                    return [...prev, ...newPois];
                  });
                }
              })
              .catch(err => console.error("Moveend POI fetch failed:", err))
              .finally(() => {
                isFetchingPoisRef.current = false;
                setIsFetchingPois(false);
              });
          }
        }, 1000);
      });

      userMarkerRef.current = L.marker(initialPos, { icon: userIcon, zIndexOffset: 5000 }).addTo(map);
      setIsMapReady(true);

      const interval = setInterval(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 3000);
      
      return () => { 
        clearInterval(interval); 
        document.removeEventListener('click', handleMapPopupClick);
        if (moveEndTimeout) clearTimeout(moveEndTimeout);
        if (mapInstanceRef.current) { 
          mapInstanceRef.current.remove(); 
          mapInstanceRef.current = null; 
        }
      };
    } catch (err) {
      console.error("Map initialization failed:", err);
      setError("Failed to initialize map. Please refresh.");
    }
  }, []);

  useEffect(() => {
    if (!trafficLayerGroupRef.current) return;
    
    trafficLayerGroupRef.current.clearLayers();
    if (showTraffic && HERE_API_KEY) {
      L.tileLayer(`https://traffic.maps.hereapi.com/v3/flow/mc/{z}/{x}/{y}/png8?apiKey=${HERE_API_KEY}`, {
        tileSize: 256,
        maxZoom: 20,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 4,
        subdomains: ['1', '2', '3', '4']
      }).addTo(trafficLayerGroupRef.current);
    }
  }, [showTraffic]);

  useEffect(() => {
    if (!weatherLayerGroupRef.current) return;
    
    weatherLayerGroupRef.current.clearLayers();
    if (showWeather && zoom >= 5) {
      // Fetch latest radar timestamp from RainViewer
      fetch('https://api.rainviewer.com/public/weather-maps.json')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data && data.radar && data.radar.past && data.radar.past.length > 0) {
            const latestTimestamp = data.radar.past[data.radar.past.length - 1].time;
            L.tileLayer(`https://tilecache.rainviewer.com/v2/radar/${latestTimestamp}/256/{z}/{x}/{y}/2/1_1.png`, {
              tileSize: 256,
              opacity: 0.7,
              transparent: true,
              attribution: 'RainViewer',
              maxZoom: 20,
              zIndex: 100
            }).addTo(weatherLayerGroupRef.current);
          }
        })
        .catch(err => console.error("Failed to load weather radar:", err));
    }
  }, [showWeather, zoom]);

  useEffect(() => {
    if (isMapReady && userLocation) {
      const shouldFetchPois = (lat: number, lon: number) => {
        if (!lastPoiFetchRef.current) return true;
        const { time, lat: lastLat, lon: lastLon } = lastPoiFetchRef.current;
        const now = Date.now();
        if (now - time > 5 * 60 * 1000) return true; // 5 minutes
        
        // Calculate distance
        const R = 3958.8; // miles
        const dLat = (lat - lastLat) * Math.PI / 180;
        const dLon = (lon - lastLon) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lastLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return distance >= 5; // 5 miles
      };

      if (!shouldFetchPois(userLocation[0], userLocation[1]) || isFetchingPoisRef.current) return;

      console.log("Fetching initial POIs for location:", userLocation);
      isFetchingPoisRef.current = true;
      setIsFetchingPois(true);
      lastPoiFetchRef.current = { time: Date.now(), lat: userLocation[0], lon: userLocation[1] };
      
      Promise.all([
        fetchTruckPOIs(userLocation[0], userLocation[1]),
        fetchMajorChains(userLocation[0], userLocation[1]),
        fetchHERETruckStops(userLocation[0], userLocation[1])
      ])
        .then(([poiData, chainData, hereData]) => {
          const combinedRaw = [...poiData, ...chainData, ...hereData];
          const seenInBatch = new Set();
          const combined = combinedRaw.filter(p => {
            const id = `${p.lat}-${p.lon}-${p.name}`;
            if (seenInBatch.has(id)) return false;
            seenInBatch.add(id);
            return true;
          });

          console.log(`Fetched ${combined.length} POIs total (Gemini + HERE)`);
          setPois(prev => {
            const existingIds = new Set(prev.map(p => `${p.lat}-${p.lon}-${p.name}`));
            const newPois = combined.filter(p => !existingIds.has(`${p.lat}-${p.lon}-${p.name}`));
            return [...prev, ...newPois];
          });
        })
        .catch(err => {
          console.error("Failed to fetch POIs:", err);
        })
        .finally(() => {
          isFetchingPoisRef.current = false;
          setIsFetchingPois(false);
        });
    }
  }, [isMapReady, userLocation]);

  useEffect(() => {
    if (!weatherAlertGroupRef.current || !isMapReady) return;

    weatherAlertGroupRef.current.clearLayers();

    weatherAlerts.forEach((alert) => {
      const alertIcon = L.divIcon({
        className: 'weather-alert-marker',
        html: renderToStaticMarkup(
          <div className="flex flex-col items-center group">
            <div className={`px-2 py-1 rounded-lg border shadow-xl mb-1 whitespace-nowrap transition-all group-hover:scale-110 ${
              alert.severity === 'SEVERE' ? 'bg-red-600 border-red-400 text-white' : 'bg-amber-500 border-amber-300 text-black'
            }`}>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase tracking-tighter">{alert.type}: {alert.value}</span>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-full shadow-lg flex items-center justify-center border-2 border-black transition-all group-hover:scale-110 ${
              alert.severity === 'SEVERE' ? 'bg-red-600' : 'bg-amber-500'
            }`}>
              {alert.type === 'WIND' ? <Wind className="w-3 h-3 text-white" /> : 
               alert.type === 'ICE' ? <Zap className="w-3 h-3 text-white" /> :
               alert.type === 'STORM' ? <CloudLightning className="w-3 h-3 text-white" /> :
               <AlertTriangle className="w-3 h-3 text-white" />}
            </div>
          </div>
        ),
        iconSize: [100, 60],
        iconAnchor: [50, 60]
      });

      L.marker([alert.lat, alert.lon], { icon: alertIcon })
        .bindPopup(`
          <div class="p-3 min-w-[150px]">
            <div class="flex items-center gap-2 mb-2">
              <div class="p-1.5 rounded-lg ${alert.severity === 'SEVERE' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="3" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <div class="font-black text-zinc-900 text-sm uppercase tracking-tight">${alert.severity} ${alert.type}</div>
            </div>
            <div class="text-xs font-bold text-zinc-600 mb-3">Expected around ${alert.time}</div>
            <div class="p-2 bg-zinc-50 rounded-xl border border-zinc-100 mb-3">
              <div class="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Condition</div>
              <div class="text-xs font-bold text-zinc-900">${alert.condition} - ${alert.value}</div>
            </div>
          </div>
        `)
        .addTo(weatherAlertGroupRef.current);
    });
  }, [weatherAlerts, isMapReady]);

  useEffect(() => {
    if (!mapInstanceRef.current || !currentSpeedLimit) {
      if (speedLimitMarkerRef.current) {
        mapInstanceRef.current.removeLayer(speedLimitMarkerRef.current);
        speedLimitMarkerRef.current = null;
      }
      return;
    }

    const icon = L.divIcon({
      className: 'speed-limit-marker',
      html: `<div class="counter-rotate">${renderToStaticMarkup(<SpeedLimitSign limit={currentSpeedLimit} currentSpeed={context?.speed || 0} />)}</div>`,
      iconSize: [48, 64],
      iconAnchor: [24, 32]
    });

    if (!speedLimitMarkerRef.current) {
      if (isValidLatLng(userLocation)) {
        speedLimitMarkerRef.current = L.marker(userLocation, { icon }).addTo(mapInstanceRef.current);
      }
    } else {
      if (isValidLatLng(userLocation)) {
        speedLimitMarkerRef.current.setLatLng(userLocation);
        speedLimitMarkerRef.current.setIcon(icon);
      }
    }
  }, [currentSpeedLimit, context?.speed, userLocation]);

  useEffect(() => {
    if (isOverviewMode && mapInstanceRef.current && routeGroupRef.current) {
      const bounds = routeGroupRef.current.getBounds();
      if (bounds.isValid()) {
        mapInstanceRef.current.flyToBounds(bounds, {
          padding: [50, 50],
          duration: 1.5,
          easeLinearity: 0.25
        });
      }
    }
  }, [isOverviewMode]);

  useEffect(() => {
    if (isValidLatLng(userLocation) && userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userLocation);
      if (isFollowMode && mapInstanceRef.current) { 
        try {
          mapInstanceRef.current.panTo(userLocation, { animate: true, duration: 0.5, easeLinearity: 0.25 }); 
        } catch (e) {
          console.error("PanTo error:", e);
        }
      }
    }
    if (isDriving && userLocation) {
      updateNavigationState(userLocation).catch(err => console.error("Navigation update failed:", err));
    }

    // Periodic ETA update even when stationary
    const etaInterval = setInterval(() => {
      if (isDriving && userLocation) {
        updateNavigationState(userLocation).catch(err => console.error("Navigation periodic update failed:", err));
      }
    }, 30000); // Every 30 seconds

    let targetHeading = context?.heading || 0;
    
    if (isDriving && userLocation && routeCoordsRef.current.length > 0) {
      const currentIdx = lastSimIdxRef.current;
      if (currentIdx >= 0 && currentIdx < routeCoordsRef.current.length - 1) {
        const p1 = routeCoordsRef.current[currentIdx];
        const p2 = routeCoordsRef.current[currentIdx + 1];
        const dy = p2[0] - p1[0];
        const dx = Math.cos(Math.PI / 180 * p1[0]) * (p2[1] - p1[1]);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        targetHeading = (90 - angle + 360) % 360;
      }
    }

    if (mapRef.current) {
      let currentBearing = 0;
      if (isOverviewMode || isNorthUp) {
        if (mapInstanceRef.current) {
          animateBearing(0);
          currentBearing = 0;
        }
      } else if (isFollowMode) {
        if (mapInstanceRef.current) {
          animateBearing(targetHeading);
          currentBearing = targetHeading;
        }
      } else {
        if (mapInstanceRef.current) {
          currentBearing = (mapInstanceRef.current as any).getBearing() || 0;
        }
      }
      
      mapRef.current.style.setProperty('--map-rotation', `0deg`);
      
      // The marker stays upright relative to the screen by default.
      // To point to targetHeading relative to the map, we rotate it by targetHeading - currentBearing.
      let vehicleRotation = targetHeading - currentBearing;
      // Normalize to 0-360
      vehicleRotation = (vehicleRotation % 360 + 360) % 360;
      
      mapRef.current.style.setProperty('--vehicle-rotation', `${vehicleRotation}deg`);
    }

    return () => clearInterval(etaInterval);
  }, [userLocation, isDriving, isOverviewMode, isFollowMode, isNorthUp, context?.heading]);

  useEffect(() => {
    console.log("Current POIs:", pois.length, pois);
    if (!poiLayerGroupRef.current) return;

    poiLayerGroupRef.current.clearLayers();

    if (showPois) {
      const markers: L.Marker[] = [];
      let validPoisCount = 0;
      pois.forEach(poi => {
        const category = getPoiCategory(poi.type, poi.name);
        if (!poiFilters.has(category)) return;

        try {
          if (typeof poi.lat !== 'number' || typeof poi.lon !== 'number' || isNaN(poi.lat) || isNaN(poi.lon)) {
            console.warn("Invalid POI coordinates:", poi);
            return;
          }

          // Filter by 250 miles
          const distMeters = L.latLng(mapCenter[0], mapCenter[1]).distanceTo(L.latLng(poi.lat, poi.lon));
          if (distMeters > 250 * 1609.34) return;

          validPoisCount++;
          const iconElement = getPoiIcon(poi.type, poi.name);
          if (iconElement) {
            const iconHtml = renderToStaticMarkup(iconElement);
            const icon = L.divIcon({
              className: 'custom-poi-icon',
              html: `<div class="counter-rotate">${iconHtml}</div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 32],
              popupAnchor: [0, -32]
            });
            const marker = L.marker([poi.lat, poi.lon], { icon });
            
            marker.on('click', () => {
              setSelectedPoi(poi);
            });

            marker.bindPopup(`
              <div class="p-3 min-w-[180px]">
                <div class="font-black text-zinc-900 text-sm mb-1">${poi.name}</div>
                <div class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">${poi.type}</div>
                <button 
                  class="view-poi-details-btn w-full py-2 bg-[#D4AF37] text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#B8860B] transition-colors mb-2"
                  data-poi-id="${poi.name}-${poi.lat}-${poi.lon}"
                >
                  View Details
                </button>
                <div class="flex flex-col gap-2">
                  <button 
                    class="add-poi-stop-btn add-deadhead w-full py-2 bg-zinc-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-zinc-600 transition-colors flex items-center justify-center gap-2"
                    data-poi-id="${poi.name}-${poi.lat}-${poi.lon}"
                    data-type="DEADHEAD"
                  >
                    Add Deadhead
                  </button>
                  <button 
                    class="add-poi-stop-btn add-paid w-full py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                    data-poi-id="${poi.name}-${poi.lat}-${poi.lon}"
                    data-type="PAID"
                  >
                    Add Paid
                  </button>
                </div>
              </div>
            `);
            markers.push(marker);

            // Add Entrance Marker if available
            if (poi.entrance) {
              const entranceIcon = L.divIcon({
                className: 'custom-entrance-icon',
                html: renderToStaticMarkup(getEntranceIcon()),
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              });
              const entranceMarker = L.marker([poi.entrance.lat, poi.entrance.lon], { 
                icon: entranceIcon,
                title: `${poi.name} Entrance`
              });
              entranceMarker.bindPopup(`<div class="p-2 font-bold text-xs">${poi.name} Entrance</div>`);
              markers.push(entranceMarker);
            }

            // Add Exit Marker if available
            if (poi.exit) {
              const exitIcon = L.divIcon({
                className: 'custom-exit-icon',
                html: renderToStaticMarkup(getExitIcon()),
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              });
              const exitMarker = L.marker([poi.exit.lat, poi.exit.lon], { 
                icon: exitIcon,
                title: `${poi.name} Exit`
              });
              exitMarker.bindPopup(`<div class="p-2 font-bold text-xs">${poi.name} Exit</div>`);
              markers.push(exitMarker);
            }
          }
        } catch (err) {
          console.error("Failed to render POI icon:", err, poi);
        }
      });

      console.log(`Rendering ${markers.length} POI markers out of ${validPoisCount} valid POIs within range`);

      // Add event delegation for the "Add as Stop" button in popups
      const handlePopupClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('add-poi-stop-btn')) {
          const poiId = target.getAttribute('data-poi-id');
          const type = target.getAttribute('data-type') as 'DEADHEAD' | 'PAID';
          const poi = pois.find(p => `${p.name}-${p.lat}-${p.lon}` === poiId);
          if (poi) {
            addWaypoint(poi, type);
            mapInstanceRef.current?.closePopup();
          }
        } else if (target.classList.contains('view-poi-details-btn')) {
          const poiId = target.getAttribute('data-poi-id');
          const poi = pois.find(p => `${p.name}-${p.lat}-${p.lon}` === poiId);
          if (poi) {
            setSelectedPoi(poi);
            mapInstanceRef.current?.closePopup();
          }
        }
      };

      document.addEventListener('click', handlePopupClick);
      markers.forEach(marker => marker.addTo(poiLayerGroupRef.current));
      
      return () => document.removeEventListener('click', handlePopupClick);
    }
  }, [pois, showPois, poiFilters, mapCenter]);

  const upcomingPois = useMemo(() => {
    if (!isDriving || pois.length === 0 || routePoints.length === 0 || !userLocation) return [];

    // Find user's closest point on route
    let userMinDist = Infinity;
    let userRouteIdx = 0;
    for (let i = 0; i < routePoints.length; i++) {
      const d = Math.pow(routePoints[i][0] - userLocation[0], 2) + Math.pow(routePoints[i][1] - userLocation[1], 2);
      if (d < userMinDist) {
        userMinDist = d;
        userRouteIdx = i;
      }
    }

    const upcoming = pois
      .filter(poi => {
        if (typeof poi.lat !== 'number' || typeof poi.lon !== 'number' || isNaN(poi.lat) || isNaN(poi.lon)) return false;
        const category = getPoiCategory(poi.type, poi.name);
        return poiFilters.has(category);
      })
      .map(poi => {
        let poiMinDist = Infinity;
        let poiRouteIdx = 0;
        for (let i = 0; i < routePoints.length; i++) {
          const d = Math.pow(routePoints[i][0] - poi.lat, 2) + Math.pow(routePoints[i][1] - poi.lon, 2);
          if (d < poiMinDist) {
            poiMinDist = d;
            poiRouteIdx = i;
          }
        }
        
        // Rough distance from user to POI in miles
        const R = 3959; // Earth's radius in miles
        const dLat = (poi.lat - userLocation[0]) * Math.PI / 180;
        const dLon = (poi.lon - userLocation[1]) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(userLocation[0] * Math.PI / 180) * Math.cos(poi.lat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        return {
          ...poi,
          routeIdx: poiRouteIdx,
          distance
        };
      })
      .filter(poi => poi.routeIdx >= userRouteIdx - 5 && poi.distance > 0.5) // Allow slightly behind, but filter out very close ones
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4); // Show top 4 upcoming

    return upcoming;
  }, [isDriving, pois, routePoints, userLocation, poiFilters]);


  const toggleDriving = () => {
    if (milesRemaining <= 0) return;

    const newIsDriving = !isDriving;
    setIsDriving(newIsDriving);

    if (newIsDriving) {
      // Just started driving
      setIsOverviewMode(false); // Ensure we are in follow mode
      setIsNorthUp(false); // Default to Heading Up mode
      if (mapInstanceRef.current && userMarkerRef.current) {
        // The marker is at the start of the route, which is the user's location
        const startPosition = userMarkerRef.current.getLatLng(); 
        if (startPosition && !isNaN(startPosition.lat) && !isNaN(startPosition.lng)) {
          try {
            mapInstanceRef.current.flyTo(startPosition, 17, { // Zoom level 17 is good for driving
              animate: true,
              duration: 1.5 
            });
          } catch (e) {
            console.error("FlyTo error in toggleDriving:", e);
          }
        }
      }
      setIsFollowMode(true);
    } else {
      // Stopped driving
      if (eldStatus?.status === 'DRIVE') {
        setEldStatus?.(prev => ({ ...prev, status: 'ON' }));
      }
    }
  }

  return (
    <div className="h-full w-full relative bg-[#050505] overflow-hidden font-sans">
      <style>{`
        .glow-overlay {
          filter: drop-shadow(0 0 5px rgba(212, 175, 55, 0.8));
        }
      `}</style>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vmax] h-[150vmax] pointer-events-none z-0">
        <div 
          id="nav-map-container" 
          ref={mapRef} 
          className={`h-full w-full transition-all duration-500 ease-linear pointer-events-auto ${isOverviewMode ? 'opacity-90' : 'opacity-100'} ${mapStyle === 'TUE_GOLD' ? 'tue-gold-black-tiles-v2' : 'white-gold-map-tiles'}`} 
          style={{ transform: 'rotate(var(--map-rotation, 0deg))' }}
        />
      </div>

      {/* Route Comparison Overlay */}
      {isRoutePreview && alternativeRoutes.length > 1 ? (
        <div className="absolute top-20 left-4 right-4 z-[2000] flex flex-col gap-3 pointer-events-auto">
          <div className="bg-zinc-900/95 backdrop-blur-md border border-[#D4AF37]/30 rounded-2xl p-4 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[#D4AF37] font-bold text-sm uppercase tracking-widest">Select Route</h3>
              <button onClick={() => setIsRoutePreview(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {alternativeRoutes.map((route, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedRouteIndex(idx);
                    setRoutePoints(route.coords);
                    setRouteSteps(route.steps);
                    setMilesRemaining(route.distMi);
                    setInitialMiles(route.distMi);
                    setEta(new Date(Date.now() + route.durationSec * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                    
                    if (routeGroupRef.current && mapInstanceRef.current) {
                      routeGroupRef.current.clearLayers();
                      currentSegmentLineRef.current = null;
                      const polyline = L.polyline(route.coords, {
                        color: idx === selectedRouteIndex ? '#D4AF37' : '#555',
                        weight: 8,
                        opacity: 0.9,
                        lineJoin: 'round',
                        lineCap: 'round',
                        className: 'route-line-glow'
                      }).addTo(routeGroupRef.current);
                      routeLineRef.current = polyline;
                    }
                  }}
                  className={`flex-shrink-0 w-48 p-4 rounded-xl border-2 transition-all ${
                    idx === selectedRouteIndex 
                      ? 'bg-[#D4AF37]/10 border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]' 
                      : 'bg-black/40 border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${idx === selectedRouteIndex ? 'text-[#D4AF37]' : 'text-zinc-500'}`}>
                      {idx === 0 ? 'Fastest' : `Alt ${idx}`}
                    </span>
                    <span className="text-xs font-bold text-white">{route.distMi.toFixed(1)} mi</span>
                  </div>
                  <div className="text-xl font-bold text-white mb-1">
                    {Math.floor(route.durationSec / 3600)}h {Math.floor((route.durationSec % 3600) / 60)}m
                  </div>
                  <div className="text-[10px] text-zinc-400 font-medium">
                    {route.alerts.length} alerts • {route.steps.length} steps
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setIsRoutePreview(false);
                setIsDriving(true);
                speak("Starting navigation.");
              }}
              className="w-full mt-4 py-3 rounded-xl bg-[#D4AF37] text-black font-bold uppercase tracking-widest hover:bg-[#F3E5AB] transition-colors active:scale-95"
            >
              Start Navigation
            </button>
          </div>
        </div>
      ) : null}

      {/* Explore Mode Overlay */}
      {isExploreMode && (
        <div className="absolute bottom-24 left-4 right-4 z-[2000] flex flex-col gap-3 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-md border border-[#D4AF37]/30 rounded-2xl p-4 shadow-2xl pointer-events-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#D4AF37] animate-spin-slow" />
                <h3 className="text-[#D4AF37] font-bold text-xs uppercase tracking-widest">Explore Mode</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Live Traffic</span>
                <button 
                  onClick={() => setIsExploreMode(false)}
                  className="ml-2 p-1 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
                  title="Exit Explore Mode"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                <div className="text-[8px] font-bold text-zinc-500 uppercase mb-1">Nearby POIs</div>
                <div className="text-xs font-bold text-white">{pois.length} found</div>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                <div className="text-[8px] font-bold text-zinc-500 uppercase mb-1">Traffic Cams</div>
                <div className="text-xs font-bold text-white">{trafficCams.length} active</div>
              </div>
            </div>

            {trafficCams.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {trafficCams.slice(0, 5).map((cam, idx) => (
                  <div key={idx} className="flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden border border-zinc-800 relative group">
                    <img src={cam.url} alt={cam.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-[8px] font-bold text-white truncate">
                      {cam.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* POI Detail Modal */}
      {selectedPoi && (
        <div className="absolute inset-0 z-[4000] flex items-center justify-center p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-[2rem] landscape:rounded-2xl w-full max-w-md overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 max-h-[calc(100vh-4rem)] flex flex-col">
            <div className="relative h-24 md:h-32 landscape:h-16 shrink-0 bg-gradient-to-br from-[#D4AF37]/20 to-black border-b border-white/5 p-4 md:p-8 landscape:p-4 flex items-end justify-between">
              <div>
                <h3 className="text-lg md:text-2xl landscape:text-lg font-black text-white uppercase tracking-tight leading-tight">{selectedPoi.name}</h3>
                <p className="text-[10px] landscape:text-[8px] font-bold text-[#D4AF37] uppercase tracking-widest mt-1 landscape:mt-0">{selectedPoi.type}</p>
              </div>
              <button 
                onClick={() => setSelectedPoi(null)}
                className="absolute top-4 right-4 md:top-6 md:right-6 landscape:top-2 landscape:right-2 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors"
              >
                <X className="w-5 h-5 landscape:w-4 landscape:h-4" />
              </button>
            </div>
            
            <div className="p-4 md:p-8 landscape:p-4 space-y-4 md:space-y-8 landscape:space-y-3 overflow-y-auto custom-scrollbar">
              {selectedPoi.amenities && selectedPoi.amenities.length > 0 && (
                <div>
                  <h4 className="text-[10px] landscape:text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-2 md:mb-4 landscape:mb-2 flex items-center gap-2">
                    <Star className="w-3 h-3 landscape:w-2 landscape:h-2 text-[#D4AF37]" />
                    Available Amenities
                  </h4>
                  <div className="grid grid-cols-2 gap-2 md:gap-3 landscape:gap-1.5">
                    {selectedPoi.amenities.map((amenity: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 md:gap-3 landscape:gap-1.5 bg-white/5 p-2 md:p-3 landscape:p-1.5 rounded-xl landscape:rounded-lg border border-white/5">
                        <div className="w-1.5 h-1.5 landscape:w-1 landscape:h-1 rounded-full bg-[#D4AF37]" />
                        <span className="text-xs landscape:text-[9px] font-bold text-zinc-300">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedPoi.entrance && (
                <div className="mt-4">
                  <h4 className="text-[10px] landscape:text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <MapPin className="w-3 h-3 landscape:w-2 landscape:h-2 text-[#D4AF37]" />
                    Entrance
                  </h4>
                  <p className="text-xs landscape:text-[9px] font-bold text-zinc-300 bg-white/5 p-2 rounded-xl">
                    {selectedPoi.entrance.lat.toFixed(6)}, {selectedPoi.entrance.lon.toFixed(6)}
                  </p>
                </div>
              )}
              {selectedPoi.exit && (
                <div className="mt-4">
                  <h4 className="text-[10px] landscape:text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <MapPin className="w-3 h-3 landscape:w-2 landscape:h-2 text-[#D4AF37]" />
                    Exit
                  </h4>
                  <p className="text-xs landscape:text-[9px] font-bold text-zinc-300 bg-white/5 p-2 rounded-xl">
                    {selectedPoi.exit.lat.toFixed(6)}, {selectedPoi.exit.lon.toFixed(6)}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 md:gap-4 landscape:gap-2">
                <button 
                  onClick={() => {
                    addWaypoint(selectedPoi, 'DEADHEAD');
                    setSelectedPoi(null);
                  }}
                  className="flex flex-col items-center justify-center gap-2 md:gap-3 landscape:gap-1 p-4 md:p-6 landscape:p-3 bg-white/5 border border-white/5 rounded-2xl landscape:rounded-xl hover:border-zinc-500 hover:bg-zinc-500/10 transition-all group"
                >
                  <GitMerge className="w-5 h-5 md:w-6 md:h-6 landscape:w-4 landscape:h-4 text-zinc-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] md:text-[10px] landscape:text-[8px] font-black text-white uppercase tracking-widest">Add Deadhead</span>
                </button>
                <button 
                  onClick={() => {
                    addWaypoint(selectedPoi, 'PAID');
                    setSelectedPoi(null);
                  }}
                  className="flex flex-col items-center justify-center gap-2 md:gap-3 landscape:gap-1 p-4 md:p-6 landscape:p-3 bg-emerald-600/10 border border-emerald-600/20 rounded-2xl landscape:rounded-xl hover:bg-emerald-600 hover:border-emerald-600 transition-all group"
                >
                  <CircleDollarSign className="w-5 h-5 md:w-6 md:h-6 landscape:w-4 landscape:h-4 text-emerald-500 group-hover:text-white group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] md:text-[10px] landscape:text-[8px] font-black text-emerald-500 group-hover:text-white uppercase tracking-widest">Add Paid</span>
                </button>
              </div>

              <button 
                onClick={() => {
                  handleNavigate(selectedPoi.name, { lat: selectedPoi.lat, lon: selectedPoi.lon });
                  setSelectedPoi(null);
                }}
                className="w-full py-3 md:py-4 landscape:py-2 bg-[#D4AF37] hover:bg-[#B8860B] text-black rounded-2xl landscape:rounded-xl text-xs landscape:text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-3 landscape:gap-2"
              >
                <NavIcon className="w-4 h-4 landscape:w-3 landscape:h-3" />
                Navigate Directly
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[4000] bg-rose-500/20 backdrop-blur-xl border border-rose-500/50 rounded-2xl p-6 flex items-center gap-4 shadow-2xl animate-in fade-in duration-300">
          <AlertTriangle className="w-8 h-8 text-rose-400" />
          <div>
            <h3 className="text-rose-400 font-black">Routing Error</h3>
            <p className="text-white/80 text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-white/50 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Off Route Recalculation Banner */}
      {isOffRoute && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-[3000] w-full max-w-[600px] px-4 md:px-6 transition-all duration-700 ${milesRemaining > 0 ? 'top-[160px] md:top-[200px]' : 'top-[calc(2rem+env(safe-area-inset-top))]'}`}>
          <div className="bg-rose-600 border-2 border-white/20 rounded-3xl p-3 md:p-4 flex items-center gap-3 md:gap-4 shadow-[0_20px_60px_rgba(225,29,72,0.4)]">
            <div className="bg-white p-1.5 md:p-2 rounded-xl text-rose-600">
              <RotateCcw className={`w-5 h-5 md:w-6 md:h-6 ${isCalculating ? 'animate-spin' : ''}`} strokeWidth={3} />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-black uppercase italic tracking-tighter text-base md:text-lg leading-none">Off Route Detected</h3>
              <p className="text-white/80 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-0.5 md:mt-1">
                {context?.autoReroute ? 'Recalculating route...' : 'Manual recalculation required'}
              </p>
            </div>
            {!context?.autoReroute && (
              <button 
                onClick={() => handleReroute()}
                disabled={isCalculating}
                className="px-4 py-2 bg-white text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all shadow-lg disabled:opacity-50"
              >
                {isCalculating ? 'Recalculating...' : 'Recalculate'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* HOS Violation Warning Banner */}
      {hasViolation && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-[3000] w-full max-w-[600px] px-4 md:px-6 transition-all duration-700 ${milesRemaining > 0 ? 'top-[160px] md:top-[200px]' : 'top-[calc(2rem+env(safe-area-inset-top))]'}`}>
          <div className="bg-rose-600 border-2 border-white/20 rounded-3xl p-3 md:p-4 flex items-center gap-3 md:gap-4 shadow-[0_20px_60px_rgba(225,29,72,0.4)]">
            <div className="bg-white p-1.5 md:p-2 rounded-xl text-rose-600 animate-pulse">
              <AlertTriangle className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-black uppercase italic tracking-tighter text-base md:text-lg leading-none">HOS Violation Alert</h3>
              <p className="text-white/80 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-0.5 md:mt-1">Immediate Stop Required • Safety Protocol Active</p>
            </div>
          </div>
        </div>
      )}

      {/* Turn Instruction Header - Now Gold Themed */}
      {!isExploreMode && (
        <div className={`absolute top-0 left-0 right-0 z-[2100] transition-all duration-700 ease-in-out ${milesRemaining > 0 ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
          <div className="bg-gradient-to-b from-black/95 to-black/60 backdrop-blur-3xl border-b border-[#D4AF37]/20 p-2 md:p-6 landscape:p-2 landscape:md:p-4 pt-[calc(0.5rem+env(safe-area-inset-top))] md:pt-[calc(1rem+env(safe-area-inset-top))] landscape:pt-[calc(0.25rem+env(safe-area-inset-top))] shadow-2xl">
            <div className="flex flex-col md:flex-row landscape:flex-row items-start md:items-center landscape:items-center justify-between gap-2 md:gap-4 landscape:gap-2">
              <div className="flex items-center gap-2 md:gap-10 landscape:gap-4 w-full md:w-auto landscape:w-auto">
                <div className="bg-[#D4AF37] p-2 md:p-6 landscape:p-3 rounded-xl md:rounded-[2rem] landscape:rounded-2xl shadow-2xl shadow-[#D4AF37]/30 shrink-0">
                  <nextInstruction.icon className="w-6 h-6 md:w-14 md:h-14 landscape:w-8 landscape:h-8 text-black" strokeWidth={4} />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[7px] md:text-[10px] landscape:text-[8px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-0.5 md:mb-1 landscape:mb-0">Next Turn</span>
                  <div className="flex items-baseline gap-1 md:gap-3 landscape:gap-1.5">
                    <span className="text-3xl md:text-7xl landscape:text-4xl font-[1000] text-white tracking-tighter leading-none">{nextInstruction.distance}</span>
                    <span className="text-base md:text-3xl landscape:text-xl font-black text-[#D4AF37] uppercase">mi</span>
                    {nextInstruction.maneuver?.hasTrafficLight && (
                      <div className="ml-2 md:ml-6 bg-rose-500/20 p-1.5 md:p-3 rounded-xl border border-rose-500/30 flex items-center gap-2 animate-pulse">
                        <TrafficCone className="w-3 h-3 md:w-6 md:h-6 text-rose-500" />
                        <span className="text-[8px] md:text-[12px] font-black text-rose-500 uppercase tracking-wider">Traffic Light</span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm md:text-2xl landscape:text-lg font-black text-white italic uppercase tracking-tight mt-0.5 md:mt-1 landscape:mt-0 flex items-center gap-1 md:gap-3 landscape:gap-1.5 truncate max-w-full md:max-w-[500px] landscape:max-w-[300px]">
                    {(() => {
                      const highwayMatch = nextInstruction.text.match(/(I-|US-|SR-|Hwy|Route|State Route)\s*(\d+[A-Z]?)/i);
                      if (highwayMatch) {
                        return (
                          <div className="scale-50 md:scale-75 origin-left shrink-0">
                            <HighwayShield roadName={highwayMatch[0]} />
                          </div>
                        );
                      }
                      return null;
                    })()}
                    <span className="truncate">{nextInstruction.text}</span>
                  </span>
                </div>
              </div>
              
              <div className="flex flex-row md:flex-col landscape:flex-row items-center md:items-end landscape:items-center justify-between w-full md:w-auto landscape:w-auto mt-1 md:mt-0 landscape:mt-0">
                <div className="flex flex-col items-end landscape:items-end landscape:ml-4">
                  <div className="flex items-center gap-1 md:gap-3 landscape:gap-2 mb-0 md:mb-4 landscape:mb-0">
                    <div className="flex flex-col items-end mr-1 md:mr-4 landscape:mr-2">
                      <span className="text-[7px] md:text-[10px] landscape:text-[8px] font-black text-zinc-500 uppercase tracking-widest">ETA</span>
                      <span className="text-base md:text-2xl landscape:text-xl font-[1000] text-white tracking-tighter italic">{eta}</span>
                    </div>
                  </div>
                  <span className="text-[8px] md:text-[12px] landscape:text-[9px] font-black text-zinc-500 uppercase tracking-[0.4em] mb-0.5 md:mb-2 landscape:mb-0 hidden md:block landscape:hidden">Truck Route</span>
                  <span className="text-xl md:text-4xl landscape:text-2xl font-[1000] text-[#D4AF37] tracking-tighter uppercase italic hidden md:block landscape:hidden">{currentDestination}</span>
                </div>
              </div>
            </div>

            {/* Prominent Lane Guidance Bar */}
            {nextInstruction.lanes && nextInstruction.lanes.length > 0 && (
              <div className="mt-3 md:mt-6 landscape:mt-3 pt-3 md:pt-6 landscape:pt-3 border-t border-white/10 flex flex-col items-center overflow-hidden">
                <span className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Lane Guidance</span>
                <div className="flex gap-2 md:gap-4 landscape:gap-3 bg-black/50 p-2 md:p-4 landscape:p-2.5 rounded-2xl md:rounded-[2rem] landscape:rounded-2xl border border-white/5 overflow-x-auto no-scrollbar max-w-full">
                  {nextInstruction.lanes.map((lane, idx) => {
                    const { rotation, active } = parseLane(lane);
                    return (
                      <div key={idx} className={`p-2 md:p-4 landscape:p-2.5 rounded-xl md:rounded-2xl landscape:rounded-xl border-2 transition-all duration-500 shrink-0 flex items-center justify-center ${active ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-white shadow-[0_0_20px_rgba(212,175,55,0.4)] scale-110' : 'bg-white/5 border-white/10 text-white/20'}`}>
                        <ArrowUp className="w-5 h-5 md:w-10 md:h-10 landscape:w-6 landscape:h-6" strokeWidth={active ? 4 : 3} style={{ transform: `rotate(${rotation}deg)` }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map Controls consolidated in nav-map-controls below */}

      {/* Weather Overlay */}
      {!selectedPoi && !isExploreMode && (
        <div id="nav-weather-overlay" className={`absolute left-2 md:left-4 z-[2000] flex flex-col gap-1 md:gap-2 transition-all duration-700 -translate-y-1/2 ${milesRemaining > 0 ? 'top-[55%]' : 'top-1/2'} scale-90 md:scale-100 origin-left`}>
          {weatherAlerts.length > 0 && (
            <div className="bg-black/90 backdrop-blur-2xl border border-red-500/30 rounded-xl md:rounded-2xl p-2 md:p-3 shadow-2xl w-36 md:w-64 animate-pulse">
              <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 border-b border-red-500/20 pb-1.5">
                <div className="p-1 md:p-1.5 bg-red-500 rounded-lg">
                  <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] md:text-[10px] font-black text-red-500 uppercase tracking-wider">Route Hazards ({weatherAlerts.length})</span>
                  <span className="text-[6px] md:text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Weather Impact Report</span>
                </div>
              </div>
              <div className="space-y-1.5 max-h-32 md:max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {weatherAlerts.map((alert, idx) => {
                  const Icon = alert.icon || AlertTriangle;
                  return (
                    <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                      alert.severity === 'SEVERE' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'
                    }`}>
                      <div className={`p-1 rounded-md ${alert.severity === 'SEVERE' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>
                        <Icon className="w-3 h-3 md:w-4 md:h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[6px] md:text-[8px] font-black text-zinc-500 uppercase">{alert.time}</span>
                          <span className={`text-[6px] md:text-[7px] font-black px-1 rounded uppercase ${alert.severity === 'SEVERE' ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'}`}>
                            {alert.severity}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] md:text-[10px] font-black text-white uppercase truncate">{alert.type}</span>
                          <span className="text-[7px] md:text-[9px] font-bold text-[#D4AF37] uppercase tracking-tighter">{alert.value}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-black/90 backdrop-blur-2xl border border-[#D4AF37]/20 rounded-xl md:rounded-2xl p-2 md:p-4 shadow-2xl w-36 md:w-56 transition-all">
            <div className="flex items-center justify-between mb-1.5 md:mb-3">
               <weather.icon className="w-4 h-4 md:w-6 md:h-6 text-[#D4AF37]" />
               <div className="flex flex-col items-end">
                 <span className="text-xl md:text-3xl font-bold text-white tracking-tight leading-none">{weather.temp}</span>
                 <span className="text-[7px] md:text-[9px] font-bold text-[#D4AF37] uppercase tracking-widest leading-none mt-0.5">{weather.condition}</span>
               </div>
            </div>
            <div className="space-y-1 md:space-y-2 mb-1.5 md:mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 md:gap-2 text-zinc-500">
                  <Wind className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                  <span className="text-[7px] md:text-[9px] font-bold uppercase tracking-widest">Wind</span>
                </div>
                <span className="text-[8px] md:text-[11px] font-bold text-white uppercase">{weather.wind}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 md:gap-2 text-zinc-500">
                  <Eye className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                  <span className="text-[7px] md:text-[9px] font-bold uppercase tracking-widest">Vis</span>
                </div>
                <span className="text-[8px] md:text-[11px] font-bold text-white uppercase">{weather.visibility}</span>
              </div>
            </div>
            
            {isDriving && routeWeatherForecast.length > 0 ? (
              <div className="pt-2 border-t border-white/10 flex justify-between">
                {routeWeatherForecast.slice(0, 3).map((point, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <span className="text-[7px] md:text-[8px] font-black text-[#D4AF37] uppercase">{point.time}</span>
                    <point.icon className="w-3 h-3 md:w-4 md:h-4 text-white/70" />
                    <span className="text-[9px] md:text-[11px] font-bold text-white">{point.temp}°</span>
                  </div>
                ))}
              </div>
            ) : weather.forecast && weather.forecast.length > 0 && (
              <div className="pt-2 border-t border-white/10 flex justify-between">
                {weather.forecast.slice(0, 3).map((day, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <span className="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase">{day.day}</span>
                    <day.icon className="w-3 h-3 md:w-4 md:h-4 text-white/70" />
                    <span className="text-[9px] md:text-[11px] font-bold text-white">{day.max}°</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weigh Station Alert */}
          {weighStationAlert && (
            <div className={`mt-2 backdrop-blur-2xl border rounded-xl md:rounded-2xl p-2 md:p-3 shadow-2xl w-36 md:w-56 transition-all ${
              weighStationAlert.status === 'BYPASS' 
                ? 'bg-emerald-900/90 border-emerald-500/30' 
                : 'bg-red-900/90 border-red-500/30 animate-pulse'
            }`}>
              <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                <div className={`p-1 md:p-1.5 rounded-lg ${
                  weighStationAlert.status === 'BYPASS' ? 'bg-emerald-500' : 'bg-red-500'
                }`}>
                  <Scale className="w-3 h-3 md:w-4 md:h-4 text-white" />
                </div>
                <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-wider ${
                  weighStationAlert.status === 'BYPASS' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  Weigh Station
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] md:text-xs font-bold text-white uppercase">Status</span>
                  <span className={`text-[10px] md:text-xs font-black px-1.5 py-0.5 rounded-md ${
                    weighStationAlert.status === 'BYPASS' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {weighStationAlert.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] md:text-[10px] font-bold text-zinc-400 uppercase">Distance</span>
                  <span className="text-[8px] md:text-[10px] font-bold text-white">{weighStationAlert.distance.toFixed(1)} mi</span>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming POIs */}
          {upcomingPois.length > 0 && (
            <div className="mt-2 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-xl md:rounded-2xl p-2 md:p-3 shadow-2xl w-36 md:w-56 transition-all">
              <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                <div className="p-1 md:p-1.5 bg-[#D4AF37]/20 rounded-lg">
                  <MapIcon className="w-3 h-3 md:w-4 md:h-4 text-[#D4AF37]" />
                </div>
                <span className="text-[8px] md:text-[10px] font-black text-[#D4AF37] uppercase tracking-wider">Upcoming POIs</span>
              </div>
              <div className="flex flex-col gap-1 md:gap-1.5">
                {upcomingPois.map((poi, idx) => {
                  const category = getPoiCategory(poi.type, poi.name);
                  let Icon = MapIcon;
                  let iconColor = "text-zinc-400";
                  
                  if (category === 'fuel' || category === 'major_chains') { Icon = Fuel; iconColor = "text-yellow-400"; }
                  else if (category === 'parking') { Icon = ParkingSquare; iconColor = "text-blue-400"; }
                  else if (category === 'food') { Icon = UtensilsCrossed; iconColor = "text-green-400"; }
                  else if (category === 'service') { Icon = Wrench; iconColor = "text-red-400"; }
                  else if (category === 'distribution') { Icon = Box; iconColor = "text-indigo-400"; }
                  else if (category === 'weigh_station') { Icon = Scale; iconColor = "text-emerald-400"; }

                  return (
                    <div key={idx} className="flex items-center justify-between p-1 md:p-1.5 bg-white/5 rounded-lg border border-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setSelectedPoi(poi)}>
                      <div className="flex items-center gap-1.5 md:gap-2 overflow-hidden">
                        <Icon className={`w-3 h-3 md:w-4 md:h-4 ${iconColor} shrink-0`} />
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-[8px] md:text-[10px] font-bold text-white truncate w-full">{poi.name}</span>
                          <span className="text-[6px] md:text-[8px] font-black text-zinc-500 uppercase truncate w-full">{poi.type}</span>
                        </div>
                      </div>
                      <span className="text-[7px] md:text-[9px] font-black text-[#D4AF37] whitespace-nowrap shrink-0 ml-1">
                        {poi.distance.toFixed(1)} mi
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search HUD - Gold Bordered */}
      {isSearchFocused && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-[2004] transition-all duration-500" />
      )}
      {!isExploreMode && (
        <div id="nav-search-container" className={`absolute transition-all duration-700 z-[2005] left-1/2 -translate-x-1/2 w-full max-w-[650px] px-2 md:px-6 ${milesRemaining > 0 ? 'top-[180px] md:top-[280px] opacity-0 pointer-events-none' : 'top-[calc(1rem+env(safe-area-inset-top))] landscape:top-[calc(0.5rem+env(safe-area-inset-top))] opacity-100'}`}>
          {/* Waypoints List */}
          {waypoints.length > 0 && (
            <div className="flex flex-col gap-1.5 md:gap-2 landscape:gap-1 mb-2 md:mb-4 landscape:mb-2 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between px-2 mb-0.5 md:mb-1 landscape:mb-0.5">
                <span className="text-[9px] md:text-[10px] landscape:text-[8px] font-black text-[#D4AF37] uppercase tracking-[0.3em]">Active Stops ({waypoints.length})</span>
                <button 
                  onClick={() => setWaypoints([])}
                  className="text-[8px] md:text-[9px] landscape:text-[7px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
                >
                  Clear All
                </button>
              </div>
              {waypoints.map((wp, index) => (
                <div key={wp.id} className="bg-black/90 backdrop-blur-xl border border-[#D4AF37]/30 rounded-xl md:rounded-2xl landscape:rounded-xl p-2 md:p-4 landscape:p-2 flex items-center justify-between shadow-xl">
                  <div className="flex items-center gap-2 md:gap-4 landscape:gap-2">
                    <div className="flex flex-col gap-0.5 md:gap-1 landscape:gap-0.5 mr-1 md:mr-2 landscape:mr-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveWaypoint(index, 'up'); }}
                        disabled={index === 0}
                        className="p-0.5 md:p-1 landscape:p-0.5 rounded-md md:rounded-lg landscape:rounded-md bg-white/5 text-zinc-500 hover:text-[#D4AF37] disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                      >
                        <ArrowUp className="w-2.5 h-2.5 md:w-3 md:h-3 landscape:w-2 landscape:h-2" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveWaypoint(index, 'down'); }}
                        disabled={index === waypoints.length - 1}
                        className="p-0.5 md:p-1 landscape:p-0.5 rounded-md md:rounded-lg landscape:rounded-md bg-white/5 text-zinc-500 hover:text-[#D4AF37] disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                      >
                        <ArrowUp className="w-2.5 h-2.5 md:w-3 md:h-3 landscape:w-2 landscape:h-2 rotate-180" />
                      </button>
                    </div>
                    <div className={`p-1.5 md:p-2.5 landscape:p-1.5 rounded-lg md:rounded-xl landscape:rounded-lg ${wp.type === 'PAID' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-500/20 text-zinc-500'}`}>
                      {wp.type === 'PAID' ? <CircleDollarSign className="w-3.5 h-3.5 md:w-5 md:h-5 landscape:w-4 landscape:h-4" /> : <Truck className="w-3.5 h-3.5 md:w-5 md:h-5 landscape:w-4 landscape:h-4" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[7px] md:text-[9px] landscape:text-[7px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-0.5">{wp.type} STOP {index + 1}</span>
                      <span className="text-[10px] md:text-sm landscape:text-[10px] font-bold text-white truncate max-w-[150px] md:max-w-[300px] landscape:max-w-[200px]">{wp.address}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeWaypoint(wp.id)} 
                    className="p-1.5 md:p-2.5 landscape:p-1.5 rounded-lg md:rounded-xl landscape:rounded-lg bg-white/5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90 ml-1 md:ml-2 landscape:ml-1"
                  >
                    <Trash2 className="w-3 h-3 md:w-4 md:h-4 landscape:w-3 landscape:h-3" />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => handleNavigate().catch(err => {
                  console.error("Navigation failed from start route button:", err);
                  setError("Failed to calculate route. Please try again.");
                })}
                disabled={isCalculating || !isMapReady}
                className="w-full py-2 md:py-4 landscape:py-2 bg-[#D4AF37] hover:bg-[#B8860B] text-black rounded-xl md:rounded-2xl landscape:rounded-xl text-[10px] md:text-sm landscape:text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2 md:gap-3 landscape:gap-2 mt-1 md:mt-2 landscape:mt-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCalculating ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 landscape:w-4 landscape:h-4 animate-spin" /> : <NavIcon className="w-4 h-4 md:w-5 md:h-5 landscape:w-4 landscape:h-4" />}
                <span>Start Route</span>
              </button>
            </div>
          )}

          <div className={`w-full bg-black/95 backdrop-blur-3xl ${isSuggestionsVisible && suggestions.length > 0 ? 'rounded-t-[1.5rem] md:rounded-t-[2.5rem] landscape:rounded-t-2xl' : 'rounded-[1.5rem] md:rounded-[2.5rem] landscape:rounded-2xl'} border transition-all duration-500 ${isSearchFocused ? 'border-[#D4AF37] shadow-[0_0_80px_rgba(212,175,55,0.4)] scale-[1.02]' : 'border-[#D4AF37]/20 shadow-2xl'}`}>
            <div className="flex items-center p-1.5 md:p-2 landscape:p-1.5 pl-4 md:pl-7 landscape:pl-4">
              <Search className={`w-4 h-4 md:w-6 md:h-6 landscape:w-4 landscape:h-4 mr-2 md:mr-5 landscape:mr-2 transition-colors ${isSearchFocused ? 'text-[#D4AF37]' : 'text-zinc-700'}`} />
              <input 
                id="nav-search-input"
                type="text" 
                placeholder={!isMapReady ? "System Booting..." : isCalculating ? "Mapping Path..." : "Search Address or POI..."} 
                className="flex-1 bg-transparent border-none outline-none text-white text-sm md:text-xl landscape:text-sm font-black placeholder:text-zinc-800 tracking-tight py-2 md:py-5 landscape:py-2" 
                value={searchQuery} 
                disabled={isCalculating || !isMapReady} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                onFocus={() => { setIsSearchFocused(true); setIsSuggestionsVisible(true); }} 
                onBlur={() => { 
                  // Small delay to allow onMouseDown on suggestions to fire
                  setTimeout(() => {
                    setIsSuggestionsVisible(false); 
                    setIsSearchFocused(false); 
                  }, 200);
                }} 
                onKeyDown={(e) => e.key === 'Enter' && handleNavigate().catch(err => {
                  console.error("Navigation failed from enter key:", err);
                  setError("Failed to calculate route. Please try again.");
                })}  
              />
              <button
                onClick={() => {
                  if (selectedPoi) {
                    addWaypoint(selectedPoi, 'DEADHEAD');
                    setSelectedPoi(null);
                  } else if (mapInstanceRef.current) {
                    const center = mapInstanceRef.current.getCenter();
                    addWaypoint({
                      name: `Map Center (${center.lat.toFixed(4)}, ${center.lng.toFixed(4)})`,
                      lat: center.lat,
                      lon: center.lng
                    }, 'DEADHEAD');
                  }
                }}
                disabled={!isMapReady}
                className="p-2 md:p-3 landscape:p-2 rounded-full bg-white/5 text-[#D4AF37] hover:bg-white/10 transition-all active:scale-95 mr-1 md:mr-2 landscape:mr-1 flex-shrink-0"
                title="Add current view or POI as waypoint"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5 landscape:w-4 landscape:h-4" />
              </button>
              <button id="nav-search-button" onClick={() => handleNavigate().catch(err => {
                console.error("Navigation failed from search button:", err);
                setError("Failed to calculate route. Please try again.");
              })} disabled={!isMapReady} className={`flex items-center gap-1.5 md:gap-3 landscape:gap-1.5 px-4 py-2 md:px-10 md:py-4 landscape:px-4 landscape:py-2 rounded-full transition-all active:scale-95 mr-0.5 md:mr-1 landscape:mr-0.5 ${searchQuery.trim() && !isCalculating ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' : 'bg-zinc-900 text-zinc-700'}`}>
                {isCalculating ? <Loader2 className="w-3 h-3 md:w-5 md:h-5 landscape:w-3 landscape:h-3 animate-spin" /> : <NavIcon className="w-3 h-3 md:w-5 md:h-5 landscape:w-3 landscape:h-3" />}
                <span className="text-[10px] md:text-[14px] landscape:text-[10px] font-black uppercase tracking-widest italic">{isCalculating ? 'Mapping' : 'Route'}</span>
              </button>
            </div>
          </div>
          {isSuggestionsVisible && suggestions.length > 0 && (
            <div className={`w-full bg-black/95 backdrop-blur-3xl rounded-b-[1.5rem] md:rounded-b-[2.5rem] landscape:rounded-b-2xl border-x border-b border-[#D4AF37]/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-top-2 duration-300 ${milesRemaining > 0 ? 'max-h-[150px] md:max-h-[200px] landscape:max-h-[100px]' : 'max-h-[250px] md:max-h-[400px] landscape:max-h-[200px]'} overflow-y-auto custom-scrollbar`}>
              <ul className="py-1 md:py-2 landscape:py-1">
                {suggestions.map((s, idx) => {
                  const isFirstRecommended = s.isRecommended && idx === 0;
                  const isFirstSearchResult = !s.isRecommended && (idx === 0 || suggestions[idx - 1]?.isRecommended);
                  
                  return (
                    <li key={s.place_id}>
                      {isFirstRecommended && (
                        <div className="px-4 md:px-8 landscape:px-4 py-1.5 md:py-2 bg-white/5 text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/60 border-b border-white/5 flex items-center gap-2">
                          <Star className="w-2 h-2 md:w-3 md:h-3" />
                          Nearby Recommendations
                        </div>
                      )}
                      {isFirstSearchResult && searchQuery.trim().length >= 2 && (
                        <div className="px-4 md:px-8 landscape:px-4 py-1.5 md:py-2 bg-white/5 text-[7px] md:text-[9px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/5 flex items-center gap-2">
                          <Search className="w-2 h-2 md:w-3 md:h-3" />
                          Search Results
                        </div>
                      )}
                      <div 
                        className="w-full text-left px-4 md:px-8 landscape:px-4 py-3 md:py-5 landscape:py-2 text-white hover:bg-[#D4AF37]/20 transition-all group flex items-start gap-3 md:gap-5 landscape:gap-3 border-b border-white/5 last:border-none cursor-pointer"
                        onMouseDown={() => {
                          // Optimization: Use coordinates from suggestion directly to avoid redundant search
                          setDestinationCoords([s.lat, s.lon]);
                          setCurrentDestination(s.display_name.split(',')[0]);
                          setSearchQuery(s.display_name);
                          handleNavigate().catch(err => {
                            console.error("Navigation failed from suggestion:", err);
                            setError("Failed to calculate route. Please try again.");
                          });
                        }}
                      >
                        <div className="mt-0.5 md:mt-1 p-1.5 md:p-2 rounded-lg bg-white/5 group-hover:bg-[#D4AF37]/20 transition-colors">
                          <MapIcon className="w-3 h-3 md:w-4 md:h-4 text-zinc-500 group-hover:text-[#D4AF37]" />
                        </div>
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm md:text-base font-black tracking-tight group-hover:text-[#D4AF37] transition-colors">{s.display_name.split(',')[0]}</span>
                            {s.isRecommended && (
                              <span className="text-[7px] md:text-[9px] font-black bg-[#D4AF37]/20 text-[#D4AF37] px-1.5 py-0.5 rounded uppercase tracking-widest">Recommended</span>
                            )}
                          </div>
                          <span className="text-[9px] md:text-[11px] font-bold text-zinc-500 uppercase tracking-wider mt-0.5 line-clamp-1">{s.display_name.split(',').slice(1).join(',').trim()}</span>
                        </div>
                        
                        <div className="flex gap-1 md:gap-2 ml-auto">
                          <button 
                            onMouseDown={(e) => { 
                              e.stopPropagation(); 
                              if (setUserLocationRef.current) {
                                setUserLocationRef.current([s.lat, s.lon]);
                                setIsSearchFocused(false);
                                setIsFollowMode(true);
                              }
                            }}
                            className="px-2 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 hover:text-white transition-all flex items-center gap-1 md:gap-2 border border-blue-500/20"
                            title="Set as Current Location"
                          >
                            <MapPin className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest hidden md:inline">Here</span>
                          </button>
                          <button 
                            onMouseDown={(e) => { e.stopPropagation(); addWaypoint(s, 'DEADHEAD'); }}
                            className="px-2 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20 hover:text-white transition-all flex items-center gap-1 md:gap-2 border border-zinc-500/20"
                          >
                            <Truck className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest hidden md:inline">Deadhead</span>
                          </button>
                          <button 
                            onMouseDown={(e) => { e.stopPropagation(); addWaypoint(s, 'PAID'); }}
                            className="px-2 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 hover:text-white transition-all flex items-center gap-1 md:gap-2 border border-emerald-500/20"
                          >
                            <CircleDollarSign className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest hidden md:inline">Paid</span>
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Current Road Banner */}
      {isDriving && currentRoad && !isExploreMode && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[2005] pointer-events-none transition-all duration-500 animate-in slide-in-from-bottom-4">
          <div className="bg-black/80 backdrop-blur-md border border-[#D4AF37]/30 rounded-2xl px-6 py-2 shadow-2xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
            <span className="text-white font-black text-sm md:text-base uppercase tracking-widest">{currentRoad}</span>
          </div>
        </div>
      )}

      {!isExploreMode && (
      <div id="nav-map-controls" className={`absolute right-2 md:right-4 z-[2010] flex flex-col items-end gap-1 md:gap-2 transition-all duration-700 -translate-y-1/2 ${milesRemaining > 0 ? 'top-[55%]' : 'top-1/2'} scale-90 md:scale-100 origin-right`}>
        {/* Rotating Compass - Now integrated at the top of the column */}
        {!isNorthUp && (
          <div className="bg-black/90 backdrop-blur-3xl border border-[#D4AF37]/30 rounded-full p-2 md:p-3 shadow-2xl transition-all animate-in fade-in zoom-in mb-1">
            <div 
              className="transition-transform duration-300"
              style={{ transform: `rotate(${-mapBearing}deg)` }}
            >
              <Compass className="w-5 h-5 md:w-7 md:h-7 text-[#D4AF37]" />
            </div>
          </div>
        )}

        {/* Navigation Mode Controls */}
        <div className="bg-black/90 backdrop-blur-3xl border border-[#D4AF37]/30 rounded-xl md:rounded-[2rem] p-1 md:p-1.5 shadow-2xl transition-all flex flex-col gap-1">
          {isDriving && (
            <button 
              onClick={() => {
                clearRoute();
                setIsDriving(false);
              }}
              className="p-1.5 md:p-3 rounded-lg md:rounded-xl bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white transition-all border border-red-500/30"
              title="Stop Navigation"
            >
              <X className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" strokeWidth={4} />
            </button>
          )}
          <button 
            onClick={() => {
              setIsNorthUp(!isNorthUp);
              if (!isNorthUp) {
                // When switching to North Up, reset bearing
                if (mapInstanceRef.current) animateBearing(0);
              }
            }}
            className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${!isNorthUp ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-[#D4AF37] hover:bg-white/10'}`}
            title={isNorthUp ? "Switch to Heading Up" : "Switch to North Up"}
          >
            <Compass 
              className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 transition-transform duration-300" 
              style={{ transform: `rotate(${-mapBearing}deg)` }}
            />
          </button>
          
          <button 
            onClick={() => setIsRouteSettingsOpen(true)}
            className="p-1.5 md:p-3 rounded-lg md:rounded-xl bg-white/5 text-[#D4AF37] hover:bg-white/10 transition-all"
            title="Route Settings"
          >
            <Settings className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
          </button>

          <button 
            onClick={() => {
              setIsExploreMode(!isExploreMode);
              if (!isExploreMode) {
                speak("Explore mode active. Showing real-time traffic and points of interest.");
              }
            }}
            className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${isExploreMode ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-[#D4AF37] hover:bg-white/10'}`}
            title="Explore Mode"
          >
            <Compass className={`w-3.5 h-3.5 md:w-4.5 md:h-4.5 ${isExploreMode ? 'animate-pulse' : ''}`} />
          </button>
        </div>

        {/* Map Style Selection - Removed */}

        {/* POI & Utility Controls */}
        <div className="flex flex-col gap-1 md:gap-1.5 bg-black/90 backdrop-blur-3xl border border-[#D4AF37]/20 rounded-xl md:rounded-[2rem] p-1 md:p-1.5 shadow-2xl">
          <button
            onClick={() => setShowPois(!showPois)}
            className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all relative ${showPois ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-[#D4AF37]'}`}
            title="Toggle POIs"
          >
            {isFetchingPois ? (
              <Loader2 className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 animate-spin" />
            ) : (
              <Layers className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
            )}
            {isFetchingPois && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              if (userLocation) {
                isFetchingPoisRef.current = true;
                setIsFetchingPois(true);
                lastPoiFetchRef.current = { time: Date.now(), lat: userLocation[0], lon: userLocation[1] };
                
                Promise.all([
                  fetchTruckPOIs(userLocation[0], userLocation[1]),
                  fetchMajorChains(userLocation[0], userLocation[1]),
                  fetchHERETruckStops(userLocation[0], userLocation[1])
                ])
                  .then(([poiData, chainData, hereData]) => {
                    const combinedRaw = [...poiData, ...chainData, ...hereData];
                    const seenInBatch = new Set();
                    const combined = combinedRaw.filter(p => {
                      const id = `${p.lat}-${p.lon}-${p.name}`;
                      if (seenInBatch.has(id)) return false;
                      seenInBatch.add(id);
                      return true;
                    });

                    setPois(prev => {
                      const existingIds = new Set(prev.map(p => `${p.lat}-${p.lon}-${p.name}`));
                      const newPois = combined.filter(p => !existingIds.has(`${p.lat}-${p.lon}-${p.name}`));
                      return [...prev, ...newPois];
                    });
                  })
                  .catch(err => {
                    console.error("Failed to fetch POIs:", err);
                  })
                  .finally(() => {
                    isFetchingPoisRef.current = false;
                    setIsFetchingPois(false);
                  });
              }
            }}
            className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all bg-white/5 text-[#D4AF37] hover:bg-white/10`}
            title="Refresh POIs"
          >
            <RotateCcw className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
          </button>

          <button
            onClick={() => setShowHighways(!showHighways)}
            className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${showHighways ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-[#D4AF37]'}`}
            title="Toggle Highway Overlay"
          >
            <Route className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
          </button>
          
          <button
            onClick={() => setShowRoadOverlay(!showRoadOverlay)}
            className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${showRoadOverlay ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-[#D4AF37]'}`}
            title="Toggle Road Name Overlay"
          >
            <Shield className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${isFilterMenuOpen ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-[#D4AF37]'}`}
              title="Filter POIs"
            >
              <Filter strokeWidth={3} className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
            </button>
            
            {isFilterMenuOpen && (
              <div className="absolute right-full mr-2 md:mr-4 top-0 bg-black/95 backdrop-blur-3xl border border-[#D4AF37]/30 rounded-xl md:rounded-2xl p-2 md:p-3 shadow-2xl w-40 md:w-56 flex flex-col gap-1.5 md:gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-[#D4AF37] font-black text-[8px] md:text-[10px] uppercase tracking-widest border-b border-[#D4AF37]/20 pb-1 mb-0.5">Filters</h3>
                <div className="flex flex-col gap-0.5 md:gap-1">
                  {[
                    { id: 'major_chains', label: 'Major Chains' },
                    { id: 'fuel', label: 'Fuel' },
                    { id: 'parking', label: 'Parking' },
                    { id: 'rest_area', label: 'Rest Areas' },
                    { id: 'weigh_station', label: 'Scales' },
                    { id: 'food', label: 'Food' },
                    { id: 'service', label: 'Service' },
                    { id: 'distribution', label: 'Distribution' },
                    { id: 'other', label: 'Other' }
                  ].map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => {
                        setPoiFilters(prev => {
                          const next = new Set(prev);
                          if (next.has(filter.id)) next.delete(filter.id);
                          else next.add(filter.id);
                          return next;
                        });
                      }}
                      className="flex items-center justify-between text-left group py-0.5"
                    >
                      <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-tight transition-colors ${poiFilters.has(filter.id) ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>{filter.label}</span>
                      <div className={`w-2.5 h-2.5 md:w-4 md:h-4 rounded border flex items-center justify-center transition-all ${poiFilters.has(filter.id) ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-zinc-700 group-hover:border-zinc-500'}`}>
                        {poiFilters.has(filter.id) && <Check className="w-2 h-2 md:w-3 md:h-3 text-black" strokeWidth={5} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="h-px bg-[#D4AF37]/10 mx-1" />
          
          <button 
            onClick={() => setMapStyle(prev => prev === 'TUE_GOLD' ? 'MAPTILER' : prev === 'MAPTILER' ? 'SATELLITE' : 'TUE_GOLD')}
            className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${mapStyle === 'MAPTILER' || mapStyle === 'SATELLITE' ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-[#D4AF37] hover:bg-white/10'}`}
            title="Toggle Map Style"
          >
            <MapIcon className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
          </button>
          
          <button 
            onClick={() => setShowWeather(!showWeather)}
            className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${showWeather ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
            title="Weather"
          >
            <CloudRain className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
          </button>
          
          <button 
            onClick={() => setShowTraffic(!showTraffic)}
            className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${showTraffic ? 'bg-red-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
            title="Traffic"
          >
            <svg className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </button>
          
          <div className="h-px bg-[#D4AF37]/10 mx-1" />
          
          <button onClick={() => mapInstanceRef.current?.zoomIn()} className="p-1.5 md:p-3 rounded-lg md:rounded-xl bg-white/5 text-[#D4AF37] hover:bg-white/10">
            <Plus className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" strokeWidth={4} />
          </button>
          <button onClick={() => mapInstanceRef.current?.zoomOut()} className="p-1.5 md:p-3 rounded-lg md:rounded-xl bg-white/5 text-[#D4AF37] hover:bg-white/10">
            <Minus className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" strokeWidth={4} />
          </button>
          
          <button 
            onClick={() => { 
              setIsOverviewMode(!isOverviewMode);
              if (!isOverviewMode) {
                setIsFollowMode(false);
              }
            }} 
            className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${isOverviewMode ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-[#D4AF37]'} hover:bg-white/10`}
            title="Toggle Route Overview"
          >
            <MapIcon className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" strokeWidth={4} />
          </button>

          <button 
            onClick={() => { 
              if (isValidLatLng(userLocation) && mapInstanceRef.current) { 
                mapInstanceRef.current.flyTo(userLocation, 17, { duration: 1.5, easeLinearity: 0.25 }); 
                setIsFollowMode(true); 
                setIsOverviewMode(false);
              } 
            }} 
            className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${!isFollowMode || isOverviewMode ? 'bg-red-600/20 text-red-500 border border-red-500/50 animate-pulse' : 'bg-white/5 text-[#D4AF37] hover:bg-white/10'}`}
            title="Follow User"
          >
            <RotateCcw className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" strokeWidth={4} />
          </button>

          <button 
            onClick={() => {
              if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const { latitude, longitude } = position.coords;
                    if (setUserLocationRef.current) {
                      setUserLocationRef.current([latitude, longitude]);
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.flyTo([latitude, longitude], 17, { duration: 1.5, easeLinearity: 0.25 });
                        setIsFollowMode(true);
                        setIsOverviewMode(false);
                      }
                    }
                  },
                  (error) => {
                    console.warn("GPS Signal Issue:", error.message);
                    setError("Failed to get precise location.");
                  },
                  { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
              }
            }} 
            className="p-1.5 md:p-3 rounded-lg md:rounded-xl bg-blue-600/20 text-blue-500 border border-blue-500/50 hover:bg-blue-600 hover:text-white transition-all"
            title="Force GPS Update"
          >
            <MapPin className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" strokeWidth={4} />
          </button>
        </div>

        {/* TUE Branding Watermark */}
        <div className="mt-1 opacity-30 pointer-events-none flex flex-col items-end whitespace-nowrap pr-1">
          <div className="flex items-center gap-1">
            <Truck className="w-2.5 h-2.5 text-[#D4AF37]" />
            <span className="text-[7px] font-black text-white uppercase tracking-[0.2em]">Truckers Nav</span>
          </div>
          <span className="text-[5px] font-black text-[#D4AF37] uppercase tracking-[0.4em]">By Tue</span>
        </div>
      </div>
    )}

    {/* Custom Layer Modal */}
      {isCustomLayerModalOpen && (
        <div className="absolute inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-[#D4AF37]/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[#D4AF37] font-bold text-lg uppercase tracking-wider">Custom Map Layer</h3>
              <button 
                onClick={() => setIsCustomLayerModalOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  Tile URL Template
                </label>
                <input
                  type="text"
                  value={customTileUrl}
                  onChange={(e) => setCustomTileUrl(e.target.value)}
                  placeholder="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  className="w-full bg-black/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors font-mono text-sm"
                />
                <p className="text-xs text-zinc-500 mt-2">
                  Use {'{s}'}, {'{z}'}, {'{x}'}, and {'{y}'} placeholders.
                </p>
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="customMapShowRoads"
                  checked={customMapShowRoads}
                  onChange={(e) => setCustomMapShowRoads(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 text-[#D4AF37] focus:ring-[#D4AF37] bg-black/50"
                />
                <label htmlFor="customMapShowRoads" className="text-sm text-zinc-300 font-medium">
                  Show up-to-date roads and highways overlay
                </label>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsCustomLayerModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors font-medium text-sm uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('custom_tile_url', customTileUrl);
                    localStorage.setItem('custom_map_show_roads', customMapShowRoads.toString());
                    setMapStyle('CUSTOM');
                    setIsCustomLayerModalOpen(false);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#D4AF37] text-black hover:bg-[#F3E5AB] transition-colors font-bold text-sm uppercase tracking-wider"
                >
                  Apply Layer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Route Settings Modal */}
      {isRouteSettingsOpen && (
        <div className="absolute inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-[#D4AF37]/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-[#D4AF37] font-bold text-lg uppercase tracking-wider">Route Preferences</h3>
              </div>
              <button 
                onClick={() => setIsRouteSettingsOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Avoidance Options</h4>
                
                <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-zinc-800 hover:border-[#D4AF37]/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <CircleDollarSign className="w-5 h-5 text-zinc-400" />
                    <span className="text-sm font-bold text-white">Avoid Toll Roads</span>
                  </div>
                  <button 
                    onClick={() => setAvoidTolls(!avoidTolls)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${avoidTolls ? 'bg-[#D4AF37]' : 'bg-zinc-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${avoidTolls ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-zinc-800 hover:border-[#D4AF37]/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Wind className="w-5 h-5 text-zinc-400" />
                    <span className="text-sm font-bold text-white">Avoid Ferries</span>
                  </div>
                  <button 
                    onClick={() => setAvoidFerries(!avoidFerries)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${avoidFerries ? 'bg-[#D4AF37]' : 'bg-zinc-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${avoidFerries ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-zinc-800 hover:border-[#D4AF37]/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <TrafficCone className="w-5 h-5 text-zinc-400" />
                    <span className="text-sm font-bold text-white">Avoid Unpaved Roads</span>
                  </div>
                  <button 
                    onClick={() => setAvoidUnpaved(!avoidUnpaved)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${avoidUnpaved ? 'bg-[#D4AF37]' : 'bg-zinc-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${avoidUnpaved ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-zinc-800">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Display Mode</h4>
                
                <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-zinc-800 hover:border-[#D4AF37]/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <NavIcon className="w-5 h-5 text-zinc-400" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">CarPlay Mode</span>
                      <span className="text-[10px] text-zinc-500">Simplified high-contrast UI</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsCarPlayMode(!isCarPlayMode)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${isCarPlayMode ? 'bg-[#D4AF37]' : 'bg-zinc-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isCarPlayMode ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setIsRouteSettingsOpen(false)}
                className="w-full bg-[#D4AF37] text-black font-black py-4 rounded-xl hover:bg-[#D4AF37]/90 transition-all uppercase tracking-[0.2em] text-xs shadow-lg shadow-[#D4AF37]/20 active:scale-95"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CarPlay Mode Overlay */}
      {isCarPlayMode && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          {/* CarPlay Content */}
        </div>
      )}
    </div>
  );
};

export default NavigationView;