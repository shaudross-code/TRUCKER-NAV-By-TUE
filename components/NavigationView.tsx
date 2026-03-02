import React, { useEffect, useRef, useState, useContext } from 'react';
import { Marker } from 'leaflet';
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
  Globe,
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
  Fuel,
  Filter,
  Check,
  Box,
  Compass,
  Star
} from 'lucide-react';

interface Waypoint {
  id: string;
  address: string;
  lat: number;
  lon: number;
  type: 'DEADHEAD' | 'PAID';
}
import { AppContext } from '../App';
import { fetchTruckPOIs, fetchMajorChains } from '../services/geminiService';
import { fetchHERETruckStops } from '../services/hereService';
import { speak } from '../services/speechService';
import { getPoiIcon, getPoiCategory } from './PoiIcon';
import { decode } from '@here/flexpolyline';

const HERE_API_KEY = import.meta.env.VITE_HERE_API_KEY;

interface NavigationViewProps {
  initialTarget?: string | null;
  isSidebarCollapsed?: boolean;
}

type MapStyle = 'NORMAL' | 'SATELLITE' | 'HYBRID' | 'TUE_GOLD';

const FALLBACK_LOCATION: [number, number] = [41.8781, -87.6298];

const isValidLatLng = (coords: any): coords is [number, number] => {
  if (!Array.isArray(coords) || coords.length < 2) return false;
  return typeof coords[0] === 'number' && typeof coords[1] === 'number' && !isNaN(coords[0]) && !isNaN(coords[1]);
};

const SpeedLimitSign: React.FC<{ limit: number | null }> = ({ limit }) => {
  if (!limit) return null;
  return (
    <div className="bg-white border-2 border-black rounded-md w-12 h-16 flex flex-col items-center justify-center shadow-lg">
      <span className="text-black text-[8px] font-bold uppercase tracking-tighter leading-none mt-1">Speed</span>
      <span className="text-black text-[8px] font-bold uppercase tracking-tighter leading-none mb-0.5">Limit</span>
      <span className="text-black text-xl font-black leading-none">{limit}</span>
    </div>
  );
};

const HighwayShield: React.FC<{ roadName: string | null }> = ({ roadName }) => {
  if (!roadName) return null;
  
  const isInterstate = roadName.match(/I\s*[- ]?\s*(\d+[A-Z]?)/i);
  const isUSHighway = roadName.match(/US\s*[- ]?\s*(\d+[A-Z]?)/i);
  const isStateHighway = roadName.match(/(?:State Route|SR|CA|TX|FL|NY|IL|PA|OH|MI|GA|NC|NJ|VA|WA|AZ|MA|TN|IN|MO|MD|WI|CO|MN|SC|AL|LA|KY|OR|OK|CT|UT|IA|NV|AR|MS|KS|NM|NE|ID|WV|HI|NH|ME|MT|RI|DE|SD|ND|AK|VT|WY)\s*[- ]?\s*(\d+[A-Z]?)/i);

  if (isInterstate) {
    return (
      <div className="relative w-16 h-16 flex items-center justify-center drop-shadow-md">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <path d="M50 5 L90 20 L90 60 C90 80 50 95 50 95 C50 95 10 80 10 60 L10 20 Z" fill="#003f87" stroke="white" strokeWidth="4" />
          <path d="M10 20 L90 20 L50 5 Z" fill="#cf142b" />
          <path d="M50 5 L90 20 L90 60 C90 80 50 95 50 95 C50 95 10 80 10 60 L10 20 Z" fill="none" stroke="white" strokeWidth="2" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center mt-1">
          <span className="text-white text-[9px] font-bold uppercase tracking-tighter leading-none mb-0.5">Interstate</span>
          <span className="text-white text-2xl font-black leading-none">{isInterstate[1]}</span>
        </div>
      </div>
    );
  }

  if (isUSHighway) {
    return (
      <div className="relative w-14 h-16 flex items-center justify-center drop-shadow-md">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <rect x="5" y="5" width="90" height="90" fill="white" stroke="black" strokeWidth="2" />
          <path d="M10 10 L90 10 L90 60 C90 85 50 95 50 95 C50 95 10 85 10 60 Z" fill="white" stroke="black" strokeWidth="4" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-black text-2xl font-black mt-2">{isUSHighway[1]}</span>
      </div>
    );
  }

  if (isStateHighway) {
    return (
      <div className="relative w-14 h-14 flex items-center justify-center drop-shadow-md">
        <div className="absolute inset-0 bg-white border-2 border-black rounded-full" />
        <span className="absolute inset-0 flex items-center justify-center text-black text-xl font-black">{isStateHighway[1]}</span>
      </div>
    );
  }

  return null;
};

const NavigationView: React.FC<NavigationViewProps> = ({ initialTarget, isSidebarCollapsed }) => {
  if (!HERE_API_KEY) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">HERE API Key Not Found</h2>
          <p className="text-zinc-400">Please add your HERE API key to the .env file to use the navigation features.</p>
        </div>
      </div>
    );
  }
  const context = useContext(AppContext);

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
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const routeGroupRef = useRef<any>(null);
  const baseLayerGroupRef = useRef<any>(null);
  const markerClusterGroupRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const simulationIntervalRef = useRef<any>(null);
  const routeCoordsRef = useRef<[number, number][]>([]);
  const totalRouteDistanceRef = useRef(0);
  const lastSimIdxRef = useRef(-1);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const isDriving = context?.isDriving || false;
  const setIsDriving = context?.setIsDriving || (() => {});
  const setSpeed = context?.setSpeed || (() => {});
  const eldStatus = context?.eldStatus;
  const setEldStatus = context?.setEldStatus;
  const hasViolation = context?.hasViolation || false;

  const [currentDestination, setCurrentDestination] = useState('Standby');
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);
  const [milesRemaining, setMilesRemaining] = useState(0);
  const [initialMiles, setInitialMiles] = useState(0);
  const [eta, setEta] = useState('--:-- --');
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [isOverviewMode, setIsOverviewMode] = useState(false);
  const [isFollowMode, setIsFollowMode] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>('TUE_GOLD');
  const [is3DMode, setIs3DMode] = useState(false);
  const [isNorthUp, setIsNorthUp] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [isTruckRoute, setIsTruckRoute] = useState(false);
  const [pois, setPois] = useState<any[]>(() => {
    const saved = localStorage.getItem('truck_pois');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('truck_pois', JSON.stringify(pois));
  }, [pois]);
  const [isFetchingPois, setIsFetchingPois] = useState(false);
  const isFetchingPoisRef = useRef(false);
  const lastPoiFetchRef = useRef<{ time: number, lat: number, lon: number } | null>(null);
  const [showPois, setShowPois] = useState(true);
  const [poiFilters, setPoiFilters] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('poi_filters');
    return saved ? new Set(JSON.parse(saved)) : new Set(['major_chains', 'fuel', 'parking', 'weigh_station', 'food', 'service', 'other']);
  });

  useEffect(() => {
    localStorage.setItem('poi_filters', JSON.stringify(Array.from(poiFilters)));
  }, [poiFilters]);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeSteps, setRouteSteps] = useState<any[]>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedPoi, setSelectedPoi] = useState<any | null>(null);
  
  const [nextInstruction, setNextInstruction] = useState({ text: 'Ready for Route', distance: '0.0', icon: ArrowUp as React.ElementType, lanes: [] as any[] });
  const [weather, setWeather] = useState({ 
    temp: '--°', 
    condition: 'Loading...', 
    wind: '-- MPH', 
    visibility: '-- MI',
    icon: CloudSun,
    forecast: [] as { day: string, max: number, min: number, icon: any }[]
  });
  const [routeWeatherForecast, setRouteWeatherForecast] = useState<any[]>([]);
  
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
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18`, {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'TruckersNav-Professional-Navigation-App/1.0 (Contact: safety@truckersnav.com)'
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.address) {
            const road = data.address.road || data.address.highway || '';
            const ref = data.address.ref || '';
            setCurrentRoad(ref || road);
          }
        }
      } catch (error) {
        console.warn('Could not fetch road name:', error);
        setCurrentRoad(null);
      }
    };

    const interval = setInterval(fetchRoadName, 5000); // Fetch every 5 seconds while driving
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
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current || !baseLayerGroupRef.current) return;
    baseLayerGroupRef.current.clearLayers();
    
    const tileOptions = {
      tileSize: 256,
      maxZoom: 20
    };

    if (mapStyle === 'NORMAL') {
      if (HERE_API_KEY) {
        // Use HERE normal.day for a lighter base
        L.tileLayer(`https://{s}.base.maps.ls.hereapi.com/maptile/2.1/maptile/newest/normal.day/{z}/{x}/{y}/256/png8?apiKey=${HERE_API_KEY}`, {
          ...tileOptions,
          subdomains: ['1', '2', '3', '4']
        }).addTo(baseLayerGroupRef.current);
        // Add Truck Overlay
        L.tileLayer(`https://{s}.base.maps.ls.hereapi.com/maptile/2.1/truckonlytile/newest/normal.day/{z}/{x}/{y}/256/png8?apiKey=${HERE_API_KEY}`, {
          ...tileOptions,
          subdomains: ['1', '2', '3', '4']
        }).addTo(baseLayerGroupRef.current);

        // Fallback to Google Maps if HERE API key is invalid or fails
        hereBase.on('tileerror', () => {
          if (baseLayerGroupRef.current) {
            baseLayerGroupRef.current.clearLayers();
            L.tileLayer('https://{s}.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}', { 
              maxZoom: 22,
              maxNativeZoom: 20,
              subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            }).addTo(baseLayerGroupRef.current);
          }
        });
      } else {
        // Use Google Maps standard roadmap
        L.tileLayer('https://{s}.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}', { 
          maxZoom: 22,
          maxNativeZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        }).addTo(baseLayerGroupRef.current);
      }
    } else if (mapStyle === 'TUE_GOLD') {
      // Use a dark base map and apply the TUE gold filter
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        ...tileOptions,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        className: 'tue-gold-black-tiles-v2'
      }).addTo(baseLayerGroupRef.current);
      
      // Add Truck Overlay if available
      if (HERE_API_KEY) {
        L.tileLayer(`https://{s}.base.maps.ls.hereapi.com/maptile/2.1/truckonlytile/newest/normal.day/{z}/{x}/{y}/256/png8?apiKey=${HERE_API_KEY}`, {
          ...tileOptions,
          subdomains: ['1', '2', '3', '4'],
          opacity: 0.5,
          className: 'tue-gold-black-tiles-v2'
        }).addTo(baseLayerGroupRef.current);
      }
    } else if (mapStyle === 'SATELLITE') {
      L.tileLayer('https://{s}.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}', { 
        maxZoom: 22,
        maxNativeZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }).addTo(baseLayerGroupRef.current);
    } else if (mapStyle === 'HYBRID') {
      L.tileLayer('https://{s}.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}', { 
        maxZoom: 22,
        maxNativeZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }).addTo(baseLayerGroupRef.current);
    }
  }, [mapStyle, isMapReady]);

  useEffect(() => {
    if (!mapRef.current) return;
    const mapContainer = mapRef.current;

    if (is3DMode) {
      mapContainer.classList.add('map-3d-perspective');
      mapContainer.classList.add('map-interaction-disabled');
    } else {
      mapContainer.classList.remove('map-3d-perspective');
      mapContainer.classList.remove('map-interaction-disabled');
    }

    if (!isNorthUp) {
      mapContainer.classList.add('map-heading-up');
    } else {
      mapContainer.classList.remove('map-heading-up');
    }
  }, [is3DMode, isNorthUp]);

  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const handler = setTimeout(async () => {
      try {
        const [lat, lon] = userLocation;
        // Create a large bounding box around the user (approx 300mi radius) for strong local bias
        const viewbox = `${lon - 5},${lat + 5},${lon + 5},${lat - 5}`;
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(searchQuery)}&limit=10&addressdetails=1&lat=${lat}&lon=${lon}&viewbox=${viewbox}&bounded=0`, { 
          headers: { 
            'Accept-Language': 'en', 
            'User-Agent': 'TruckersNav-Professional-Navigation-App/1.0 (Contact: safety@truckersnav.com)' 
          } 
        });
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const data = await res.json();
        setSuggestions(data || []);
      } catch (error) {
        console.error('Failed to fetch suggestions', error);
        setSuggestions([]);
      }
    }, 800);
    return () => clearTimeout(handler);
  }, [searchQuery, userLocation]);

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

  const updateNavigationState = async (currentLocation: [number, number]) => {
    if (!currentLocation || isNaN(currentLocation[0]) || isNaN(currentLocation[1])) return;
    if (!routeSteps.length || !routeCoordsRef.current || routeCoordsRef.current.length < 2) return;

    const turfPoint = (window as any).turf.point;
    const turfLineString = (window as any).turf.lineString;
    const turfNearestPointOnLine = (window as any).turf.nearestPointOnLine;
    const turfLength = (window as any).turf.length;

    if (!turfPoint || !turfLineString || !turfNearestPointOnLine || !turfLength) {
      console.error("Turf.js functions not available.");
      return;
    }

    const routeLine = turfLineString(routeCoordsRef.current.map(c => c.slice().reverse()));
    const userPoint = turfPoint(currentLocation.slice().reverse());
    const snapped = turfNearestPointOnLine(routeLine, userPoint, { units: 'meters' });

    let traveledDistance = 0;
    if (snapped.properties.index > 0) {
        const traveledLine = turfLineString(routeCoordsRef.current.slice(0, snapped.properties.index + 1).map(c => c.slice().reverse()));
        traveledDistance = turfLength(traveledLine, { units: 'meters' });
    }
    
    const startOfSegment = turfPoint(routeCoordsRef.current[snapped.properties.index].slice().reverse());
    const distOnSegment = turfLength(turfLineString([startOfSegment.geometry.coordinates, snapped.geometry.coordinates]), { units: 'meters' });
    traveledDistance += distOnSegment;

    const remainingDist = totalRouteDistanceRef.current - traveledDistance;
    if (!isNaN(remainingDist)) {
      const remainingMiles = remainingDist / 1609.34;
      setMilesRemaining(remainingMiles);
      
      if (remainingMiles <= 1.0 && remainingMiles > 0.9 && !spokenDistancesRef.current.has('dest_1')) {
        speak(`You are 1 mile away from your destination.`);
        spokenDistancesRef.current.add('dest_1');
      } else if (remainingMiles <= 0.1 && !spokenDistancesRef.current.has('dest_0.1')) {
        speak(`You have arrived at your destination.`);
        spokenDistancesRef.current.add('dest_0.1');
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
        const roadName = currentStep.instruction.match(/on (.+?) for/)?.[1] || currentStep.instruction.split(' on ')[1] || '';
        setCurrentRoad(roadName.replace(/\u003c/g, '<').replace(/\u003e/g, '>'));
        setNextInstruction({
          text: currentStep.instruction.replace(/\u003c/g, '<').replace(/\u003e/g, '>'),
          distance: (distanceToManeuver / 1609.34).toFixed(1), // Convert to miles string
        });
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
        const roadName = currentStep.instruction.match(/on (.+?) for/)?.[1] || currentStep.instruction.split(' on ')[1] || '';
        if (roadName.match(/^I\s*[- ]/i)) setCurrentSpeedLimit(70);
        else if (roadName.match(/^US\s*[- ]/i)) setCurrentSpeedLimit(65);
        else if (roadName.match(/^(?:State Route|SR|CA|TX|FL|NY|IL|PA|OH|MI|GA|NC|NJ|VA|WA|AZ|MA|TN|IN|MO|MD|WI|CO|MN|SC|AL|LA|KY|OR|OK|CT|UT|IA|NV|AR|MS|KS|NM|NE|ID|WV|HI|NH|ME|MT|RI|DE|SD|ND|AK|VT|WY)\s*[- ]/i)) setCurrentSpeedLimit(60);
        else setCurrentSpeedLimit(45);
      }
    } else if (maneuverIndex !== -1) {
      const currentStep = routeSteps[maneuverIndex];
      const roadName = currentStep.instruction.match(/on (.+?) for/)?.[1] || currentStep.instruction.split(' on ')[1] || '';
      if (roadName.match(/^I\s*[- ]/i)) setCurrentSpeedLimit(70);
      else if (roadName.match(/^US\s*[- ]/i)) setCurrentSpeedLimit(65);
      else if (roadName.match(/^(?:State Route|SR|CA|TX|FL|NY|IL|PA|OH|MI|GA|NC|NJ|VA|WA|AZ|MA|TN|IN|MO|MD|WI|CO|MN|SC|AL|LA|KY|OR|OK|CT|UT|IA|NV|AR|MS|KS|NM|NE|ID|WV|HI|NH|ME|MT|RI|DE|SD|ND|AK|VT|WY)\s*[- ]/i)) setCurrentSpeedLimit(60);
      else setCurrentSpeedLimit(45);
    }
  };

  const lastWeatherFetchPos = useRef<[number, number] | null>(null);
  const userLocationRef = useRef(userLocation);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

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
          console.error("Invalid weather data received:", data.reason);
          throw new Error(`Invalid weather data: ${data.reason}`);
        }
        
        if (data && data.current && data.daily) {
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
          if (data.daily.time?.length > 3) {
            for (let i = 1; i <= 3; i++) {
              const dateStr = data.daily.time[i];
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
  }, []);

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

  const clearRoute = () => {
    setWaypoints([]);
    setDestinationCoords(null);
    setCurrentDestination('Standby');
    setRoutePoints([]);
    setMilesRemaining(0);
    setEta('--:-- --');
    if (routeGroupRef.current) routeGroupRef.current.clearLayers();
    if (context) context.setNavTarget(null);
  };

  const fetchRouteWeather = async (coords: [number, number][], distMi: number) => {
    try {
      if (coords.length < 10) return;
      
      const p1Idx = Math.floor(coords.length * 0.33);
      const p2Idx = Math.floor(coords.length * 0.66);
      const p3Idx = coords.length - 1;
      
      const points = [
        { lat: coords[p1Idx][0], lon: coords[p1Idx][1], dist: distMi * 0.33 },
        { lat: coords[p2Idx][0], lon: coords[p2Idx][1], dist: distMi * 0.66 },
        { lat: coords[p3Idx][0], lon: coords[p3Idx][1], dist: distMi }
      ];
      
      const forecasts = await Promise.all(points.map(async (p) => {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`);
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
        const timeStr = eta.toLocaleTimeString([], { hour: 'numeric' });
        
        return {
          time: timeStr,
          temp: Math.round(data.current.temperature_2m),
          icon: details.icon,
          condition: details.condition
        };
      }));
      
      const validForecasts = forecasts.filter(f => f !== null);
      if (validForecasts.length > 0) {
        setRouteWeatherForecast(validForecasts);
        
        const badWeather = validForecasts.find(f => ['Rain', 'Snow', 'Storm', 'Fog'].includes(f?.condition || ''));
        if (badWeather) {
          speak(`Weather alert: Expect ${badWeather.condition} conditions around ${badWeather.time} along your route.`);
        }
      }
    } catch (e) {
      console.error("Failed to fetch route weather", e);
    }
  };

  const handleNavigate = async (target?: string) => {
    if (context) context.setNavTarget(null);
    setError(null);
    const query = target || searchQuery;
    setIsTruckRoute(false);
    if (!query || !query.trim() || isCalculating) return;
    if (!userLocation || isNaN(userLocation[0]) || isNaN(userLocation[1])) {
      setError("Waiting for valid GPS signal...");
      return;
    }
    setSuggestions([]);
    setIsSuggestionsVisible(false);
    const L = (window as any).L;
    if (!L) return;
    setIsCalculating(true);
    setIsSearchFocused(false);
    setIsDriving(false);
    try {
      let geoData: any[] = [];
      const [lat, lon] = userLocation;
      
      if (query && query.trim()) {
        const viewbox = `${lon - 5},${lat + 5},${lon + 5},${lat - 5}`;
        const headers = { 
          'Accept-Language': 'en', 
          'User-Agent': 'TruckersNav-Professional-Navigation-App/1.0 (Contact: safety@truckersnav.com)' 
        };
        
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=1&addressdetails=1&lat=${lat}&lon=${lon}&viewbox=${viewbox}&bounded=0`, { headers })
          .catch(err => {
            console.error("Geocoding fetch failed:", err);
            throw err;
          });
        
        if (!geoRes.ok) throw new Error(`Geocoding failed: ${geoRes.status}`);
        
        geoData = await geoRes.json();
        if (!geoData || geoData.length === 0) { 
          // Fallback: try without addressdetails if it failed
          const fallbackRes = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=1&lat=${userLocation[0]}&lon=${userLocation[1]}`, { headers });
          if (!fallbackRes.ok) throw new Error(`Fallback geocoding failed: ${fallbackRes.status}`);
          geoData = await fallbackRes.json();
          
          if (!geoData || geoData.length === 0) {
            alert("Location not found. Please try a more general search (e.g., City, State)."); 
            setIsCalculating(false); 
            return; 
          }
        }
        // Clear destinationCoords if it's a new query
        setDestinationCoords(null);
      } else if (destinationCoords) {
        // Use existing destination coords
      } else if (waypoints.length > 0) {
        // Fallback: Use last waypoint as destination
      } else {
        setIsCalculating(false);
        return;
      }

      const destLat = destinationCoords ? destinationCoords[0] : (geoData.length > 0 ? parseFloat(geoData[0].lat) : waypoints[waypoints.length - 1].lat);
      const destLon = destinationCoords ? destinationCoords[1] : (geoData.length > 0 ? parseFloat(geoData[0].lon) : waypoints[waypoints.length - 1].lon);
      
      if (isNaN(destLat) || isNaN(destLon)) {
        throw new Error("Invalid destination coordinates received from geocoding.");
      }
      
      const destName = destinationCoords ? currentDestination : (geoData.length > 0 ? geoData[0].display_name.split(',')[0] : waypoints[waypoints.length - 1].address);
      
      if (!destinationCoords) {
        setDestinationCoords([destLat, destLon]);
      }
      
      let coords: [number, number][] = [];
      let distMi = 0;
      let durationSec = 0;
      let steps: any[] = [];

      let isTruckRoute = false;

      if (HERE_API_KEY) {
        try {
          const heightCm = Math.round(truckProfile.height * 30.48);
          const weightKg = Math.round(truckProfile.weight * 0.453592);
          const lengthCm = Math.round(truckProfile.length * 30.48);
          
          const hereUrl = new URL('https://router.hereapi.com/v8/routes');
          hereUrl.searchParams.append('transportMode', 'truck');
          hereUrl.searchParams.append('origin', `${userLocation[0]},${userLocation[1]}`);
          
          // Add waypoints as 'via' parameters
          waypoints.forEach(wp => {
            hereUrl.searchParams.append('via', `${wp.lat},${wp.lon}`);
          });
          
          hereUrl.searchParams.append('destination', `${destLat},${destLon}`);
          hereUrl.searchParams.append('return', 'summary,actions,instructions,incidents,polyline');
          hereUrl.searchParams.append('spans', 'length,truckAttributes,incidents,speedLimit');
          hereUrl.searchParams.append('vehicle[height]', heightCm.toString());
          hereUrl.searchParams.append('vehicle[grossWeight]', weightKg.toString());
          hereUrl.searchParams.append('vehicle[length]', lengthCm.toString());
          if (truckProfile.hazmat) {
            hereUrl.searchParams.append('shippedHazardousGoods', 'explosive,gas,flammable,combustible,organic,poison,radioactive,corrosive,poisonousInhalation,harmfulToWater,other');
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
              steps = route.sections[0].actions.map((action: any) => ({
                maneuver: { instruction: action.instruction, type: action.action, modifier: action.direction },
                distance: action.length,
                lanes: action.lanes || []
              }));

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
              setAllRouteAlerts(alerts.sort((a, b) => a.progress - b.progress));

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
        // Fetch geometry from OSRM, and use for routing if HERE failed
        const waypointCoords = waypoints.map(wp => `${wp.lon},${wp.lat}`).join(';');
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${userLocation[1]},${userLocation[0]};${waypointCoords ? waypointCoords + ';' : ''}${destLon},${destLat}?overview=full&geometries=geojson&steps=true`;
        const routeRes = await fetch(osrmUrl);
        if (!routeRes.ok) throw new Error(`Routing failed: ${routeRes.status}`);
        
        const routeData = await routeRes.json();
        if (!routeData.routes || routeData.routes.length === 0) { alert("No route found."); setIsCalculating(false); return; }
        const route = routeData.routes[0];
        coords = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);
        routeCoordsRef.current = coords;
        
        if (isNaN(route.distance) || isNaN(route.duration)) {
          throw new Error("Invalid route data from OSRM.");
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
      }

      setIsTruckRoute(isTruckRoute);

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
      if (routeGroupRef.current) routeGroupRef.current.clearLayers();
      const destIcon = L.divIcon({
        className: 'dest-marker',
        html: `<div class="flex flex-col items-center">
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
          html: `<div class="flex flex-col items-center">
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
      L.polyline(coords, { color: '#D4AF37', weight: 12, opacity: 1, lineCap: 'round', lineJoin: 'round' }).addTo(routeGroupRef.current);
      L.polyline(coords, { color: 'white', weight: 4, opacity: 0.8, lineCap: 'round', lineJoin: 'round' }).addTo(routeGroupRef.current);
      setRoutePoints(coords);
      lastSimIdxRef.current = -1;
      
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
      setCurrentDestination(destName);
      setSearchQuery('');
      const arrival = new Date();
      arrival.setSeconds(arrival.getSeconds() + durationSec);
      setEta(arrival.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
      const bounds = routeGroupRef.current.getBounds();
      if (bounds.isValid()) { 
        try {
          if (isValidLatLng(userLocation)) {
            const center = L.latLng(userLocation[0], userLocation[1]);
            mapInstanceRef.current.flyTo(center, 17, { animate: true, duration: 1.5 }); 
          } else {
            console.warn("Invalid userLocation for flyTo in handleNavigate:", userLocation);
          }
        } catch (e) {
          console.error("FlyTo error in handleNavigate:", e);
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

      if (!isDriving) {
        toggleDriving();
      }
            } catch (err: any) { 
      console.error("Routing Error:", err); 
      let errorMessage = 'Failed to calculate route. Please check destination or network.';
      if (err.message.includes('Geocoding failed')) {
        errorMessage = 'Could not find the specified location. Please try a different search term.';
      } else if (err.message.includes('Routing failed')) {
        errorMessage = 'Could not find a route to the specified location.';
      } else if (err.message.includes('No route found')) {
        errorMessage = 'No route found to the destination.';
      }
      setError(errorMessage);
      setIsCalculating(false); 
    }
  };

  useEffect(() => {
    if (initialTarget && isMapReady) {
      handleNavigate(initialTarget).catch(err => console.error("Initial navigation failed:", err));
    }
  }, [initialTarget, isMapReady]);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || mapInstanceRef.current) return;
    
    try {
      const initialPos = userLocation || FALLBACK_LOCATION;
      const map = L.map(mapRef.current, { center: initialPos, zoom: 15, zoomControl: false, attributionControl: false });
      mapInstanceRef.current = map;
      baseLayerGroupRef.current = L.layerGroup().addTo(map);
      const tileOptions = {
        tileSize: 256,
        maxZoom: 20
      };

      if (HERE_API_KEY) {
        const hereBase = L.tileLayer(`https://{s}.base.maps.ls.hereapi.com/maptile/2.1/maptile/newest/normal.day/{z}/{x}/{y}/256/png8?apiKey=${HERE_API_KEY}`, {
          ...tileOptions,
          subdomains: ['1', '2', '3', '4']
        }).addTo(baseLayerGroupRef.current);
        
        L.tileLayer(`https://{s}.base.maps.ls.hereapi.com/maptile/2.1/truckonlytile/newest/normal.day/{z}/{x}/{y}/256/png8?apiKey=${HERE_API_KEY}`, {
          ...tileOptions,
          subdomains: ['1', '2', '3', '4']
        }).addTo(baseLayerGroupRef.current);

        // Fallback to Google Maps if HERE API key is invalid or fails
        hereBase.on('tileerror', () => {
          if (baseLayerGroupRef.current) {
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
      markerClusterGroupRef.current = L.layerGroup().addTo(map);
      
      const userIcon = L.divIcon({
        className: 'user-marker',
        html: `<div class="relative flex items-center justify-center">
            <div class="absolute w-12 h-12 bg-[#D4AF37]/20 rounded-full animate-ping"></div>
            <div class="w-10 h-10 bg-black rounded-full shadow-[0_0_20px_rgba(212,175,55,0.6)] flex items-center justify-center border-[3px] border-[#D4AF37] z-10">
              <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[12px] border-b-[#D4AF37] transform transition-transform duration-300 vehicle-pointer"></div>
            </div>
          </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });
      
      map.on('dragstart', () => {
        setIsFollowMode(false);
      });

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
            if (now - time > 60 * 60 * 1000) return true; // 1 hour
            
            // Calculate distance
            const R = 3958.8; // miles
            const dLat = (lat - lastLat) * Math.PI / 180;
            const dLon = (lon - lastLon) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lastLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distance = R * c;
            
            return distance >= 50;
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
                const combined = [...poiData, ...chainData, ...hereData];
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

      userMarkerRef.current = L.marker(initialPos, { icon: userIcon, zIndexOffset: 2000 }).addTo(map);
      setIsMapReady(true);

      const interval = setInterval(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 3000);
      
      return () => { 
        clearInterval(interval); 
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
    if (isMapReady && userLocation) {
      const shouldFetchPois = (lat: number, lon: number) => {
        if (!lastPoiFetchRef.current) return true;
        const { time, lat: lastLat, lon: lastLon } = lastPoiFetchRef.current;
        const now = Date.now();
        if (now - time > 60 * 60 * 1000) return true; // 1 hour
        
        // Calculate distance
        const R = 3958.8; // miles
        const dLat = (lat - lastLat) * Math.PI / 180;
        const dLon = (lon - lastLon) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lastLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return distance >= 50;
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
          const combined = [...poiData, ...chainData, ...hereData];
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
    if (isValidLatLng(userLocation) && userMarkerRef.current && !isDriving) {
      userMarkerRef.current.setLatLng(userLocation);
      if (isFollowMode && mapInstanceRef.current) { 
        try {
          mapInstanceRef.current.panTo(userLocation); 
        } catch (e) {
          console.error("PanTo error:", e);
        }
      }
    }
    if (isDriving && userLocation) {
      updateNavigationState(userLocation).catch(err => console.error("Navigation update failed:", err));
    }
  }, [userLocation, isDriving, isOverviewMode]);

  useEffect(() => {
    if (!markerClusterGroupRef.current) return;

    markerClusterGroupRef.current.clearLayers();

    if (showPois) {
      const L = (window as any).L;
      if (!L) return;

      const markers: Marker[] = [];
      pois.forEach(poi => {
        const category = getPoiCategory(poi.type, poi.name);
        if (!poiFilters.has(category)) return;

        try {
          const iconElement = getPoiIcon(poi.type, poi.name);
          if (iconElement) {
            const icon = L.divIcon({
              className: 'custom-poi-icon',
              html: renderToStaticMarkup(iconElement),
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
          }
        } catch (err) {
          console.error("Failed to render POI icon:", err, poi);
        }
      });

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
      markers.forEach(marker => marker.addTo(markerClusterGroupRef.current));
      return () => document.removeEventListener('click', handlePopupClick);
    }
  }, [pois, showPois, poiFilters]);

  useEffect(() => {
    // Simulation removed as per user request
    return () => {
      clearInterval(simulationIntervalRef.current);
      setSpeed(0);
      if (mapRef.current) {
        mapRef.current.style.setProperty('--map-rotation', `0deg`);
      }
    };
  }, [isDriving, routePoints, initialMiles, isOverviewMode, isNorthUp]);

  const toggleDriving = () => {
    if (milesRemaining <= 0) return;

    const newIsDriving = !isDriving;
    setIsDriving(newIsDriving);

    if (newIsDriving) {
      // Just started driving
      setIsOverviewMode(false); // Ensure we are in follow mode
      setIs3DMode(true); // Default to 3D mode for immersion
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
      <div ref={mapRef} className={`h-full w-full transition-opacity duration-500`} />

      {/* POI Detail Modal */}
      {selectedPoi && (
        <div className="absolute inset-0 z-[4000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-[2rem] w-full max-w-md overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300">
            <div className="relative h-32 bg-gradient-to-br from-[#D4AF37]/20 to-black border-b border-white/5 p-8 flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-tight">{selectedPoi.name}</h3>
                <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mt-1">{selectedPoi.type}</p>
              </div>
              <button 
                onClick={() => setSelectedPoi(null)}
                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-8">
              {selectedPoi.amenities && selectedPoi.amenities.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Star className="w-3 h-3 text-[#D4AF37]" />
                    Available Amenities
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedPoi.amenities.map((amenity: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                        <span className="text-xs font-bold text-zinc-300">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => {
                    addWaypoint(selectedPoi, 'DEADHEAD');
                    setSelectedPoi(null);
                  }}
                  className="flex flex-col items-center justify-center gap-3 p-6 bg-white/5 border border-white/5 rounded-2xl hover:border-zinc-500 hover:bg-zinc-500/10 transition-all group"
                >
                  <GitMerge className="w-6 h-6 text-zinc-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Add Deadhead</span>
                </button>
                <button 
                  onClick={() => {
                    addWaypoint(selectedPoi, 'PAID');
                    setSelectedPoi(null);
                  }}
                  className="flex flex-col items-center justify-center gap-3 p-6 bg-emerald-600/10 border border-emerald-600/20 rounded-2xl hover:bg-emerald-600 hover:border-emerald-600 transition-all group"
                >
                  <CircleDollarSign className="w-6 h-6 text-emerald-500 group-hover:text-white group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black text-emerald-500 group-hover:text-white uppercase tracking-widest">Add Paid</span>
                </button>
              </div>

              <button 
                onClick={() => {
                  handleSearch(selectedPoi.name);
                  setSelectedPoi(null);
                }}
                className="w-full py-4 bg-[#D4AF37] hover:bg-[#B8860B] text-black rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-3"
              >
                <NavIcon className="w-4 h-4" />
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

      {/* HOS Violation Warning Banner */}
      {hasViolation && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-[3000] w-full max-w-[600px] px-6 transition-all duration-700 ${milesRemaining > 0 ? 'top-[380px]' : 'top-8'}`}>
          <div className="bg-rose-600 border-2 border-white/20 rounded-3xl p-4 flex items-center gap-4 shadow-[0_20px_60px_rgba(225,29,72,0.4)]">
            <div className="bg-white p-2 rounded-xl text-rose-600 animate-pulse">
              <AlertTriangle className="w-6 h-6" strokeWidth={3} />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-black uppercase italic tracking-tighter text-lg leading-none">HOS Violation Alert</h3>
              <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mt-1">Immediate Stop Required • Safety Protocol Active</p>
            </div>
          </div>
        </div>
      )}

      {/* Turn Instruction Header - Now Gold Themed */}
      <div className={`absolute top-0 left-0 right-0 z-[2100] transition-all duration-700 ease-in-out ${milesRemaining > 0 ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="bg-gradient-to-b from-black/95 to-black/60 backdrop-blur-3xl border-b border-[#D4AF37]/20 p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-10">
              <div className="bg-[#D4AF37] p-6 rounded-[2rem] shadow-2xl shadow-[#D4AF37]/30">
                <nextInstruction.icon className="w-14 h-14 text-black" strokeWidth={4} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-1">Next Turn</span>
                <div className="flex items-baseline gap-3">
                  <span className="text-7xl font-[1000] text-white tracking-tighter leading-none">{nextInstruction.distance}</span>
                  <span className="text-3xl font-black text-[#D4AF37] uppercase">mi</span>
                </div>
                <span className="text-2xl font-black text-white italic uppercase tracking-tight mt-1 flex items-center gap-3 truncate max-w-[500px]">
                  {nextInstruction.text.match(/^(I-|US-|SR-|Hwy|Route)/i) && (
                    <div className="bg-blue-700 text-white px-2 py-0.5 rounded-md border border-white/20 not-italic text-xs font-black shadow-lg">
                      {nextInstruction.text.split(' ')[0]}
                    </div>
                  )}
                  {nextInstruction.text}
                </span>
                
                <div className="flex gap-2.5 mt-4">
                  {nextInstruction.lanes?.map((lane, idx) => {
                    const { rotation, active } = parseLane(lane);
                    return (
                      <div key={idx} className={`p-2.5 rounded-xl border transition-all duration-500 ${active ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-white scale-110' : 'bg-white/5 border-white/10 text-white/20'}`}>
                        <ArrowUp className="w-6 h-6" strokeWidth={4} style={{ transform: `rotate(${rotation}deg)` }} />
                      </div>
                    );
                  })}
                  {nextInstruction.lanes && nextInstruction.lanes.length > 0 && (
                    <div className="ml-4 flex items-center gap-2">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Guidance: Optimal Lane Selection</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-4 mb-4">
                <SpeedLimitSign limit={currentSpeedLimit} />
                <HighwayShield roadName={currentRoad} />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex flex-col items-end mr-4">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">ETA</span>
                  <span className="text-2xl font-[1000] text-white tracking-tighter italic">{eta}</span>
                </div>
                {isTruckRoute && (
                  <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl px-5 py-3 flex items-center gap-3">
                     <Shield className="w-4 h-4 text-[#D4AF37]" />
                     <span className="text-xs font-black text-white uppercase tracking-widest italic">Truck Optimized</span>
                  </div>
                )}
                <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl px-5 py-3 flex items-center gap-3">
                   <Zap className="w-4 h-4 text-[#D4AF37] animate-pulse" />
                   <span className="text-xs font-black text-white uppercase tracking-widest italic">TUE Protocol</span>
                </div>
              </div>
              <span className="text-[12px] font-black text-zinc-500 uppercase tracking-[0.4em] mb-2">Primary Route</span>
              <span className="text-4xl font-[1000] text-[#D4AF37] tracking-tighter uppercase italic">{currentDestination}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Control - Now Gold Themed */}
      <div className={`absolute right-10 z-[2010] flex flex-col gap-4 items-end transition-all duration-700 ${milesRemaining > 0 ? 'top-[480px]' : 'top-48'}`}>
        {/* Rotating Compass */}
        {!isNorthUp && (
          <div className="bg-black/80 backdrop-blur-2xl border border-[#D4AF37]/20 rounded-full p-4 shadow-2xl mb-4 transition-all animate-in fade-in zoom-in">
            <div 
              className="transition-transform duration-300"
              style={{ transform: `rotate(var(--map-rotation, 0deg))` }}
            >
              <Compass className="w-8 h-8 text-[#D4AF37]" />
            </div>
          </div>
        )}

        <div className="bg-black/80 backdrop-blur-2xl border border-[#D4AF37]/20 rounded-[2.5rem] p-4 shadow-2xl transition-all">
          <div className="flex flex-col gap-2">
            {[
              { id: 'TUE_GOLD', icon: Star, label: 'TUE Gold' },
              { id: 'SATELLITE', icon: Globe, label: 'Satellite' },
              { id: 'HYBRID', icon: Layers, label: 'Hybrid' },
              { id: 'NORMAL', icon: MapIcon, label: 'Normal' }
            ].map((style) => (
              <button
                key={style.id}
                onClick={() => setMapStyle(style.id as MapStyle)}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
                  mapStyle === style.id 
                    ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                }`}
              >
                <style.icon className="w-5 h-5" />
                <span className="text-[11px] font-bold uppercase tracking-widest">{style.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-black/80 backdrop-blur-2xl border border-[#D4AF37]/20 rounded-[2.5rem] p-4 shadow-2xl transition-all mt-4">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowPois(!showPois)}
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all w-full ${showPois ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>
              <Layers className="w-5 h-5" />
              <span className="text-[11px] font-bold uppercase tracking-widest">POI</span>
            </button>
            <button
              onClick={() => {
                setPoiFilters(prev => {
                  const next = new Set(prev);
                  if (next.has('major_chains')) {
                    next.delete('major_chains');
                  } else {
                    next.add('major_chains');
                  }
                  return next;
                });
              }}
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all w-full ${poiFilters.has('major_chains') ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>
              <Star className="w-5 h-5" />
              <span className="text-[11px] font-bold uppercase tracking-widest">Major Chains</span>
            </button>
            <button
              onClick={() => setIs3DMode(!is3DMode)}
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all w-full ${is3DMode ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>
              <Box className="w-5 h-5" />
              <span className="text-[11px] font-bold uppercase tracking-widest">3D View</span>
            </button>
            <button
              onClick={() => setIsNorthUp(!isNorthUp)}
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all w-full ${!isNorthUp ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>
              <Compass className="w-5 h-5" />
              <span className="text-[11px] font-bold uppercase tracking-widest">{isNorthUp ? 'North Up' : 'Heading Up'}</span>
            </button>
          </div>
        </div>



      </div>

      {/* Weather Overlay */}
      <div id="nav-weather-overlay" className={`absolute left-10 z-[2000] flex flex-col gap-4 transition-all duration-700 ${milesRemaining > 0 ? 'top-[480px]' : 'top-48'}`}>
        <div className="bg-black/80 backdrop-blur-2xl border border-[#D4AF37]/20 rounded-[2.5rem] p-6 shadow-2xl w-64 transition-all">
          <div className="flex items-center justify-between mb-6">
             <weather.icon className="w-8 h-8 text-[#D4AF37]" />
             <div className="flex flex-col items-end">
               <span className="text-4xl font-bold text-white tracking-tight leading-none">{weather.temp}</span>
               <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mt-1">{weather.condition}</span>
             </div>
          </div>
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-zinc-500">
                <Wind className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Wind</span>
              </div>
              <span className="text-sm font-bold text-white uppercase">{weather.wind}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-zinc-500">
                <Eye className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Visibility</span>
              </div>
              <span className="text-sm font-bold text-white uppercase">{weather.visibility}</span>
            </div>
          </div>
          
          {isDriving && routeWeatherForecast.length > 0 ? (
            <div className="pt-4 border-t border-white/10 flex justify-between">
              {routeWeatherForecast.map((point, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <span className="text-[9px] font-black text-[#D4AF37] uppercase">{point.time}</span>
                  <point.icon className="w-4 h-4 text-white/70" />
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-white">{point.temp}°</span>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">{point.condition}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : weather.forecast && weather.forecast.length > 0 && (
            <div className="pt-4 border-t border-white/10 flex justify-between">
              {weather.forecast.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <span className="text-[9px] font-black text-zinc-500 uppercase">{day.day}</span>
                  <day.icon className="w-4 h-4 text-white/70" />
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-white">{day.max}°</span>
                    <span className="text-[10px] font-bold text-zinc-500">{day.min}°</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search HUD - Gold Bordered */}
      {isSearchFocused && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-[2004] transition-all duration-500" />
      )}
      <div id="nav-search-container" className={`absolute transition-all duration-700 z-[2005] left-1/2 -translate-x-1/2 w-full max-w-[650px] px-6 ${milesRemaining > 0 ? 'top-[280px]' : 'top-8'}`}>
        {/* Waypoints List */}
        {waypoints.length > 0 && (
          <div className="flex flex-col gap-2 mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em]">Active Stops ({waypoints.length})</span>
              <button 
                onClick={() => setWaypoints([])}
                className="text-[9px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
              >
                Clear All
              </button>
            </div>
            {waypoints.map((wp, index) => (
              <div key={wp.id} className="bg-black/90 backdrop-blur-xl border border-[#D4AF37]/30 rounded-2xl p-4 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1 mr-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveWaypoint(index, 'up'); }}
                      disabled={index === 0}
                      className="p-1 rounded-lg bg-white/5 text-zinc-500 hover:text-[#D4AF37] disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveWaypoint(index, 'down'); }}
                      disabled={index === waypoints.length - 1}
                      className="p-1 rounded-lg bg-white/5 text-zinc-500 hover:text-[#D4AF37] disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                    >
                      <ArrowUp className="w-3 h-3 rotate-180" />
                    </button>
                  </div>
                  <div className={`p-2.5 rounded-xl ${wp.type === 'PAID' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-500/20 text-zinc-500'}`}>
                    {wp.type === 'PAID' ? <CircleDollarSign className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-0.5">{wp.type} STOP {index + 1}</span>
                    <span className="text-sm font-bold text-white truncate max-w-[300px]">{wp.address}</span>
                  </div>
                </div>
                <button 
                  onClick={() => removeWaypoint(wp.id)} 
                  className="p-2.5 rounded-xl bg-white/5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90 ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button 
              onClick={() => handleNavigate().catch(err => {
                console.error("Navigation failed from start route button:", err);
                setError("Failed to calculate route. Please try again.");
              })}
              disabled={isCalculating || !isMapReady}
              className="w-full py-4 bg-[#D4AF37] hover:bg-[#B8860B] text-black rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-3 mt-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCalculating ? <Loader2 className="w-5 h-5 animate-spin" /> : <NavIcon className="w-5 h-5" />}
              <span>Start Route</span>
            </button>
          </div>
        )}

        <div className={`w-full bg-black/95 backdrop-blur-3xl ${isSuggestionsVisible && suggestions.length > 0 ? 'rounded-t-[2.5rem]' : 'rounded-[2.5rem]'} border transition-all duration-500 ${isSearchFocused ? 'border-[#D4AF37] shadow-[0_0_80px_rgba(212,175,55,0.4)] scale-[1.02]' : 'border-[#D4AF37]/20 shadow-2xl'}`}>
          <div className="flex items-center p-2 pl-7">
            <Search className={`w-6 h-6 mr-5 transition-colors ${isSearchFocused ? 'text-[#D4AF37]' : 'text-zinc-700'}`} />
            <input 
              id="nav-search-input"
              type="text" 
              placeholder={!isMapReady ? "System Booting..." : isCalculating ? "Mapping Path..." : "Search Address or Point of Interest..."} 
              className="flex-1 bg-transparent border-none outline-none text-white text-xl font-black placeholder:text-zinc-800 tracking-tight py-5" 
              value={searchQuery} 
              disabled={isCalculating || !isMapReady} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              onFocus={() => { setIsSearchFocused(true); setIsSuggestionsVisible(true); }} 
              onBlur={() => { setIsSuggestionsVisible(false); setIsSearchFocused(false); }} 
              onKeyDown={(e) => e.key === 'Enter' && handleNavigate().catch(err => {
                console.error("Navigation failed from enter key:", err);
                setError("Failed to calculate route. Please try again.");
              })}  
            />
            <button id="nav-search-button" onClick={() => handleNavigate().catch(err => {
              console.error("Navigation failed from search button:", err);
              setError("Failed to calculate route. Please try again.");
            })} disabled={!isMapReady} className={`flex items-center gap-3 px-10 py-4 rounded-full transition-all active:scale-95 mr-1 ${searchQuery.trim() && !isCalculating ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' : 'bg-zinc-900 text-zinc-700'}`}>
              {isCalculating ? <Loader2 className="w-5 h-5 animate-spin" /> : <NavIcon className="w-5 h-5" />}
              <span className="text-[14px] font-black uppercase tracking-widest italic">{isCalculating ? 'Mapping' : 'Route'}</span>
            </button>
          </div>
        </div>
        {isSuggestionsVisible && suggestions.length > 0 && (
          <div className={`w-full bg-black/95 backdrop-blur-3xl rounded-b-[2.5rem] border-x border-b border-[#D4AF37]/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-top-2 duration-300 ${milesRemaining > 0 ? 'max-h-[200px]' : 'max-h-[400px]'} overflow-y-auto custom-scrollbar`}>
            <ul className="py-2">
              {suggestions.map((s) => (
                <li key={s.place_id}>
                  <div 
                    className="w-full text-left px-8 py-5 text-white hover:bg-[#D4AF37]/20 transition-all group flex items-start gap-5 border-b border-white/5 last:border-none cursor-pointer"
                    onMouseDown={() => handleNavigate(s.display_name).catch(err => {
                      console.error("Navigation failed from suggestion:", err);
                      setError("Failed to calculate route. Please try again.");
                    })}
                  >
                    <div className="mt-1 p-2 rounded-lg bg-white/5 group-hover:bg-[#D4AF37]/20 transition-colors">
                      <MapIcon className="w-4 h-4 text-zinc-500 group-hover:text-[#D4AF37]" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-base font-black tracking-tight group-hover:text-[#D4AF37] transition-colors">{s.display_name.split(',')[0]}</span>
                      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mt-0.5 line-clamp-1">{s.display_name.split(',').slice(1).join(',').trim()}</span>
                    </div>
                    
                    <div className="flex gap-2 ml-auto">
                      <button 
                        onMouseDown={(e) => { e.stopPropagation(); addWaypoint(s, 'DEADHEAD'); }}
                        className="px-4 py-2 rounded-xl bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20 hover:text-white transition-all flex items-center gap-2 border border-zinc-500/20"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Deadhead</span>
                      </button>
                      <button 
                        onMouseDown={(e) => { e.stopPropagation(); addWaypoint(s, 'PAID'); }}
                        className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 hover:text-white transition-all flex items-center gap-2 border border-emerald-500/20"
                      >
                        <CircleDollarSign className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Paid</span>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div id="nav-map-controls" className="absolute right-10 top-2/3 z-[1000] flex flex-col gap-5">
        <div className="relative">
          <button 
            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            className={`p-6 bg-black/95 backdrop-blur-3xl border rounded-[2rem] shadow-xl hover:bg-zinc-900 active:scale-90 transition-all ${isFilterMenuOpen ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-[#D4AF37]/20 text-[#D4AF37]'}`}
            title="Filter POIs"
          >
            <Filter strokeWidth={4} />
          </button>
          
          {isFilterMenuOpen && (
            <div className="absolute right-full mr-4 top-0 bg-black/95 backdrop-blur-3xl border border-[#D4AF37]/30 rounded-2xl p-4 shadow-2xl w-56 flex flex-col gap-3">
              <h3 className="text-[#D4AF37] font-bold text-sm uppercase tracking-wider border-b border-[#D4AF37]/20 pb-2 mb-1">Show on Map</h3>
              
              {[
                { id: 'major_chains', label: 'Major Truck Stops (Love\'s, Pilot, TA...)' },
                { id: 'fuel', label: 'Other Fuel / Truck Stops' },
                { id: 'parking', label: 'Parking / Rest Areas' },
                { id: 'weigh_station', label: 'Weigh Stations' },
                { id: 'food', label: 'Food / Restaurants' },
                { id: 'service', label: 'Service / Repair' },
                { id: 'other', label: 'Other POIs' }
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => {
                    setPoiFilters(prev => {
                      const next = new Set(prev);
                      if (next.has(filter.id)) {
                        next.delete(filter.id);
                      } else {
                        next.add(filter.id);
                      }
                      return next;
                    });
                  }}
                  className="flex items-center justify-between text-left text-zinc-300 hover:text-white transition-colors group"
                >
                  <span className="text-sm font-medium">{filter.label}</span>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${poiFilters.has(filter.id) ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-zinc-600 group-hover:border-zinc-400'}`}>
                    {poiFilters.has(filter.id) && <Check className="w-3.5 h-3.5 text-black" strokeWidth={4} />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={() => {
            if (userLocation && !isFetchingPoisRef.current) {
              isFetchingPoisRef.current = true;
              setIsFetchingPois(true);
              lastPoiFetchRef.current = { time: Date.now(), lat: userLocation[0], lon: userLocation[1] };
              fetchTruckPOIs(userLocation[0], userLocation[1])
                .then(setPois)
                .catch(err => console.error("Manual POI refresh failed:", err))
                .finally(() => {
                  isFetchingPoisRef.current = false;
                  setIsFetchingPois(false);
                });
            }
          }}
          className="p-6 bg-black/95 backdrop-blur-3xl border border-[#D4AF37]/20 rounded-[2rem] text-[#D4AF37] shadow-xl hover:bg-zinc-900 active:scale-90 transition-all disabled:opacity-50"
          title="Refresh Truck Stops"
          disabled={isFetchingPois}
        >
          {isFetchingPois ? <Loader2 className="w-6 h-6 animate-spin" /> : <Fuel strokeWidth={4} />}
        </button>
        <button id="nav-zoom-in" onClick={() => mapInstanceRef.current?.zoomIn()} className="p-6 bg-black/95 backdrop-blur-3xl border border-[#D4AF37]/20 rounded-[2rem] text-[#D4AF37] shadow-xl hover:bg-zinc-900 active:scale-90 transition-all"><Plus strokeWidth={4} /></button>
        <button id="nav-zoom-out" onClick={() => mapInstanceRef.current?.zoomOut()} className="p-6 bg-black/95 backdrop-blur-3xl border border-[#D4AF37]/20 rounded-[2rem] text-[#D4AF37] shadow-xl hover:bg-zinc-900 active:scale-90 transition-all"><Minus strokeWidth={4} /></button>
        <button id="nav-recenter" onClick={() => { 
          if (isValidLatLng(userLocation) && mapInstanceRef.current) { 
            try {
              mapInstanceRef.current.setView(userLocation, 17, { animate: true }); 
              setIsFollowMode(true); 
            } catch (e) {
              console.error("Recenter setView error:", e);
            }
          } 
        }} className={`p-6 bg-black/95 backdrop-blur-3xl border rounded-[2rem] text-[#D4AF37] shadow-xl hover:text-[#FFD700] active:scale-90 transition-all ${!isFollowMode ? 'border-red-500/50 animate-pulse' : 'border-[#D4AF37]/20'}`}><RotateCcw strokeWidth={4} /></button>
      </div>

      {currentRoad && isDriving && (
        <div className="absolute bottom-[180px] left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md text-white font-bold text-lg px-6 py-3 rounded-2xl border-2 border-[#D4AF37]/50 shadow-2xl z-[1001] animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-[#D4AF37]" />
            <span>{currentRoad}</span>
          </div>
        </div>
      )}

      {/* Arrival HUD */}
      <div id="nav-arrival-hud" className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[2010] w-full max-w-[750px] px-6 pointer-events-none">
        <div className="bg-black border border-[#D4AF37]/30 rounded-[2.5rem] p-6 flex items-center justify-between shadow-[0_40px_100px_rgba(0,0,0,0.8)] pointer-events-auto transition-all hover:scale-[1.005]">
          <button id="nav-exit-button" onClick={() => window.location.reload()} className="p-6 rounded-[1.5rem] bg-zinc-900 text-zinc-600 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all active:scale-90">
            <X className="w-7 h-7" strokeWidth={5} />
          </button>

          <div className="flex items-center gap-12">
            <div id="nav-stat-speed" className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.25em] mb-1">Speed</span>
              <span className="text-4xl font-bold text-[#D4AF37] tracking-tight leading-none">
                {context?.speed || 0}
                <span className="text-xs text-zinc-600 ml-1.5 font-bold uppercase">mph</span>
              </span>
            </div>
            <div className="h-14 w-px bg-[#D4AF37]/20" />
            <div id="nav-stat-dist" className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.25em] mb-1">Target Dist</span>
              <span className="text-5xl font-bold text-[#D4AF37] tracking-tight leading-none">
                {milesRemaining > 0 ? milesRemaining.toFixed(1) : '---'}
                <span className="text-xs text-zinc-600 ml-1.5 font-bold uppercase">mi</span>
              </span>
            </div>
            <div className="h-14 w-px bg-[#D4AF37]/20" />
            {waypoints.length > 0 && (
              <>
                <div id="nav-stat-stops" className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.25em] mb-1">Stops</span>
                  <span className="text-4xl font-bold text-[#D4AF37] tracking-tight leading-none">
                    {waypoints.length}
                    <span className="text-xs text-zinc-600 ml-1.5 font-bold uppercase">pts</span>
                  </span>
                </div>
                <div className="h-14 w-px bg-[#D4AF37]/20" />
              </>
            )}
            <div id="nav-stat-eta" className="flex flex-col items-end">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${userLocation ? 'bg-[#D4AF37] animate-pulse shadow-[0_0_10px_#D4AF37]' : 'bg-zinc-800'}`} />
                <span className="text-4xl font-bold text-white tracking-tight leading-none">{eta}</span>
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.25em] mt-1.5">Verified ETA • LIVE</span>
            </div>
            {currentDestination !== 'Standby' && (
              <>
                <div className="h-14 w-px bg-[#D4AF37]/20" />
                <button 
                  onClick={clearRoute}
                  className="p-4 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-90 flex flex-col items-center gap-1"
                >
                  <X className="w-6 h-6" strokeWidth={3} />
                  <span className="text-[8px] font-black uppercase tracking-widest">Clear</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_350px_rgba(0,0,0,0.95)]" />
    </div>
  );
};

export default NavigationView;