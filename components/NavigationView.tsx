import { getRoute } from '../src/services/hereRoutingService';
import { safeStringify, isValidLatLng, calcDistMi } from '../utils';
import { getUserStorageKey, getCurrentUserId } from '../utils/userStorage';
import React, { useEffect, useLayoutEffect, useRef, useState, useContext, useMemo, useCallback } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
// Map utility imports (Mapbox GL JS wrapper)
import { createHereMap, disposeHereMap, createGroup, createPolyline, updatePolylineCoords, createDomMarker, createSvgMarker, boundsFromCoords, fitBounds, createClusterProvider, buildClusterDataPoints } from '../utils/hereMapUtils';
import { 
  Plus, 
  Search,
  Navigation as NavIcon,
  Loader2,
  RotateCcw,
  RotateCw,
  Wind,
  CloudSun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Sun,
  Eye,
  Octagon,
  ArrowUp,
  AlertTriangle,
  Zap,
  Map as MapIcon,
  ArrowLeft,
  ArrowRight,
  Undo2,
  GitMerge,
  CornerUpLeft,
  CornerUpRight,
  CornerDownLeft,
  CornerDownRight,
  Truck,
  CircleDollarSign,
  Trash2,
  List,
  Compass,
  Star,
  TrafficCone,
  Scale,
  Fuel,
  ParkingSquare,
  UtensilsCrossed,
  Wrench,
  Box,
  MapPin,
  Phone,
  Globe,
  Clock,
  X,
  Mic,
  MapPinned,
  CheckCircle2,
  SkipForward,
  ChevronDown
} from 'lucide-react';
import { fetchTrafficInfrastructure, playTrafficAlert, TrafficInfrastructure } from '../services/trafficInfrastructure';
import { TrafficIcon } from './TrafficIcon';
import { Navigation3DView } from './Navigation3DView';
import { PoiDetailModal } from './PoiDetailModal';
import { RouteStepsModal } from './RouteStepsModal';
import { NavigationHUD } from './NavigationHUD';
import { WarningBanners } from './WarningBanners';
import { loadHudLayout, loadHudPositions, loadHudScales, DEFAULT_POSITIONS, DEFAULT_SCALES, type HudPositions, type HudScales } from '../utils/hudLayout';
import type { HudLayoutConfig } from '../types';
import { useHudConfig } from '../hooks/useHudConfig';
import { useSignPlacement } from '../hooks/useSignPlacement';
import { useTrafficFlow } from '../hooks/useTrafficFlow';
import { useRouteReasoning } from '../hooks/useRouteReasoning';

interface Waypoint {
  id: string;
  address: string;
  lat: number;
  lon: number;
  type: 'DEADHEAD' | 'PAID';
}
import { AppContext, HOSContext, LocationContext, TelemetryContext, POI } from '../types';
import { RouteHistoryItem, RestrictionAlert } from '../types';
import { fetchTruckPOIs, fetchCorridorPOIs, searchPlaces, fetchAddressSuggestions, lookupPlace } from '../services/geminiService';
import { fetchCorridorFuelPrices, matchFuelStationToPoi, findCheapestDiesel, FuelStation } from '../services/fuelPriceService';
import { speak } from '../services/speechService';
import { SpeedLimitSign, HighwayShield } from './MapUI';
import { MapControls } from './MapControls';
import { CompassRose } from './CompassRose';
import { FacilityPanel, AddFacilityForm } from './FacilityPanel';
import { fetchFacilities, facilityIconSVG, Facility } from '../services/facilityService';
// ReputationScore functions used elsewhere
import { RouteSettingsModal } from './RouteSettingsModal';
import { getPoiIcon, getPoiCategory, getPoiFilterIcon, getEntranceIcon, getExitIcon } from './PoiIcon';
import { getFuelNetworkSelections } from './FuelNetwork';
import { decode } from '@here/flexpolyline';
import { RouteComparisonPanel } from './RouteComparisonPanel';
import { FuelCostCalculator } from './FuelCostCalculator';
import { DriverFatigueAlert } from './DriverFatigueAlert';
import { useLaneVisualization } from '../hooks/useLaneVisualization';
import { useTruckIntelligence } from '../hooks/useTruckIntelligence';
import { ManeuverPreview } from './ManeuverPreview';

import { ViewType } from '../types';

interface NavigationViewProps {
  initialTarget?: string | null;
  userLocation: [number, number] | null;
  activeView?: ViewType;
}

const MAPTILER_KEY = process.env.MAPTILER_API_KEY || '';
const HERE_API_KEY = process.env.HERE_API_KEY || '';
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';
const MAPTILER_STYLE_ID = '019cd801-e446-7ed9-b765-d542688d7f3e';
const MAPTILER_STYLE = {
  url: `https://api.maptiler.com/maps/${MAPTILER_STYLE_ID}/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`,
  attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
};

const FALLBACK_LOCATION: [number, number] = [39.0119, -98.4842];
const noop = () => {};

// Manual distance calculation helpers
const R_EARTH = 6371e3; // Earth radius in meters
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
  return R_EARTH * c;
};

const calcEuclideanDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2));
};

// Convert metric references in instruction text to imperial (miles/feet)
const convertInstructionToImperial = (instruction: string): string => {
  // Convert "X.X km" to "X.X mi"
  let result = instruction.replace(/(\d+(?:\.\d+)?)\s*km\b/gi, (_match, num) => {
    const miles = parseFloat(num) * 0.621371;
    if (miles < 0.1) return `${Math.round(miles * 5280)} feet`;
    if (miles < 0.5) return `quarter mile`;
    if (miles < 0.8) return `half a mile`;
    if (miles < 1.2) return `1 mile`;
    return `${miles.toFixed(1)} miles`;
  });
  // Convert "X meters" or "X metres" to feet/miles
  result = result.replace(/(\d+(?:\.\d+)?)\s*(?:meters?|metres?)\b/gi, (_match, num) => {
    const meters = parseFloat(num);
    const miles = meters / 1609.34;
    if (miles >= 1) return `${miles.toFixed(1)} miles`;
    if (miles >= 0.4) return `half a mile`;
    if (miles >= 0.2) return `quarter mile`;
    return `${Math.round(meters * 3.28084)} feet`;
  });
  // Convert standalone "X m" (meters) — match "X m" not followed by letters (avoids "mi", "min" etc.)
  result = result.replace(/(\d+)\s*m(?=[,.\s)]|$)/gi, (_match, num) => {
    const meters = parseInt(num);
    const miles = meters / 1609.34;
    if (miles >= 1) return `${miles.toFixed(1)} miles`;
    if (miles >= 0.4) return `half a mile`;
    if (miles >= 0.2) return `quarter mile`;
    return `${Math.round(meters * 3.28084)} feet`;
  });
  return result;
};

/**
 * Synthesizes lane guidance data from HERE API action type + direction.
 * Professional truck GPS units generate lane views from road geometry data.
 * Since the HERE REST API doesn't provide per-lane data, we derive it from:
 *   - action type: enterHighway, exit, keep, continueHighway, turn, fork, roundabout
 *   - direction: left, right, middle
 *   - severity: light, quite, heavy
 */
const synthesizeLanes = (actionType: string, direction: string | undefined, severity?: string): any[] => {
  if (!actionType || actionType === 'depart' || actionType === 'arrive') return [];
  
  const dir = (direction || '').toLowerCase();
  const act = actionType.toLowerCase();
  
  // Helper to build a lane object
  const lane = (dirs: string, active: boolean) => ({
    direction: dirs,
    matches: active ? ['selected'] : []
  });

  // Highway entrance: 3-4 lanes, ramp lane highlighted
  if (act === 'enterhighway') {
    if (dir === 'left') {
      return [lane('slight left', true), lane('straight', false), lane('straight', false)];
    } else if (dir === 'right') {
      return [lane('straight', false), lane('straight', false), lane('slight right', true)];
    } else {
      // middle
      return [lane('straight', false), lane('straight', true), lane('straight', false)];
    }
  }
  
  // Highway exit: 3-4 lanes, exit lane highlighted
  if (act === 'exit') {
    if (dir === 'right') {
      return [lane('straight', false), lane('straight', false), lane('straight', false), lane('right', true)];
    } else {
      return [lane('left', true), lane('straight', false), lane('straight', false), lane('straight', false)];
    }
  }
  
  // Keep: highway fork/split, stay in indicated lanes
  if (act === 'keep') {
    if (dir === 'right') {
      return [lane('slight left', false), lane('straight;slight right', true), lane('slight right', true)];
    } else if (dir === 'left') {
      return [lane('slight left', true), lane('straight;slight left', true), lane('slight right', false)];
    } else {
      return [lane('slight left', false), lane('straight', true), lane('slight right', false)];
    }
  }
  
  // Continue highway: stay in flow lanes
  if (act === 'continuehighway') {
    if (dir === 'left') {
      return [lane('straight', true), lane('straight', true), lane('straight', false)];
    } else if (dir === 'right') {
      return [lane('straight', false), lane('straight', true), lane('straight', true)];
    } else {
      return [lane('straight', true), lane('straight', true), lane('straight', true)];
    }
  }
  
  // Fork: split lanes
  if (act === 'fork') {
    if (dir === 'right') {
      return [lane('slight left', false), lane('slight right', true), lane('slight right', true)];
    } else {
      return [lane('slight left', true), lane('slight left', true), lane('slight right', false)];
    }
  }
  
  // Turn at intersection: 2-3 lanes based on severity
  if (act === 'turn') {
    const isLight = severity === 'light' || severity === 'quite';
    if (dir === 'left') {
      return isLight
        ? [lane('left', true), lane('straight', false)]
        : [lane('left', true), lane('straight', false), lane('straight', false)];
    } else if (dir === 'right') {
      return isLight
        ? [lane('straight', false), lane('right', true)]
        : [lane('straight', false), lane('straight', false), lane('right', true)];
    }
  }
  
  // Roundabout
  if (act === 'roundabout' || act.includes('roundabout')) {
    if (dir === 'left' || dir === 'sharp left') {
      return [lane('left', true), lane('straight', false)];
    } else if (dir === 'right' || dir === 'sharp right') {
      return [lane('straight', false), lane('right', true)];
    } else {
      return [lane('straight', true), lane('straight', false)];
    }
  }
  
  // Default: no lane guidance for simple straight segments
  return [];
};

const SpeedLimitMarker = React.memo(({ currentSpeedLimit, speed, unitSystem }: { currentSpeedLimit: number | null; speed: number; unitSystem?: string }) => {
  if (!currentSpeedLimit) return null;
  const isMetric = unitSystem === 'metric';
  const displayLimit = isMetric ? Math.round(currentSpeedLimit * 1.60934) : currentSpeedLimit;
  // speed is already in mph (converted in App.tsx from m/s)
  const displaySpeed = isMetric ? Math.round(speed * 1.60934) : speed;
  
  return (
    <div data-testid="speed-limit-overlay" className="absolute top-4 left-4 z-[1999] pointer-events-none">
      <SpeedLimitSign limit={displayLimit} currentSpeed={displaySpeed} />
    </div>
  );
});

const NavigationView: React.FC<NavigationViewProps> = ({ initialTarget, userLocation: propUserLocation, activeView }) => {
  // console.log("NavigationView rendering, activeView:", activeView);
  const hasValidMapTilerKey = Boolean(MAPTILER_KEY) && MAPTILER_KEY !== 'YOUR_API_KEY';
  // console.log("NavigationView: MAPTILER_KEY", MAPTILER_KEY, "hasValidMapTilerKey", hasValidMapTilerKey);

  if (!hasValidMapTilerKey) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-[#050505] font-sans p-4">
        <div className="text-center max-w-md bg-zinc-900/50 backdrop-blur-xl border border-[#D4AF37]/20 rounded-3xl p-8 shadow-2xl">
          <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <MapIcon className="w-8 h-8 text-[#D4AF37]" />
          </div>
          <h2 className="text-2xl font-black text-white mb-4 tracking-tight uppercase">MapTiler API Key Required</h2>
          <p className="text-zinc-400 mb-8 text-sm leading-relaxed">
            To enable high-performance truck navigation, please provide a MapTiler API key.
          </p>
          
          <div className="space-y-4 text-left mb-8">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <p className="text-zinc-300 text-sm">Get a free key at <a href="https://www.maptiler.com/cloud/" target="_blank" rel="noopener" className="text-[#D4AF37] hover:underline">maptiler.com</a></p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center text-xs font-bold shrink-0">2</div>
              <p className="text-zinc-300 text-sm">Open <strong>Settings</strong> (⚙️ top-right) → <strong>Secrets</strong></p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center text-xs font-bold shrink-0">3</div>
              <p className="text-zinc-300 text-sm">Add <code>MAPTILER_API_KEY</code> and paste your key</p>
            </div>
          </div>

          <div className="p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl text-[#D4AF37] text-xs text-center">
            The app will rebuild automatically once the key is saved.
          </div>
        </div>
      </div>
    );
  }

  // console.log("NavigationView: Rendering", { initialTarget: !!initialTarget, propUserLocation: !!propUserLocation });
  const context = useContext(AppContext);
  const locationContext = useContext(LocationContext);
  const telemetryContext = useContext(TelemetryContext);
  const speed = React.useSyncExternalStore(
    telemetryContext?.subscribe || (() => () => {}),
    () => telemetryContext?.speedRef.current || 0
  );
  const mapInstanceRef = useRef<any>(null);
  const mapboxMapRef = useRef<any>(null); // kept for 3D compat - unused with HERE
  const herePlatformRef = useRef<any>(null);
  const hereDefaultLayersRef = useRef<any>(null);
  const hereBehaviorRef = useRef<any>(null);
  const hereUiRef = useRef<any>(null);
  const routeGroupRef = useRef<any>(null); // Map layer group
  const shieldLayerGroupRef = useRef<any>(null); // Map layer group
  const roadOverlayRef = useRef<any>(null);
  const markerClusterGroupRef = useRef<any>(null);
  const clusterProviderRef = useRef<any>(null);
  const clusterLayerRef = useRef<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<any>(null);
  const userMarkerElRef = useRef<HTMLElement | null>(null);
  // Smooth marker interpolation
  const markerTargetRef = useRef<[number, number] | null>(null);
  const markerCurrentRef = useRef<[number, number] | null>(null);
  const markerAnimFrameRef = useRef<number>(0);
  const mapLayersRef = useRef<Record<string, any>>({});
  const poiMarkersRef = useRef<any[]>([]);
  const waypointMarkersRef = useRef<any[]>([]);
  const trafficIncidentMarkersRef = useRef<any[]>([]);
  const trafficIncidentIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [autoRerouteCountdown, setAutoRerouteCountdown] = useState<number | null>(null);
  const autoRerouteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastIncidentFetchRef = useRef<number>(0);
  const [triggerReroute, setTriggerReroute] = useState(false);
  
  // HUD Layout configuration (extracted to hook)
  const { hudLayout, setHudLayout, hudPositions, setHudPositions, hudScales, setHudScales } = useHudConfig();

  // Sign placement system (extracted to hook)
  const {
    signDataStoreRef, visibleSignMarkersRef, syncVisibleSignsRef,
    syncVisibleSigns, clearSigns, setRegionState, setDataSaver,
    updateSignVisibility,
    placeHighwayShields, placeExitSigns, placeCurveSigns,
    placeSpeedLimitSigns, placeTrafficSlowdowns, placeCmvWarnings, placeTruckWarnings,
    placeRoadLabels,
  } = useSignPlacement(mapInstanceRef, shieldLayerGroupRef);

  // Traffic flow overlay system
  const {
    startTrafficFlow, stopTrafficFlow, refreshFlow, clearFlow,
  } = useTrafficFlow(mapInstanceRef);

  // Route reasoning overlay system
  const {
    renderReasoning, parseRouteReasoning, clearReasoning,
    setEnabled: setReasoningEnabled, enabledRef: reasoningEnabledRef,
  } = useRouteReasoning(mapInstanceRef);

  // Overlay toggle states
  const [showTrafficFlow, setShowTrafficFlow] = useState(false);
  const [showRouteReasoning, setShowRouteReasoning] = useState(false);
  const [weatherDismissed, setWeatherDismissed] = useState(false);

  // ─── Responsive auto-scale: detect screen size + orientation ─────────────
  const [screenScale, setScreenScale] = useState(1);
  const [isPortrait, setIsPortrait] = useState(false);
  useEffect(() => {
    const computeScale = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const portrait = h > w;
      setIsPortrait(portrait);
      // Scale factor: 1.0 for 1920+ desktop, scales down for smaller screens
      let scale = 1;
      if (w < 400) scale = 0.6;         // Small phone
      else if (w < 640) scale = 0.72;   // Phone
      else if (w < 768) scale = 0.82;   // Large phone / small tablet
      else if (w < 1024) scale = 0.9;   // Tablet
      else if (w < 1280) scale = 0.95;  // Small desktop
      // Portrait orientation: tighten spacing
      if (portrait && w < 768) scale *= 0.9;
      setScreenScale(scale);
    };
    computeScale();
    window.addEventListener('resize', computeScale);
    window.addEventListener('orientationchange', () => setTimeout(computeScale, 200));
    return () => {
      window.removeEventListener('resize', computeScale);
      window.removeEventListener('orientationchange', computeScale);
    };
  }, []);

  // Compute effective scale: user's hudScale * auto-responsive screenScale
  const autoScale = useCallback((key: string) => {
    const userScale = (hudScales as any)[key] || 1;
    return userScale * screenScale;
  }, [hudScales, screenScale]);


  // Reload HUD config from localStorage when this view becomes active
  useEffect(() => {
    if (activeView === ViewType.NAVIGATION) {
      setHudLayout(loadHudLayout());
      setHudPositions(loadHudPositions());
      setHudScales(loadHudScales());
    }
  }, [activeView]);

  // Sync map sign visibility whenever hudLayout sign toggles change
  useEffect(() => {
    updateSignVisibility(hudLayout as any);
    syncVisibleSigns();
  }, [
    hudLayout.showHighwayShields, hudLayout.showExitSigns, hudLayout.showCurveWarnings,
    hudLayout.showSpeedLimitSigns, hudLayout.showTrafficIncidents, hudLayout.showCmvWarnings,
    hudLayout.showTruckRestrictions, updateSignVisibility, syncVisibleSigns,
  ]);

  // Traffic flow overlay toggle
  useEffect(() => {
    if (showTrafficFlow) {
      startTrafficFlow();
    } else {
      stopTrafficFlow();
    }
    return () => { stopTrafficFlow(); };
  }, [showTrafficFlow]);

  // Route reasoning overlay toggle
  useEffect(() => {
    setReasoningEnabled(showRouteReasoning);
  }, [showRouteReasoning, setReasoningEnabled]);

  const userLocation = useMemo(() => {
    // console.log("NavigationView: userLocation calculation", { propUserLocation, locationContextUserLocation: locationContext?.userLocation });
    return propUserLocation || locationContext?.userLocation || FALLBACK_LOCATION;
  }, [propUserLocation, locationContext?.userLocation]); 
  const truckProfile = context?.truckProfile || { 
    height: 0, 
    weight: 0, 
    length: 0, 
    width: 0, 
    hazmat: false, 
    hazmatClasses: [], 
    tunnelCategory: 'NONE', 
    axleCount: 0, 
    axleWeight: 0, 
    trailerCount: 0 
  };
  const routeDistancesRef = useRef<number[]>([]);
  const routeCoordsRef = useRef<[number, number][]>([]);
  const routeLineRef = useRef<any>(null);
  const currentSegmentLineRef = useRef<any>(null);
  const totalRouteDistanceRef = useRef(0);
  const lastSimIdxRef = useRef(-1);
  const routeDurationRef = useRef<number>(0);
  const routeSavedRef = useRef<boolean>(false);

  // User-scoped localStorage helpers
  const uKey = useCallback((key: string) => getUserStorageKey(getCurrentUserId(), key), []);
  const uGet = useCallback((key: string) => { try { return localStorage.getItem(getUserStorageKey(getCurrentUserId(), key)); } catch { return null; } }, []);
  const uSet = useCallback((key: string, val: string) => { try { localStorage.setItem(getUserStorageKey(getCurrentUserId(), key), val); } catch {} }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  const [mapCenter, setMapCenter] = useState<[number, number]>(userLocation);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const isDriving = context?.isDriving || false;
  const setIsDriving = context?.setIsDriving || (() => {});
  const dataSaver = context?.dataSaver || false;
  useEffect(() => { setDataSaver(dataSaver); }, [dataSaver, setDataSaver]);
  const setUserLocation = locationContext?.setUserLocation || noop;
  const hosContext = useContext(HOSContext);
  const eldStatus = hosContext?.eldStatus;
  const setEldStatus = hosContext?.setEldStatus;
  const hasViolation = hosContext?.hasViolation || false;

  const [currentDestination, setCurrentDestination] = useState(() => uGet('nav_current_destination') || 'Standby');
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(() => {
    const saved = uGet('nav_destination_coords');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse nav_destination_coords from localStorage", e);
      return null;
    }
  });
  const [milesRemaining, setMilesRemaining] = useState(0);
  const [initialMiles, setInitialMiles] = useState(0);
  const [eta, setEta] = useState('--:-- --');
  const [remainingDuration, setRemainingDuration] = useState<number>(0);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  
  // Convert routePoints to Mapbox coordinate format [lng, lat] for 3D view
  const routeCoordinates = routePoints.map(point => [point[1], point[0]]);
  const [isOverviewMode, setIsOverviewMode] = useState(false);
  const [isFollowMode, setIsFollowMode] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);

  const [isNorthUp, setIsNorthUp] = useState(false); // Always start in heading-up mode
  const [isTilted, setIsTilted] = useState(false); // Map tilt toggle (0° flat vs 55° cinematic)
  const manualRotationRef = useRef(0);
  const [manualRotation, setManualRotation] = useState(0);
  const [isCompassMode, setIsCompassMode] = useState(false);
  const compassHeadingRef = useRef(0);

  // Zoom tracking and auto-zoom for maneuvers
  const [currentZoom, setCurrentZoom] = useState<number>(17);
  const userPreferredZoomRef = useRef<number>(17); // The zoom level the user manually set
  const isManeuverZoomActiveRef = useRef<boolean>(false); // Whether auto-zoom is currently engaged

  // Handle orientation mode changes and apply rotation
  useEffect(() => {
    manualRotationRef.current = manualRotation;
    const el = mapRef.current;
    if (!el) return;

    if (isNorthUp) {
      // North-up mode: apply manual rotation (user can still rotate with touch)
      el.style.setProperty('--map-rotation', `${manualRotation}deg`);
    }
    // Heading-up mode rotation is handled by the telemetry subscription (updateRotationAndPan)
  }, [manualRotation, isNorthUp, isCompassMode]);

  // When switching modes, reset rotation properly
  const handleToggleNorthUp = useCallback(() => {
    const newVal = !isNorthUp;
    setIsNorthUp(newVal);
    localStorage.setItem(uKey('nav_north_up'), String(newVal));
    
    const el = mapRef.current;
    if (newVal) {
      // Switching TO North Up — reset rotation to face north
      setManualRotation(0);
      manualRotationRef.current = 0;
      if (el) {
        el.style.setProperty('--map-rotation', '0deg');
      }
    } else {
      // Switching TO Heading Up — reset manual rotation and apply current heading
      setManualRotation(0);
      manualRotationRef.current = 0;
      // Use best available heading: GPS → route-based → position-based → smoothed
      let heading = telemetryContext?.headingRef?.current || 0;
      // Route-based heading: use current segment or first segment
      if (!heading && routeCoordsRef.current.length > 1) {
        const currentIdx = lastSimIdxRef.current;
        const idx = currentIdx >= 0 && currentIdx < routeCoordsRef.current.length - 1 ? currentIdx : 0;
        const p1 = routeCoordsRef.current[idx];
        const p2 = routeCoordsRef.current[idx + 1];
        const dy = p2[0] - p1[0];
        const dx = Math.cos(Math.PI / 180 * p1[0]) * (p2[1] - p1[1]);
        heading = (90 - Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
      }
      if (!heading && positionHeadingRef.current > 0) {
        heading = positionHeadingRef.current;
      }
      if (!heading && smoothedHeadingRef.current > 0) {
        heading = smoothedHeadingRef.current;
      }
      // Initialize smoothed heading so it doesn't snap back to 0
      if (heading > 0) {
        smoothedHeadingRef.current = heading;
      }
      const totalRotation = -heading;
      if (el) {
        el.style.setProperty('--map-rotation', `${totalRotation}deg`);
      }
    }
  }, [isNorthUp, telemetryContext]);

  const isRotatingRef = useRef(false);
  const initialAngleRef = useRef(0);
  const initialRotationRef = useRef(0);

  useEffect(() => {
    const mapEl = mapRef.current;
    if (!mapEl) return;

    const getAngle = (touches: TouchList) => {
      const dx = touches[1].clientX - touches[0].clientX;
      const dy = touches[1].clientY - touches[0].clientY;
      return Math.atan2(dy, dx) * 180 / Math.PI;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2 && isNorthUp) {
        // Only allow manual rotation in north-up mode
        e.preventDefault();
        isRotatingRef.current = true;
        initialAngleRef.current = getAngle(e.touches);
        initialRotationRef.current = manualRotationRef.current;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRotatingRef.current && e.touches.length === 2 && isNorthUp) {
        e.preventDefault();
        const currentAngle = getAngle(e.touches);
        const deltaAngle = currentAngle - initialAngleRef.current;
        setManualRotation(initialRotationRef.current + deltaAngle);
      }
    };

    const handleTouchEnd = () => {
      isRotatingRef.current = false;
    };

    mapEl.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    mapEl.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    mapEl.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });

    return () => {
      mapEl.removeEventListener('touchstart', handleTouchStart);
      mapEl.removeEventListener('touchmove', handleTouchMove);
      mapEl.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isNorthUp]);

  // Device compass mode — uses DeviceOrientationEvent for physical compass heading
  // Includes tilt compensation for non-level device mounting (truck dashboards)
  useEffect(() => {
    if (!isCompassMode) return;

    let smoothedCompass = compassHeadingRef.current || 0;
    let animFrameId = 0;
    let latestBearing = 0;
    let deviceGamma = 0; // left-right tilt
    let deviceBeta = 0;  // front-back tilt

    const handleOrientation = (event: DeviceOrientationEvent) => {
      let bearing = 0;
      // iOS provides webkitCompassHeading (true north, clockwise)
      if ((event as any).webkitCompassHeading !== undefined) {
        bearing = (event as any).webkitCompassHeading;
      } else if (event.alpha !== null) {
        // Android absolute / fallback — alpha is CCW from north, invert it
        bearing = (360 - (event.alpha || 0)) % 360;
      } else {
        return; // No usable data
      }

      // Capture device tilt for level correction
      deviceBeta = event.beta || 0;
      deviceGamma = event.gamma || 0;

      // Compensate compass heading for device tilt (non-level mounting)
      // When gamma != 0, the compass heading drifts — apply correction factor
      if (Math.abs(deviceBeta) > 10 && Math.abs(deviceBeta) < 170) {
        const tiltRad = (deviceGamma || 0) * Math.PI / 180;
        const betaRad = (deviceBeta || 0) * Math.PI / 180;
        // Small correction for tilted devices
        bearing = bearing - Math.atan2(Math.sin(tiltRad), Math.cos(tiltRad) * Math.cos(betaRad)) * 180 / Math.PI;
        bearing = ((bearing % 360) + 360) % 360;
      }

      latestBearing = bearing;
    };

    // Smooth animation loop — prevents jerky rotation on mobile
    const animate = () => {
      const diff = latestBearing - smoothedCompass;
      const normalizedDiff = ((diff + 540) % 360) - 180;
      // Heavy smoothing factor (0.08) for silky-smooth professional rotation
      smoothedCompass = (smoothedCompass + normalizedDiff * 0.08 + 360) % 360;

      compassHeadingRef.current = smoothedCompass;
      smoothedHeadingRef.current = smoothedCompass;

      if (userMarkerElRef.current) {
        userMarkerElRef.current.style.setProperty('--vehicle-rotation', `${smoothedCompass}deg`);
      }

      // Rotate map container with tilt-corrected heading
      const el = mapRef.current;
      if (el) {
        const rotation = manualRotationRef.current;
        el.style.setProperty('--map-rotation', `${-smoothedCompass + rotation}deg`);
      }

      animFrameId = requestAnimationFrame(animate);
    };

    const setup = async () => {
      // iOS 13+ requires explicit permission
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const perm = await (DeviceOrientationEvent as any).requestPermission();
          if (perm !== 'granted') { setIsCompassMode(false); return; }
        } catch { setIsCompassMode(false); return; }
      }
      // Prefer absolute orientation (Android), fall back to relative
      window.addEventListener('deviceorientationabsolute', handleOrientation as any, true);
      window.addEventListener('deviceorientation', handleOrientation as any);
      animFrameId = requestAnimationFrame(animate);
    };

    setup();

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as any);
      window.removeEventListener('deviceorientation', handleOrientation as any);
      cancelAnimationFrame(animFrameId);
    };
  }, [isCompassMode]);
  const [showTruckRestrictions] = useState(() => {
    const saved = uGet('nav_show_truck_restrictions');
    return saved === null ? true : saved === 'true';
  });
  
  const [avoidTolls, setAvoidTolls] = useState(() => uGet('nav_avoid_tolls') === 'true');
  const [avoidFerries, setAvoidFerries] = useState(() => uGet('nav_avoid_ferries') === 'true');
  const [avoidUnpaved, setAvoidUnpaved] = useState(() => uGet('nav_avoid_unpaved') === 'true');

  const [alternativeRoutes, setAlternativeRoutes] = useState<any[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [showRouteComparison, setShowRouteComparison] = useState(false);
  const [fuelPricePerGallon, setFuelPricePerGallon] = useState(3.52);
  const [truckMpg, setTruckMpg] = useState(6.5);
  const { drawLaneVisualization, clearLanes } = useLaneVisualization();
  const { analyzeRouteGrades, checkGradeProximity, clearGradeData } = useTruckIntelligence();
  const gradeWarningsRef = useRef<any[]>([]);
  const [activeGradeAlert, setActiveGradeAlert] = useState<string | null>(null);
  const [maneuverPreviewData, setManeuverPreviewData] = useState<any>(null);
  const [currentDistToManeuverMi, setCurrentDistToManeuverMi] = useState<number | undefined>(undefined);
  const [currentManeuverType, setCurrentManeuverType] = useState('');
  const [currentManeuverModifier, setCurrentManeuverModifier] = useState('');
  const [isCarPlayMode, setIsCarPlayMode] = useState(() => uGet('nav_carplay_mode') === 'true');
  const [isRouteSettingsOpen, setIsRouteSettingsOpen] = useState(false);
  const [isRoutePreview, setIsRoutePreview] = useState(false);
  const [isExploreMode, setIsExploreMode] = useState(false);
  const [trafficCams, setTrafficCams] = useState<any[]>([]);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [pois, setPois] = useState<any[]>(() => {
    // Clear any old fake POIs from localStorage
    uSet('truck_pois', '');
    console.log('Cleared old POI cache - will fetch fresh real data from HERE Maps');
    return [];
  });
  const poisRef = useRef<any[]>([]);
  useEffect(() => { poisRef.current = pois; }, [pois]);

  const [trafficInfrastructure, setTrafficInfrastructure] = useState<any[]>([]);
  const [showTrafficSigns, setShowTrafficSigns] = useState(() => 
    uGet('nav_show_traffic_signs') !== 'false'
  );
  const alertedTrafficItems = useRef<Set<string>>(new Set());
  
  const [is3DMode, setIs3DMode] = useState(() => 
    uGet('nav_3d_mode') === 'true'
  );
  const was3DRef = useRef(is3DMode);

  // Re-initialize HERE map when switching from 3D back to 2D
  useEffect(() => {
    const wasIn3D = was3DRef.current;
    was3DRef.current = is3DMode;
    
    // Only act when transitioning FROM 3D TO 2D (not on initial mount)
    if (wasIn3D && !is3DMode) {
      // Destroy old HERE map instance
      if (mapInstanceRef.current) {
        try {
          const handler = (mapInstanceRef.current as any).__resizeHandler;
          if (handler) window.removeEventListener('resize', handler);
          mapInstanceRef.current.dispose();
        } catch (e) { /* already disposed */ }
        mapInstanceRef.current = null;
      }
      // Reset all map-attached refs so they get recreated on the new instance
      routeGroupRef.current = null;
      shieldLayerGroupRef.current = null;
      clearSigns();
      markerClusterGroupRef.current = null;
      clusterProviderRef.current = null;
      clusterLayerRef.current = null;
      userMarkerRef.current = null;
      userMarkerElRef.current = null;
      poiMarkersRef.current = [];
      routeLineRef.current = null;
      facilityLayerGroupRef.current = null;
      facilityMarkersRef.current = new Map();
      mapLayersRef.current = {};
      setIsMapReady(false);
      // Wait for the DOM div to mount, then initialize
      setTimeout(() => {
        initializeMap();
      }, 150);
    }
  }, [is3DMode]);

  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
  const [poiParkingStatus, setPoiParkingStatus] = useState<{ status: string | null; updatedAt: string | null; updateCount: number } | null>(null);
  const [isParkingLoading, setIsParkingLoading] = useState(false);
  const [parkingSubmitDone, setParkingSubmitDone] = useState<string | null>(null);
  const [poiRatingsCache, setPoiRatingsCache] = useState<Record<string, { averageRating: number; totalReviews: number }>>({});

  useEffect(() => {
    // Save only real POIs fetched from APIs
    const str = safeStringify(pois);
    if (str && pois.length > 0) {
      localStorage.setItem(uKey('truck_pois'), str);
    }
  }, [pois]);
  const isFetchingPoisRef = useRef(false);
  const lastPoiFetchRef = useRef<{ time: number, lat: number, lon: number } | null>(null);
  const smoothedHeadingRef = useRef(0);
  const prevLocationRef = useRef<[number, number] | null>(null);
  const positionHeadingRef = useRef(0); // heading calculated from position changes
  const [showPois] = useState(() => uGet('nav_show_pois') !== 'false');

  // ─── Facility state ──────────────────────────────────────────────────────
  const [showFacilities, setShowFacilities] = useState(() => uGet('nav_show_facilities') !== 'false');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [showAddFacility, setShowAddFacility] = useState(false);
  const facilityLayerGroupRef = useRef<any>(null);
  const facilityMarkersRef = useRef<Map<string, any>>(new Map());

  const [poiFilters, setPoiFilters] = useState<Set<string>>(() => {
    const saved = uGet('poi_filters');
    const brandIds = ['loves', 'pilot', 'flying_j', 'petro', 'ta', 'road_ranger', 'bucees', 'sapp_bros', 'ambest', 'truck_wash'];
    try {
      const parsed = saved ? new Set(JSON.parse(saved)) : new Set([...brandIds, 'parking', 'rest_area', 'cat_scale', 'food', 'low_clearance', 'other']);
      parsed.delete('weigh_station'); // Remove weigh stations
      return parsed;
    } catch (e) {
      console.error("Failed to parse poi_filters from localStorage", e);
      return new Set([...brandIds, 'parking', 'rest_area', 'cat_scale', 'food', 'low_clearance', 'other']);
    }
  });

  useEffect(() => {
    const str = safeStringify(Array.from(poiFilters));
    if (str) uSet('poi_filters', str);
  }, [poiFilters]);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [minRatingFilter, setMinRatingFilter] = useState(0); // 0 = show all
  const [error, setError] = useState<string | null>(null);
  const [mapInitError, setMapInitError] = useState<string | null>(null);
  useEffect(() => {
    if (error) console.log("NavigationView: error state updated", error);
  }, [error]);
  const [showSteps, setShowSteps] = useState(false);
  const [routeSteps, setRouteSteps] = useState<any[]>([]);
  const [currentManeuverIndex, setCurrentManeuverIndex] = useState(-1);
  const [waypoints, setWaypoints] = useState<Waypoint[]>(() => {
    const saved = uGet('nav_waypoints');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse nav_waypoints from localStorage", e);
      return [];
    }
  });
  // console.log("NavigationView rendering");
  const lastPoiUpdateLocationRef = useRef<[number, number] | null>(null);
  const [upcomingPois, setUpcomingPois] = useState<any[]>([]);
  const [fuelStations, setFuelStations] = useState<FuelStation[]>([]);

  // Persistence Effects
  useEffect(() => {
    const str = safeStringify(waypoints);
    if (str) uSet('nav_waypoints', str);
  }, [waypoints]);

  useEffect(() => {
    const str = safeStringify(destinationCoords);
    if (str) uSet('nav_destination_coords', str);
  }, [destinationCoords]);

  useEffect(() => {
    uSet('nav_current_destination', currentDestination);
  }, [currentDestination]);

  useEffect(() => {
    // console.log("NavigationView: activeView changed to", activeView);
    if (activeView === ViewType.NAVIGATION) {
      if (!mapInstanceRef.current) {
        initializeMap();
      } else {
        mapInstanceRef.current.getViewPort().resize();
      }
    }
  }, [activeView]);

  useLayoutEffect(() => {
    // console.log("NavigationView: mapRef.current changed to", mapRef.current ? "exists" : "null");
  }, [mapRef.current]);

  const initializeMap = () => {
    // console.log("NavigationView: initializeMap called");
    try {
      if (!mapRef.current) {
        // console.log("NavigationView: mapRef.current is null");
        return;
      }
      if (mapInstanceRef.current) {
        // console.log("NavigationView: mapInstanceRef.current already exists");
        return;
      }

      // Ensure container has dimensions
      const width = mapRef.current.clientWidth;
      const height = mapRef.current.clientHeight;
      // console.log("NavigationView: map container dimensions", { width, height });

      if (width > 0 && height > 0) {
        // console.log("NavigationView: container has dimensions", { width, height });
        let timeoutId: any;
        try {
          // console.log("NavigationView: starting map initialization");
          // Add a timeout to trigger error if map takes too long to load
          timeoutId = setTimeout(() => {
            if (!isMapReady) {
              console.error("Map initialization timed out after 30 seconds");
              setMapInitError("Map initialization timed out. Please check your connection or API key.");
            }
          }, 30000); // 30 seconds timeout

          const centerLoc = isValidLatLng(userLocation) ? userLocation : FALLBACK_LOCATION;
          let map: any;
          try {
            // Initialize HERE Maps
            const hereResult = createHereMap(
              mapRef.current!,
              { lat: centerLoc[0], lng: centerLoc[1] },
              13
            );
            map = hereResult.map;
            herePlatformRef.current = hereResult.platform;
            hereDefaultLayersRef.current = hereResult.defaultLayers;
            hereBehaviorRef.current = hereResult.behavior;
            hereUiRef.current = hereResult.ui;
          } catch (e) {
            console.error("NavigationView: HERE Map init failed", e);
            throw e;
          }
          
          // Map event listeners
          map.addEventListener('dragstart', () => {
            setIsFollowMode(false);
          });
          map.addEventListener('mapviewchangeend', () => {
            const center = map.getCenter();
            setMapCenter([center.lat, center.lng]);
            syncVisibleSignsRef.current();
          });
          map.addEventListener('mapviewchangeend', () => {
            const z = map.getZoom();
            setCurrentZoom(z);
            if (!isManeuverZoomActiveRef.current) {
              userPreferredZoomRef.current = z;
            }
            syncVisibleSignsRef.current();
          });

          mapInstanceRef.current = map;
          
          // Initialize layer groups
          // Route polylines sit below signs/shields
          routeGroupRef.current = createGroup();
          routeGroupRef.current.setZIndex(100);
          map.addObject(routeGroupRef.current);
          // Signs, shields, weight limits, bridge heights, truck restrictions — always on TOP
          shieldLayerGroupRef.current = createGroup();
          shieldLayerGroupRef.current.setZIndex(900);
          map.addObject(shieldLayerGroupRef.current);

          // POI clustering layer for proper cluster/zoom behavior
          const { provider: clusterProv, layer: clusterLay } = createClusterProvider();
          clusterProviderRef.current = clusterProv;
          clusterLayerRef.current = clusterLay;
          map.addLayer(clusterLay);
          // Keep a reference for backwards-compat with existing code
          markerClusterGroupRef.current = clusterProv;

          clearTimeout(timeoutId);
          setIsMapReady(true);
          setTimeout(() => {
            map.getViewPort().resize();
          }, 100);
        } catch (error) {
          console.error("Map initialization caught error:", error);
          setMapInitError(`Map initialization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else {
        console.log("NavigationView: container dimensions are 0, retrying...");
        setTimeout(initializeMap, 500);
      }
    } catch (e) {
      console.error("NavigationView: initializeMap failed unexpectedly", e);
    }
  };


  useEffect(() => {
    if (!mapRef.current || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    
    const observer = new ResizeObserver(() => {
      map.getViewPort().resize();
    });
    
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, [isMapReady]);

  // Persist user preferences to localStorage
  useEffect(() => {
    uSet('nav_north_up', isNorthUp.toString());
    uSet('nav_avoid_tolls', avoidTolls.toString());
    uSet('nav_avoid_ferries', avoidFerries.toString());
    uSet('nav_avoid_unpaved', avoidUnpaved.toString());
    uSet('nav_carplay_mode', isCarPlayMode.toString());
    uSet('nav_show_pois', showPois.toString());
    uSet('nav_show_truck_restrictions', showTruckRestrictions.toString());
  }, [isNorthUp, avoidTolls, avoidFerries, avoidUnpaved, isCarPlayMode, showPois, showTruckRestrictions]);

  
  const [nextInstruction, setNextInstruction] = useState({ 
    text: 'Ready for Route', 
    distance: '0.0', 
    icon: ArrowUp as React.ElementType, 
    lanes: [] as any[],
    maneuver: null as any,
    followingStep: null as { text: string, icon: React.ElementType } | null
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
  const [restrictionAlerts, setRestrictionAlerts] = useState<RestrictionAlert[]>([]);
  const [trafficAlerts, setTrafficAlerts] = useState<any[]>([]);
  const cmvWarningsRef = useRef<{ type: string; severity: string; message: string; grade?: number; coord: [number, number]; progress: number }[]>([]);
  const routeSignsRef = useRef<{ speedLimitSigns: any[]; exitSigns: any[]; restrictions: any[]; curveSigns: any[] }>({ speedLimitSigns: [], exitSigns: [], restrictions: [], curveSigns: [] });
  const restrictionAlertMarkersRef = useRef<any[]>([]);
  const trafficAlertMarkersRef = useRef<any[]>([]);
  const weatherAlertMarkersRef = useRef<any[]>([]);
  const [weighStationAlert, setWeighStationAlert] = useState<{ distance: number, status: 'OPEN' | 'CLOSED' | 'BYPASS' } | null>(null);
  
  // Collapsible alert panels state
  const [restrictionsCollapsed, setRestrictionsCollapsed] = useState(false);
  const [trafficAlertsCollapsed, setTrafficAlertsCollapsed] = useState(false);
  const [weatherAlertsCollapsed, setWeatherAlertsCollapsed] = useState(false);
  const [poiPanelOpen, setPoiPanelOpen] = useState(true);
  // Alert detail modal
  const [alertDetailModal, setAlertDetailModal] = useState<{ type: string; title: string; items: { label: string; value: string; color?: string }[] } | null>(null);
  
  const [currentRoad, setCurrentRoad] = useState<string | null>(null);
  const [currentSpeedLimit, setCurrentSpeedLimit] = useState<number | null>(null);
  const routeSpansRef = useRef<any[]>([]);
  
  // Voice guidance: track which distance thresholds have been announced per step index
  const announcedManeuverThresholdsRef = useRef<Map<number, Set<string>>>(new Map());

  // ─── State/Country Boundary Tracking ──────────────────────────────────────
  const [currentRegion, setCurrentRegion] = useState<{ state: string | null; country: string | null; city: string | null }>(() => {
    try {
      const saved = uGet('trucker_current_region');
      return saved ? JSON.parse(saved) : { state: null, country: null, city: null };
    } catch { return { state: null, country: null, city: null }; }
  });
  useEffect(() => { setRegionState(currentRegion.state || ''); }, [currentRegion.state, setRegionState]);
  const lastGeocodeFetchRef = useRef<{ time: number; lat: number; lon: number } | null>(null);
  const prevRegionRef = useRef<{ state: string | null; country: string | null }>({ state: null, country: null });

  const lastViolationRef = useRef(false);
  const playedAlertsRef = useRef<Record<string, Set<number>>>({});
  
  // ─── Speed Warning System ─────────────────────────────────────────────────
  const speedWarningAudioRef = useRef<AudioContext | null>(null);
  const speedWarningActiveRef = useRef(false);
  const speedWarningIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isSpeedWarning, setIsSpeedWarning] = useState(false);
  
  useEffect(() => {
    if (!hudLayout.showSpeedWarning || !currentSpeedLimit || !isDriving) {
      if (speedWarningIntervalRef.current) {
        clearInterval(speedWarningIntervalRef.current);
        speedWarningIntervalRef.current = null;
      }
      speedWarningActiveRef.current = false;
      setIsSpeedWarning(false);
      return;
    }
    
    const tolerance = hudLayout.speedWarningTolerance ?? 5;
    const isSpeeding = speed > (currentSpeedLimit + tolerance);
    setIsSpeedWarning(isSpeeding);
    
    if (isSpeeding && !speedWarningActiveRef.current) {
      speedWarningActiveRef.current = true;
      // Play escalating beep pattern
      const playBeep = () => {
        try {
          if (!speedWarningAudioRef.current) {
            speedWarningAudioRef.current = new AudioContext();
          }
          const ctx = speedWarningAudioRef.current;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          osc.type = 'square';
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.15);
        } catch {}
      };
      playBeep();
      speedWarningIntervalRef.current = setInterval(playBeep, 3000);
    } else if (!isSpeeding && speedWarningActiveRef.current) {
      speedWarningActiveRef.current = false;
      if (speedWarningIntervalRef.current) {
        clearInterval(speedWarningIntervalRef.current);
        speedWarningIntervalRef.current = null;
      }
    }
    
    return () => {
      if (speedWarningIntervalRef.current) {
        clearInterval(speedWarningIntervalRef.current);
        speedWarningIntervalRef.current = null;
      }
    };
  }, [speed, currentSpeedLimit, isDriving, hudLayout.showSpeedWarning, hudLayout.speedWarningTolerance]);

  useEffect(() => {
    if (selectedPoi && (selectedPoi.place_id || selectedPoi.id) && !selectedPoi.detailsFetched) {
      const id = selectedPoi.place_id || selectedPoi.id;
      // Only lookup if it looks like a HERE ID (not a local UUID or static ID)
      if (id && id.length > 10) {
        lookupPlace(id).then(details => {
          if (details) {
            setSelectedPoi(prev => {
              if (!prev || (prev.place_id || prev.id) !== id) return prev;
              return {
                ...prev,
                detailsFetched: true,
                phone: details.contacts?.[0]?.phone?.[0]?.value,
                website: details.contacts?.[0]?.www?.[0]?.value,
                openingHours: details.openingHours?.[0]?.text,
                rating: details.rating,
                address: details.address?.label || prev.address,
                amenities: (details.categories?.map((c: any) => c.name) || prev.amenities || [])
                  .filter((a: string) => !/(ev\s*charg|electric\s*vehicle|tesla|supercharg|chargepoint|electrify|blink\s*charg)/i.test(a))
              };
            });
          }
        }).catch(err => {
          console.warn("Failed to lookup place details:", err);
        });
      }
    }
  }, [selectedPoi]);

  // Fetch crowd-sourced parking status when a POI popup opens
  useEffect(() => {
    if (!selectedPoi) {
      setPoiParkingStatus(null);
      setParkingSubmitDone(null);
      return;
    }
    const poiId = `${selectedPoi.lat.toFixed(4)}_${selectedPoi.lon.toFixed(4)}`;
    setIsParkingLoading(true);
    setPoiParkingStatus(null);
    setParkingSubmitDone(null);
    fetch(`/api/poi/parking-status?poiId=${encodeURIComponent(poiId)}`)
      .then(r => r.json())
      .then(data => setPoiParkingStatus(data))
      .catch(() => setPoiParkingStatus({ status: null, updatedAt: null, updateCount: 0 }))
      .finally(() => setIsParkingLoading(false));
  }, [selectedPoi?.lat, selectedPoi?.lon]);

  useEffect(() => {
    if (hasViolation && !lastViolationRef.current) {
      speak("Attention: Hours of Service violation detected. Immediate stop required.");
    }
    lastViolationRef.current = hasViolation;
  }, [hasViolation]);



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

  const lastPoiRenderCenterRef = useRef<[number, number] | null>(null);
  const poiIconsCacheRef = useRef<Record<string, string>>({});
  const weatherIconsCacheRef = useRef<Record<string, string>>({});

  const getCachedPoiIcon = (type: any, name: any) => {
    const category = getPoiCategory(type, name);
    if (poiIconsCacheRef.current[category]) return poiIconsCacheRef.current[category];
    
    const iconElement = getPoiIcon(type, name);
    if (!iconElement) return null;
    
    const html = renderToStaticMarkup(iconElement);
    poiIconsCacheRef.current[category] = html;
    return html;
  };

  const updateMapLine = (map: any, id: string, coords: [number, number][], color: string, width: number) => {
    if (!map) return;
    
    if (id === 'route' && routeGroupRef.current) {
      // Clear any existing route lines
      routeGroupRef.current.removeAll();
      
      // 1. Outer glow effect (soft gold shadow)
      routeGroupRef.current.addObject(createPolyline(coords, '#D4AF37', 28, { opacity: 0.18, zIndex: 1 }));
      
      // 2. Outer dark border (creates depth and road edge)
      routeGroupRef.current.addObject(createPolyline(coords, '#1a1a2e', 16, { opacity: 0.9, zIndex: 2 }));

      // 3. Inner route line — gold primary navigation path
      routeGroupRef.current.addObject(createPolyline(coords, '#D4AF37', 10, { opacity: 1, zIndex: 3 }));
      return;
    }

    const layer = mapLayersRef.current[id];
    if (layer) {
      updatePolylineCoords(layer, coords);
      return;
    }
    
    const polyline = createPolyline(coords, color, width);
    map.addObject(polyline);
    mapLayersRef.current[id] = polyline;
  };

  // Draw alternative routes with distinct colors (dimmed, dashed)
  const altRouteLayersRef = useRef<any>(null);
  const ALT_ROUTE_COLORS = ['#4A9EFF', '#8B5CF6', '#FF6B4A'];

  const drawAlternativeRoutes = (map: any, routes: any[], selectedIdx: number) => {
    if (!altRouteLayersRef.current) {
      altRouteLayersRef.current = createGroup();
      altRouteLayersRef.current.setZIndex(90);
      map.addObject(altRouteLayersRef.current);
    } else {
      altRouteLayersRef.current.removeAll();
    }

    routes.forEach((route, idx) => {
      if (idx === selectedIdx) return;
      const altColor = ALT_ROUTE_COLORS[(idx > selectedIdx ? idx - 1 : idx) % ALT_ROUTE_COLORS.length];
      altRouteLayersRef.current.addObject(createPolyline(route.coords, altColor, 6, { opacity: 0.35, dash: [12, 8] }));
    });

    // Mark diverge points
    if (routes.length > 1 && routes[selectedIdx]) {
      const primary = routes[selectedIdx].coords;
      routes.forEach((route, idx) => {
        if (idx === selectedIdx) return;
        const alt = route.coords;
        const altColor = ALT_ROUTE_COLORS[(idx > selectedIdx ? idx - 1 : idx) % ALT_ROUTE_COLORS.length];
        let divergeIdx = -1;
        for (let i = 0; i < Math.min(primary.length, alt.length); i++) {
          const dist = Math.abs(primary[i][0] - alt[i][0]) + Math.abs(primary[i][1] - alt[i][1]);
          if (dist > 0.001) { divergeIdx = Math.max(0, i - 1); break; }
        }
        if (divergeIdx >= 0 && divergeIdx < primary.length) {
          const dp = primary[divergeIdx];
          const markerHtml = `<div style="width:12px;height:12px;background:${altColor};border:2px solid white;border-radius:50%;box-shadow:0 0 8px ${altColor}80"></div>`;
          altRouteLayersRef.current.addObject(createDomMarker(dp[0], dp[1], markerHtml, [12, 12], [6, 6], 50));
        }
      });
    }
  };

  // Place highway shield markers along the route using HERE Map Image API
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // HERE Maps context menu (right-click / long-press)
    const ctxListener = (e: any) => {
      const coord = map.screenToGeo(e.viewportX, e.viewportY);
      if (!coord) return;
      console.log('contextmenu at:', coord);
    };
    (map as any).__ctxListener = ctxListener;
    map.addEventListener('contextmenu', ctxListener);

    let moveEndTimeout: any = null;
    const moveEndListener = () => {
      if (moveEndTimeout) clearTimeout(moveEndTimeout);
      moveEndTimeout = setTimeout(() => {
        if (!mapInstanceRef.current) return;
        const center = mapInstanceRef.current.getCenter();
        const lat = center.lat;
        const lon = center.lng;
        
        const shouldUpdateCenter = (lat: number, lon: number) => {
          if (!mapCenter) return true;
          const distance = calcDistMi(lat, lon, mapCenter[0], mapCenter[1]);
          return distance >= 1.0; // Only update state if moved > 1 mile
        };

        if (shouldUpdateCenter(lat, lon)) {
          setMapCenter([lat, lon]);
        }
        
        const shouldFetchPois = (lat: number, lon: number) => {
          if (!lastPoiFetchRef.current) return true;
          const { time, lat: lastLat, lon: lastLon } = lastPoiFetchRef.current;
          const now = Date.now();
          if (now - time > 15 * 60 * 1000) return true; // 15 minutes
          
          const distance = calcDistMi(lat, lon, lastLat, lastLon);
          return distance >= 10;
        };

        if (!isFetchingPoisRef.current && shouldFetchPois(center.lat, center.lng)) {
          isFetchingPoisRef.current = true;
          lastPoiFetchRef.current = { time: Date.now(), lat: center.lat, lon: center.lng };
          
          fetchTruckPOIs(center.lat, center.lng)
            .then((poiData) => {
              const combinedRaw = [...poiData];
              const seenInBatch = new Set();
              const combined = combinedRaw.filter(p => {
                const id = `${p.lat}-${p.lon}-${p.name}`;
                if (seenInBatch.has(id)) return false;
                seenInBatch.add(id);
                return true;
              });

              if (combined.length > 0) {
                setPois(prev => {
                  const existingIds = new Set();
                  // Only check against a subset of recent POIs if the list is too large
                  // or just keep it simple but add a hard limit
                  prev.forEach(p => existingIds.add(`${p.lat}-${p.lon}-${p.name}`));
                  
                  const newPois = combined.filter(p => !existingIds.has(`${p.lat}-${p.lon}-${p.name}`));
                  if (newPois.length === 0) return prev;
                  
                  const updated = [...prev, ...newPois];
                  // Keep only the 1000 most recent POIs to prevent performance degradation
                  if (updated.length > 1000) {
                    return updated.slice(updated.length - 1000);
                  }
                  return updated;
                });
              }
            })
            .catch(err => console.error("Moveend POI fetch failed:", err instanceof Error ? err.message : String(err)))
            .finally(() => {
              isFetchingPoisRef.current = false;
            });
        }
      }, 1000);
    };
    (map as any).__moveEndListener = moveEndListener;
    map.addEventListener('mapviewchangeend', moveEndListener);

    return () => {
      // HERE Maps: dispose listeners by removing all on dispose (no direct .off)
      try { map.removeEventListener('contextmenu', (map as any).__ctxListener); } catch(_){}
      try { map.removeEventListener('mapviewchangeend', (map as any).__moveEndListener); } catch(_){}
      Object.values(mapLayersRef.current).forEach(layer => { try { mapInstanceRef.current?.removeObject(layer); } catch(_){} });
      mapLayersRef.current = {};
    };
  }, [isMapReady]);

  // Create user marker ONCE when map is ready and first location is available
  // Position updates are handled by the interpolation loop (markerTargetRef)
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady || !userLocation) return;
    // If marker already exists, don't recreate — position is managed by interpolation
    if (userMarkerRef.current) return;
    
    // Build the marker element directly (NOT via outerHTML string copy)
    // This ensures userMarkerElRef points to the LIVE DOM element on the map
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '64px';
    wrapper.style.height = '64px';
    wrapper.style.marginLeft = '-32px';
    wrapper.style.marginTop = '-32px';
    wrapper.style.pointerEvents = 'none';
    wrapper.innerHTML = `<div class="relative flex items-center justify-center w-full h-full">
      <!-- Outer warm golden glow (large radiating halo) -->
      <div class="absolute" style="width:80px;height:80px;top:50%;left:50%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle, rgba(212,175,55,0.35) 0%, rgba(212,175,55,0.15) 35%, rgba(212,175,55,0) 70%);animation:navPulse 2.5s ease-out infinite;"></div>
      <div class="absolute" style="width:60px;height:60px;top:50%;left:50%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0) 65%);animation:navPulse 2.5s ease-out 0.8s infinite;"></div>
      <!-- Black circle with gold fill and black border ring -->
      <div class="absolute" style="width:38px;height:38px;top:50%;left:50%;transform:translate(-50%,-50%);border-radius:50%;background:#D4AF37;border:3.5px solid #000000;box-shadow:0 0 12px rgba(212,175,55,0.5),0 2px 8px rgba(0,0,0,0.6);"></div>
      <!-- Arrow pointing up inside the circle -->
      <div class="relative vehicle-pointer" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));">
        <svg viewBox="0 0 40 40" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
          <polygon points="20,6 32,30 20,22 8,30" fill="#111111" stroke="none"/>
        </svg>
      </div>
    </div>`;

    // Create marker using the wrapper's createDomMarker approach (Mapbox-compatible)
    const marker = createDomMarker(
      userLocation[0], userLocation[1],
      wrapper.outerHTML,
      [64, 64], [32, 32], 100
    );
    
    userMarkerRef.current = marker;
    mapInstanceRef.current.addObject(marker);

    // Get the pointer element from the marker's actual DOM
    const markerEl = marker.getElement?.();
    const pointerEl = markerEl?.querySelector('.vehicle-pointer') as HTMLElement || 
                      wrapper.querySelector('.vehicle-pointer') as HTMLElement;
    if (pointerEl && smoothedHeadingRef.current) {
      pointerEl.style.setProperty('--vehicle-rotation', `${smoothedHeadingRef.current}deg`);
    }
    userMarkerElRef.current = pointerEl;

    // Mapbox markers use the live element directly — no cloning
    requestAnimationFrame(() => {
      const mEl = marker.getElement?.();
      if (mEl) {
        const livePointer = mEl.querySelector('.vehicle-pointer') as HTMLElement;
        if (livePointer && livePointer !== pointerEl) {
          userMarkerElRef.current = livePointer;
          if (smoothedHeadingRef.current) {
            livePointer.style.setProperty('--vehicle-rotation', `${smoothedHeadingRef.current}deg`);
          }
        }
      }
    });
  }, [isMapReady, userLocation ? userLocation[0] : null, userLocation ? userLocation[1] : null]);

  // Numbered waypoint markers on the map
  useEffect(() => {
    // Clear old waypoint markers
    waypointMarkersRef.current.forEach(m => { try { mapInstanceRef.current?.removeObject(m); } catch(_){} });
    waypointMarkersRef.current = [];

    if (!mapInstanceRef.current || !isMapReady || waypoints.length === 0 || milesRemaining <= 0 || !hudLayout.showWaypointMarkers) return;

    waypoints.forEach((wp: any, idx: number) => {
      if (!wp.lat || !wp.lon) return;
      const num = idx + 1;
      const html = `<div style="
        display:flex;align-items:center;justify-content:center;
        width:28px;height:28px;
        background:#D4AF37;
        border:2px solid #000;
        border-radius:50%;
        box-shadow:0 2px 8px rgba(0,0,0,0.5);
        font-weight:900;font-size:13px;color:#000;
        font-family:system-ui,sans-serif;
      ">${num}</div>`;
      const marker = createDomMarker(wp.lat, wp.lon, html, [28, 28], [14, 14], 600);
      mapInstanceRef.current!.addObject(marker);
      waypointMarkersRef.current.push(marker);
    });
  }, [isMapReady, waypoints, milesRemaining, hudLayout.showWaypointMarkers]);

  // Real-time traffic incident overlays on the route
  useEffect(() => {
    // Clear previous markers and intervals on cleanup
    const clearIncidentMarkers = () => {
      trafficIncidentMarkersRef.current.forEach(m => { try { mapInstanceRef.current?.removeObject(m); } catch(_){} });
      trafficIncidentMarkersRef.current = [];
    };

    const fetchAndDisplayIncidents = async () => {
      if (!mapInstanceRef.current || !isMapReady || milesRemaining <= 0 || routeCoordsRef.current.length === 0) return;

      const now = Date.now();
      if (now - lastIncidentFetchRef.current < 45000) return; // Throttle: min 45s between fetches
      lastIncidentFetchRef.current = now;

      try {
        const coords = routeCoordsRef.current;
        // Calculate bounding box from route
        let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
        for (const c of coords) {
          if (c[0] < minLat) minLat = c[0];
          if (c[0] > maxLat) maxLat = c[0];
          if (c[1] < minLon) minLon = c[1];
          if (c[1] > maxLon) maxLon = c[1];
        }
        // Add padding
        const pad = 0.05;
        const bbox = `${minLon - pad},${minLat - pad},${maxLon + pad},${maxLat + pad}`;

        const response = await fetch('/api/traffic-incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bbox })
        });
        if (!response.ok) return;
        const data = await response.json();
        const results = data?.results || [];

        clearIncidentMarkers();
        if (!shieldLayerGroupRef.current || !mapInstanceRef.current) return;

        let hasCriticalOnRoute = false;

        for (const incident of results) {
          const loc = incident?.location?.shape;
          if (!loc) continue;
          const desc = incident?.incidentDetails?.description?.value || incident?.incidentDetails?.type?.value || 'Incident';
          const incType = (incident?.incidentDetails?.type?.value || '').toLowerCase();
          const criticality = (incident?.incidentDetails?.criticality?.value || '').toLowerCase();

          // Get incident lat/lon
          let iLat: number, iLon: number;
          if (loc.links && loc.links.length > 0 && loc.links[0].points && loc.links[0].points.length > 0) {
            iLat = loc.links[0].points[0].lat;
            iLon = loc.links[0].points[0].lng;
          } else {
            continue;
          }

          // Check if incident is near the route (within ~1 mile)
          let isNearRoute = false;
          for (let i = 0; i < coords.length; i += Math.max(1, Math.floor(coords.length / 200))) {
            const dist = Math.abs(coords[i][0] - iLat) + Math.abs(coords[i][1] - iLon);
            if (dist < 0.02) { // ~1 mile
              isNearRoute = true;
              break;
            }
          }
          if (!isNearRoute) continue;

          // Determine icon and color based on type
          let bgColor = '#f97316'; // orange default
          let iconSvg = '<svg viewBox="0 0 20 20" width="14" height="14" fill="white"><path d="M10 2L2 18h16L10 2zm0 4l5 10H5l5-10z"/></svg>';
          
          if (incType.includes('accident') || incType.includes('crash')) {
            bgColor = '#ef4444';
            iconSvg = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
          } else if (incType.includes('closure') || incType.includes('closed')) {
            bgColor = '#dc2626';
            iconSvg = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>';
          } else if (incType.includes('construction') || incType.includes('road work')) {
            bgColor = '#eab308';
            iconSvg = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.5"><path d="M2 20h20"/><path d="M5 20V8l7-5 7 5v12"/></svg>';
          } else if (incType.includes('congestion') || incType.includes('slow')) {
            bgColor = '#f97316';
          }

          if (criticality === 'critical') {
            hasCriticalOnRoute = true;
          }

          const el = document.createElement('div');
          el.className = 'counter-rotate';
          el.innerHTML = `<div data-testid="traffic-incident-marker" style="
            display:flex;align-items:center;justify-content:center;
            width:26px;height:26px;
            background:${bgColor};
            border:2px solid #fff;
            border-radius:50%;
            box-shadow:0 2px 8px rgba(0,0,0,0.5);
            cursor:pointer;
          " title="${desc.replace(/"/g, '&quot;')}">${iconSvg}</div>`;

          const marker = createDomMarker(iLat, iLon, el.outerHTML, [26, 26], [13, 13], 580);
          mapInstanceRef.current!.addObject(marker);

          // No popup binding in HERE Maps — tooltip shown via title attribute
          trafficIncidentMarkersRef.current.push(marker);
        }

        // Trigger auto-reroute countdown for critical incidents
        if (hasCriticalOnRoute && autoRerouteCountdown === null && !autoRerouteTimerRef.current) {
          setAutoRerouteCountdown(10);
        }
      } catch (err) {
        console.warn('Failed to fetch traffic incidents:', err);
      }
    };

    if (milesRemaining > 0 && isMapReady && hudLayout.showTrafficIncidents) {
      fetchAndDisplayIncidents();
      trafficIncidentIntervalRef.current = setInterval(fetchAndDisplayIncidents, 60000); // Every 60s
    }

    return () => {
      if (trafficIncidentIntervalRef.current) {
        clearInterval(trafficIncidentIntervalRef.current);
        trafficIncidentIntervalRef.current = null;
      }
      clearIncidentMarkers();
    };
  }, [isMapReady, milesRemaining > 0]);

  // Auto-reroute countdown timer
  useEffect(() => {
    if (autoRerouteCountdown === null) return;

    if (autoRerouteCountdown <= 0) {
      setAutoRerouteCountdown(null);
      if (destinationCoords && !isCalculating) {
        speak('Rerouting due to traffic incident ahead.');
        setTriggerReroute(true);
      }
      return;
    }

    autoRerouteTimerRef.current = setTimeout(() => {
      setAutoRerouteCountdown(prev => prev !== null ? prev - 1 : null);
    }, 1000);

    return () => {
      if (autoRerouteTimerRef.current) {
        clearTimeout(autoRerouteTimerRef.current);
        autoRerouteTimerRef.current = null;
      }
    };
  }, [autoRerouteCountdown]);

  // POI fetch on location change (separate from marker creation)
  useEffect(() => {
    if (!isMapReady || !userLocation || isFetchingPoisRef.current) return;

    const [lat, lon] = userLocation;
    
    const shouldFetchPois = (lat: number, lon: number) => {
      if (!lastPoiFetchRef.current) return true;
      const { time, lat: lastLat, lon: lastLon } = lastPoiFetchRef.current;
      const now = Date.now();
      if (now - time > 15 * 60 * 1000) return true; // 15 minutes
      
      const distance = calcDistMi(lat, lon, lastLat, lastLon);
      return distance >= 10;
    };

    if (shouldFetchPois(lat, lon)) {
      isFetchingPoisRef.current = true;
      lastPoiFetchRef.current = { time: Date.now(), lat, lon };
      
      fetchTruckPOIs(lat, lon)
        .then((poiData) => {
          const combinedRaw = [...poiData];
          const seenInBatch = new Set();
          const combined = combinedRaw.filter(p => {
            const id = `${p.lat}-${p.lon}-${p.name}`;
            if (seenInBatch.has(id)) return false;
            seenInBatch.add(id);
            return true;
          });

          if (combined.length > 0) {
            setPois(prev => {
              const existingIds = new Set();
              prev.forEach(p => existingIds.add(`${p.lat}-${p.lon}-${p.name}`));
              
              const newPois = combined.filter(p => !existingIds.has(`${p.lat}-${p.lon}-${p.name}`));
              if (newPois.length === 0) return prev;
              
              const updated = [...prev, ...newPois];
              if (updated.length > 1000) {
                return updated.slice(updated.length - 1000);
              }
              return updated;
            });
          }
        })
        .catch(err => console.error("User location POI fetch failed:", err instanceof Error ? err.message : String(err)))
        .finally(() => {
          isFetchingPoisRef.current = false;
        });
    }
  }, [isMapReady, userLocation ? userLocation[0] : null, userLocation ? userLocation[1] : null]);


  // HERE Maps handles its own vector tiles (logistics + traffic + vehicle restrictions).
  // No Leaflet tile layer setup needed — the base layer was set during createHereMap().
  // Data saver mode & truck restrictions can toggle layers on/off.
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;
    const map = mapInstanceRef.current;

    // Toggle traffic layer based on settings
    try {
      if (hereDefaultLayersRef.current?.vector?.traffic?.map) {
        if (dataSaver) {
          try { map.removeLayer(hereDefaultLayersRef.current.vector.traffic.map); } catch (_) {}
        } else {
          try { map.addLayer(hereDefaultLayersRef.current.vector.traffic.map); } catch (_) {}
        }
      }
    } catch (_) {}

    console.log('[HERE Map] Tile layers updated (dataSaver:', dataSaver, ')');
  }, [isMapReady, showTruckRestrictions, dataSaver]);

  useEffect(() => {
    if (!mapRef.current || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    
    const observer = new ResizeObserver(() => {
      map.getViewPort().resize();
    });
    
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, [isMapReady]);

  // ─── Facility layer group setup ──────────────────────────────────────────
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;
    const group = createGroup();
    group.setZIndex(200);
    mapInstanceRef.current.addObject(group);
    facilityLayerGroupRef.current = group;
    return () => { try { mapInstanceRef.current?.removeObject(group); } catch(_){} facilityLayerGroupRef.current = null; };
  }, [isMapReady]);

  // ─── Fetch facilities when location changes ──────────────────────────────
  useEffect(() => {
    if (!isValidLatLng(userLocation) || !showFacilities) return;
    const [lat, lon] = userLocation as [number, number];
    fetchFacilities(lat, lon, 80000).then(result => {
      setFacilities(result);
    });
  }, [
    userLocation ? Math.round((userLocation[0]) * 10) / 10 : null,
    userLocation ? Math.round((userLocation[1]) * 10) / 10 : null,
    showFacilities,
  ]);

  // ─── Render facility markers on map ─────────────────────────────────────
  useEffect(() => {
    if (!facilityLayerGroupRef.current) return;
    facilityLayerGroupRef.current.removeAll();
    facilityMarkersRef.current.clear();
    if (!showFacilities) return;

    facilities.forEach(facility => {
      const type = facility.majority?.type || 'both';
      const iconEl = document.createElement('div');
      iconEl.style.cssText = 'cursor:pointer;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.6))';
      iconEl.innerHTML = facilityIconSVG(type, 32);

      const marker = createDomMarker(facility.lat, facility.lon, iconEl.outerHTML, [32, 36], [16, 36], 200);
      facilityLayerGroupRef.current!.addObject(marker);
      facilityMarkersRef.current.set(facility.id, marker);
    });
  }, [facilities, showFacilities]);

  // When isNorthUp changes, reset map rotation accordingly
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isNorthUp && mapRef.current) {
      // North-up: reset rotation to 0
      mapRef.current.style.setProperty('--map-rotation', '0deg');
    }
    map.getViewPort().resize();
  }, [isNorthUp]);

  // Toggle map tilt (0° flat / 55° cinematic)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    try {
      map.getViewModel().setLookAtData({ tilt: isTilted ? 55 : 0 }, true);
    } catch (_) {}
  }, [isTilted]);


  const poiFiltersString = useMemo(() => Array.from(poiFilters).join(','), [poiFilters]);

  useEffect(() => {
    const getNearbyPois = () => {
      if (!pois || pois.length === 0 || !userLocation || !isValidLatLng(userLocation)) return [];
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
        .sort((a, b) => {
          const distA = a.dist;
          const distB = b.dist;
          const threshold = 0.0001; // ~10 meters
          if (distA < threshold && distB >= threshold) return -1;
          if (distB < threshold && distA >= threshold) return 1;
          return distA - distB;
        })
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
        console.log(`Fetching suggestions for "${searchQuery}" at ${lat}, ${lon}`);
        const hereSuggestions = await fetchAddressSuggestions(searchQuery, lat, lon);
        console.log(`Received ${hereSuggestions.length} suggestions from HERE`);
        
        // Combine and deduplicate
        const combined = [...hereSuggestions];
        const seen = new Set();
        
        // Add nearby POIs as recommendations at the top
        const nearby = getNearbyPois().slice(0, 3);
        console.log(`Found ${nearby.length} nearby POIs`);
        nearby.forEach(p => {
          seen.add(`${p.lat.toFixed(4)}-${p.lon.toFixed(4)}`);
        });

        const uniqueResults = combined.filter(s => {
          const key = `${s.lat.toFixed(4)}-${s.lon.toFixed(4)}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        
        // Search results appear ABOVE nearby recommendations when user is actively typing
        const finalResults = [...uniqueResults.slice(0, 10), ...nearby];
        console.log(`Setting ${finalResults.length} final suggestions`);
        setSuggestions(finalResults);
      } catch (error) {
        console.error('Failed to fetch suggestions', error instanceof Error ? error.message : String(error));
        setSuggestions(getNearbyPois().slice(0, 3));
      }
    }, 300); // Reduced debounce for snappier feel
    return () => clearTimeout(handler);
  }, [searchQuery, userLocation ? userLocation[0] : null, userLocation ? userLocation[1] : null, isSearchFocused, pois.length, poiFiltersString]);

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
    const direction = (lane?.direction || '').toLowerCase();
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
      active: (lane?.matches || []).includes('selected'),
      isStraight
    };
  };

  const getLaneGuidancePhrase = (lanes: any[]) => {
    if (!lanes || lanes.length === 0) return '';
    
    const recommendedLanes = lanes.filter(l => (l?.matches || []).includes('selected') || l?.active);
    if (recommendedLanes.length === 0) return '';
    if (recommendedLanes.length === lanes.length) return ''; // All lanes are fine

    const totalLanes = lanes.length;
    const recommendedCount = recommendedLanes.length;
    
    // Find recommended lane indices (1-based for speech)
    const activeIndices: number[] = [];
    for (let i = 0; i < lanes.length; i++) {
      if ((lanes[i]?.matches || []).includes('selected') || lanes[i]?.active) {
        activeIndices.push(i + 1); // 1-based
      }
    }

    const firstIdx = activeIndices[0];
    const lastIdx = activeIndices[activeIndices.length - 1];
    
    const isLeftmost = firstIdx === 1;
    const isRightmost = lastIdx === totalLanes;
    const isCenter = !isLeftmost && !isRightmost;

    // Get direction hints from lane data
    const primaryDirection = recommendedLanes[0]?.direction || '';
    const dirHints = primaryDirection.toLowerCase().split(';').filter(Boolean);
    const hasExit = dirHints.some(d => d.includes('right') || d.includes('exit'));
    const hasMerge = dirHints.some(d => d.includes('merge') || d.includes('left'));
    
    // Build professional callout
    const ordinals = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
    
    if (recommendedCount === 1) {
      // Single lane recommendation
      const position = isLeftmost ? 'left' : isRightmost ? 'right' : isCenter ? 'center' : '';
      const laneNum = ordinals[firstIdx] || `lane ${firstIdx}`;
      
      if (totalLanes === 2) {
        return `Use the ${position} lane.`;
      } else if (totalLanes <= 4) {
        return `Move to the ${laneNum} lane from left.`;
      } else {
        return `Use lane ${firstIdx} of ${totalLanes}, the ${position} side.`;
      }
    } else {
      // Multiple lane recommendation
      const side = isLeftmost ? 'left' : isRightmost ? 'right' : 'center';
      
      if (hasExit) {
        return `Stay in the ${side} ${recommendedCount} lanes for the exit.`;
      } else if (hasMerge) {
        return `Use the ${side} ${recommendedCount} lanes to merge.`;
      } else {
        return `Use the ${side} ${recommendedCount} lanes.`;
      }
    }
  };

  const lastSpokenRef = useRef('');
  const spokenDistancesRef = useRef<Set<string>>(new Set());
  const lastLaneSpokenRef = useRef('');
  // Fuel Network: track last announced POI per category to avoid repeat spam
  const fuelNetworkLastRef = useRef<Map<string, { poiName: string; lastDist: number; lastTime: number }>>(new Map());
  const lastFuelNetworkCheckRef = useRef(0);
  useEffect(() => {
    if (!isDriving || nextInstruction.text === 'Ready for Route') {
      return;
    }

    const dist = parseFloat(nextInstruction.distance);
    if (isNaN(dist)) return;
    
    let shouldSpeak = false;
    let phrase = "";

    const lanePhrase = getLaneGuidancePhrase(nextInstruction.lanes || []);
    const hasLaneGuidance = lanePhrase.length > 0;
    const maneuverType = nextInstruction.maneuver?.type || '';
    const isComplexManeuver = ['exit', 'fork', 'roundabout', 'merge'].some(t => maneuverType.includes(t));

    // New instruction detected — announce with full context
    if (nextInstruction.text !== lastSpokenRef.current) {
      lastSpokenRef.current = nextInstruction.text;
      spokenDistancesRef.current.clear();
      lastLaneSpokenRef.current = '';
      
      const spokenText = convertInstructionToImperial(nextInstruction.text);
      shouldSpeak = true;
      if (dist > 5) {
        phrase = `Continue for ${Math.round(dist)} miles, then ${spokenText}.`;
        if (hasLaneGuidance) phrase += ` ${lanePhrase}`;
      } else if (dist > 2) {
        phrase = `In ${Math.round(dist)} miles, ${spokenText}.`;
        if (hasLaneGuidance) phrase += ` ${lanePhrase}`;
      } else if (dist > 1) {
        phrase = `In ${dist.toFixed(0)} mile${dist >= 1.5 ? 's' : ''}, ${spokenText}.`;
        if (hasLaneGuidance) phrase += ` ${lanePhrase}`;
        if (dist <= 2) spokenDistancesRef.current.add('2');
        if (dist <= 1.5) spokenDistancesRef.current.add('1.5');
        if (dist <= 1) spokenDistancesRef.current.add('1');
      } else if (dist > 0.5) {
        phrase = `In half a mile, ${spokenText}.`;
        if (hasLaneGuidance) phrase += ` ${lanePhrase}`;
        spokenDistancesRef.current.add('2');
        spokenDistancesRef.current.add('1.5');
        spokenDistancesRef.current.add('1');
      } else {
        phrase = `In ${Math.round(dist * 5280)} feet, ${spokenText}.`;
        if (hasLaneGuidance) phrase += ` ${lanePhrase}`;
        spokenDistancesRef.current.add('2');
        spokenDistancesRef.current.add('1.5');
        spokenDistancesRef.current.add('1');
        if (dist <= 0.5) spokenDistancesRef.current.add('0.5');
        if (dist <= 0.25) spokenDistancesRef.current.add('0.25');
      }
    }

    // Distance-based progressive announcements
    if (!shouldSpeak) {
      const spokenText = convertInstructionToImperial(nextInstruction.text);
      if (dist <= 2.0 && dist > 1.8 && !spokenDistancesRef.current.has('2')) {
        shouldSpeak = true;
        phrase = `In 2 miles, ${spokenText}.`;
        if (hasLaneGuidance) phrase += ` ${lanePhrase}`;
        spokenDistancesRef.current.add('2');
      } else if (dist <= 1.5 && dist > 1.3 && !spokenDistancesRef.current.has('1.5') && (hasLaneGuidance || isComplexManeuver)) {
        // 1.5 mile announcement only for complex maneuvers or when lane change needed
        shouldSpeak = true;
        phrase = hasLaneGuidance 
          ? `In 1 and a half miles, ${spokenText}. ${lanePhrase}` 
          : `In 1 and a half miles, ${spokenText}.`;
        spokenDistancesRef.current.add('1.5');
      } else if (dist <= 1.0 && dist > 0.9 && !spokenDistancesRef.current.has('1')) {
        shouldSpeak = true;
        phrase = `In 1 mile, ${spokenText}.`;
        if (hasLaneGuidance) phrase += ` ${lanePhrase}`;
        spokenDistancesRef.current.add('1');
      } else if (dist <= 0.75 && dist > 0.65 && hasLaneGuidance && !spokenDistancesRef.current.has('0.75')) {
        // Dedicated lane guidance reminder at 3/4 mile
        shouldSpeak = true;
        phrase = `Lane guidance: ${lanePhrase}`;
        spokenDistancesRef.current.add('0.75');
        lastLaneSpokenRef.current = lanePhrase;
      } else if (dist <= 0.5 && dist > 0.4 && !spokenDistancesRef.current.has('0.5')) {
        shouldSpeak = true;
        phrase = `In half a mile, ${spokenText}.`;
        if (hasLaneGuidance && lastLaneSpokenRef.current !== lanePhrase) {
          phrase += ` ${lanePhrase}`;
          lastLaneSpokenRef.current = lanePhrase;
        }
        spokenDistancesRef.current.add('0.5');
      } else if (dist <= 0.25 && dist > 0.2 && hasLaneGuidance && !spokenDistancesRef.current.has('0.25')) {
        // Final lane reminder at quarter mile
        shouldSpeak = true;
        phrase = `Get in position. ${lanePhrase}`;
        spokenDistancesRef.current.add('0.25');
      } else if (dist <= 0.2 && !spokenDistancesRef.current.has('0.2')) {
        shouldSpeak = true;
        const feetRemaining = Math.round(dist * 5280);
        phrase = feetRemaining > 500 
          ? `In ${feetRemaining} feet, ${spokenText}.` 
          : `${spokenText} now.`;
        spokenDistancesRef.current.add('0.2');
      }
    }

    if (shouldSpeak && phrase) {
      speak(phrase);
    }
  }, [nextInstruction.distance, nextInstruction.text, nextInstruction.lanes, isDriving]);

  const [isOffRoute, setIsOffRoute] = useState(false);
  const offRouteCountRef = useRef(0);
  const lastRerouteTimeRef = useRef(0);

  const saveRouteToHistory = useCallback((status: 'COMPLETED' | 'CANCELLED') => {
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

    const saved = uGet('trucker_route_history');
    const history = saved ? JSON.parse(saved) : [];
    const str = safeStringify([historyItem, ...history]);
    if (str) uSet('trucker_route_history', str);
    routeSavedRef.current = true;
  }, [currentDestination, waypoints]);

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
      console.error("Reroute failed:", e instanceof Error ? e.message : String(e));
    }
  };

  const lastUpdateLocationRef = useRef<[number, number] | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const lastPanRef = useRef<number>(0);
  const isUpdatingRef = useRef<boolean>(false);

  const routeStepsRef = useRef(routeSteps);
  const poiFiltersRef = useRef(poiFilters);
  const isOffRouteRef = useRef(isOffRoute);
  const isCalculatingRef = useRef(isCalculating);
  const autoRerouteRef = useRef(context?.autoReroute);
  const weighStationAlertRef = useRef(weighStationAlert);
  const initialMilesRef = useRef(initialMiles);
  const handleRerouteRef = useRef(handleReroute);

  useEffect(() => {
    routeStepsRef.current = routeSteps;
    // Reset voice guidance thresholds when route steps change
    announcedManeuverThresholdsRef.current.clear();
    poiFiltersRef.current = poiFilters;
    isOffRouteRef.current = isOffRoute;
    isCalculatingRef.current = isCalculating;
    autoRerouteRef.current = context?.autoReroute;
    weighStationAlertRef.current = weighStationAlert;
    initialMilesRef.current = initialMiles;
    handleRerouteRef.current = handleReroute;
  }, [routeSteps, poiFilters, isOffRoute, isCalculating, context?.autoReroute, weighStationAlert, initialMiles, handleReroute]);
 
  const updateNavigationState = useCallback(async (currentLocation: [number, number]) => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    try {
      const now = Date.now();
      if (now - lastUpdateRef.current < 1000) return; // Throttle to 1000ms
      lastUpdateRef.current = now;

      if (lastUpdateLocationRef.current && 
          lastUpdateLocationRef.current[0] === currentLocation[0] && 
          lastUpdateLocationRef.current[1] === currentLocation[1]) return;
      lastUpdateLocationRef.current = currentLocation;
      
      if (!currentLocation || isNaN(currentLocation[0]) || isNaN(currentLocation[1])) return;
      if (!routeStepsRef.current.length || !routeCoordsRef.current || routeCoordsRef.current.length < 2) return;

      // Find nearest point on route line manually
      let minEuclideanDist = Infinity;
      let minDistanceMeters = Infinity;
      let nearestIndex = 0;
      let distOnSegment = 0;

      // Optimization: only search a window around the last known index to improve performance
      let startIndex = 0;
      let endIndex = routeCoordsRef.current.length - 1;
      if (lastSimIdxRef.current !== -1) {
        startIndex = Math.max(0, lastSimIdxRef.current - 50);
        endIndex = Math.min(routeCoordsRef.current.length - 1, lastSimIdxRef.current + 200);
      }

      console.time("updateNavigationState-loop");
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
        const dist = calcEuclideanDist(currentLocation[0], currentLocation[1], proj[0], proj[1]);

        if (dist < minEuclideanDist) {
          minEuclideanDist = dist;
          minDistanceMeters = calcDist(currentLocation[0], currentLocation[1], proj[0], proj[1]);
          nearestIndex = i;
          distOnSegment = calcDist(p1[0], p1[1], proj[0], proj[1]);
        }
      }
      console.timeEnd("updateNavigationState-loop");

      // If we get off route, we might need to search the whole route again
      if (minDistanceMeters > 500 && lastSimIdxRef.current !== -1) {
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
          const dist = calcEuclideanDist(currentLocation[0], currentLocation[1], proj[0], proj[1]);
          if (dist < minEuclideanDist) {
            minEuclideanDist = dist;
            minDistanceMeters = calcDist(currentLocation[0], currentLocation[1], proj[0], proj[1]);
            nearestIndex = i;
            distOnSegment = calcDist(p1[0], p1[1], proj[0], proj[1]);
          }
        }
      }

      lastSimIdxRef.current = nearestIndex;

      if (routeLineRef.current && routeCoordsRef.current.length > nearestIndex) {
        const remainingCoords = [currentLocation, ...routeCoordsRef.current.slice(nearestIndex + 1)];
        updateMapLine(mapInstanceRef.current, routeLineRef.current.id, remainingCoords, routeLineRef.current.color, 8);
        
        // Draw completed (traveled) portion as dimmed gray
        if (nearestIndex > 0) {
          const traveledCoords = routeCoordsRef.current.slice(0, nearestIndex + 1);
          traveledCoords.push(currentLocation);
          if (mapLayersRef.current['traveled']) {
            updatePolylineCoords(mapLayersRef.current['traveled'], traveledCoords);
          } else {
            const traveledLine = createPolyline(traveledCoords, '#555555', 8, { opacity: 0.4 });
            mapInstanceRef.current!.addObject(traveledLine);
            mapLayersRef.current['traveled'] = traveledLine;
          }
        }
      }

      if (routeCoordsRef.current.length > nearestIndex + 1) {
        const segmentCoords = [currentLocation, routeCoordsRef.current[nearestIndex + 1]];
        // Active segment: bright white with glow
        if (!currentSegmentLineRef.current) {
          // Glow layer
          const glowLine = createPolyline(segmentCoords, '#ffffff', 18, { opacity: 0.2 });
          mapInstanceRef.current!.addObject(glowLine);
          mapLayersRef.current['segment_glow'] = glowLine;
          
          updateMapLine(mapInstanceRef.current, 'segment', segmentCoords, '#ffffff', 12);
          currentSegmentLineRef.current = 'segment';
        } else {
          if (mapLayersRef.current['segment_glow']) {
            updatePolylineCoords(mapLayersRef.current['segment_glow'], segmentCoords);
          }
          updateMapLine(mapInstanceRef.current, currentSegmentLineRef.current, segmentCoords, '#ffffff', 12);
        }
      }

      const distanceFromRoute = minDistanceMeters;
      
      // Check if off-route
      if (distanceFromRoute > 300) { // Increased from 150m to 300m to reduce recalculations
          offRouteCountRef.current += 1;
          if (offRouteCountRef.current >= 5) { // Increased from 3 to 5 consecutive updates
              if (!isOffRouteRef.current && !isCalculatingRef.current) {
                  setIsOffRoute(true);
                  speak("Off route.");
                  if (autoRerouteRef.current) {
                    speak("Recalculating.");
                    handleRerouteRef.current();
                  }
              }
          }
      } else {
          offRouteCountRef.current = 0;
          if (isOffRouteRef.current) setIsOffRoute(false);
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
        
        // Weigh Station Alert — based on real POI data along route
        if (initialMilesRef.current > 5 && poiFiltersRef.current.has('weigh_station')) {
          // Find the nearest weigh station POI ahead on the route
          const weighStationPoi = pois.find(p => {
            const cat = getPoiCategory(p.type, p.name);
            if (cat !== 'weigh_station') return false;
            const poiDist = calcDistMi(userLat, userLon, p.lat, p.lon);
            return poiDist > 0.1 && poiDist <= 3; // Within 3 miles ahead
          });
          
          if (weighStationPoi) {
            const distToStation = calcDistMi(userLat, userLon, weighStationPoi.lat, weighStationPoi.lon);
            if (!weighStationAlertRef.current || Math.abs(weighStationAlertRef.current.distance - distToStation) > 0.05) {
              const status: 'OPEN' | 'CLOSED' | 'BYPASS' = 'OPEN';
              setWeighStationAlert({ distance: distToStation, status });
              
              if (distToStation <= 2 && distToStation > 1.9 && !spokenDistancesRef.current.has('ws_2')) {
                speak(`Weigh station ahead in 2 miles.`);
                spokenDistancesRef.current.add('ws_2');
              } else if (distToStation <= 0.5 && distToStation > 0.4 && !spokenDistancesRef.current.has('ws_0.5')) {
                speak(`Weigh station in half a mile. Pull in for inspection.`);
                spokenDistancesRef.current.add('ws_0.5');
              }
            }
          } else if (weighStationAlertRef.current) {
            setWeighStationAlert(null);
          }
        } else if (weighStationAlertRef.current) {
          setWeighStationAlert(null); // Clear alert if filter disabled
        }

        // Fuel Network Voice Alerts — announce distance to nearest POI from each selected category
        const fuelNetworkNow = Date.now();
        if (fuelNetworkNow - lastFuelNetworkCheckRef.current > 20000) { // Check every 20s
          lastFuelNetworkCheckRef.current = fuelNetworkNow;
          const networkSelections = getFuelNetworkSelections();
          if (networkSelections.length > 0 && poisRef.current.length > 0) {
            for (const categoryId of networkSelections) {
              const matchingPois = poisRef.current.filter(p => {
                const cat = getPoiCategory(p.type, p.name);
                return cat === categoryId;
              });
              if (matchingPois.length === 0) continue;
              // Find nearest by haversine distance from current location
              let nearestPoi: any = null;
              let nearestDistMi = Infinity;
              for (const p of matchingPois) {
                const dLat = (p.lat - currentLocation[0]) * Math.PI / 180;
                const dLon = (p.lon - currentLocation[1]) * Math.PI / 180;
                const a = Math.sin(dLat/2)**2 + Math.cos(currentLocation[0]*Math.PI/180) * Math.cos(p.lat*Math.PI/180) * Math.sin(dLon/2)**2;
                const distMi = 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                if (distMi < nearestDistMi && distMi > 0.3) {
                  nearestDistMi = distMi;
                  nearestPoi = p;
                }
              }
              if (!nearestPoi) continue;
              const poiLabel = nearestPoi.name?.split(',')[0] || categoryId.replace(/_/g, ' ');
              const prev = fuelNetworkLastRef.current.get(categoryId);
              const isNewPoi = !prev || prev.poiName !== poiLabel;
              // Only announce when a NEW poi is detected (previous was passed or first time)
              if (isNewPoi) {
                const distText = nearestDistMi < 1
                  ? `${nearestDistMi.toFixed(1)} miles`
                  : `${Math.round(nearestDistMi)} miles`;
                speak(`Next ${poiLabel}, ${distText} ahead.`);
                fuelNetworkLastRef.current.set(categoryId, { poiName: poiLabel, lastDist: nearestDistMi, lastTime: fuelNetworkNow });
              } else if (prev) {
                // Update tracked distance silently (no voice) so we detect when passed
                prev.lastDist = nearestDistMi;
              }
            }
          }
        }

        if (remainingMiles <= 1.0 && remainingMiles > 0.9 && !spokenDistancesRef.current.has('dest_1')) {
          speak(`You are 1 mile away from your destination.`);
          spokenDistancesRef.current.add('dest_1');
        } else if (remainingMiles <= 0.1 && !spokenDistancesRef.current.has('dest_0.1')) {
          speak(`You have arrived at your destination.`);
          spokenDistancesRef.current.add('dest_0.1');
          saveRouteToHistory('COMPLETED');
        }

        // Restriction Alerts
        restrictionAlerts.forEach((alert, idx) => {
          if (!alert.progress) return;
          const alertDistMi = initialMilesRef.current * alert.progress;
          const distToAlert = alertDistMi - (initialMilesRef.current - remainingMiles);
          
          if (distToAlert > 0 && distToAlert <= 1.0) {
            const alertKey = `restriction_${alert.type}_${idx}`;
            if (distToAlert <= 1.0 && distToAlert > 0.9 && !spokenDistancesRef.current.has(`${alertKey}_1`)) {
              speak(`Warning: ${alert.message} ahead in 1 mile.`);
              spokenDistancesRef.current.add(`${alertKey}_1`);
            } else if (distToAlert <= 0.25 && distToAlert > 0.2 && !spokenDistancesRef.current.has(`${alertKey}_0.25`)) {
              speak(`Caution: ${alert.message} in a quarter mile.`);
              spokenDistancesRef.current.add(`${alertKey}_0.25`);
            }
          }
        });

        // Traffic Alerts (Traffic Lights, Stop Signs)
        // Stop signs: announce ONCE at 1 mile ahead, minimum 1 mile spacing between alerts
        let lastStopSignAnnouncedDistMi = Infinity;
        trafficAlerts.forEach((alert, idx) => {
          if (!alert.progress) return;
          const alertDistMi = initialMilesRef.current * alert.progress;
          const distToAlert = alertDistMi - (initialMilesRef.current - remainingMiles);
          
          const alertKey = `traffic_${alert.type}_${idx}`;
          
          if (alert.type === 'STOP_SIGN') {
            // Only announce at ~1 mile ahead, once per sign, with 1mi min spacing
            if (distToAlert > 0 && distToAlert <= 1.0 && distToAlert > 0.85 && !spokenDistancesRef.current.has(alertKey)) {
              const distFromLastAnnounced = lastStopSignAnnouncedDistMi - alertDistMi;
              if (distFromLastAnnounced >= 1.0) {
                speak(`Stop sign ahead in 1 mile.`);
                spokenDistancesRef.current.add(alertKey);
                lastStopSignAnnouncedDistMi = alertDistMi;
              }
            }
          } else {
            // Traffic lights: announce at 0.5 miles
            if (distToAlert > 0 && distToAlert <= 0.5 && distToAlert > 0.4 && !spokenDistancesRef.current.has(alertKey)) {
              speak(`Upcoming ${alert.message} in half a mile.`);
              spokenDistancesRef.current.add(alertKey);
            }
          }
        });
      }

      // CMV Warning Voice Announcements
      if (cmvWarningsRef.current.length > 0 && !isNaN(remainingDist)) {
        const cmvRemainingMiles = remainingDist / 1609.34;
        cmvWarningsRef.current.forEach((warning, idx) => {
          if (!warning.progress) return;
          const warningDistMi = initialMilesRef.current * warning.progress;
          const distToWarning = warningDistMi - (initialMilesRef.current - cmvRemainingMiles);
          
          if (distToWarning > 0 && distToWarning <= 2.0) {
            const alertKey = `cmv_${warning.type}_${idx}`;
            
            // Voice message templates per warning type
            const voiceMessages: Record<string, { far: string; near: string }> = {
              STEEP_DOWNGRADE: {
                far: `Attention: ${warning.message}. Use low gear.`,
                near: `Steep downgrade ahead. Reduce speed and use engine braking.`
              },
              STEEP_HILL: {
                far: `Attention: ${warning.message}. Prepare for climb.`,
                near: `Steep hill ahead. Maintain momentum.`
              },
              ROLLOVER_RISK: {
                far: `Warning: ${warning.message}. Reduce speed significantly.`,
                near: `Rollover risk zone. Slow down immediately.`
              },
              WINDING_ROAD: {
                far: `Caution: Winding road ahead in 1 mile. Reduce speed.`,
                near: `Winding road. Use caution.`
              }
            };
            
            const msgs = voiceMessages[warning.type] || { far: `Warning: ${warning.message}`, near: `Caution ahead.` };
            
            if (distToWarning <= 2.0 && distToWarning > 1.9 && !spokenDistancesRef.current.has(`${alertKey}_2`)) {
              speak(msgs.far);
              spokenDistancesRef.current.add(`${alertKey}_2`);
            } else if (distToWarning <= 0.5 && distToWarning > 0.4 && !spokenDistancesRef.current.has(`${alertKey}_0.5`)) {
              speak(msgs.near);
              spokenDistancesRef.current.add(`${alertKey}_0.5`);
            }
          }
        });
      }

      let maneuverIndex = -1;
      let traveledForStep = 0;

      // Speed limit & exit voice announcements during active navigation
      if (routeSignsRef.current.speedLimitSigns.length > 0) {
        routeSignsRef.current.speedLimitSigns.forEach((sign: any, idx: number) => {
          if (!sign.coord) return;
          const distToSign = calcDistMi(currentLocation[0], currentLocation[1], sign.coord[0], sign.coord[1]);
          if (distToSign > 0 && distToSign <= 0.3) {
            const key = `speed_${sign.speed}_${idx}`;
            if (!spokenDistancesRef.current.has(key)) {
              speak(`Speed limit ${sign.speed} miles per hour.`);
              spokenDistancesRef.current.add(key);
            }
          }
        });
      }

      if (routeSignsRef.current.exitSigns.length > 0) {
        routeSignsRef.current.exitSigns.forEach((exit: any, idx: number) => {
          if (!exit.coord) return;
          const distToExit = calcDistMi(currentLocation[0], currentLocation[1], exit.coord[0], exit.coord[1]);
          if (distToExit > 0 && distToExit <= 1.0) {
            const keyFar = `exit_${idx}_1mi`;
            const keyNear = `exit_${idx}_quarter`;
            if (distToExit <= 1.0 && distToExit > 0.8 && !spokenDistancesRef.current.has(keyFar)) {
              const exitLabel = exit.exitNumber ? `Exit ${exit.exitNumber}` : 'Your exit';
              speak(`${exitLabel} toward ${exit.name} in 1 mile.`);
              spokenDistancesRef.current.add(keyFar);
            } else if (distToExit <= 0.3 && distToExit > 0.15 && !spokenDistancesRef.current.has(keyNear)) {
              const exitLabel = exit.exitNumber ? `Take exit ${exit.exitNumber}` : 'Take exit';
              speak(`${exitLabel} now.`);
              spokenDistancesRef.current.add(keyNear);
            }
          }
        });
      }

      // Truck restriction voice announcements
      if (routeSignsRef.current.restrictions.length > 0) {
        routeSignsRef.current.restrictions.forEach((r: any, idx: number) => {
          if (!r.coords) return;
          const distToWarning = calcDistMi(currentLocation[0], currentLocation[1], r.coords[0], r.coords[1]);
          if (distToWarning > 0 && distToWarning <= 0.5) {
            const key = `warning_${r.type}_${idx}`;
            if (!spokenDistancesRef.current.has(key)) {
              const typeLabel = r.type === 'BRIDGE' ? 'Low clearance ahead' : r.type === 'WEIGHT' ? 'Weight limit ahead' : r.type === 'TUNNEL' ? 'Tunnel ahead' : r.type === 'HAZMAT' ? 'Hazmat restriction ahead' : r.type === 'TRUCK_PROHIBITED' ? 'Truck restriction ahead' : 'Route notice';
              speak(`${typeLabel}. ${r.message}.`);
              spokenDistancesRef.current.add(key);
            }
          }
        });
      }

      for (let i = 0; i < routeStepsRef.current.length; i++) {
        traveledForStep += routeStepsRef.current[i].distance;
        if (traveledForStep > traveledDistance) {
          maneuverIndex = i;
          break;
        }
      }
      
      // Update state for RouteStepsModal
      setCurrentManeuverIndex(maneuverIndex);

      if (maneuverIndex !== -1) {
        const distanceToManeuver = traveledForStep - traveledDistance;
        if (!isNaN(distanceToManeuver)) {
          const currentStep = routeStepsRef.current[maneuverIndex];
          if (currentStep && currentStep.maneuver && currentStep.maneuver.instruction) {
            const instruction = currentStep.maneuver.instruction;
            const roadNameMatch = instruction.match(/on (.+?) for/);
            const roadName = roadNameMatch ? roadNameMatch[1] : (instruction.split(' on ')[1] || '');
            setCurrentRoad(roadName.replace(/\u003c/g, '<').replace(/\u003e/g, '>'));
            
            const followingStep = routeStepsRef.current[maneuverIndex + 1];
            setNextInstruction({
              text: instruction.replace(/\u003c/g, '<').replace(/\u003e/g, '>'),
              distance: (distanceToManeuver / 1609.34).toFixed(1), // Convert to miles string
              icon: getManeuverIcon(currentStep.maneuver.type, currentStep.maneuver.modifier),
              lanes: currentStep.lanes || [],
              maneuver: currentStep.maneuver,
              followingStep: followingStep ? {
                text: followingStep.maneuver.instruction.replace(/\u003c/g, '<').replace(/\u003e/g, '>'),
                icon: getManeuverIcon(followingStep.maneuver.type, followingStep.maneuver.modifier)
              } : null
            });

            // Update distance-based detail props for enhanced HUD
            setCurrentDistToManeuverMi(distanceToManeuver / 1609.34);
            setCurrentManeuverType(currentStep.maneuver.type || '');
            setCurrentManeuverModifier(currentStep.maneuver.modifier || '');

            // Auto-zoom for upcoming maneuvers
            // Zoom in when within 0.3 mi (~480m), zoom back when past 0.5 mi (~800m)
            if (mapInstanceRef.current && isFollowMode && !isOverviewMode) {
              const distMi = distanceToManeuver / 1609.34;
              const maneuverType = currentStep.maneuver.type || '';
              const isComplexManeuver = ['exit', 'fork', 'turn', 'roundabout', 'merge'].some(t => maneuverType.includes(t));
              const zoomThreshold = isComplexManeuver ? 0.4 : 0.3; // Complex maneuvers get zoom earlier
              const maneuverZoomLevel = Math.min(19, userPreferredZoomRef.current + 2);
              
              if (distMi <= zoomThreshold && !isManeuverZoomActiveRef.current) {
                // Zoom in for the upcoming maneuver
                isManeuverZoomActiveRef.current = true;
                mapInstanceRef.current.getViewModel().setLookAtData({
                  position: mapInstanceRef.current.getCenter(),
                  zoom: maneuverZoomLevel,
                }, true);
              } else if (distMi > 0.6 && isManeuverZoomActiveRef.current) {
                // Maneuver passed — zoom back to user's preferred level
                isManeuverZoomActiveRef.current = false;
                mapInstanceRef.current.getViewModel().setLookAtData({
                  position: mapInstanceRef.current.getCenter(),
                  zoom: userPreferredZoomRef.current,
                }, true);
              }
            }

            // ─── Voice Guidance: Graduated Distance Announcements ───
            // Announce upcoming maneuver at: 10mi, 5mi, 2mi, 1mi, 0.5mi, 0.2mi, 1000ft
            if (isDriving) {
              const distMiVoice = distanceToManeuver / 1609.34;
              const instruction = currentStep.maneuver.instruction
                .replace(/\u003c/g, '<').replace(/\u003e/g, '>')
                .replace(/<[^>]+>/g, ''); // Strip HTML tags

              // Build a clean maneuver description
              const maneuverType = currentStep.maneuver.type || '';
              const modifier = currentStep.maneuver.modifier || '';
              let action = '';
              if (maneuverType.includes('turn')) action = modifier ? `Turn ${modifier}` : 'Turn';
              else if (maneuverType.includes('exit')) action = 'Take the exit';
              else if (maneuverType.includes('fork')) action = modifier === 'left' ? 'Keep left' : modifier === 'right' ? 'Keep right' : 'Continue at the fork';
              else if (maneuverType.includes('merge')) action = 'Merge';
              else if (maneuverType.includes('roundabout')) action = 'Enter the roundabout';
              else if (maneuverType.includes('ramp')) action = modifier ? `Take the ramp to the ${modifier}` : 'Take the ramp';
              else if (maneuverType.includes('depart')) action = 'Head';
              else if (maneuverType.includes('arrive')) action = 'Arrive at your destination';
              else action = instruction.split('.')[0] || 'Continue';

              // Extract road name from instruction
              const roadMatch = instruction.match(/(?:on|onto|toward)\s+(.+?)(?:\s+for|\s*$)/i);
              const roadName = roadMatch ? `onto ${roadMatch[1]}` : '';

              // Thresholds in miles with voice text
              const thresholds: [string, number, string][] = [
                ['10mi',     10,    `In 10 miles, ${action} ${roadName}.`],
                ['5mi',       5,    `In 5 miles, ${action} ${roadName}.`],
                ['2mi',       2,    `In 2 miles, ${action} ${roadName}.`],
                ['1mi',       1,    `In 1 mile, ${action} ${roadName}.`],
                ['halfmi',    0.5,  `In half a mile, ${action} ${roadName}.`],
                ['qtrmi',     0.25, `In a quarter mile, ${action} ${roadName}.`],
                ['1000ft',    0.19, `In 1000 feet, ${action} ${roadName}.`],
                ['now',       0.03, `${action} ${roadName} now.`],
              ];

              // Initialize threshold set for this step if needed
              if (!announcedManeuverThresholdsRef.current.has(maneuverIndex)) {
                announcedManeuverThresholdsRef.current.set(maneuverIndex, new Set());
              }
              const announced = announcedManeuverThresholdsRef.current.get(maneuverIndex)!;

              for (const [key, thresholdMi, text] of thresholds) {
                if (distMiVoice <= thresholdMi && !announced.has(key)) {
                  // For far distances (>2mi), only announce major maneuvers
                  const isMajorManeuver = ['exit', 'fork', 'turn', 'roundabout', 'merge', 'ramp'].some(t => maneuverType.includes(t));
                  if (thresholdMi > 2 && !isMajorManeuver) continue;
                  
                  announced.add(key);
                  speak(text.replace(/\s+/g, ' ').trim());
                  break; // Only announce one threshold per update cycle
                }
              }

              // Clean up old step announcements (keep only current and next 2)
              for (const [stepIdx] of announcedManeuverThresholdsRef.current) {
                if (stepIdx < maneuverIndex - 1) {
                  announcedManeuverThresholdsRef.current.delete(stepIdx);
                }
              }

              // ─── Truck Intelligence: Check steep grade proximity ───
              if (gradeWarningsRef.current.length > 0) {
                const gradeAlerts = checkGradeProximity(
                  currentLocation[0], currentLocation[1],
                  gradeWarningsRef.current,
                  routeCoordsRef.current
                );
                if (gradeAlerts.length > 0) {
                  setActiveGradeAlert(gradeAlerts[0].message);
                  setTimeout(() => setActiveGradeAlert(null), 15000);
                }
              }

              // ─── Maneuver Preview: Update for complex maneuvers ───
              const distMiPreview = distanceToManeuver / 1609.34;
              const isComplex = ['exit', 'fork', 'roundabout', 'ramp', 'merge'].some(t => 
                (currentStep.maneuver?.type || '').includes(t)
              );
              if (isComplex && distMiPreview <= 2) {
                const instrText = currentStep.maneuver?.instruction || '';
                const exitMatch = instrText.match(/exit\s+(\d+[A-Z]?)/i);
                const roadMatch = instrText.replace(/<[^>]+>/g, '').match(/(?:on|onto|toward)\s+(.+?)(?:\s+for|\s*$)/i);
                setManeuverPreviewData({
                  instruction: instrText,
                  maneuverType: currentStep.maneuver?.type || '',
                  modifier: currentStep.maneuver?.modifier || '',
                  distanceMi: distMiPreview,
                  lanes: currentStep.laneInfo || null,
                  roadName: roadMatch?.[1] || '',
                  exitNumber: exitMatch?.[1] || '',
                  isComplex: true,
                });
              } else if (distMiPreview > 2.5 || !isComplex) {
                setManeuverPreviewData(null);
              }
            }

            // Update ETA based on remaining steps
            let remainingDuration = 0;
            for (let i = maneuverIndex; i < routeStepsRef.current.length; i++) {
              remainingDuration += routeStepsRef.current[i].duration || 0;
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
              setRemainingDuration(remainingDuration);
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
          const currentStep = routeStepsRef.current[maneuverIndex];
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
        const currentStep = routeStepsRef.current[maneuverIndex];
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
    } finally {
      isUpdatingRef.current = false;
    }
  }, []);

  const lastWeatherFetchPos = useRef<[number, number] | null>(null);
  const userLocationRef = useRef(userLocation);
  const setUserLocationRef = useRef(setUserLocation);
  const setWaypointsRef = useRef(setWaypoints);

  useEffect(() => {
    userLocationRef.current = userLocation;
    setUserLocationRef.current = setUserLocation;
    setWaypointsRef.current = setWaypoints;
  }, [userLocation ? userLocation[0] : null, userLocation ? userLocation[1] : null, setUserLocation, setWaypoints]);

  useEffect(() => {
    const fetchWeather = async (force = false) => {
      const loc = userLocationRef.current;
      console.log("NavigationView: fetchWeather, loc:", loc);
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
            temp: context?.unitSystem === 'metric' ? `${Math.round((current.temperature_2m - 32) * 5/9)}°C` : `${Math.round(current.temperature_2m)}°`,
            condition: currentDetails.condition,
            wind: context?.unitSystem === 'metric' 
              ? `${Math.round((current.wind_speed_10m || 0) * 1.60934)} KM/H ${windDir}`
              : `${Math.round(current.wind_speed_10m || 0)} MPH ${windDir}`,
            visibility: context?.unitSystem === 'metric'
              ? `${(visMiles * 1.60934).toFixed(1)} KM`
              : `${visMiles} MI`,
            icon: currentDetails.icon,
            forecast
          });
        } else {
            console.error("Invalid weather data received: Missing 'current' or 'daily' data.");
            throw new Error("Invalid weather data format.");
        }
      } catch (err) {
        console.error("Weather fetch failed:", err instanceof Error ? err.message : String(err));
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

  // ─── State/Country Boundary Voice Prompts ────────────────────────────────
  useEffect(() => {
    const loc = userLocation;
    if (!loc || !isValidLatLng(loc)) return;
    const [lat, lon] = loc;

    // Throttle: only reverse-geocode every 20s or if moved >3km
    const now = Date.now();
    if (lastGeocodeFetchRef.current) {
      const { time, lat: pLat, lon: pLon } = lastGeocodeFetchRef.current;
      const elapsed = now - time;
      const dist = calcDist(lat, lon, pLat, pLon);
      if (elapsed < 20000 && dist < 3000) return;
    }

    lastGeocodeFetchRef.current = { time: now, lat, lon };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=8`, {
      headers: { 'User-Agent': 'TruckersNav/1.0', 'Accept-Language': 'en' },
      signal: controller.signal
    })
      .then(r => r.json())
      .then(data => {
        clearTimeout(timeout);
        if (!data?.address) return;
        const newState = data.address.state || data.address.province || data.address.region || null;
        const newCountry = data.address.country || null;
        const newCity = data.address.city || data.address.town || data.address.village || null;

        setCurrentRegion(prev => {
          const updated = { state: newState, country: newCountry, city: newCity };
          try { uSet('trucker_current_region', JSON.stringify(updated)); } catch {}
          return updated;
        });

        // Voice announcement on state or country change
        const prevState = prevRegionRef.current.state;
        const prevCountry = prevRegionRef.current.country;

        if (newState && prevState && newState !== prevState) {
          speak(`Now entering ${newState}.`);
        } else if (newCountry && prevCountry && newCountry !== prevCountry) {
          speak(`Now entering ${newCountry}.`);
        }

        prevRegionRef.current = { state: newState, country: newCountry };
      })
      .catch(err => {
        clearTimeout(timeout);
        if (err.name !== 'AbortError') {
          console.warn('Reverse geocoding failed:', err);
        }
      });

    return () => { clearTimeout(timeout); controller.abort(); };
  }, [userLocation ? userLocation[0] : null, userLocation ? userLocation[1] : null]);

  // Initialize prevRegionRef from stored region on mount
  useEffect(() => {
    if (currentRegion.state || currentRegion.country) {
      prevRegionRef.current = { state: currentRegion.state, country: currentRegion.country };
    }
  }, []);

  useEffect(() => {
    if (destinationCoords && !isCalculating) {
      // Re-calculate route when waypoints change and we have a destination
      handleNavigate().catch(err => console.error("Auto re-route failed:", err));
    }
  }, [waypoints]);

  const submitParkingStatus = async (status: string) => {
    if (!selectedPoi) return;
    const poiId = `${selectedPoi.lat.toFixed(4)}_${selectedPoi.lon.toFixed(4)}`;
    setParkingSubmitDone(status);
    try {
      const res = await fetch('/api/poi/parking-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poiId, status, name: selectedPoi.name, lat: selectedPoi.lat, lon: selectedPoi.lon })
      });
      const data = await res.json();
      if (data.success) {
        setPoiParkingStatus({ status, updatedAt: new Date().toISOString(), updateCount: data.updateCount });
      }
    } catch {
      setParkingSubmitDone(null);
    }
  };

  const addWaypoint = (s: any, type: 'DEADHEAD' | 'PAID' = 'DEADHEAD', position?: number) => {
    const newWaypoint: Waypoint = {
      id: Math.random().toString(36).substr(2, 9),
      address: (s.display_name || s.name).split(',')[0],
      lat: parseFloat(s.lat),
      lon: parseFloat(s.lon),
      type
    };
    setWaypoints(prev => {
      if (position !== undefined && position >= 0 && position <= prev.length) {
        const updated = [...prev];
        updated.splice(position, 0, newWaypoint);
        return updated;
      }
      return [...prev, newWaypoint];
    });
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


  const clearRouteMarkers = useCallback(() => {
    // No-op as route markers are no longer used
  }, []);

  const clearRoute = () => {
    if (currentDestination !== 'Standby') {
      saveRouteToHistory('CANCELLED');
    }
    setWaypoints([]);
    setDestinationCoords(null);
    setCurrentDestination('Standby');
    setRoutePoints([]);
    routeCoordsRef.current = [];
    routeDistancesRef.current = [];
    setMilesRemaining(0);
    setEta('--:-- --');
    setRemainingDuration(0);
    setWeatherAlerts([]);
    setRouteWeatherForecast([]);
    lastSimIdxRef.current = -1;
    
    // Clear map layers
    if (mapLayersRef.current) {
      Object.values(mapLayersRef.current).forEach(layer => {
        try {
          mapInstanceRef.current?.removeObject(layer);
        } catch (e) {
          console.warn("Failed to remove layer:", e);
        }
      });
      mapLayersRef.current = {};
    }
    
    clearRouteMarkers();
    // Clear waypoint numbered markers
    waypointMarkersRef.current.forEach(m => { try { mapInstanceRef.current?.removeObject(m); } catch(_){} });
    waypointMarkersRef.current = [];
    // Clear traffic incident markers
    trafficIncidentMarkersRef.current.forEach(m => { try { mapInstanceRef.current?.removeObject(m); } catch(_){} });
    trafficIncidentMarkersRef.current = [];
    if (trafficIncidentIntervalRef.current) {
      clearInterval(trafficIncidentIntervalRef.current);
      trafficIncidentIntervalRef.current = null;
    }
    setAutoRerouteCountdown(null);
    // Clear highway shield markers
    isManeuverZoomActiveRef.current = false; // Reset auto-zoom state
    // Clear voice guidance thresholds
    announcedManeuverThresholdsRef.current.clear();
    clearSigns();
    // Clear lane visualization
    if (mapInstanceRef.current) {
      clearLanes(mapInstanceRef.current);
    }
    // Clear alternative route overlays
    if (altRouteLayersRef.current) {
      altRouteLayersRef.current.removeAll();
    }
    // Clear truck intelligence data
    gradeWarningsRef.current = [];
    clearGradeData();
    setActiveGradeAlert(null);
    setManeuverPreviewData(null);
    // Clear traveled segment
    if (mapLayersRef.current['traveled']) {
      try { mapInstanceRef.current?.removeObject(mapLayersRef.current['traveled']); } catch(_){}
      delete mapLayersRef.current['traveled'];
    }
    if (mapLayersRef.current['segment_glow']) {
      try { mapInstanceRef.current?.removeObject(mapLayersRef.current['segment_glow']); } catch(_){}
      delete mapLayersRef.current['segment_glow'];
    }
    currentSegmentLineRef.current = null;
    if (context) context.setNavTarget(null);
  };

  const fetchRouteWeather = async (coords: [number, number][], distMi: number) => {
    try {
      if (coords.length < 10) return;
      
      // Sample points every ~100 miles for better coverage, max 10 points
      const numPoints = Math.min(10, Math.max(2, Math.floor(distMi / 100)));
      const sampleInterval = Math.max(1, Math.floor(coords.length / numPoints));
      const sampledPoints: { lat: number, lon: number, dist: number }[] = [];
      
      for (let i = sampleInterval; i < coords.length; i += sampleInterval) {
        if (sampledPoints.length >= 9) break; // Leave room for destination
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
      console.error("Failed to fetch route weather", e instanceof Error ? e.message : String(e));
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
      console.log(`[geocodeDestination] Query: ${query}, User Location: ${lat}, ${lon}`);
      
      // Wrap searchPlaces in a timeout
      try {
        const geoData = await Promise.race([
          searchPlaces(query, lat, lon),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Geocoding timed out")), 20000))
        ]) as any;

        console.log(`[geocodeDestination] Received geoData:`, geoData);

        if (!geoData || geoData.length === 0) {
          console.warn(`[geocodeDestination] No results found for query: ${query}`);
          throw new Error("Geocoding failed: Location not found.");
        }

        const result = {
          lat: parseFloat(geoData[0].lat),
          lon: parseFloat(geoData[0].lon),
          name: geoData[0].display_name.split(',')[0],
        };
        console.log(`[geocodeDestination] Returning result:`, result);
        return result;
      } catch (error) {
        console.error(`[geocodeDestination] Error:`, error);
        throw error;
      }
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
  ): Promise<{ 
    coords: [number, number][]; 
    distMi: number; 
    durationSec: number; 
    steps: any[]; 
    alerts: any[]; 
    restrictions: any[]; 
    trafficAlerts: any[]; 
    spans: any[];
    highwayShields: any[];
    exitSigns: any[];
    curveSigns: any[];
    speedLimitSigns: any[];
    trafficSlowdowns: any[];
    cmvWarnings: any[];
    roadSegments: any[];
  }[] | null> => {
    if (!userLocation) return null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const hereRouteData = await getRoute(
        `${userLocation[0]},${userLocation[1]}`,
        `${destLat},${destLon}`,
        truckProfile,
        waypoints.map(wp => `${wp.lat},${wp.lon}`),
        avoidTolls,
        avoidFerries,
        avoidUnpaved,
        controller.signal
      );
      clearTimeout(timeoutId);

      console.log('Frontend: Parsed HERE route data', hereRouteData);
      if (!hereRouteData.routes || hereRouteData.routes.length === 0) {
        console.warn('Frontend: No routes found in HERE response', hereRouteData);
        return null;
      }
      
      // Process all routes
      const processedRoutes = hereRouteData.routes.map((route: any, routeIdx: number) => {
        if (!route.sections || route.sections.length === 0) {
          console.warn(`Frontend: Route ${routeIdx} has no sections`);
          return null;
        }

        // Merge multi-section routes (waypoint legs) into a unified section
        // This ensures exits, shields, and other signs work correctly across all legs
        const mergedSection = (() => {
          if (route.sections.length === 1) return route.sections[0];
          
          const merged: any = {
            summary: { length: 0, duration: 0 },
            polyline: null,
            actions: [],
            spans: [],
            incidents: [],
            notices: []
          };
          
          let pointOffset = 0;
          let distOffset = 0;
          
          for (let si = 0; si < route.sections.length; si++) {
            const sec = route.sections[si];
            if (!sec.summary) continue;
            
            merged.summary.length += sec.summary.length;
            merged.summary.duration += sec.summary.duration;
            
            // Merge actions with adjusted offsets
            if (sec.actions) {
              sec.actions.forEach((a: any) => {
                merged.actions.push({ ...a, offset: (a.offset ?? 0) + pointOffset });
              });
            }
            
            // Merge spans with adjusted offsets
            if (sec.spans) {
              sec.spans.forEach((s: any) => {
                merged.spans.push({ ...s, offset: s.offset != null ? s.offset + pointOffset : undefined });
              });
            }
            
            // Merge incidents
            if (sec.incidents) {
              sec.incidents.forEach((inc: any) => {
                const adj = { ...inc };
                if (adj.from?.offset != null) adj.from = { ...adj.from, offset: adj.from.offset + pointOffset };
                merged.incidents.push(adj);
              });
            }
            
            if (sec.notices) merged.notices.push(...sec.notices);
            
            // Track polyline point count for offset adjustment
            if (sec.polyline) {
              // @ts-expect-error: Polyline decoding library type definition is missing
              const d = decode(sec.polyline);
              if (d?.polyline) {
                const skip = si > 0 ? 1 : 0; // Skip duplicate boundary point
                pointOffset += d.polyline.length - skip;
              }
              // Use first section's polyline; we'll decode all together below
              if (si === 0) merged.polyline = sec.polyline;
            }
          }
          
          // Build the merged polyline string by re-encoding concatenated points
          // Actually, we'll handle multi-decode below in the polyline processing
          merged._allSections = route.sections;
          return merged;
        })();

        const section = mergedSection;
        const summary = section.summary;
        if (!summary || isNaN(summary.length) || isNaN(summary.duration)) {
          console.warn(`Frontend: Route ${routeIdx} has invalid merged summary`, summary);
          return null;
        }

        const distMi = summary.length / 1609.34;
        const durationSec = summary.duration;
        
        const steps = section.actions.map((action: any) => {
          const rawInstruction = (action.instruction || '').replace(/\u003c/g, '<').replace(/\u003e/g, '>');
          const instruction = convertInstructionToImperial(rawInstruction);          const hasTrafficLight = instruction.toLowerCase().includes('traffic light');
          return {
            maneuver: { 
              instruction, 
              type: action.action, 
              modifier: action.direction,
              hasTrafficLight
            },
            distance: action.length,
            duration: summary.length > 0 ? (action.length / summary.length) * summary.duration : 0,
            offset: action.offset ?? 0,
            lanes: synthesizeLanes(action.action, action.direction, action.severity)
          };
        });

        // Decode polyline — handle multi-section routes by merging polylines
        let decoded: any;
        let allSectionPolylines: any[] = [];
        
        if (section._allSections) {
          // Multi-section route: decode and merge all section polylines
          const mergedPoints: any[] = [];
          for (let si = 0; si < section._allSections.length; si++) {
            const sec = section._allSections[si];
            if (!sec.polyline) continue;
            // @ts-expect-error: Polyline decoding library type definition is missing
            const d = decode(sec.polyline);
            if (d?.polyline?.length > 0) {
              const skip = si > 0 && mergedPoints.length > 0 ? 1 : 0; // De-dupe boundary point
              for (let i = skip; i < d.polyline.length; i++) {
                mergedPoints.push(d.polyline[i]);
              }
            }
          }
          decoded = { polyline: mergedPoints };
        } else if (section.polyline) {
          // @ts-expect-error: Polyline decoding library type definition is missing
          decoded = decode(section.polyline);
        }
        
        if (!decoded || !decoded.polyline || decoded.polyline.length === 0) {
          console.error(`Frontend: Decoded polyline for route ${routeIdx} is empty or invalid`);
          return null;
        }
        console.log(`Frontend: Decoded ${decoded.polyline.length} points for route ${routeIdx} (${section._allSections ? section._allSections.length + ' sections merged' : '1 section'})`);

        const coords = decoded.polyline.map((c: any) => [c[0], c[1]]);
        console.log(`Frontend: Processed ${coords.length} coordinates for route ${routeIdx}`);

        const allIncidents = section.incidents || [];
        const alerts = allIncidents.filter((incident: any) => incident?.from?.offset != null).map((incident: any) => {
          // incident.from.offset is a polyline point index, NOT distance in meters
          const incidentIdx = Math.min(incident.from.offset, coords.length - 1);
          const progress = incidentIdx / (coords.length - 1 || 1);
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

        const restrictions: any[] = [];
        const trafficAlertsList: any[] = [];
        const highwayShields: { label: string; routeLevel: number; type: string; coord: [number, number]; pointIndex: number; direction?: string }[] = [];
        const exitSigns: { name: string; exitNumber?: string; coord: [number, number] }[] = [];
        const curveSigns: { severity: string; direction: string; coord: [number, number] }[] = [];
        const speedLimitSigns: { speed: number; coord: [number, number] }[] = [];
        const trafficSlowdowns: { severity: string; message: string; coord: [number, number] }[] = [];
        const cmvWarnings: { type: string; severity: string; message: string; grade?: number; coord: [number, number] }[] = [];
        const roadSegments: { name: string; shieldType: 'interstate' | 'us' | 'state' | 'local'; shieldLabel: string; direction: string; startIdx: number; endIdx: number; }[] = [];
        
        if (section.notices) {
          section.notices.forEach((notice: any) => {
            restrictions.push({
              type: 'RESTRICTION',
              message: notice.title || notice.code || 'Route Restriction',
              icon: AlertTriangle,
              color: 'text-red-500',
              bg: 'bg-red-500/10',
              progress: 0
            });
          });
        }

        if (section.actions) {
          section.actions.forEach((action: any) => {
            const instruction = (action.instruction || '').toLowerCase();
            const rawInstruction = action.instruction || '';
            const actionOffset = action.offset ?? 0;
            const coordIdx = Math.min(actionOffset, coords.length - 1);
            const actionCoord = coords[coordIdx] || coords[Math.floor(actionOffset * (coords.length - 1) / (summary.length || 1))];
            
            if (instruction.includes('stop sign') || action.action === 'stop') {
              // Progress = polyline point index / total polyline points (NOT distance)
              const progress = coordIdx / (coords.length - 1 || 1);
              trafficAlertsList.push({
                type: 'STOP_SIGN',
                message: 'Stop Sign',
                icon: Octagon,
                color: 'text-red-600',
                bg: 'bg-red-600/10',
                progress,
                coords: actionCoord
              });
            }
            
            // Extract highway exit signs - capture from ALL action types that reference exit numbers
            const exitNumMatch = rawInstruction.match(/exit\s+(\d+[A-Z]?)/i);
            if (action.action === 'exit' || action.action === 'ramp' || instruction.includes('take exit') || instruction.includes('take the exit') || instruction.includes('take ramp') || exitNumMatch) {
              const towardMatch = rawInstruction.match(/(?:toward|towards|onto)\s+(.+?)(?:\.|$)/i);
              exitSigns.push({
                name: towardMatch ? towardMatch[1].trim() : rawInstruction.replace(/<[^>]*>/g, '').substring(0, 50),
                exitNumber: exitNumMatch ? exitNumMatch[1] : undefined,
                coord: actionCoord
              });
            }
            
            // Extract sharp curve warnings
            const dir = (action.direction || '').toLowerCase();
            if (dir.includes('sharpleft') || dir.includes('sharpright') || dir === 'sharp left' || dir === 'sharp right') {
              curveSigns.push({
                severity: 'sharp',
                direction: dir.includes('left') ? 'left' : 'right',
                coord: actionCoord
              });
            }
          });
        }

        if (section.spans) {
          let currentPointIndex = 0;
          const totalPoints = decoded.polyline.length;
          
          // Track highway shields for route overlay
          let lastShieldName = '';
          let lastShieldPointIndex = -99999;
          const routeDistMi = summary.length / 1609.34;
          // Same-road shields: space every ~20-35 miles for denser professional look
          const SAME_ROAD_GAP = Math.max(120, Math.floor(totalPoints * (routeDistMi > 200 ? 0.04 : 0.03)));
          // Different-road shields: place immediately but with small minimum gap to avoid overlap
          const DIFF_ROAD_GAP = Math.max(10, Math.floor(totalPoints * 0.003));
          
          // Track speed limit changes
          let prevSpeedLimit = -1;
          const MIN_SPEED_SIGN_GAP = Math.max(20, Math.floor(totalPoints * 0.015)); // Min gap between speed signs
          let lastSpeedSignIdx = -99999;

          // Track road segments for inline road labels
          let currentRoadName = '';
          let currentRoadShieldType: 'interstate' | 'us' | 'state' | 'local' = 'local';
          let currentRoadShieldLabel = '';
          let currentRoadDirection = '';
          let currentRoadStartIdx = 0;

          // Throttle traffic light/stop sign alerts — minimum gap between markers
          const MIN_TRAFFIC_ALERT_GAP = Math.max(40, Math.floor(totalPoints * 0.02)); // ~0.3 miles apart minimum
          let lastTrafficLightIdx = -99999;
          let lastStopSignIdx = -99999;

          section.spans.forEach((span: any) => {
            const progress = currentPointIndex / (totalPoints - 1 || 1);

            if (span.streetAttributes && span.streetAttributes.includes('trafficLight')) {
              // Only add if far enough from the last traffic light marker
              if (currentPointIndex - lastTrafficLightIdx >= MIN_TRAFFIC_ALERT_GAP) {
                trafficAlertsList.push({
                  type: 'TRAFFIC_LIGHT',
                  message: 'Traffic Light',
                  icon: TrafficCone,
                  color: 'text-[#D4AF37]',
                  bg: 'bg-[#D4AF37]/10',
                  progress,
                  coords: coords[currentPointIndex]
                });
                lastTrafficLightIdx = currentPointIndex;
              }
            }

            if (span.truckAttributes) {
              const attrs = span.truckAttributes;
              const progress = currentPointIndex / (totalPoints - 1 || 1);
              
              if (attrs.maxHeight !== undefined) {
                const heightFt = (attrs.maxHeight / 30.48).toFixed(1);
                // Warning if bridge is lower than truck height + 6 inches (approx 15cm)
                if (attrs.maxHeight < (truckProfile.height * 30.48) + 15) {
                  restrictions.push({
                    type: 'BRIDGE',
                    message: `Low Bridge: ${heightFt}ft`,
                    icon: Truck,
                    color: 'text-red-500',
                    bg: 'bg-red-500/20',
                    progress,
                    value: attrs.maxHeight,
                    coords: coords[currentPointIndex]
                  });
                }
              }
              
              if (attrs.maxWeight !== undefined) {
                const weightLbs = Math.round(attrs.maxWeight * 2.20462);
                // Warning if weight limit is within 2000 lbs of truck weight
                if (attrs.maxWeight < (truckProfile.weight * 0.453592) + 907) {
                  restrictions.push({
                    type: 'WEIGHT',
                    message: `Weight Limit: ${weightLbs.toLocaleString()} lbs`,
                    icon: Scale,
                    color: 'text-orange-500',
                    bg: 'bg-orange-500/20',
                    progress,
                    value: attrs.maxWeight,
                    coords: coords[currentPointIndex]
                  });
                }
              }

              // Tunnel restriction detection
              if (attrs.tunnelCategory) {
                const tunnelCat = attrs.tunnelCategory;
                const truckTunnelCat = truckProfile.tunnelCategory || 'NONE';
                // ADR tunnel categories: B > C > D > E. If tunnel requires higher restriction than truck has, warn.
                const tunnelOrder: Record<string, number> = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, 'NONE': 0 };
                const tunnelLevel = tunnelOrder[tunnelCat] ?? 0;
                const truckLevel = tunnelOrder[truckTunnelCat] ?? 0;
                if (tunnelLevel > 0) {
                  const isBlocked = truckProfile.hazmat && tunnelLevel > truckLevel;
                  restrictions.push({
                    type: 'TUNNEL',
                    message: `Tunnel Cat. ${tunnelCat}${isBlocked ? ' — BLOCKED' : ''}`,
                    icon: AlertTriangle,
                    color: isBlocked ? 'text-red-500' : 'text-[#D4AF37]',
                    bg: isBlocked ? 'bg-red-500/20' : 'bg-[#D4AF37]/20',
                    progress,
                    value: tunnelLevel,
                    coords: coords[currentPointIndex]
                  });
                }
              }

              // Hazmat-prohibited zone detection
              if (attrs.permittedHazardousGoods !== undefined || attrs.hazardousGoods !== undefined) {
                const forbidden = attrs.hazardousGoods === false || (Array.isArray(attrs.permittedHazardousGoods) && attrs.permittedHazardousGoods.length === 0);
                if (forbidden && truckProfile.hazmat) {
                  restrictions.push({
                    type: 'HAZMAT',
                    message: 'Hazmat Prohibited Zone',
                    icon: AlertTriangle,
                    color: 'text-yellow-500',
                    bg: 'bg-yellow-500/20',
                    progress,
                    coords: coords[currentPointIndex]
                  });
                }
              }
            }
            // Extract highway names from span for shield markers
            if (span.routeNumbers && Array.isArray(span.routeNumbers) && span.routeNumbers.length > 0) {
              const coordIdx = Math.min(span.offset ?? currentPointIndex, coords.length - 1);
              if (coords[coordIdx]) {
                for (const rn of span.routeNumbers) {
                  const routeValue = rn.value || '';
                  if (!routeValue) continue;
                  
                  // Parse highway label from route number value (e.g., "I-95" -> label="95", "US-30" -> label="30", "PA-611" -> label="611")
                  const interstateMatch = routeValue.match(/^I[- ]?(\d+[A-Z]?)/i);
                  const usMatch = routeValue.match(/^US[- ]?(\d+[A-Z]?)/i);
                  const stateMatch = routeValue.match(/^([A-Z]{2})[- ]?(\d+[A-Z]?)/i);
                  const rtMatch = routeValue.match(/^(?:RT|Rt|Route)[- ]?(\d+[A-Z]?)/i);
                  
                  let shieldLabel = '';
                  let routeLevel = rn.routeType || 4;
                  let shieldType = 'other';
                  
                  if (interstateMatch) {
                    shieldLabel = interstateMatch[1];
                    routeLevel = 1;
                    shieldType = 'interstate';
                  } else if (usMatch) {
                    shieldLabel = usMatch[1];
                    routeLevel = 2;
                    shieldType = 'us';
                  } else if (stateMatch && !interstateMatch) {
                    shieldLabel = stateMatch[2];
                    routeLevel = 3;
                    shieldType = 'state';
                  } else if (rtMatch) {
                    shieldLabel = rtMatch[1];
                    routeLevel = rn.routeType || 3;
                    shieldType = 'state';
                  }
                  
                  if (shieldLabel) {
                    const effectiveIdx = span.offset ?? currentPointIndex;
                    const isSameRoad = routeValue === lastShieldName;
                    const gap = isSameRoad ? SAME_ROAD_GAP : DIFF_ROAD_GAP;
                    
                    if (!isSameRoad || (effectiveIdx - lastShieldPointIndex) > gap) {
                      highwayShields.push({
                        label: shieldLabel,
                        routeLevel,
                        type: shieldType,
                        coord: coords[coordIdx],
                        pointIndex: effectiveIdx,
                        direction: rn.direction || undefined
                      });
                      lastShieldName = routeValue;
                      lastShieldPointIndex = effectiveIdx;
                    }
                    break; // Only use first matching route number per span
                  }
                }
              }
            }
            
            // ── Track road name segments for inline labels ──
            {
              let spanRoadName = '';
              let spanShieldType: 'interstate' | 'us' | 'state' | 'local' = 'local';
              let spanShieldLabel = '';
              let spanDirection = '';
              // Prefer routeNumbers for road identification
              if (span.routeNumbers && span.routeNumbers.length > 0) {
                const rn = span.routeNumbers[0];
                spanRoadName = rn.value || '';
                spanDirection = rn.direction || '';
                if (/^I[- ]?(\d+)/i.test(spanRoadName)) { spanShieldType = 'interstate'; spanShieldLabel = spanRoadName.match(/^I[- ]?(\d+[A-Z]?)/i)?.[1] || ''; }
                else if (/^US[- ]?(\d+)/i.test(spanRoadName)) { spanShieldType = 'us'; spanShieldLabel = spanRoadName.match(/^US[- ]?(\d+[A-Z]?)/i)?.[1] || ''; }
                else if (/^[A-Z]{2}[- ]?\d+/i.test(spanRoadName)) { spanShieldType = 'state'; spanShieldLabel = spanRoadName.match(/^[A-Z]{2}[- ]?(\d+[A-Z]?)/i)?.[2] || spanRoadName; }
              } else if (span.names && span.names.length > 0) {
                spanRoadName = span.names[0].value || '';
              }
              // If road changed, close previous segment and start new one
              if (spanRoadName && spanRoadName !== currentRoadName) {
                if (currentRoadName && currentPointIndex - currentRoadStartIdx > 10) {
                  roadSegments.push({ name: currentRoadName, shieldType: currentRoadShieldType, shieldLabel: currentRoadShieldLabel, direction: currentRoadDirection, startIdx: currentRoadStartIdx, endIdx: currentPointIndex });
                }
                currentRoadName = spanRoadName;
                currentRoadShieldType = spanShieldType;
                currentRoadShieldLabel = spanShieldLabel;
                currentRoadDirection = spanDirection;
                currentRoadStartIdx = currentPointIndex;
              }
            }

            // Detect speed limit changes
            if (span.speedLimit !== undefined && span.speedLimit > 0) {
              const mph = Math.round(span.speedLimit * 2.23694);
              if (mph !== prevSpeedLimit && (currentPointIndex - lastSpeedSignIdx) > MIN_SPEED_SIGN_GAP) {
                if (coords[currentPointIndex]) {
                  speedLimitSigns.push({
                    speed: mph,
                    coord: coords[currentPointIndex]
                  });
                  lastSpeedSignIdx = currentPointIndex;
                }
                prevSpeedLimit = mph;
              }
            }
            
            // Detect traffic slowdowns from incident spans
            if (span.incidents && Array.isArray(span.incidents)) {
              for (const inc of span.incidents) {
                if (inc && (inc.type === 'CONGESTION' || inc.type === 'CONSTRUCTION' || inc.type === 'LANE_RESTRICTION' || inc.type === 'SLOW_TRAFFIC' || inc.type === 'ROAD_CLOSURE')) {
                  if (coords[currentPointIndex]) {
                    trafficSlowdowns.push({
                      severity: inc.severity || 'medium',
                      message: inc.description?.value || inc.type || 'Traffic Slowdown',
                      coord: coords[currentPointIndex]
                    });
                  }
                  break;
                }
              }
            }

            // Extract span-level notices for truck-specific warnings
            if (span.notices && Array.isArray(span.notices)) {
              span.notices.forEach((notice: any) => {
                if (notice && coords[currentPointIndex]) {
                  const msg = notice.title || notice.message || notice.code || 'Route Notice';
                  const noticeType = (notice.code || '').toLowerCase();
                  let type = 'NOTICE';
                  if (noticeType.includes('violatedAvoid') || noticeType.includes('truck')) type = 'TRUCK_PROHIBITED';
                  restrictions.push({
                    type,
                    message: msg,
                    icon: AlertTriangle,
                    color: 'text-amber-500',
                    bg: 'bg-amber-500/20',
                    progress: currentPointIndex / (totalPoints - 1 || 1),
                    coords: coords[currentPointIndex]
                  });
                }
              });
            }
            
            // Use maxSpeed (m/s) as more accurate speed limit if available
            if (span.maxSpeed !== undefined && span.maxSpeed > 0 && span.speedLimit === undefined) {
              const mph = Math.round(span.maxSpeed * 2.23694);
              if (mph !== prevSpeedLimit && (currentPointIndex - lastSpeedSignIdx) > MIN_SPEED_SIGN_GAP) {
                if (coords[currentPointIndex]) {
                  speedLimitSigns.push({ speed: mph, coord: coords[currentPointIndex] });
                  lastSpeedSignIdx = currentPointIndex;
                }
                prevSpeedLimit = mph;
              }
            }
            
            currentPointIndex += (span.length || 0);
          });
          // Close the final road segment
          if (currentRoadName && currentPointIndex - currentRoadStartIdx > 10) {
            roadSegments.push({ name: currentRoadName, shieldType: currentRoadShieldType, shieldLabel: currentRoadShieldLabel, direction: currentRoadDirection, startIdx: currentRoadStartIdx, endIdx: currentPointIndex });
          }
        }

        // ── CMV Warning Detection from 3D Elevation Data ──────────────────
        const rawPoints = decoded.polyline;
        const has3D = rawPoints.length > 0 && rawPoints[0].length >= 3;
        
        if (has3D) {
          // Helper: haversine distance between two points (meters)
          const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
            const R = 6371000;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
            return 2 * R * Math.asin(Math.sqrt(a));
          };
          
          // Helper: bearing between two points (degrees)
          const bearing = (lat1: number, lng1: number, lat2: number, lng2: number) => {
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
            const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
            return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
          };
          
          // Compute smoothed grades over sliding windows (~400m)
          const WINDOW = 400; // meters
          const MIN_GRADE_THRESHOLD = 5; // % grade to trigger warning
          const MIN_STEEP_DISTANCE = 300; // meters of sustained grade
          const MIN_CMV_GAP = Math.max(50, Math.floor(rawPoints.length * 0.02)); // Min gap between warnings
          
          let lastCmvIdx = -99999;
          let gradeRunStart = -1;
          let gradeRunType = ''; // 'downgrade' or 'upgrade'
          let gradeRunMaxGrade = 0;
          
          for (let i = 1; i < rawPoints.length; i++) {
            // Smoothed grade: look ahead WINDOW meters
            let totalElev = 0;
            let totalDist = 0;
            let j = i;
            while (j < rawPoints.length - 1 && totalDist < WINDOW) {
              const d = haversine(rawPoints[j][0], rawPoints[j][1], rawPoints[j + 1][0], rawPoints[j + 1][1]);
              totalDist += d;
              totalElev += rawPoints[j + 1][2] - rawPoints[j][2];
              j++;
            }
            if (totalDist < 50) continue;
            
            const grade = (totalElev / totalDist) * 100;
            
            if (Math.abs(grade) >= MIN_GRADE_THRESHOLD) {
              const currentType = grade < 0 ? 'downgrade' : 'upgrade';
              if (gradeRunStart === -1 || currentType !== gradeRunType) {
                // End previous run if it was long enough
                if (gradeRunStart !== -1 && gradeRunType) {
                  const runDist = haversine(rawPoints[gradeRunStart][0], rawPoints[gradeRunStart][1], rawPoints[i - 1][0], rawPoints[i - 1][1]);
                  if (runDist >= MIN_STEEP_DISTANCE && (gradeRunStart - lastCmvIdx) > MIN_CMV_GAP) {
                    const absGrade = Math.abs(gradeRunMaxGrade);
                    const severity = absGrade >= 8 ? 'critical' : absGrade >= 6 ? 'high' : 'medium';
                    cmvWarnings.push({
                      type: gradeRunType === 'downgrade' ? 'STEEP_DOWNGRADE' : 'STEEP_HILL',
                      severity,
                      message: gradeRunType === 'downgrade' 
                        ? `Steep Downgrade ${absGrade.toFixed(0)}% — ${(runDist / 1609.34).toFixed(1)} mi`
                        : `Steep Hill ${absGrade.toFixed(0)}% — ${(runDist / 1609.34).toFixed(1)} mi`,
                      grade: gradeRunMaxGrade,
                      coord: coords[gradeRunStart],
                      progress: gradeRunStart / (rawPoints.length - 1 || 1)
                    });
                    lastCmvIdx = gradeRunStart;
                  }
                }
                gradeRunStart = i;
                gradeRunType = currentType;
                gradeRunMaxGrade = grade;
              } else {
                if (Math.abs(grade) > Math.abs(gradeRunMaxGrade)) gradeRunMaxGrade = grade;
              }
            } else {
              // Grade dropped below threshold — finalize run
              if (gradeRunStart !== -1 && gradeRunType) {
                const runDist = haversine(rawPoints[gradeRunStart][0], rawPoints[gradeRunStart][1], rawPoints[i][0], rawPoints[i][1]);
                if (runDist >= MIN_STEEP_DISTANCE && (gradeRunStart - lastCmvIdx) > MIN_CMV_GAP) {
                  const absGrade = Math.abs(gradeRunMaxGrade);
                  const severity = absGrade >= 8 ? 'critical' : absGrade >= 6 ? 'high' : 'medium';
                  cmvWarnings.push({
                    type: gradeRunType === 'downgrade' ? 'STEEP_DOWNGRADE' : 'STEEP_HILL',
                    severity,
                    message: gradeRunType === 'downgrade'
                      ? `Steep Downgrade ${absGrade.toFixed(0)}% — ${(runDist / 1609.34).toFixed(1)} mi`
                      : `Steep Hill ${absGrade.toFixed(0)}% — ${(runDist / 1609.34).toFixed(1)} mi`,
                    grade: gradeRunMaxGrade,
                    coord: coords[gradeRunStart],
                    progress: gradeRunStart / (rawPoints.length - 1 || 1)
                  });
                  lastCmvIdx = gradeRunStart;
                }
              }
              gradeRunStart = -1;
              gradeRunType = '';
              gradeRunMaxGrade = 0;
            }
          }
          // Finalize any remaining run
          if (gradeRunStart !== -1 && gradeRunType) {
            const endIdx = rawPoints.length - 1;
            const runDist = haversine(rawPoints[gradeRunStart][0], rawPoints[gradeRunStart][1], rawPoints[endIdx][0], rawPoints[endIdx][1]);
            if (runDist >= MIN_STEEP_DISTANCE && (gradeRunStart - lastCmvIdx) > MIN_CMV_GAP) {
              const absGrade = Math.abs(gradeRunMaxGrade);
              const severity = absGrade >= 8 ? 'critical' : absGrade >= 6 ? 'high' : 'medium';
              cmvWarnings.push({
                type: gradeRunType === 'downgrade' ? 'STEEP_DOWNGRADE' : 'STEEP_HILL',
                severity,
                message: gradeRunType === 'downgrade'
                  ? `Steep Downgrade ${absGrade.toFixed(0)}% — ${(runDist / 1609.34).toFixed(1)} mi`
                  : `Steep Hill ${absGrade.toFixed(0)}% — ${(runDist / 1609.34).toFixed(1)} mi`,
                grade: gradeRunMaxGrade,
                coord: coords[gradeRunStart],
                progress: gradeRunStart / (rawPoints.length - 1 || 1)
              });
            }
          }
          
          // ── Winding Road Detection ──
          // Detect segments with frequent bearing changes (>30° per ~200m)
          const WIND_WINDOW = 15; // points to look at 
          const MIN_BEARING_CHANGES = 4; // min direction changes in window
          const BEARING_THRESHOLD = 30; // degrees
          let lastWindIdx = -99999;
          
          for (let i = WIND_WINDOW; i < rawPoints.length - WIND_WINDOW; i += Math.floor(WIND_WINDOW / 2)) {
            let bearingChanges = 0;
            for (let k = i - WIND_WINDOW; k < i + WIND_WINDOW - 1; k++) {
              if (k + 2 >= rawPoints.length) break;
              const b1 = bearing(rawPoints[k][0], rawPoints[k][1], rawPoints[k + 1][0], rawPoints[k + 1][1]);
              const b2 = bearing(rawPoints[k + 1][0], rawPoints[k + 1][1], rawPoints[k + 2][0], rawPoints[k + 2][1]);
              let diff = Math.abs(b2 - b1);
              if (diff > 180) diff = 360 - diff;
              if (diff > BEARING_THRESHOLD) bearingChanges++;
            }
            
            if (bearingChanges >= MIN_BEARING_CHANGES && (i - lastWindIdx) > MIN_CMV_GAP * 2) {
              cmvWarnings.push({
                type: 'WINDING_ROAD',
                severity: bearingChanges >= 8 ? 'high' : 'medium',
                message: 'Winding Road Ahead',
                coord: coords[i],
                progress: i / (rawPoints.length - 1 || 1)
              });
              lastWindIdx = i;
            }
          }
          
          // ── Rollover Risk Detection ──
          // Sharp curve + steep grade = rollover risk
          // Check curves that coincide with >3% grade
          for (const curve of curveSigns) {
            // Find nearest polyline point to this curve
            let nearestIdx = 0;
            let nearestDist = Infinity;
            for (let k = 0; k < Math.min(rawPoints.length, 2000); k += 3) {
              const d = Math.abs(rawPoints[k][0] - curve.coord[0]) + Math.abs(rawPoints[k][1] - curve.coord[1]);
              if (d < nearestDist) { nearestDist = d; nearestIdx = k; }
            }
            // Check grade at that point
            if (nearestIdx > 0 && nearestIdx < rawPoints.length - 1) {
              const localDist = haversine(rawPoints[Math.max(0, nearestIdx - 5)][0], rawPoints[Math.max(0, nearestIdx - 5)][1], rawPoints[Math.min(rawPoints.length - 1, nearestIdx + 5)][0], rawPoints[Math.min(rawPoints.length - 1, nearestIdx + 5)][1]);
              const localElev = rawPoints[Math.min(rawPoints.length - 1, nearestIdx + 5)][2] - rawPoints[Math.max(0, nearestIdx - 5)][2];
              const localGrade = localDist > 0 ? Math.abs((localElev / localDist) * 100) : 0;
              if (localGrade > 3) {
                cmvWarnings.push({
                  type: 'ROLLOVER_RISK',
                  severity: localGrade > 6 ? 'critical' : 'high',
                  message: `Rollover Risk — ${curve.direction} curve on ${localGrade.toFixed(0)}% grade`,
                  grade: localGrade,
                  coord: curve.coord,
                  progress: nearestIdx / (rawPoints.length - 1 || 1)
                });
              }
            }
          }
        }

        // Extract toll information
        let tolls: any = null;
        if (route.sections) {
          for (const sec of route.sections) {
            if (sec.tolls) {
              if (!tolls) tolls = { fares: [], total: { cost: { value: 0, currency: 'USD' } } };
              if (sec.tolls.fares) tolls.fares.push(...sec.tolls.fares);
              if (sec.tolls.estimatedPrice) {
                for (const price of sec.tolls.estimatedPrice) {
                  tolls.total.cost.value += price.price || 0;
                  if (price.currency) tolls.total.cost.currency = price.currency;
                }
              }
            }
            // Also check section-level toll summaries
            if (sec.summary?.tollCost) {
              if (!tolls) tolls = { fares: [], total: { cost: { value: 0, currency: 'USD' } } };
              tolls.total.cost.value += sec.summary.tollCost;
            }
          }
        }

        return { coords, distMi, durationSec, steps, alerts, restrictions, trafficAlerts: trafficAlertsList, spans: route.sections[0].spans, highwayShields, exitSigns, curveSigns, speedLimitSigns, trafficSlowdowns, cmvWarnings, roadSegments, tolls };
      }).filter(Boolean);

      if (processedRoutes.length === 0) return null;

      // For now, return the first one as primary, but we'll store others in state
      const primaryRoute = processedRoutes[0];
      setWeatherAlerts(primaryRoute.alerts.sort((a: any, b: any) => a.progress - b.progress));
      setRestrictionAlerts(primaryRoute.restrictions.sort((a: any, b: any) => a.progress - b.progress));
      setTrafficAlerts(primaryRoute.trafficAlerts.sort((a: any, b: any) => a.progress - b.progress));
      cmvWarningsRef.current = (primaryRoute.cmvWarnings || []).sort((a: any, b: any) => a.progress - b.progress);
      routeSignsRef.current = {
        speedLimitSigns: primaryRoute.speedLimitSigns || [],
        exitSigns: primaryRoute.exitSigns || [],
        restrictions: primaryRoute.restrictions || [],
        curveSigns: primaryRoute.curveSigns || []
      };
      if (primaryRoute.spans) {
        routeSpansRef.current = primaryRoute.spans;
        // Set initial speed limit from the first route span that has one
        for (const span of primaryRoute.spans) {
          if (span.speedLimit !== undefined && span.speedLimit > 0) {
            setCurrentSpeedLimit(Math.round(span.speedLimit * 2.23694)); // m/s → mph
            break;
          }
        }
        // Fallback: if no span has speed limit, infer from route steps
        if (!currentSpeedLimit && routeStepsRef.current.length > 0) {
          const firstStep = routeStepsRef.current[0];
          if (firstStep?.maneuver?.instruction) {
            const roadName = firstStep.maneuver.instruction.match(/on (.+?)(?:\s+for|\.|$)/)?.[1] || '';
            if (roadName.match(/^I\s*[- ]/i)) setCurrentSpeedLimit(70);
            else if (roadName.match(/^US\s*[- ]/i)) setCurrentSpeedLimit(65);
            else setCurrentSpeedLimit(45);
          }
        }
      }

      // Render route reasoning overlay if enabled
      if (reasoningEnabledRef.current && primaryRoute.coords) {
        try {
          const firstRoute = hereRouteData?.routes?.[0];
          if (firstRoute?.sections) {
            const reasoningSegments = parseRouteReasoning(firstRoute.sections, primaryRoute.coords);
            renderReasoning(reasoningSegments);
          }
        } catch (e) {
          console.warn('Route reasoning parse error:', e);
        }
      }

      // Store alternative routes in state if needed
      setAlternativeRoutes(processedRoutes);
      setSelectedRouteIndex(0);
      
      return processedRoutes;
    } catch (e) {
      console.error("Routing error:", e);
      return null;
    }
  };

  const calculateFallbackRoute = async (
    destLat: number,
    destLon: number
  ): Promise<{ coords: [number, number][]; distMi: number; durationSec: number; steps: any[] } | null> => {
    if (!userLocation) return null;
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
            maneuver: { instruction: convertInstructionToImperial(step.maneuver.instruction), type: step.maneuver.type },
            distance: step.distance,
            duration: step.duration
          }));
          totalRouteDistanceRef.current = route.distance;
          return { coords, distMi, durationSec, steps };
        }
      }
    } catch (e) {
      console.error("OSRM fallback failed", e instanceof Error ? e.message : String(e));
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
        maneuver: { instruction: convertInstructionToImperial(step.maneuver.instruction), type: step.maneuver.type },
        distance: step.distance,
        duration: step.duration
      }));
      totalRouteDistanceRef.current = route.distance;
      return { coords, distMi, durationSec, steps };
    } catch (e) {
      console.error("OSM fallback failed", e instanceof Error ? e.message : String(e));
    }

    return null;
  };

  const calculateOfflineRoute = (
    destLat: number,
    destLon: number
  ): { coords: [number, number][]; distMi: number; durationSec: number; steps: any[] } | null => {
    if (!userLocation) return null;
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

  const handleCancelRoute = useCallback(() => {
    setRoutePoints([]);
    routeCoordsRef.current = [];
    routeDistancesRef.current = [];
    setRouteSteps([]);
    setMilesRemaining(0);
    setCurrentDestination('');
    setDestinationCoords(null);
    setAlternativeRoutes([]);
    setIsOffRoute(false);
    setIsCalculating(false);
    setIsDriving(false);
    setEta('--:--');
    setRemainingDuration(0);
    lastSimIdxRef.current = -1;
    setNextInstruction({ 
      text: 'Ready for Route', 
      distance: '0.0', 
      icon: ArrowUp as React.ElementType, 
      lanes: [] as any[],
      maneuver: null as any,
      followingStep: null
    });
    
    // Clear map layers
    if (mapLayersRef.current) {
      Object.values(mapLayersRef.current).forEach(layer => {
        try {
          mapInstanceRef.current?.removeObject(layer);
        } catch (e) {
          console.warn("Failed to remove layer:", e);
        }
      });
      mapLayersRef.current = {};
    }
    currentSegmentLineRef.current = null;
    
    // Clear highway shield and sign markers
    clearSigns();
    
    if (context) context.setNavTarget(null);
  }, [context]);

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice search.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setIsSuggestionsVisible(true);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleNavigate = async (target?: string, targetCoords?: { lat: number, lon: number }) => {
    console.log(`[handleNavigate] target: ${target}, targetCoords:`, targetCoords);
    if (context) context.setNavTarget(null);
    setError(null);
    setWeatherAlerts([]);
    setRestrictionAlerts([]);
    setTrafficAlerts([]);
    cmvWarningsRef.current = [];
    routeSignsRef.current = { speedLimitSigns: [], exitSigns: [], restrictions: [], curveSigns: [] };
    
    if (isCalculating) {
      console.warn(`[handleNavigate] Already calculating, ignoring request.`);
      return;
    }

    if (!userLocation || isNaN(userLocation[0]) || isNaN(userLocation[1])) {
      console.error(`[handleNavigate] Invalid userLocation:`, userLocation);
      setError("Waiting for valid GPS signal...");
      return;
    }

    setSuggestions([]);
    setIsSuggestionsVisible(false);
    setIsCalculating(true);
    setIsOffRoute(false);
    setIsSearchFocused(false);
    
    try {
      console.log(`[handleNavigate] Calling geocodeDestination...`);
      const destination = await geocodeDestination(target, targetCoords);
      
      if (!destination) {
        console.warn(`[handleNavigate] geocodeDestination returned null.`);
        if (!target && !searchQuery.trim() && !destinationCoords && waypoints.length === 0) {
          setError("Please enter a destination or select a point on the map.");
        } else {
          setError("Could not find the specified location. Please try a different search.");
        }
        setIsCalculating(false);
        return;
      }

      const { lat: destLat, lon: destLon, name: destName } = destination;
      console.log(`[handleNavigate] Destination found: ${destName} at ${destLat}, ${destLon}`);
      
      if (isNaN(destLat) || isNaN(destLon)) {
        throw new Error("Invalid destination coordinates received from geocoding.");
      }
      
      setDestinationCoords([destLat, destLon]);
      setCurrentDestination(destName);
      
      console.log(`[handleNavigate] Calculating truck route...`);
      const routes = await calculateTruckRoute(destLat, destLon);
      let primaryRoute = routes ? routes[0] : null;

      if (!primaryRoute) {
        console.warn(`[handleNavigate] calculateTruckRoute failed, trying fallback...`);
        primaryRoute = await calculateFallbackRoute(destLat, destLon);
      }
      
      if (!primaryRoute) {
        console.warn(`[handleNavigate] calculateFallbackRoute failed, trying offline...`);
        primaryRoute = calculateOfflineRoute(destLat, destLon);
      }

      if (!primaryRoute) {
        throw new Error("Failed to calculate route.");
      }
      console.log(`[handleNavigate] Route calculated successfully.`);

      if (routes && routes.length > 0) {
        setAlternativeRoutes(routes);
      } else {
        setAlternativeRoutes([primaryRoute]);
      }

      const { coords, distMi, durationSec, steps } = primaryRoute;
      
      routeCoordsRef.current = coords;
      
      // Reset navigation progress refs for the new route
      lastSimIdxRef.current = -1;
      lastUpdateLocationRef.current = null;
      lastUpdateRef.current = 0;
      
      // Calculate cumulative distances for each point in the route
      const distances: number[] = [0];
      let cumulativeDist = 0;
      for (let i = 0; i < coords.length - 1; i++) {
        cumulativeDist += calcDist(coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1]);
        distances.push(cumulativeDist);
      }
      routeDistancesRef.current = distances;
      console.log(`[handleNavigate] Populated routeDistancesRef with ${distances.length} points. Total dist: ${cumulativeDist}m`);

      setRoutePoints(coords);
      setRouteSteps(steps);
      setMilesRemaining(distMi);
      setInitialMiles(distMi);
      totalRouteDistanceRef.current = distMi * 1609.34;
      routeDurationRef.current = durationSec;
      
      const arrival = new Date();
      arrival.setSeconds(arrival.getSeconds() + durationSec);
      setEta(arrival.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
      setRemainingDuration(durationSec);
      
      // Update map
      if (mapInstanceRef.current) {
        // Clear existing route lines from mapLayersRef
        if (mapLayersRef.current['route']) {
          try { mapInstanceRef.current.removeObject(mapLayersRef.current['route']); } catch(_){}
          delete mapLayersRef.current['route'];
        }
        if (mapLayersRef.current['segment']) {
          try { mapInstanceRef.current.removeObject(mapLayersRef.current['segment']); } catch(_){}
          delete mapLayersRef.current['segment'];
        }
        currentSegmentLineRef.current = null;
        
        // Draw route polyline using updateMapLine for consistency
        updateMapLine(mapInstanceRef.current, 'route', coords, '#D4AF37', 12);
        routeLineRef.current = { id: 'route', color: '#D4AF37' };

        // Draw alternative routes with distinct colors if available
        if (routes.length > 1) {
          drawAlternativeRoutes(mapInstanceRef.current, routes, 0);
        }
        
        // Clear all previous route overlay signs before placing new ones
        if (shieldLayerGroupRef.current) {
          shieldLayerGroupRef.current.removeAll();
        }
        // Reset viewport culling stores for new route
        clearSigns();

        // Anti-clutter: thin signs with minimum distance spacing for long routes
        const thinSigns = <T extends { coord: [number, number] }>(signs: T[], minDistDeg: number, maxCount: number): T[] => {
          if (!signs || signs.length <= maxCount) return signs || [];
          const kept: T[] = [];
          for (const s of signs) {
            if (!s.coord) continue;
            const tooClose = kept.some(k => 
              Math.abs(k.coord[0] - s.coord[0]) < minDistDeg && Math.abs(k.coord[1] - s.coord[1]) < minDistDeg
            );
            if (!tooClose) kept.push(s);
            if (kept.length >= maxCount) break;
          }
          return kept;
        };

        // Place highway shield markers on the route (limit: every ~5mi, max 30)
        if (hudLayout.showHighwayShields && primaryRoute.highwayShields && primaryRoute.highwayShields.length > 0) {
          placeHighwayShields(thinSigns(primaryRoute.highwayShields, 0.07, 30));
        }
        // Place exit signs (limit: every ~3mi, max 25)
        if (hudLayout.showExitSigns && primaryRoute.exitSigns && primaryRoute.exitSigns.length > 0) {
          placeExitSigns(thinSigns(primaryRoute.exitSigns, 0.04, 25));
        }
        // Place sharp curve warnings (limit: every ~2mi, max 20)
        if (hudLayout.showCurveWarnings && primaryRoute.curveSigns && primaryRoute.curveSigns.length > 0) {
          placeCurveSigns(thinSigns(primaryRoute.curveSigns, 0.03, 20));
        }
        // Place speed limit change signs (limit: every ~5mi, max 20)
        if (hudLayout.showSpeedLimitSigns && primaryRoute.speedLimitSigns && primaryRoute.speedLimitSigns.length > 0) {
          placeSpeedLimitSigns(thinSigns(primaryRoute.speedLimitSigns, 0.07, 20));
        }
        // Place traffic slowdown markers (max 15)
        if (hudLayout.showTrafficIncidents && primaryRoute.trafficSlowdowns && primaryRoute.trafficSlowdowns.length > 0) {
          const slimSlowdowns = (primaryRoute.trafficSlowdowns || []).slice(0, 15);
          placeTrafficSlowdowns(slimSlowdowns);
        }
        // Place CMV warning signs — these are critical, keep more (max 20)
        if (hudLayout.showCmvWarnings && primaryRoute.cmvWarnings && primaryRoute.cmvWarnings.length > 0) {
          placeCmvWarnings(thinSigns(primaryRoute.cmvWarnings, 0.02, 20));
        }
        
        // Place truck restriction warning signs — critical safety, keep more (max 20)
        if (hudLayout.showTruckRestrictions && primaryRoute.restrictions && primaryRoute.restrictions.length > 0) {
          const thinRestrictions = primaryRoute.restrictions.filter((r: any) => r.coords).slice(0, 20);
          placeTruckWarnings(thinRestrictions);
        }

        // Road name labels removed — user reported they cause confusion and screen clutter

        // Draw lane count visualization on highway segments
        if (primaryRoute.spans && primaryRoute.spans.length > 0) {
          drawLaneVisualization(mapInstanceRef.current, coords, primaryRoute.spans, 'routePane');
        }

        // Analyze route for steep grades (truck intelligence)
        gradeWarningsRef.current = analyzeRouteGrades(coords as any);
        if (gradeWarningsRef.current.length > 0) {
          console.log(`[TruckIntel] Found ${gradeWarningsRef.current.length} steep grade segments`);
        }
        
        // Fit map to route
        const bounds = boundsFromCoords(coords);
        if (bounds) mapInstanceRef.current.getViewModel().setLookAtData({ bounds }, true);

        // After a short delay, zoom into the starting position
        setTimeout(() => {
          try {
            if (isValidLatLng(userLocation) && mapInstanceRef.current) {
              mapInstanceRef.current.getViewModel().setLookAtData({ position: { lat: userLocation[0], lng: userLocation[1] }, zoom: 17 }, true); 
            }
          } catch (error) {
            console.error(`[handleNavigate] FlyTo error:`, error);
          }
        }, 2000);
      }

      // Fetch extra data in background
      const fetchRoutePOIs = async (points: [number, number][], totalDistMi: number) => {
        // Use corridor-based search for tighter, more accurate results along the route
        try {
          const corridorPois = await fetchCorridorPOIs(points, totalDistMi);
          console.log(`[Route] Corridor search returned ${corridorPois.length} POIs along ${totalDistMi.toFixed(0)}mi route`);
          
          setPois(prev => {
            const combined = [...prev, ...corridorPois];
            const next = Array.from(new Map(combined.map(item => [
              `${item.name}_${parseFloat(item.lat).toFixed(4)}_${parseFloat(item.lon).toFixed(4)}`,
              item
            ])).values());
            if (next.length > 1500) return next.slice(next.length - 1500);
            return next;
          });
        } catch (err) {
          console.error("[Route] Corridor POI fetch failed, using fallback:", err);
          // Fallback: fetch at start, middle, end
          const fallbackPoints = [
            points[0],
            points[Math.floor(points.length / 2)],
            points[points.length - 1]
          ];
          const results = await Promise.all(
            fallbackPoints.map(p => fetchTruckPOIs(p[1], p[0]).catch(() => []))
          );
          const flat = results.flat();
          setPois(prev => {
            const combined = [...prev, ...flat];
            return Array.from(new Map(combined.map(item => [item.name + item.lat + item.lon, item])).values());
          });
        }
      };
      
      fetchRoutePOIs(coords, distMi).catch(err => console.error("Fetch route POIs failed:", err));
      fetchRouteWeather(coords, distMi).catch(err => console.error("Fetch route weather failed:", err));
      fetchTrafficCams(coords, distMi);
      
      // Fetch diesel fuel prices along the route corridor
      fetchCorridorFuelPrices(coords, distMi)
        .then(stations => {
          console.log(`[Fuel] Loaded ${stations.length} fuel stations along route`);
          setFuelStations(stations);
        })
        .catch(err => console.error("Fetch fuel prices failed:", err));
      
      setSearchQuery('');
      
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
      
      lastSpokenRef.current = firstManeuverText;
      spokenDistancesRef.current.clear();
      fuelNetworkLastRef.current.clear();
      if (firstDistNum <= 2) spokenDistancesRef.current.add('2');
      if (firstDistNum <= 1) spokenDistancesRef.current.add('1');
      if (firstDistNum <= 0.2) spokenDistancesRef.current.add('0.2');

      // Reset route progress index for the new route
      lastSimIdxRef.current = -1;

      // Set initial instruction immediately so NavigationHUD shows right away
      if (steps.length > 0 && steps[0].maneuver && steps[0].maneuver.instruction) {
        const firstStep = steps[0];
        const followingStep = steps.length > 1 ? steps[1] : null;
        setNextInstruction({
          text: firstStep.maneuver.instruction.replace(/\u003c/g, '<').replace(/\u003e/g, '>'),
          distance: (firstStep.distance / 1609.34).toFixed(1),
          icon: getManeuverIcon(firstStep.maneuver.type, firstStep.maneuver.modifier),
          lanes: firstStep.lanes || [],
          maneuver: firstStep.maneuver,
          followingStep: followingStep ? {
            text: followingStep.maneuver.instruction.replace(/\u003c/g, '<').replace(/\u003e/g, '>'),
            icon: getManeuverIcon(followingStep.maneuver.type, followingStep.maneuver.modifier)
          } : null
        });
      }

      if (routes && routes.length > 1 && hudLayout.showRouteComparison) {
        setIsRoutePreview(true);
        // Don't start driving yet — user needs to pick a route
      } else {
        setIsDriving(true);
        setIsRoutePreview(false);
        if (!isDriving) {
          // Trigger follow-mode/zoom behavior
          setIsOverviewMode(false);
          setIsNorthUp(false);
          setIsFollowMode(true);
        }
      }
    } catch (error) {
        console.error(`[handleNavigate] Error:`, error);
        setError("Failed to calculate route. Please try again.");
        setIsCalculating(false);
      } finally {
      setIsCalculating(false);
    }
  };

  const handledTargetRef = useRef<string | null>(null);
  const resumeAttemptedRef = useRef<boolean>(false);

  useEffect(() => {
    if (isMapReady) {
      if (initialTarget && initialTarget !== handledTargetRef.current) {
        handledTargetRef.current = initialTarget;
        handleNavigate(initialTarget).catch(err => console.error("Initial navigation failed:", err));
      } else if (!initialTarget && destinationCoords && routePoints.length === 0 && !isCalculating && !resumeAttemptedRef.current) {
        // Resume navigation if we have a persisted destination but no active route
        resumeAttemptedRef.current = true;
        handleNavigate().catch(err => console.error("Resuming navigation failed:", err));
      }
    }
  }, [isMapReady, initialTarget, destinationCoords]);

  // Auto-reroute trigger (from traffic incident countdown)
  useEffect(() => {
    if (!triggerReroute) return;
    setTriggerReroute(false);
    handleNavigate().catch(err => console.error('Auto-reroute failed:', err));
  }, [triggerReroute]);

  useEffect(() => {
    if (isMapReady && userLocation) {
      const shouldFetchPois = (lat: number, lon: number) => {
        if (!lastPoiFetchRef.current) return true;
        const { time, lat: lastLat, lon: lastLon } = lastPoiFetchRef.current;
        const now = Date.now();
        if (now - time > 5 * 60 * 1000) return true; // 5 minutes
        
        const distance = calcDistMi(lat, lon, lastLat, lastLon);
        return distance >= 5; // 5 miles
      };

      if (!userLocation || !shouldFetchPois(userLocation[0], userLocation[1]) || isFetchingPoisRef.current) return;

      console.log("Fetching initial POIs for location:", userLocation);
      isFetchingPoisRef.current = true;
      lastPoiFetchRef.current = { time: Date.now(), lat: userLocation[0], lon: userLocation[1] };
      
      fetchTruckPOIs(userLocation[0], userLocation[1])
        .then((poiData) => {
          console.log(`✅ Fetched ${poiData.length} real truck stops from HERE Maps API`);
          console.log('Sample POI data:', poiData[0]); // Log first POI to verify data structure
          
          const combinedRaw = [...poiData];
          
          // Group POIs by location (within 10 meters) and merge amenities
          const locationGroups = new Map<string, any>();
          
          combinedRaw.forEach(poi => {
            // Round coordinates to ~10m precision (0.0001 degrees ≈ 11m)
            const locationKey = `${Math.round(poi.lat * 10000)}-${Math.round(poi.lon * 10000)}`;
            
            if (locationGroups.has(locationKey)) {
              // Merge with existing POI at this location
              const existing = locationGroups.get(locationKey);
              
              // Prefer name from major truck stop chains
              if (poi.type === 'major_chains' && existing.type !== 'major_chains') {
                existing.name = poi.name;
                existing.type = poi.type;
              }
              
              // Merge amenities (remove duplicates)
              if (poi.amenities && Array.isArray(poi.amenities)) {
                const currentAmenities = existing.amenities || [];
                existing.amenities = [...new Set([...currentAmenities, ...poi.amenities])];
              }
              
              // Keep the more precise coordinates
              if (!existing.address && poi.address) {
                existing.address = poi.address;
              }
              
              // Use shorter distance if available
              if (poi.distance && (!existing.distance || poi.distance < existing.distance)) {
                existing.distance = poi.distance;
              }
            } else {
              // New location
              locationGroups.set(locationKey, {
                ...poi,
                amenities: poi.amenities || []
              });
            }
          });
          
          const combined = Array.from(locationGroups.values());

          console.log(`📍 ${combined.length} unique locations (merged from ${combinedRaw.length} POIs)`);
          console.log(`🏪 Example merged POI:`, combined[0]);
          
          setPois(prev => {
            // Use location-based deduplication
            const locationMap = new Map<string, any>();
            
            // Add existing POIs to map
            prev.forEach(p => {
              const key = `${Math.round(p.lat * 10000)}-${Math.round(p.lon * 10000)}`;
              locationMap.set(key, p);
            });
            
            // Add or merge new POIs
            let addedCount = 0;
            combined.forEach(p => {
              const key = `${Math.round(p.lat * 10000)}-${Math.round(p.lon * 10000)}`;
              if (!locationMap.has(key)) {
                locationMap.set(key, p);
                addedCount++;
              } else {
                // Merge amenities if POI already exists
                const existing = locationMap.get(key);
                if (p.amenities && Array.isArray(p.amenities)) {
                  const currentAmenities = existing.amenities || [];
                  existing.amenities = [...new Set([...currentAmenities, ...p.amenities])];
                }
              }
            });
            
            if (addedCount === 0) return prev;
            
            const updated = Array.from(locationMap.values());
            console.log(`✅ Added ${addedCount} new locations (total: ${updated.length})`);
            
            // Keep only last 1000 POIs
            if (updated.length > 1000) {
              return updated.slice(updated.length - 1000);
            }
            return updated;
          });
        })
        .catch(err => {
          console.error("Failed to fetch POIs:", err instanceof Error ? err.message : String(err));
        })
        .finally(() => {
          isFetchingPoisRef.current = false;
        });
    }
  }, [isMapReady, userLocation ? userLocation[0] : null, userLocation ? userLocation[1] : null]);

  useEffect(() => {
    if (!isMapReady) return;

    restrictionAlertMarkersRef.current.forEach(m => { try { mapInstanceRef.current?.removeObject(m); } catch(_){} });
    restrictionAlertMarkersRef.current = [];

    restrictionAlerts.forEach((alert) => {
      if (!alert.coords) return;

      const iconHtml = renderToStaticMarkup(
        <div className="counter-rotate flex flex-col items-center group">
          <div className={`px-2 py-1 rounded-lg border shadow-xl mb-1 whitespace-nowrap transition-all group-hover:scale-110 ${
            alert.type === 'BRIDGE' ? 'bg-red-600 border-red-400 text-white' : 'bg-orange-500 border-orange-300 text-white'
          }`}>
            <div className="flex items-center gap-1.5">
              {alert.type === 'BRIDGE' ? <Truck className="w-3 h-3" /> : <Scale className="w-3 h-3" />}
              <span className="text-[8px] font-black uppercase tracking-tighter">{alert.message}</span>
            </div>
          </div>
          <div className={`w-6 h-6 rounded-full shadow-lg flex items-center justify-center border-2 border-black transition-all group-hover:scale-110 ${
            alert.type === 'BRIDGE' ? 'bg-red-600' : 'bg-orange-500'
          }`}>
            {alert.type === 'BRIDGE' ? <AlertTriangle className="w-3 h-3 text-white" /> : <Scale className="w-3 h-3 text-white" />}
          </div>
        </div>
      );
      
      const marker = createDomMarker(alert.coords[0], alert.coords[1], iconHtml, [24, 48], [12, 24], 500);
      if (mapInstanceRef.current) mapInstanceRef.current.addObject(marker);
      restrictionAlertMarkersRef.current.push(marker);
    });
  }, [restrictionAlerts, isMapReady]);

  useEffect(() => {
    if (!isMapReady) return;

    trafficAlertMarkersRef.current.forEach(m => { try { mapInstanceRef.current?.removeObject(m); } catch(_){} });
    trafficAlertMarkersRef.current = [];

    trafficAlerts.forEach((alert) => {
      if (!alert.coords) return;

      const iconHtml = renderToStaticMarkup(
        <div className="counter-rotate flex flex-col items-center group">
          <div className={`px-2 py-1 rounded-lg border shadow-xl mb-1 whitespace-nowrap transition-all group-hover:scale-110 ${
            alert.type === 'STOP_SIGN' ? 'bg-red-700 border-red-500 text-white' : 'bg-[#D4AF37] border-[#D4AF37] text-white'
          }`}>
            <div className="flex items-center gap-1.5">
              {alert.type === 'STOP_SIGN' ? <Octagon className="w-3 h-3" /> : <TrafficCone className="w-3 h-3" />}
              <span className="text-[8px] font-black uppercase tracking-tighter">{alert.message}</span>
            </div>
          </div>
          <div className={`w-6 h-6 rounded-full shadow-lg flex items-center justify-center border-2 border-black transition-all group-hover:scale-110 ${
            alert.type === 'STOP_SIGN' ? 'bg-red-700' : 'bg-[#D4AF37]'
          }`}>
            {alert.type === 'STOP_SIGN' ? <Octagon className="w-3 h-3 text-white" /> : <TrafficCone className="w-3 h-3 text-white" />}
          </div>
        </div>
      );
      
      const marker = createDomMarker(alert.coords[0], alert.coords[1], iconHtml, [24, 48], [12, 24], 520);
      if (mapInstanceRef.current) mapInstanceRef.current.addObject(marker);
      trafficAlertMarkersRef.current.push(marker);
    });
  }, [trafficAlerts, isMapReady]);

  useEffect(() => {
    if (!isMapReady) return;

    weatherAlertMarkersRef.current.forEach(m => { try { mapInstanceRef.current?.removeObject(m); } catch(_){} });
    weatherAlertMarkersRef.current = [];

    weatherAlerts.forEach((alert) => {
      const cacheKey = `${alert.type}-${alert.severity}`;
      if (!weatherIconsCacheRef.current[cacheKey]) {
        weatherIconsCacheRef.current[cacheKey] = renderToStaticMarkup(
          <div className="counter-rotate flex flex-col items-center group">
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
        );
      }
      
      const marker = createDomMarker(alert.lat, alert.lon, weatherIconsCacheRef.current[cacheKey], [24, 24], [12, 24], 480);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.addObject(marker);
      }
      
      // Popup not used in HERE Maps — marker is informational only
      weatherAlertMarkersRef.current.push(marker);
    });
  }, [weatherAlerts, isMapReady]);



  useEffect(() => {
    if (isOverviewMode && mapInstanceRef.current) {
      const bounds = routeCoordsRef.current.length > 0 ? boundsFromCoords(routeCoordsRef.current) : null;
      if (bounds) {
        mapInstanceRef.current.getViewModel().setLookAtData({ bounds }, true);
      }
    }
  }, [isOverviewMode]);

  // Periodic ETA update even when stationary
  useEffect(() => {
    if (!isDriving) return;
    
    const etaInterval = setInterval(() => {
      if (userLocationRef.current) {
        updateNavigationState(userLocationRef.current).catch(err => console.error("Navigation periodic update failed:", err));
      }
    }, 5000); // Every 5 seconds for turn-by-turn updates
    
    return () => clearInterval(etaInterval);
  }, [isDriving, updateNavigationState]);

  // Smooth marker interpolation loop — dampened to prevent jitter
  useEffect(() => {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    let lastSetTime = 0;
    const MIN_FRAME_MS = 50; // Cap updates to ~20fps for smooth visuals without jitter
    const DEAD_ZONE = 0.000005; // ~0.5m — ignore micro-movements

    const animate = () => {
      const now = performance.now();
      if (markerTargetRef.current && markerCurrentRef.current && userMarkerRef.current && now - lastSetTime >= MIN_FRAME_MS) {
        const [cLat, cLon] = markerCurrentRef.current;
        const [tLat, tLon] = markerTargetRef.current;
        const dLat = Math.abs(tLat - cLat);
        const dLon = Math.abs(tLon - cLon);

        // Dead-zone: skip if change is too tiny (prevents micro-jitter)
        if (dLat < DEAD_ZONE && dLon < DEAD_ZONE) {
          // Already at target, no update needed
        } else if (dLat < 0.01 && dLon < 0.01) {
          // Gentle smoothing (t=0.06 = ~6% per frame for very smooth glide)
          const t = 0.06;
          const nLat = lerp(cLat, tLat, t);
          const nLon = lerp(cLon, tLon, t);
          markerCurrentRef.current = [nLat, nLon];
          userMarkerRef.current.setGeometry({lat: nLat, lng: nLon});
          lastSetTime = now;
        } else {
          // Large jump (new route, teleport) — snap immediately
          markerCurrentRef.current = [...markerTargetRef.current];
          userMarkerRef.current.setGeometry({lat: markerTargetRef.current[0], lng: markerTargetRef.current[1]});
          lastSetTime = now;
        }
      }
      markerAnimFrameRef.current = requestAnimationFrame(animate);
    };
    markerAnimFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(markerAnimFrameRef.current);
  }, []);

  // Update target position (NOT marker directly) on GPS changes
  // When driving with an active route, SNAP the marker to the nearest route point
  useEffect(() => {
    if (isValidLatLng(userLocation)) {
      let targetPos: [number, number] = [userLocation[0], userLocation[1]];
      
      // Route-snap: project user GPS onto the route polyline for visual sync
      if (isDriving && routePoints.length > 2) {
        const searchStart = Math.max(0, lastSimIdxRef.current - 5);
        const searchEnd = Math.min(routePoints.length, lastSimIdxRef.current + 200);
        let minDist = Infinity;
        let bestIdx = lastSimIdxRef.current >= 0 ? lastSimIdxRef.current : 0;
        
        for (let i = searchStart; i < searchEnd; i++) {
          const dx = routePoints[i][0] - userLocation[0];
          const dy = routePoints[i][1] - userLocation[1];
          const d = dx * dx + dy * dy;
          if (d < minDist) { minDist = d; bestIdx = i; }
        }

        // Also check sub-segment projection between bestIdx and bestIdx+1
        // for smoother placement between route vertices
        if (bestIdx < routePoints.length - 1) {
          const A = routePoints[bestIdx];
          const B = routePoints[bestIdx + 1];
          const abLat = B[0] - A[0], abLon = B[1] - A[1];
          const apLat = userLocation[0] - A[0], apLon = userLocation[1] - A[1];
          const ab2 = abLat * abLat + abLon * abLon;
          if (ab2 > 0) {
            const t = Math.max(0, Math.min(1, (apLat * abLat + apLon * abLon) / ab2));
            const projLat = A[0] + t * abLat;
            const projLon = A[1] + t * abLon;
            const projDist = Math.pow(projLat - userLocation[0], 2) + Math.pow(projLon - userLocation[1], 2);
            if (projDist < minDist) {
              targetPos = [projLat, projLon];
              minDist = projDist;
            } else {
              targetPos = routePoints[bestIdx];
            }
          } else {
            targetPos = routePoints[bestIdx];
          }
        } else {
          targetPos = routePoints[bestIdx];
        }

        // Only snap if within ~100m of route (approx 0.001 deg ≈ 110m)
        const snapThreshold = 0.001 * 0.001; // ~100m
        if (minDist > snapThreshold) {
          // Too far from route — show raw GPS (might be off-route/rerouting)
          targetPos = [userLocation[0], userLocation[1]];
        }
      }
      
      markerTargetRef.current = targetPos;
      if (!markerCurrentRef.current) {
        markerCurrentRef.current = [targetPos[0], targetPos[1]];
      }
    }
    if (isDriving && userLocation) {
      updateNavigationState(userLocation).catch(err => console.error("Navigation update failed:", err));
    }
  }, [isDriving, userLocation ? userLocation[0] : null, userLocation ? userLocation[1] : null, updateNavigationState, routePoints]);

  // Fetch traffic infrastructure (signs, lights, signage) when location changes
  // Fetch traffic infrastructure ONLY when actively navigating and user moves significantly
  useEffect(() => {
    if (!showTrafficSigns || !isValidLatLng(userLocation) || milesRemaining <= 0) return;

    const fetchTraffic = async () => {
      try {
        const infrastructure = await fetchTrafficInfrastructure(userLocation[0], userLocation[1], 2000);
        setTrafficInfrastructure(infrastructure);
      } catch (error) {
        console.error('Error fetching traffic infrastructure:', error);
      }
    };

    // Fetch traffic infrastructure every 30 seconds
    fetchTraffic();
    const interval = setInterval(fetchTraffic, 30000);
    
    return () => clearInterval(interval);
  }, [userLocation ? userLocation[0] : null, userLocation ? userLocation[1] : null, showTrafficSigns, milesRemaining > 0 ? 1 : 0]);

  // Monitor distance to traffic infrastructure and play audio alerts
  useEffect(() => {
    if (!isDriving || !isValidLatLng(userLocation) || trafficInfrastructure.length === 0) return;

    const checkTrafficAlerts = () => {
      for (const item of trafficInfrastructure) {
        const distanceMiles = calcDistMi(
          userLocation[0], userLocation[1],
          item.position[0], item.position[1]
        );
        const distanceMeters = distanceMiles * 1609.34; // Convert miles to meters

        // Alert if within range and not already alerted
        if (distanceMeters < 300 && !alertedTrafficItems.current.has(item.id)) {
          playTrafficAlert(item, distanceMeters);
          alertedTrafficItems.current.add(item.id);
          
          // Remove from alerted set after 30 seconds
          setTimeout(() => {
            alertedTrafficItems.current.delete(item.id);
          }, 30000);
        }
      }
    };

    checkTrafficAlerts();
    const interval = setInterval(checkTrafficAlerts, 2000);
    
    return () => clearInterval(interval);
  }, [isDriving, userLocation, trafficInfrastructure]);

  useEffect(() => {
    if (!telemetryContext || !userMarkerElRef.current || !isValidLatLng(userLocationRef.current)) return;

    let lastRotationTick = 0;
    const updateRotationAndPan = () => {
      // Throttle rotation updates to 1.5s tick rate
      const now = Date.now();
      if (now - lastRotationTick < 1500) return;
      lastRotationTick = now;

      const currentLoc = userLocationRef.current;
      if (!currentLoc) return;

      // Compass mode handles its own rotation exclusively — skip vehicle rotation and map rotation here
      // Only do follow-pan so the map stays centered on the user
      if (isCompassMode) {
        if (isFollowMode && mapInstanceRef.current) {
          const now = Date.now();
          if (now - lastPanRef.current > 500) {
            lastPanRef.current = now;
            try {
              const compassH = compassHeadingRef.current;
              const offsetPixels = window.innerHeight * 0.2;
              const point = mapInstanceRef.current.geoToScreen({ lat: currentLoc[0], lng: currentLoc[1] });
              if (!point) throw new Error('geoToScreen returned null');
              const compassRad = compassH * Math.PI / 180;
              const offsetX = offsetPixels * Math.sin(compassRad);
              const offsetY = -offsetPixels * Math.cos(compassRad);
              const unprojected = mapInstanceRef.current.screenToGeo(point.x + offsetX, point.y + offsetY);
              if (unprojected) {
                mapInstanceRef.current.getViewModel().setLookAtData({ position: { lat: unprojected.lat, lng: unprojected.lng } }, true);
              }
            } catch (e) { /* ignore */ }
          }
        }
        return; // EXIT: compass mode exclusively controls icon + map rotation
      }

      let rawHeading = telemetryContext.headingRef.current || 0;
      const speed = telemetryContext.speedRef.current || 0;

      // Calculate heading from position changes as fallback
      if (prevLocationRef.current && currentLoc) {
        const [pLat, pLon] = prevLocationRef.current;
        const [cLat, cLon] = currentLoc;
        const dLat = cLat - pLat;
        const dLon = (cLon - pLon) * Math.cos(pLat * Math.PI / 180);
        const dist = Math.sqrt(dLat * dLat + dLon * dLon);
        if (dist > 0.00003) { // ~3m movement threshold (raised from 1m to reduce noise)
          const posHeading = (Math.atan2(dLon, dLat) * 180 / Math.PI + 360) % 360;
          positionHeadingRef.current = posHeading;
        }
      }
      prevLocationRef.current = currentLoc ? [currentLoc[0], currentLoc[1]] : null;

      // PRIORITY: Route heading > GPS heading > Position heading
      // Route heading is the most stable and reliable when actively navigating
      if (isDriving && routeCoordsRef.current.length > 1) {
        const currentIdx = lastSimIdxRef.current;
        if (currentIdx >= 0 && currentIdx < routeCoordsRef.current.length - 1) {
          const p1 = routeCoordsRef.current[currentIdx];
          const p2 = routeCoordsRef.current[Math.min(currentIdx + 3, routeCoordsRef.current.length - 1)];
          const dy = p2[0] - p1[0];
          const dx = Math.cos(Math.PI / 180 * p1[0]) * (p2[1] - p1[1]);
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          rawHeading = (90 - angle + 360) % 360;
        } else if (routeCoordsRef.current.length > 1) {
          const p1 = routeCoordsRef.current[0];
          const p2 = routeCoordsRef.current[1];
          const dy = p2[0] - p1[0];
          const dx = Math.cos(Math.PI / 180 * p1[0]) * (p2[1] - p1[1]);
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          rawHeading = (90 - angle + 360) % 360;
        }
      } else if (!rawHeading || rawHeading === 0) {
        // Not driving on route — fall back to position-based heading
        if (positionHeadingRef.current > 0 && speed > 1) {
          rawHeading = positionHeadingRef.current;
        }
      }

      // Smooth the heading — professional-grade: lock to route direction when navigating,
      // heavy damping to prevent erratic spinning (CMV-grade stability)
      //
      // CRITICAL: When truly stationary (speed < 1 mph), FREEZE the heading completely.
      // GPS heading data at rest is pure noise and causes the icon to spin randomly.
      if (speed < 1 && !isDriving) {
        // Completely stationary and not on an active route — freeze icon orientation
        // Do nothing: keep smoothedHeadingRef at its current value
      } else if (speed > 0.5 || (isDriving && routeCoordsRef.current.length > 1)) {
        const diff = rawHeading - smoothedHeadingRef.current;
        // Handle wraparound (e.g., 350 -> 10 should be +20, not -340)
        const normalizedDiff = ((diff + 540) % 360) - 180;
        
        // Fixed 10° dead zone — suppress micro-jitter at all speeds
        const deadZone = 10;
        
        if (Math.abs(normalizedDiff) < deadZone) {
          // Skip update — heading change too small
        } else {
          // Lower factor = smoother, more stable rotation
          // Route-driving: 0.12 (very stable, locks to route heading)
          // Free-driving at speed: 0.06 (heavy damping for GPS noise suppression)
          const factor = (isDriving && routeCoordsRef.current.length > 1) ? 0.12 : 0.06;
          smoothedHeadingRef.current = (smoothedHeadingRef.current + normalizedDiff * factor + 360) % 360;
        }
      }

      const currentHeading = smoothedHeadingRef.current;

      if (userMarkerElRef.current) {
        userMarkerElRef.current.style.setProperty('--vehicle-rotation', `${currentHeading}deg`);
      }

      // Update map rotation based on mode — apply to container div, not mapPane
      const el = mapRef.current;
      if (el) {
        if (!isNorthUp) {
          // Heading-up mode: rotate map purely opposite to heading (no manual rotation offset)
          const totalRotation = -currentHeading;
          el.style.setProperty('--map-rotation', `${totalRotation}deg`);
        } else if (!isCompassMode) {
          // North-up mode: apply only manual rotation
          const rotation = manualRotationRef.current;
          el.style.setProperty('--map-rotation', `${rotation}deg`);
        }
      }

      if (isFollowMode && mapInstanceRef.current) { 
        const now = Date.now();
        if (now - lastPanRef.current > 1200) { // Throttle panning to avoid competing animations
          lastPanRef.current = now;
          try {
            // In Heading Up mode, we offset the center slightly to see more ahead
            let center: [number, number] = [currentLoc[0], currentLoc[1]];
            
            if (!isNorthUp) {
              const offsetPixels = window.innerHeight * 0.2; // Offset by 20% of screen height
              const point = mapInstanceRef.current.geoToScreen({ lat: center[0], lng: center[1] });
              
              if (point) {
                const headingRad = currentHeading * Math.PI / 180;
                const unprojected = mapInstanceRef.current.screenToGeo(
                  point.x + offsetPixels * Math.sin(headingRad),
                  point.y - offsetPixels * Math.cos(headingRad)
                );
                if (unprojected) center = [unprojected.lat, unprojected.lng];
              }
            }
            
            mapInstanceRef.current.getViewModel().setLookAtData({ position: { lat: center[0], lng: center[1] } }, true); 
          } catch (e) {
            console.error("PanTo error:", e instanceof Error ? e.message : String(e));
          }
        }
      }
    };

    // Initial update
    updateRotationAndPan();

    // Subscribe to telemetry changes
    return telemetryContext.subscribe(updateRotationAndPan);
  }, [telemetryContext, isDriving, isFollowMode, isNorthUp, isCompassMode]);


  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;

    if (!showPois) {
      // Clear the cluster provider
      if (clusterProviderRef.current) {
        clusterProviderRef.current.setDataPoints([]);
      }
      poiMarkersRef.current = [];
      lastPoiRenderCenterRef.current = null;
      return;
    }

    // Throttling: only re-render if map moved > 2 miles or if it's the first render
    if (lastPoiRenderCenterRef.current) {
      const distMoved = calcDistMi(mapCenter[0], mapCenter[1], lastPoiRenderCenterRef.current[0], lastPoiRenderCenterRef.current[1]);
      if (distMoved < 2.0) return;
    }
    lastPoiRenderCenterRef.current = mapCenter;

    console.log(`Rendering POIs for center: ${mapCenter[0]}, ${mapCenter[1]}`);
    poiMarkersRef.current = [];

    // Pre-filter POIs to only those within 100 miles of map center, then cap at 200 nearest
    const nearbyPois = pois.filter(poi => {
      if (typeof poi.lat !== 'number' || typeof poi.lon !== 'number' || isNaN(poi.lat) || isNaN(poi.lon)) return false;
      const category = getPoiCategory(poi.type, poi.name);
      if (category === 'excluded') return false;
      if (!poiFilters.has(category)) return false;
      
      const distance = calcDistMi(mapCenter[0], mapCenter[1], poi.lat, poi.lon);
      return distance <= 100;
    })
    .map(poi => ({ ...poi, _dist: calcDistMi(mapCenter[0], mapCenter[1], poi.lat, poi.lon) }))
    .sort((a, b) => a._dist - b._dist)
    .slice(0, 200);

    // Build clustering data points with custom icon HTML
    const clusterPoints: { lat: number; lon: number; iconHtml?: string; name?: string; type?: string }[] = [];

    nearbyPois.forEach(poi => {
      try {
        const iconHtml = getCachedPoiIcon(poi.type, poi.name);
        clusterPoints.push({
          lat: poi.lat,
          lon: poi.lon,
          iconHtml: iconHtml || undefined,
          name: poi.name,
          type: poi.type,
        });
      } catch (err) {
        console.error("Failed to prepare POI for cluster:", err instanceof Error ? err.message : String(err));
      }
    });

    // Feed data points into the clustering provider
    if (clusterProviderRef.current) {
      const dataPoints = buildClusterDataPoints(clusterPoints);
      clusterProviderRef.current.setDataPoints(dataPoints);
      console.log(`Clustered ${clusterPoints.length} POIs via clustering provider`);
    }

    console.log("Show POIs:", showPois);
    console.log("POI Filters:", Array.from(poiFilters).join(', '));
    console.log("Cluster Provider:", clusterProviderRef.current ? "exists" : "null");

      // Add event delegation for the "Add as Stop" button in popups
      const handlePopupClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('add-poi-stop-btn')) {
          const poiId = target.getAttribute('data-poi-id');
          const type = target.getAttribute('data-type') as 'DEADHEAD' | 'PAID';
          const poi = pois.find(p => `${p.name}-${p.lat}-${p.lon}` === poiId);
          if (poi) {
            // Check for explicit position attribute
            const posAttr = target.getAttribute('data-position');
            const useSelect = target.getAttribute('data-use-select');
            let position: number | undefined;
            if (posAttr !== null) {
              position = parseInt(posAttr, 10);
            } else if (useSelect) {
              // Find the sibling select element
              const selectEl = target.parentElement?.querySelector('.stop-position-select') as HTMLSelectElement;
              if (selectEl) {
                position = parseInt(selectEl.value, 10);
              }
            }
            addWaypoint(poi, type, position);
            // Close any open info bubbles
            try { hereUiRef.current?.getBubbles()?.forEach((b: any) => hereUiRef.current?.removeBubble(b)); } catch(_) {}
          }
        } else if (target.classList.contains('view-poi-details-btn')) {
          const poiId = target.getAttribute('data-poi-id');
          const poi = pois.find(p => `${p.name}-${p.lat}-${p.lon}` === poiId);
          if (poi) {
            setSelectedPoi(poi);
            try { hereUiRef.current?.getBubbles()?.forEach((b: any) => hereUiRef.current?.removeBubble(b)); } catch(_) {}
          }
        }
      };

      document.addEventListener('click', handlePopupClick);
      
      return () => document.removeEventListener('click', handlePopupClick);
  }, [pois, showPois, poiFilters, mapCenter, isMapReady]);

  // Render traffic infrastructure markers — only on-route, only next 15 ahead, smaller icons
  useEffect(() => {
    const trafficMarkersRef: any[] = [];

    if (!mapInstanceRef.current || !showTrafficSigns || trafficInfrastructure.length === 0 || milesRemaining <= 0) {
      return;
    }

    // Helper: distance in metres between two [lat,lon] points
    const distM = (a: [number, number], b: [number, number]) => {
      const R = 6371000;
      const dLat = (b[0] - a[0]) * Math.PI / 180;
      const dLon = (b[1] - a[1]) * Math.PI / 180;
      const s = Math.sin(dLat / 2) ** 2 +
        Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    };

    // Step 1: Find the user's current position in the route
    const routePts = routePoints as [number, number][];
    const userPos = userLocation as [number, number];
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < routePts.length; i++) {
      const d = distM(userPos, routePts[i]);
      if (d < closestDist) { closestDist = d; closestIdx = i; }
    }

    // Step 2: Collect route points within next ~10 miles (≈16km) ahead
    const LOOK_AHEAD_M = 16000;
    let accumulated = 0;
    let lookAheadEnd = closestIdx;
    for (let i = closestIdx; i < routePts.length - 1; i++) {
      accumulated += distM(routePts[i], routePts[i + 1]);
      lookAheadEnd = i + 1;
      if (accumulated >= LOOK_AHEAD_M) break;
    }
    const aheadPts = routePts.slice(closestIdx, lookAheadEnd + 1);

    // Step 3: Keep only signs within 80m of any ahead route point
    const ON_ROUTE_M = 80;
    const onRoute = trafficInfrastructure.filter((item: TrafficInfrastructure) => {
      const pos: [number, number] = [item.position[0], item.position[1]];
      return aheadPts.some(rp => distM(pos, rp) <= ON_ROUTE_M);
    });

    // Step 4: Sort by distance from user, cap at 15 markers
    const sorted = onRoute
      .map(item => ({ item, d: distM(userPos, [item.position[0], item.position[1]]) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 15)
      .map(x => x.item);

    sorted.forEach((item: TrafficInfrastructure) => {
      try {
        const iconHtml = renderToStaticMarkup(
          <TrafficIcon
            type={item.type}
            signType={item.type === 'traffic_sign' ? item.signType : undefined}
            value={item.type === 'traffic_sign' ? item.value : undefined}
            size={18}
          />
        );

        const marker = createDomMarker(item.position[0], item.position[1], `<div class="traffic-infrastructure-icon">${iconHtml}</div>`, [18, 18], [9, 9], 500);
        mapInstanceRef.current!.addObject(marker);
        trafficMarkersRef.push(marker);
      } catch (error) {
        console.error('Error rendering traffic marker:', error);
      }
    });

    return () => {
      trafficMarkersRef.forEach(marker => { try { mapInstanceRef.current?.removeObject(marker); } catch(_){} });
    };
  }, [trafficInfrastructure, showTrafficSigns, isMapReady, milesRemaining, userLocation, routePoints]);

  useEffect(() => {
    if (!isDriving || pois.length === 0 || routePoints.length === 0 || !userLocation) {
      if (upcomingPois.length > 0) setUpcomingPois([]);
      return;
    }

    if (lastPoiUpdateLocationRef.current) {
      const distMoved = calcDistMi(userLocation[0], userLocation[1], lastPoiUpdateLocationRef.current[0], lastPoiUpdateLocationRef.current[1]);
      if (distMoved < 0.5) return;
    }

    lastPoiUpdateLocationRef.current = userLocation;

    // Find user's closest point on route - use lastSimIdxRef for optimization
    let userRouteIdx = lastSimIdxRef.current;
    if (userRouteIdx === -1) {
      let userMinDist = Infinity;
      for (let i = 0; i < routePoints.length; i++) {
        const d = Math.pow(routePoints[i][0] - userLocation[0], 2) + Math.pow(routePoints[i][1] - userLocation[1], 2);
        if (d < userMinDist) {
          userMinDist = d;
          userRouteIdx = i;
        }
      }
    }

    const upcoming = pois
      .filter(poi => {
        if (typeof poi.lat !== 'number' || typeof poi.lon !== 'number' || isNaN(poi.lat) || isNaN(poi.lon)) return false;
        
        const category = getPoiCategory(poi.type, poi.name);
        return poiFilters.has(category);
      })
      .map(poi => {
        // Find POI's closest point on the ENTIRE route (from user position to destination)
        let poiMinDist = Infinity;
        let poiRouteIdx = 0;
        
        // Search the FULL route from user's position to end — show ALL POIs to destination
        const searchStart = Math.max(0, userRouteIdx - 10);
        const searchEnd = routePoints.length;
        
        // Optimization: step by 3 for long routes, then refine
        const step = (searchEnd - searchStart > 3000) ? 3 : 1;
        for (let i = searchStart; i < searchEnd; i += step) {
          const d = Math.pow(routePoints[i][0] - poi.lat, 2) + Math.pow(routePoints[i][1] - poi.lon, 2);
          if (d < poiMinDist) {
            poiMinDist = d;
            poiRouteIdx = i;
          }
        }
        // Refine around best match if we used coarse step
        if (step > 1) {
          const refineStart = Math.max(searchStart, poiRouteIdx - 5);
          const refineEnd = Math.min(searchEnd, poiRouteIdx + 5);
          for (let i = refineStart; i < refineEnd; i++) {
            const d = Math.pow(routePoints[i][0] - poi.lat, 2) + Math.pow(routePoints[i][1] - poi.lon, 2);
            if (d < poiMinDist) {
              poiMinDist = d;
              poiRouteIdx = i;
            }
          }
        }
        
        // Corridor distance (distance from route line in miles)
        const corridorDist = Math.sqrt(poiMinDist) * 69;
        const distance = calcDistMi(userLocation[0], userLocation[1], poi.lat, poi.lon);

        return {
          ...poi,
          routeIdx: poiRouteIdx,
          distance,
          corridorDist
        };
      })
      // Show ALL POIs ahead of user, within 10mi of route line, along the ENTIRE route
      .filter(poi => poi.routeIdx >= userRouteIdx - 5 && poi.corridorDist < 10)
      .sort((a, b) => a.routeIdx - b.routeIdx); // Sort by position along route (start to end)

    // Match fuel prices to upcoming POIs
    const withPrices = upcoming.map(poi => {
      const matched = fuelStations.find(s => matchFuelStationToPoi(s, poi.lat, poi.lon));
      return { ...poi, dieselPrice: matched?.dieselPrice || null };
    });

    // Merge highway exits from route data into the POI list
    const exits = (routeSignsRef.current.exitSigns || [])
      .filter((exit: any) => exit.coord)
      .map((exit: any) => {
        // Find this exit's closest route point
        let exitRouteIdx = 0;
        let minD = Infinity;
        for (let i = 0; i < routePoints.length; i += 3) {
          const d = Math.pow(routePoints[i][0] - exit.coord[0], 2) + Math.pow(routePoints[i][1] - exit.coord[1], 2);
          if (d < minD) { minD = d; exitRouteIdx = i; }
        }
        const dist = userLocation ? calcDistMi(userLocation[0], userLocation[1], exit.coord[0], exit.coord[1]) : 0;
        return {
          name: exit.exitNumber ? `Exit ${exit.exitNumber}` : 'Exit',
          type: 'exit',
          lat: exit.coord[0],
          lon: exit.coord[1],
          routeIdx: exitRouteIdx,
          distance: dist,
          corridorDist: 0,
          dieselPrice: null,
          isExit: true,
          exitNumber: exit.exitNumber || '',
          exitName: exit.name || '',
        };
      })
      .filter((exit: any) => exit.routeIdx >= (userRouteIdx - 5));

    // Combine POIs + exits, sorted by position along route
    // Attach nearest exit info to each non-exit POI
    const enrichedPois = withPrices.map(poi => {
      if (poi.isExit) return poi;
      let nearestExit: any = null;
      let nearestDist = Infinity;
      for (const ex of exits) {
        const d = Math.abs(ex.routeIdx - poi.routeIdx);
        if (d < nearestDist) { nearestDist = d; nearestExit = ex; }
      }
      return { ...poi, nearestExit: nearestExit ? { name: nearestExit.exitName || nearestExit.name, number: nearestExit.exitNumber } : null };
    });

    const combined = [...enrichedPois, ...exits].sort((a, b) => a.routeIdx - b.routeIdx);
    setUpcomingPois(combined);
  }, [isDriving, pois.length, routePoints.length, userLocation ? userLocation[0] : null, userLocation ? userLocation[1] : null, Array.from(poiFilters).join(','), fuelStations.length]);;

  // Batch-fetch ratings for upcoming POIs
  useEffect(() => {
    if (upcomingPois.length === 0) return;
    const poiIds = upcomingPois.map(p => `${p.lat.toFixed(4)}_${p.lon.toFixed(4)}`);
    const uncachedIds = poiIds.filter(id => !poiRatingsCache[id]);
    if (uncachedIds.length === 0) return;
    
    fetch('/api/facility-ratings-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poiIds: uncachedIds }),
    })
      .then(r => r.json())
      .then(data => {
        setPoiRatingsCache(prev => ({ ...prev, ...data }));
      })
      .catch(() => {});
  }, [upcomingPois.length]);


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
        const startPosition = userMarkerRef.current.getGeometry(); 
        if (startPosition && !isNaN(startPosition.lat) && !isNaN(startPosition.lng)) {
          try {
            mapInstanceRef.current.getViewModel().setLookAtData({ position: { lat: startPosition.lat, lng: startPosition.lng }, zoom: 17 }, true);
          } catch (e) {
            console.error("FlyTo error in toggleDriving:", e instanceof Error ? e.message : String(e));
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
      {mapInitError && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-red-950/95 p-4">
          <div className="bg-red-900 border-2 border-red-500 rounded-3xl p-8 shadow-2xl max-w-md w-full text-center">
            <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">Map Error</h3>
            <p className="text-red-100 text-sm mb-6 whitespace-pre-wrap break-words">{mapInitError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-white text-red-900 font-bold py-3 rounded-xl hover:bg-red-50 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      )}
      <style>{`
        .glow-overlay {
          filter: drop-shadow(0 0 5px rgba(212, 175, 55, 0.8));
        }
      `}</style>
      {/* Main Map Container */}
      <div className="absolute inset-0 z-0 h-full w-full bg-zinc-950">
        {is3DMode ? (
          /* 3D Mapbox Navigation */
          <>
            <Navigation3DView
              userLocation={userLocation}
              route={routeCoordinates ? { coordinates: routeCoordinates } : undefined}
              heading={telemetryContext?.headingRef.current || 0}
              nextTurnDistance={milesRemaining > 0 ? (parseFloat(nextInstruction.distance) || undefined) : undefined}
              nextTurnDirection={milesRemaining > 0 ? nextInstruction.text : undefined}
              speedLimit={currentSpeedLimit ?? undefined}
              currentSpeed={speed}
              trafficSigns={trafficInfrastructure.slice(0, 1)}
              eta={eta}
              milesRemaining={milesRemaining}
              timeRemaining={remainingDuration}
              streetName={currentRoad || undefined}
              unitSystem={context?.unitSystem || 'imperial'}
              currentRegion={currentRegion}
              restrictionAlerts={restrictionAlerts}
              truckProfile={truckProfile}
              onMapRef={(m) => { mapboxMapRef.current = m; }}
              isFollowMode={isFollowMode}
              isOverviewMode={isOverviewMode}
            />
            {/* 3D Mode Route Controls */}
            {isDriving && (
              <div className="absolute bottom-20 right-4 z-[2020] flex flex-col gap-2 pointer-events-auto">
                <button onClick={handleCancelRoute} className="p-3 rounded-xl bg-black/80 backdrop-blur-sm border border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-400/40 transition-all" title="Cancel Route">
                  <X className="w-5 h-5" strokeWidth={3} />
                </button>
                <button onClick={handleReroute} className="p-3 rounded-xl bg-black/80 backdrop-blur-sm border border-zinc-700 text-zinc-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all" title="Reroute">
                  <RotateCcw className="w-5 h-5" strokeWidth={3} />
                </button>
              </div>
            )}
          </>
        ) : (
          /* 2D Leaflet Map */
          <div className="w-full h-full overflow-hidden relative">
            <div id="nav-map-container" ref={mapRef} className={`absolute transition-opacity duration-500`}
              style={{ width: '150%', height: '150%', top: '-25%', left: '-25%' }}>
              {/* The contents of this div are dynamically generated by Leaflet at runtime */}
            </div>
          </div>
        )}
      </div>
      {mapInitError && (
        <div className="absolute inset-0 z-40 w-full h-full">
          <img
            src={`https://api.maptiler.com/maps/${MAPTILER_STYLE_ID}/static/${userLocation[1]},${userLocation[0]},12/800x600.webp?key=${MAPTILER_KEY}`}
            alt="Map Fallback"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] p-1 rounded">
            <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener noreferrer">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">&copy; OpenStreetMap contributors</a>
          </div>
        </div>
      )}
      {!isMapReady && !mapInitError && <div className="absolute inset-0 z-50 flex items-center justify-center bg-black text-white">Loading Map...</div>}

      {/* Route Comparison Overlay */}
      {hudLayout.showRouteComparison && isRoutePreview && alternativeRoutes.length > 1 && (
        <div style={{
          ...(hudPositions.routeComparison && (hudPositions.routeComparison.x !== DEFAULT_POSITIONS.routeComparison.x || hudPositions.routeComparison.y !== DEFAULT_POSITIONS.routeComparison.y)
            ? { position: 'absolute' as const, left: `${hudPositions.routeComparison.x}%`, top: `${hudPositions.routeComparison.y}%`, transform: 'translate(-50%, -50%)', zIndex: 1200, width: '95vw', maxWidth: '720px' }
            : {}
          ),
        }}>
          <RouteComparisonPanel
            routes={alternativeRoutes}
            selectedIndex={selectedRouteIndex}
            onSelectRoute={(idx) => {
              const route = alternativeRoutes[idx];
              setSelectedRouteIndex(idx);
              setRoutePoints(route.coords);
              setRouteSteps(route.steps);
              setMilesRemaining(route.distMi);
              setInitialMiles(route.distMi);
              setEta(new Date(Date.now() + route.durationSec * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
              setRemainingDuration(route.durationSec);
              
              if (mapInstanceRef.current) {
                clearRouteMarkers();
                currentSegmentLineRef.current = null;
                updateMapLine(mapInstanceRef.current, 'route', route.coords, '#D4AF37', 8);
                routeLineRef.current = { id: 'route', color: '#D4AF37' };
                // Redraw alt routes with new selection
                drawAlternativeRoutes(mapInstanceRef.current, alternativeRoutes, idx);
                // Update lane visualization for selected route
                if (route.spans) {
                  drawLaneVisualization(mapInstanceRef.current, route.coords, route.spans, 'routePane');
                }
              }
            }}
            fuelPricePerGallon={fuelPricePerGallon}
            truckMpg={truckMpg}
            onClose={() => {
              setIsRoutePreview(false);
              setIsDriving(true);
              setIsOverviewMode(false);
              setIsNorthUp(false);
              setIsFollowMode(true);
              speak("Starting navigation.");
            }}
          />
        </div>
      )}

      {/* Route Steps Modal */}
      <RouteStepsModal
        showSteps={showSteps}
        onClose={() => setShowSteps(false)}
        routeSteps={routeSteps}
        maneuverIndex={currentManeuverIndex}
        getManeuverIcon={getManeuverIcon}
        parseLane={parseLane}
      />



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
                <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse" />
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

      {/* ── Facility Detail Panel ── */}
      {selectedFacility && (
        <div className="absolute inset-0 z-[4001] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[85vh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl border border-zinc-800 overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 flex flex-col">
            <FacilityPanel
              facility={selectedFacility}
              userLocation={userLocation}
              onClose={() => setSelectedFacility(null)}
              onReportSubmitted={(id, majority, totalReports) => {
                setFacilities(prev => prev.map(f => f.id === id ? { ...f, majority, crowd_data: { ...f.crowd_data, total_reports: totalReports } } : f));
              }}
            />
          </div>
        </div>
      )}

      {/* ── Add Facility Modal ── */}
      {showAddFacility && (
        <div className="absolute inset-0 z-[4002] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-zinc-800 bg-black overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
            <AddFacilityForm
              userLocation={userLocation}
              onAdd={newFacility => setFacilities(prev => [...prev, newFacility])}
              onClose={() => setShowAddFacility(false)}
            />
          </div>
        </div>
      )}

      {/* ── POI Detail Modal ── */}
      <PoiDetailModal
        selectedPoi={selectedPoi}
        onClose={() => setSelectedPoi(null)}
        fuelStations={fuelStations}
        matchFuelStationToPoi={matchFuelStationToPoi}
        findCheapestDiesel={findCheapestDiesel}
        poiParkingStatus={poiParkingStatus}
        isParkingLoading={isParkingLoading}
        parkingSubmitDone={parkingSubmitDone}
        submitParkingStatus={submitParkingStatus}
        addWaypoint={addWaypoint}
        handleNavigate={handleNavigate}
        waypointCount={waypoints.length}
      />

      <WarningBanners
        error={error}
        setError={setError}
        isOffRoute={isOffRoute}
        hasViolation={hasViolation}
        isCalculating={isCalculating}
        handleReroute={handleReroute}
        autoReroute={context?.autoReroute}
        milesRemaining={milesRemaining}
      />

      {/* Speed Limit Overlay — positioned outside z-0 map container for proper stacking */}
      {hudLayout.showSpeedOverlay && !is3DMode && (
        <div style={{
          ...(hudPositions.speedOverlay && (hudPositions.speedOverlay.x !== DEFAULT_POSITIONS.speedOverlay.x || hudPositions.speedOverlay.y !== DEFAULT_POSITIONS.speedOverlay.y)
            ? { position: 'absolute' as const, left: `${hudPositions.speedOverlay.x}%`, top: `${hudPositions.speedOverlay.y}%`, transform: `translate(-50%, -50%) scale(${autoScale('speedOverlay')})`, zIndex: 2010 }
            : { transform: `scale(${autoScale('speedOverlay')})`, transformOrigin: 'top left' }
          ),
        }}>
          <SpeedLimitMarker currentSpeedLimit={currentSpeedLimit} speed={speed} unitSystem={context?.unitSystem} />
        </div>
      )}

      {/* Modern Navigation HUD */}
      {hudLayout.showNavigationHUD && !isExploreMode && milesRemaining > 0 && !is3DMode && (
        <NavigationHUD 
          nextInstruction={nextInstruction} 
          parseLane={parseLane} 
          distanceToManeuverMi={currentDistToManeuverMi}
          maneuverType={currentManeuverType}
          maneuverModifier={currentManeuverModifier}
          speedLimit={currentSpeedLimit ?? undefined}
        />
      )}

      {/* Maneuver Preview — Shows zoomed preview of complex interchanges */}
      {hudLayout.showManeuverPreview && !isExploreMode && isDriving && maneuverPreviewData && !is3DMode && (
        <div className="absolute z-[2000] w-72 pointer-events-auto" style={{
          ...(hudPositions.maneuverPreview && (hudPositions.maneuverPreview.x !== DEFAULT_POSITIONS.maneuverPreview.x || hudPositions.maneuverPreview.y !== DEFAULT_POSITIONS.maneuverPreview.y)
            ? { left: `${hudPositions.maneuverPreview.x}%`, top: `${hudPositions.maneuverPreview.y}%`, transform: `translate(-50%, -50%) scale(${autoScale('maneuverPreview')})` }
            : { top: '9rem', left: '1rem', transform: `scale(${autoScale('maneuverPreview')})`, transformOrigin: 'top left' }
          ),
        }}>
          <ManeuverPreview {...maneuverPreviewData} />
        </div>
      )}

      {/* Truck Intelligence: Steep Grade Alert */}
      {activeGradeAlert && isDriving && (
        <div data-testid="grade-alert" className="absolute top-[calc(1rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[2100] pointer-events-none animate-in slide-in-from-top-3 fade-in duration-300">
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-600/95 backdrop-blur-md rounded-xl shadow-[0_4px_20px_rgba(217,119,6,0.5)] pointer-events-auto border border-amber-500/40">
            <div className="w-6 h-6 rounded-full bg-black/30 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <span className="text-sm font-bold text-white">{activeGradeAlert}</span>
          </div>
        </div>
      )}

      {/* Trip Progress HUD removed in favor of nav-arrival-hud */}


      {/* Map Controls consolidated in nav-map-controls below */}

      {/* Network Offline Banner — Critical for professional truck use */}
      {context && !context.isOnline && (
        <div data-testid="network-offline-banner" className="absolute top-[calc(0.5rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[2100] pointer-events-none animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600/95 backdrop-blur-md rounded-lg shadow-[0_4px_20px_rgba(220,38,38,0.4)] pointer-events-auto">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[10px] font-black text-white uppercase tracking-wider">No Network — Using Cached Data</span>
          </div>
        </div>
      )}

      {/* GPS Signal Quality Indicator */}
      {isDriving && !isExploreMode && telemetryContext?.gpsAccuracyRef?.current != null && telemetryContext.gpsAccuracyRef.current > 50 && (
        <div data-testid="gps-weak-signal" className="absolute top-[calc(0.5rem+env(safe-area-inset-top))] right-2 z-[2100] animate-in fade-in duration-300">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-600/90 backdrop-blur-md rounded-lg shadow-lg">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z" stroke="white" strokeWidth="2"/>
              <circle cx="12" cy="9" r="2" fill="white"/>
            </svg>
            <span className="text-[9px] font-black text-white uppercase tracking-wider">
              Weak GPS {telemetryContext.gpsAccuracyRef.current > 100 ? '— Low Accuracy' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Weather & Restriction Overlay — swipeable */}
      {!selectedPoi && !isExploreMode && !weatherDismissed && (hudLayout.showWeatherOverlay || hudLayout.showTruckRestrictions) && (
        <div id="nav-weather-overlay" className={`absolute z-[2000] flex flex-col gap-1 md:gap-2 transition-all duration-700 scale-90 md:scale-100`} style={{
          ...(hudPositions.weatherPanel && (hudPositions.weatherPanel.x !== DEFAULT_POSITIONS.weatherPanel.x || hudPositions.weatherPanel.y !== DEFAULT_POSITIONS.weatherPanel.y)
            ? { left: `${hudPositions.weatherPanel.x}%`, top: `${hudPositions.weatherPanel.y}%`, transform: `translate(-50%, -50%) scale(${autoScale('weatherPanel')})` }
            : { left: '0.5rem', top: milesRemaining > 0 ? '55%' : '50%', transform: `translateY(-50%) scale(${autoScale('weatherPanel')})`, transformOrigin: 'left center' }
          ),
        }}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            (e.currentTarget as any)._swipeStartX = touch.clientX;
            (e.currentTarget as any)._swipeStartY = touch.clientY;
          }}
          onTouchMove={(e) => {
            const startX = (e.currentTarget as any)._swipeStartX;
            if (startX === undefined) return;
            const dx = e.touches[0].clientX - startX;
            // Visual feedback: slide left as user drags
            if (dx < -10) {
              e.currentTarget.style.transform = `translateX(${dx}px) translateY(-50%)`;
              e.currentTarget.style.opacity = `${Math.max(0, 1 + dx / 150)}`;
            }
          }}
          onTouchEnd={(e) => {
            const startX = (e.currentTarget as any)._swipeStartX;
            if (startX === undefined) return;
            const endX = e.changedTouches[0].clientX;
            const dx = endX - startX;
            if (dx < -60) {
              // Swipe left detected — dismiss with animation
              e.currentTarget.style.transform = 'translateX(-200px) translateY(-50%)';
              e.currentTarget.style.opacity = '0';
              setTimeout(() => setWeatherDismissed(true), 300);
            } else {
              // Snap back
              e.currentTarget.style.transform = '';
              e.currentTarget.style.opacity = '';
            }
            delete (e.currentTarget as any)._swipeStartX;
          }}
        >
          {hudLayout.showTruckRestrictions && restrictionAlerts.length > 0 && (
            restrictionsCollapsed ? (
              <button
                data-testid="restrictions-expand-btn"
                onClick={() => setRestrictionsCollapsed(false)}
                className="flex items-center gap-1.5 bg-black/90 backdrop-blur-2xl border border-orange-500/30 rounded-xl p-2 shadow-2xl hover:bg-orange-500/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-[8px] font-black text-orange-500 uppercase">{restrictionAlerts.length}</span>
              </button>
            ) : (
            <div data-testid="truck-restrictions-panel" className="bg-black/90 backdrop-blur-2xl border border-orange-500/30 rounded-xl md:rounded-2xl p-2 md:p-3 shadow-2xl w-36 md:w-64">
              <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 border-b border-orange-500/20 pb-1.5">
                <div className="p-1 md:p-1.5 bg-orange-500 rounded-lg">
                  <Truck className="w-3 h-3 md:w-4 md:h-4 text-white" />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-[8px] md:text-[10px] font-black text-orange-500 uppercase tracking-wider">Truck Restrictions ({restrictionAlerts.length})</span>
                  <span className="text-[6px] md:text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Safety Critical Alerts</span>
                </div>
                <button data-testid="restrictions-collapse-btn" onClick={() => setRestrictionsCollapsed(true)} className="p-1 rounded-lg hover:bg-orange-500/10 text-zinc-500 hover:text-orange-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-1.5 max-h-32 md:max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {restrictionAlerts.map((alert, idx) => {
                  const Icon = alert.type === 'BRIDGE' ? Truck : alert.type === 'TUNNEL' ? AlertTriangle : alert.type === 'HAZMAT' ? AlertTriangle : Scale;
                  const colorMap: Record<string, { bg: string; text: string; border: string; label: string }> = {
                    BRIDGE: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20', label: 'Low Bridge' },
                    WEIGHT: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20', label: 'Weight Limit' },
                    TUNNEL: { bg: 'bg-[#D4AF37]/10', text: 'text-[#D4AF37]', border: 'border-[#D4AF37]/20', label: 'Tunnel Restriction' },
                    HAZMAT: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20', label: 'Hazmat Prohibited' },
                    RESTRICTION: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20', label: 'Restriction' },
                  };
                  const c = colorMap[alert.type] || colorMap.RESTRICTION;
                  return (
                    <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer hover:brightness-125 ${c.bg} ${c.border}`}
                      onClick={() => setAlertDetailModal({
                        type: 'restriction',
                        title: c.label,
                        items: [
                          { label: 'Type', value: alert.type, color: c.text },
                          { label: 'Details', value: alert.message },
                          ...(alert.progress !== undefined ? [{ label: 'Route Progress', value: `${(alert.progress * 100).toFixed(0)}%` }] : []),
                          ...(alert.coord ? [{ label: 'Location', value: `${alert.coord[0].toFixed(4)}, ${alert.coord[1].toFixed(4)}` }] : []),
                        ]
                      })}
                    >
                      <div className={`p-1 rounded-md ${c.bg} ${c.text}`}>
                        <Icon className="w-3 h-3 md:w-4 md:h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col">
                          <span className="text-[8px] md:text-[10px] font-black text-white uppercase truncate">{c.label}</span>
                          <span className="text-[7px] md:text-[9px] font-bold text-[#D4AF37] uppercase tracking-tighter">{alert.message}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )
          )}

          {trafficAlerts.length > 0 && (
            trafficAlertsCollapsed ? (
              <button
                data-testid="traffic-alerts-expand-btn"
                onClick={() => setTrafficAlertsCollapsed(false)}
                className="flex items-center gap-1.5 bg-black/90 backdrop-blur-2xl border border-[#D4AF37]/30 rounded-xl p-2 shadow-2xl hover:bg-[#D4AF37]/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="text-[8px] font-black text-[#D4AF37] uppercase">{trafficAlerts.length}</span>
              </button>
            ) : (
            <div data-testid="traffic-alerts-panel" className="bg-black/90 backdrop-blur-2xl border border-[#D4AF37]/30 rounded-xl md:rounded-2xl p-2 md:p-3 shadow-2xl w-36 md:w-64">
              <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 border-b border-[#D4AF37]/20 pb-1.5">
                <div className="p-1 md:p-1.5 bg-[#D4AF37] rounded-lg">
                  <TrafficCone className="w-3 h-3 md:w-4 md:h-4 text-white" />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-[8px] md:text-[10px] font-black text-[#D4AF37] uppercase tracking-wider">Traffic Alerts ({trafficAlerts.length})</span>
                  <span className="text-[6px] md:text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Road Features</span>
                </div>
                <button data-testid="traffic-alerts-collapse-btn" onClick={() => setTrafficAlertsCollapsed(true)} className="p-1 rounded-lg hover:bg-[#D4AF37]/10 text-zinc-500 hover:text-[#D4AF37] transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-1.5 max-h-32 md:max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {trafficAlerts.map((alert, idx) => {
                  const Icon = alert.type === 'STOP_SIGN' ? Octagon : TrafficCone;
                  return (
                    <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer hover:brightness-125 ${
                      alert.type === 'STOP_SIGN' ? 'bg-red-500/10 border-red-500/20' : 'bg-[#D4AF37]/10 border-[#D4AF37]/20'
                    }`}
                      onClick={() => setAlertDetailModal({
                        type: 'traffic',
                        title: alert.type === 'STOP_SIGN' ? 'Stop Sign' : 'Traffic Light',
                        items: [
                          { label: 'Type', value: alert.type === 'STOP_SIGN' ? 'Stop Sign' : 'Traffic Signal' },
                          { label: 'Status', value: 'Upcoming on route' },
                          ...(alert.coord ? [{ label: 'Location', value: `${alert.coord[0].toFixed(4)}, ${alert.coord[1].toFixed(4)}` }] : []),
                        ]
                      })}
                    >
                      <div className={`p-1 rounded-md ${alert.type === 'STOP_SIGN' ? 'bg-red-500/20 text-red-500' : 'bg-[#D4AF37]/20 text-[#D4AF37]'}`}>
                        <Icon className="w-3 h-3 md:w-4 md:h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col">
                          <span className="text-[8px] md:text-[10px] font-black text-white uppercase truncate">{alert.type === 'STOP_SIGN' ? 'Stop Sign' : 'Traffic Light'}</span>
                          <span className="text-[7px] md:text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Upcoming</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )
          )}

          {weatherAlerts.length > 0 && (
            weatherAlertsCollapsed ? (
              <button
                data-testid="weather-alerts-expand-btn"
                onClick={() => setWeatherAlertsCollapsed(false)}
                className="flex items-center gap-1.5 bg-black/90 backdrop-blur-2xl border border-red-500/30 rounded-xl p-2 shadow-2xl hover:bg-red-500/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-red-500" />
                <span className="text-[8px] font-black text-red-500 uppercase">{weatherAlerts.length}</span>
              </button>
            ) : (
            <div data-testid="weather-alerts-panel" className="bg-black/90 backdrop-blur-2xl border border-red-500/30 rounded-xl md:rounded-2xl p-2 md:p-3 shadow-2xl w-36 md:w-64 animate-pulse">
              <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 border-b border-red-500/20 pb-1.5">
                <div className="p-1 md:p-1.5 bg-red-500 rounded-lg">
                  <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-[8px] md:text-[10px] font-black text-red-500 uppercase tracking-wider">Route Hazards ({weatherAlerts.length})</span>
                  <span className="text-[6px] md:text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Weather Impact Report</span>
                </div>
                <button data-testid="weather-alerts-collapse-btn" onClick={() => setWeatherAlertsCollapsed(true)} className="p-1 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-1.5 max-h-32 md:max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {weatherAlerts.map((alert, idx) => {
                  const Icon = alert.icon || AlertTriangle;
                  return (
                    <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer hover:brightness-125 ${
                      alert.severity === 'SEVERE' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'
                    }`}
                      onClick={() => setAlertDetailModal({
                        type: 'weather',
                        title: alert.type || 'Weather Hazard',
                        items: [
                          { label: 'Severity', value: alert.severity || 'Unknown', color: alert.severity === 'SEVERE' ? 'text-red-500' : 'text-amber-500' },
                          { label: 'Condition', value: alert.value || alert.type || 'N/A' },
                          ...(alert.time ? [{ label: 'Timeframe', value: alert.time }] : []),
                        ]
                      })}
                    >
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
            )
          )}

          {hudLayout.showWeatherOverlay && (
          <>
          <div className="bg-black/90 backdrop-blur-2xl border border-[#D4AF37]/20 rounded-xl md:rounded-2xl p-2 md:p-4 shadow-2xl w-36 md:w-56 transition-all">
            {weather && (
              <>
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
              </>
            )}
            
            {routeWeatherForecast.length > 0 ? (
              <div className="pt-2 border-t border-white/10 flex justify-between">
                {routeWeatherForecast.slice(0, 3).map((point, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <span className="text-[7px] md:text-[8px] font-black text-[#D4AF37] uppercase">{point.time}</span>
                    <point.icon className="w-3 h-3 md:w-4 md:h-4 text-white/70" />
                    <span className="text-[9px] md:text-[11px] font-bold text-white">{point.temp}°</span>
                  </div>
                ))}
              </div>
            ) : weather && weather.forecast && weather.forecast.length > 0 && (
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
                ? 'bg-[#1a1500]/90 border-[#D4AF37]/30' 
                : 'bg-red-900/90 border-red-500/30 animate-pulse'
            }`}>
              <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                <div className={`p-1 md:p-1.5 rounded-lg ${
                  weighStationAlert.status === 'BYPASS' ? 'bg-[#D4AF37]' : 'bg-red-500'
                }`}>
                  <Scale className="w-3 h-3 md:w-4 md:h-4 text-white" />
                </div>
                <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-wider ${
                  weighStationAlert.status === 'BYPASS' ? 'text-[#D4AF37]' : 'text-red-400'
                }`}>
                  Weigh Station
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] md:text-xs font-bold text-white uppercase">Status</span>
                  <span className={`text-[10px] md:text-xs font-black px-1.5 py-0.5 rounded-md ${
                    weighStationAlert.status === 'BYPASS' 
                      ? 'bg-[#D4AF37]/20 text-[#D4AF37]' 
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

          {/* Route POIs extracted to independent section below */}
        </>
        )}
        </div>
      )}

      {/* Weather dismissed — show restore button */}
      {weatherDismissed && !selectedPoi && !isExploreMode && (hudLayout.showWeatherOverlay || hudLayout.showTruckRestrictions) && (
        <button
          data-testid="weather-restore-btn"
          onClick={() => setWeatherDismissed(false)}
          className="absolute z-[2000] left-2 top-[45%] bg-black/80 backdrop-blur-xl border border-[#D4AF37]/30 rounded-xl p-2 shadow-2xl hover:bg-[#D4AF37]/10 transition-colors"
          title="Show weather & alerts"
        >
          <Cloud className="w-4 h-4 text-[#D4AF37]" />
        </button>
      )}

      {/* ─── Route POIs — Independent Panel (not tied to weather swipe) ─── */}
      {!selectedPoi && !isExploreMode && hudLayout.showAlongRoute && upcomingPois.length > 0 && (
        <div data-testid="route-poi-panel" className="absolute z-[1900] transition-all duration-300"
          style={{
            left: '0.5rem',
            bottom: '1rem',
            transform: `scale(${autoScale('weatherPanel')})`,
            transformOrigin: 'left bottom',
          }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="bg-black/90 backdrop-blur-2xl border border-white/10 rounded-xl md:rounded-2xl p-2 md:p-3 shadow-2xl w-36 md:w-56">
            <div className="flex items-center justify-between mb-1.5 md:mb-2 cursor-pointer" onClick={() => setPoiPanelOpen(!poiPanelOpen)}>
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="p-1 md:p-1.5 bg-[#D4AF37]/20 rounded-lg">
                  <MapIcon className="w-3 h-3 md:w-4 md:h-4 text-[#D4AF37]" />
                </div>
                <span className="text-[8px] md:text-[10px] font-black text-[#D4AF37] uppercase tracking-wider">POI ({upcomingPois.filter(p => p.isExit || getPoiCategory(p.type, p.name) !== 'excluded').length})</span>
              </div>
              <ChevronDown className={`w-3 h-3 text-[#D4AF37] transition-transform ${poiPanelOpen ? '' : '-rotate-90'}`} />
            </div>
            {poiPanelOpen && (
              <>
              {/* Cheapest Fuel Banner */}
              {(() => {
                const cheapest = findCheapestDiesel(fuelStations);
                if (!cheapest) return null;
                return (
                  <div data-testid="cheapest-fuel-banner" className="flex items-center gap-1.5 p-1.5 md:p-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-lg mb-1.5 cursor-pointer hover:bg-[#D4AF37]/15 transition-colors"
                    onClick={() => {
                      const matchedPoi = pois.find(p => matchFuelStationToPoi(cheapest, p.lat, p.lon));
                      if (matchedPoi) setSelectedPoi(matchedPoi);
                    }}>
                    <Fuel className="w-3 h-3 text-[#D4AF37] shrink-0" />
                    <span className="text-[7px] md:text-[8px] font-black text-[#D4AF37] truncate">Best: ${cheapest.dieselPrice?.toFixed(2)}</span>
                    <span className="text-[6px] md:text-[7px] text-zinc-500 truncate ml-auto">{cheapest.name}</span>
                  </div>
                );
              })()}
              <div className="flex flex-col gap-1 md:gap-1.5 max-h-[35vh] overflow-y-auto custom-scrollbar pr-0.5" data-testid="route-poi-list"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                {upcomingPois.filter(poi => {
                  if (poi.isExit) return true;
                  const cat = getPoiCategory(poi.type, poi.name);
                  if (cat === 'excluded') return false;
                  if (minRatingFilter <= 0) return true;
                  const rid = `${poi.lat.toFixed(4)}_${poi.lon.toFixed(4)}`;
                  const r = poiRatingsCache[rid];
                  return r && r.averageRating >= minRatingFilter;
                }).map((poi, idx) => {
                  if (poi.isExit) {
                    return (
                      <div key={`exit-${idx}`} data-testid={`route-exit-item-${idx}`} 
                        className="flex items-center justify-between p-1.5 md:p-2 bg-[#1a5c1a]/30 border border-[#2a8c2a]/40 rounded-lg cursor-pointer hover:bg-[#1a5c1a]/50 transition-colors active:bg-[#2a8c2a]/30"
                        onClick={() => {
                          if (mapInstanceRef.current) {
                            mapInstanceRef.current.getViewModel().setLookAtData({ position: { lat: poi.lat, lng: poi.lon }, zoom: 15 }, true);
                          }
                        }}>
                        <div className="flex items-center gap-1.5 md:gap-2 overflow-hidden">
                          <div className="shrink-0 flex items-center justify-center">
                            <svg viewBox="0 0 28 20" width="24" height="17" xmlns="http://www.w3.org/2000/svg">
                              <path d="M2,2 L14,0 L26,2 L26,18 L14,20 L2,18 Z" fill="#003DA5" stroke="#fff" strokeWidth="1"/>
                              <text x="14" y="13" textAnchor="middle" fill="white" fontSize="8" fontWeight="900" fontFamily="Arial">{poi.exitNumber || 'EXIT'}</text>
                            </svg>
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-[8px] md:text-[10px] font-black text-white truncate">{poi.name}</span>
                            <span className="text-[6px] md:text-[8px] text-green-300/70 truncate">{poi.exitName}</span>
                          </div>
                        </div>
                        <span className="text-[8px] md:text-[10px] font-black text-green-300 whitespace-nowrap shrink-0 ml-1">
                          {poi.distance.toFixed(0)}<span className="text-[6px] md:text-[7px]">mi</span>
                        </span>
                      </div>
                    );
                  }
                  const poiIconElement = getPoiIcon(poi.type, poi.name);
                  return (
                    <div key={idx} data-testid={`route-poi-item-${idx}`} className="flex items-center justify-between p-1 md:p-1.5 bg-white/5 rounded-lg border border-white/5 cursor-pointer hover:bg-white/10 transition-colors active:bg-[#D4AF37]/10" onClick={() => {
                      setSelectedPoi(poi);
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.getViewModel().setLookAtData({ position: { lat: poi.lat, lng: poi.lon }, zoom: 15 }, true);
                      }
                    }}>
                      <div className="flex items-center gap-1.5 md:gap-2 overflow-hidden">
                        <span className="shrink-0 flex items-center justify-center w-4 h-4 md:w-5 md:h-5">{poiIconElement}</span>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-[8px] md:text-[10px] font-bold text-white truncate w-full">{poi.name}</span>
                          <div className="flex items-center gap-1.5">
                            {poi.nearestExit && (
                              <span className="text-[6px] md:text-[7px] font-black text-green-400/80 truncate">
                                Exit {poi.nearestExit.number || poi.nearestExit.name}
                              </span>
                            )}
                            {poi.dieselPrice && (
                              <span className="text-[7px] md:text-[9px] font-black text-[#D4AF37] tabular-nums">
                                ${poi.dieselPrice.toFixed(2)}
                              </span>
                            )}
                            {(() => {
                              const rid = `${poi.lat.toFixed(4)}_${poi.lon.toFixed(4)}`;
                              const r = poiRatingsCache[rid];
                              if (!r || r.averageRating === 0) return null;
                              return (
                                <span className="flex items-center gap-0.5" data-testid={`poi-rating-${idx}`}>
                                  <Star className="w-2 h-2 text-[#D4AF37]" fill="currentColor" />
                                  <span className="text-[7px] font-black text-[#D4AF37] tabular-nums">{r.averageRating.toFixed(1)}</span>
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      <span className="text-[7px] md:text-[9px] font-black text-[#D4AF37] whitespace-nowrap shrink-0 ml-1">
                        {poi.distance.toFixed(1)} mi
                      </span>
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Route Warning Signs — Right Side Stacked Badges (MUTCD Gold/Black) ─── */}
      {isDriving && !isExploreMode && !is3DMode && milesRemaining > 0 && (
        (() => {
          // Compute upcoming warnings sorted by distance to user
          const warnings: { type: string; label: string; distance: number; icon: string; coord: [number, number] }[] = [];
          const userLoc = userLocation || [0, 0];
          
          // Height restrictions (Low bridges)
          (routeSignsRef.current.restrictions || []).forEach((r: any) => {
            if (!r.coords) return;
            const dist = calcDistMi(userLoc[0], userLoc[1], r.coords[0], r.coords[1]);
            if (dist > 0.2 && dist < 50) {
              if (r.type === 'BRIDGE') {
                const heightFt = r.value ? (r.value / 30.48).toFixed(0) : '';
                const heightIn = r.value ? Math.round(((r.value / 30.48) % 1) * 12) : 0;
                warnings.push({ type: 'height', label: heightFt ? `${Math.floor(r.value / 30.48)}'-${heightIn}"` : 'Low', distance: dist, icon: 'height', coord: r.coords });
              } else if (r.type === 'WEIGHT') {
                const tons = r.value ? Math.round(r.value * 2.20462 / 2000) : 0;
                warnings.push({ type: 'weight', label: tons ? `${tons}` : '??', distance: dist, icon: 'weight', coord: r.coords });
              }
            }
          });
          
          // Curve warnings
          (routeSignsRef.current.curveSigns || []).forEach((c: any) => {
            if (!c.coord) return;
            const dist = calcDistMi(userLoc[0], userLoc[1], c.coord[0], c.coord[1]);
            if (dist > 0.2 && dist < 50) {
              warnings.push({ type: 'curve', label: c.direction, distance: dist, icon: c.direction === 'left' ? 'curveLeft' : 'curveRight', coord: c.coord });
            }
          });
          
          // Sort by distance, take closest 5
          const sorted = warnings.sort((a, b) => a.distance - b.distance).slice(0, 5);
          if (sorted.length === 0) return null;

          return (
            <div data-testid="warning-signs-panel" className="absolute z-[2050] right-2 md:right-14 flex flex-col gap-1.5 md:gap-2 transition-all duration-500"
              style={{ top: milesRemaining > 0 ? '30%' : '35%', transform: `scale(${autoScale('weatherPanel')})`, transformOrigin: 'top right' }}>
              {sorted.map((w, i) => (
                <div key={`warn-${i}`} data-testid={`warning-sign-${i}`} 
                  className="flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => {
                    if (mapInstanceRef.current && w.coord) {
                      mapInstanceRef.current.getViewModel().setLookAtData({ position: { lat: w.coord[0], lng: w.coord[1] }, zoom: 16 }, true);
                    }
                  }}>
                  {/* Warning sign icon */}
                  {w.type === 'height' && (
                    <div className="flex flex-col items-center">
                      <svg viewBox="0 0 44 44" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="2" width="40" height="40" rx="3" fill="#D4AF37" stroke="#1a1a1a" strokeWidth="2.5" transform="rotate(45 22 22)"/>
                        <text x="22" y="20" textAnchor="middle" fill="#1a1a1a" fontSize="10" fontWeight="900" fontFamily="Arial">{w.label.split("'")[0]}'</text>
                        <text x="22" y="31" textAnchor="middle" fill="#1a1a1a" fontSize="8" fontWeight="800" fontFamily="Arial">{w.label.includes('"') ? w.label.split("'")[1] : ''}</text>
                      </svg>
                      <span className="text-[8px] md:text-[9px] font-black text-white mt-0.5">{w.distance.toFixed(0)}<span className="text-[6px] text-zinc-400">mi</span></span>
                    </div>
                  )}
                  {w.type === 'weight' && (
                    <div className="flex flex-col items-center">
                      <div className="bg-[#1a1a1a] border-2 border-[#D4AF37] rounded-md px-2 py-1 flex flex-col items-center">
                        <span className="text-[14px] md:text-[16px] font-black text-[#D4AF37] leading-none">{w.label}</span>
                        <span className="text-[7px] md:text-[8px] font-black text-[#D4AF37]/70 uppercase leading-tight">TONS</span>
                      </div>
                      <span className="text-[8px] md:text-[9px] font-black text-white mt-0.5">{w.distance.toFixed(0)}<span className="text-[6px] text-zinc-400">mi</span></span>
                    </div>
                  )}
                  {w.type === 'curve' && (
                    <div className="flex flex-col items-center">
                      <svg viewBox="0 0 44 44" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="2" width="40" height="40" rx="3" fill="#D4AF37" stroke="#1a1a1a" strokeWidth="2.5" transform="rotate(45 22 22)"/>
                        {w.icon === 'curveLeft' ? (
                          <path d="M28,30 Q14,22 20,12 L16,15 M20,12 L23,16" fill="none" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                        ) : (
                          <path d="M16,30 Q30,22 24,12 L28,15 M24,12 L21,16" fill="none" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                        )}
                      </svg>
                      <span className="text-[8px] md:text-[9px] font-black text-white mt-0.5">{w.distance.toFixed(0)}<span className="text-[6px] text-zinc-400">mi</span></span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })()
      )}

      {/* Fuel Cost & HOS Panel — Right side, above arrival HUD */}
      {isDriving && !isExploreMode && milesRemaining > 0 && !is3DMode && (
        <div data-testid="trip-info-panel" className={`absolute z-[2000] flex flex-col gap-2 transition-all duration-700 scale-90 md:scale-100 w-40 md:w-52`} style={
          hudPositions.tripPanel && (hudPositions.tripPanel.x !== DEFAULT_POSITIONS.tripPanel.x || hudPositions.tripPanel.y !== DEFAULT_POSITIONS.tripPanel.y)
            ? { left: `${hudPositions.tripPanel.x}%`, top: `${hudPositions.tripPanel.y}%`, transform: 'translate(-50%, -50%)' }
            : { [hudLayout.tripPanelPosition === 'left' ? 'left' : 'right']: '4.5rem', bottom: '180px' }
        }>
          {hudLayout.showFuelCost && <div style={{ transform: `scale(${autoScale('fuelCost')})`, transformOrigin: hudLayout.tripPanelPosition === 'left' ? 'top left' : 'top right' }}><FuelCostCalculator
            routeDistanceMi={milesRemaining}
            initialFuelPrice={fuelPricePerGallon}
            initialMpg={truckMpg}
            onFuelPriceChange={setFuelPricePerGallon}
            onMpgChange={setTruckMpg}
          /></div>}
          {hudLayout.showHosStatus && <div style={{ transform: `scale(${autoScale('hosStatus')})`, transformOrigin: hudLayout.tripPanelPosition === 'left' ? 'top left' : 'top right' }}><DriverFatigueAlert isDriving={isDriving} /></div>}
        </div>
      )}

      {/* Auto-Reroute Countdown Banner */}
      {autoRerouteCountdown !== null && (
        <div data-testid="auto-reroute-banner" className="absolute top-[calc(4rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[2020] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-red-600/95 backdrop-blur-xl border border-red-400/40 rounded-xl px-5 py-3 shadow-[0_4px_24px_rgba(220,38,38,0.5)] flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" strokeWidth="2.5" className="animate-pulse">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div>
                <div className="text-white font-black text-xs uppercase tracking-wider">Traffic Incident Ahead</div>
                <div className="text-red-100 text-[10px]">Auto-rerouting in {autoRerouteCountdown}s</div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-white font-black text-sm tabular-nums">{autoRerouteCountdown}</span>
              </div>
              <button
                data-testid="cancel-reroute-btn"
                onClick={() => setAutoRerouteCountdown(null)}
                className="text-[10px] font-bold text-white/80 hover:text-white uppercase tracking-wider px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search HUD */}
      {isSearchFocused && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px] z-[2004] transition-all duration-500" />
      )}
      {!isExploreMode && (
        <div id="nav-search-container" data-testid="nav-search-container" className={`absolute transition-all duration-700 z-[2005] left-1/2 -translate-x-1/2 w-full max-w-[650px] px-2 md:px-6 ${milesRemaining > 0 ? 'top-[180px] md:top-[280px] opacity-0 pointer-events-none' : 'top-[calc(1rem+env(safe-area-inset-top))] landscape:top-[calc(0.5rem+env(safe-area-inset-top))] opacity-100'}`}>
          {/* Waypoints List */}
          {waypoints.length > 0 && (
            <div className="flex flex-col gap-1.5 md:gap-2 landscape:gap-1 mb-2 md:mb-4 landscape:mb-2 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between px-2 mb-0.5 md:mb-1 landscape:mb-0.5">
                <span className="text-[9px] md:text-[10px] landscape:text-[8px] font-black text-[#D4AF37] uppercase tracking-[0.3em]">Active Stops ({waypoints.length})</span>
                <button 
                  onClick={clearRoute}
                  className="text-[8px] md:text-[9px] landscape:text-[7px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
                >
                  Clear All
                </button>
              </div>
              {waypoints.map((wp, index) => (
                <div key={wp.id} className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-xl md:rounded-2xl p-3 md:p-4 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveWaypoint(index, 'up'); }}
                        disabled={index === 0}
                        className="p-1 rounded-lg bg-white/5 text-zinc-500 hover:text-[#D4AF37] disabled:opacity-30 transition-colors"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveWaypoint(index, 'down'); }}
                        disabled={index === waypoints.length - 1}
                        className="p-1 rounded-lg bg-white/5 text-zinc-500 hover:text-[#D4AF37] disabled:opacity-30 transition-colors"
                      >
                        <ArrowUp className="w-3 h-3 rotate-180" />
                      </button>
                    </div>
                    <div className={`p-2.5 md:p-3 rounded-xl ${wp.type === 'PAID' ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                      {wp.type === 'PAID' ? <CircleDollarSign className="w-4 h-4 md:w-5 md:h-5" /> : <Truck className="w-4 h-4 md:w-5 md:h-5" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-0.5">{wp.type} STOP {index + 1}</span>
                      <span className="text-xs md:text-sm font-bold text-white truncate max-w-[200px] md:max-w-[250px]">{wp.address}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeWaypoint(wp.id)} 
                    className="p-2 rounded-xl bg-white/5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button 
                data-testid="start-route-button"
                onClick={() => handleNavigate().catch(err => {
                  console.error("Navigation failed from start route button:", err instanceof Error ? err.message : String(err));
                  setError("Failed to calculate route. Please try again.");
                })}
                disabled={isCalculating || !isMapReady}
                className="w-full py-3 md:py-4 bg-[#D4AF37] hover:bg-[#C4A030] text-black rounded-xl md:rounded-2xl text-xs md:text-sm font-black uppercase tracking-widest transition-all shadow-[0_8px_30px_rgba(212,175,55,0.25)] flex items-center justify-center gap-3 mt-1.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCalculating ? <Loader2 className="w-5 h-5 animate-spin" /> : <NavIcon className="w-5 h-5" />}
                <span>Start Route</span>
              </button>
            </div>
          )}

          <div className={`w-full bg-black/95 backdrop-blur-xl ${isSuggestionsVisible && suggestions.length > 0 ? 'rounded-t-2xl md:rounded-t-3xl' : 'rounded-2xl md:rounded-3xl'} border transition-all duration-500 ${isSearchFocused ? 'border-[#D4AF37]/60 shadow-[0_20px_80px_rgba(212,175,55,0.15)]' : 'border-zinc-800 shadow-[0_20px_60px_rgba(0,0,0,0.6)]'}`}>
            <div className="flex items-center p-2 md:p-2.5 pl-4 md:pl-5">
              <Search className={`w-4 h-4 md:w-5 md:h-5 mr-3 md:mr-4 transition-colors ${isSearchFocused ? 'text-[#D4AF37]' : 'text-zinc-600'}`} />
              <input 
                id="nav-search-input"
                data-testid="nav-search-input"
                type="text" 
                placeholder={!isMapReady ? "Initializing..." : isCalculating ? "Calculating Route..." : "Search address, city, or POI..."} 
                className="flex-1 bg-transparent border-none outline-none text-white text-sm md:text-base font-medium placeholder:text-zinc-600 tracking-tight py-3 md:py-3.5" 
                value={searchQuery} 
                disabled={isCalculating || !isMapReady} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                onFocus={() => { 
                  console.log('Search bar focused');
                  setIsSearchFocused(true); 
                  setIsSuggestionsVisible(true); 
                }} 
                onBlur={() => { 
                  console.log('Search bar blurred');
                  setTimeout(() => {
                    setIsSuggestionsVisible(false); 
                    setIsSearchFocused(false); 
                  }, 100);
                }} 
                onKeyDown={(e) => e.key === 'Enter' && handleNavigate().catch(err => {
                  console.error("Navigation failed from enter key:", err instanceof Error ? err.message : String(err));
                  setError("Failed to calculate route. Please try again.");
                })}  
              />
              <button
                type="button"
                onClick={startVoiceSearch}
                disabled={isCalculating || !isMapReady}
                className={`p-2 transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-zinc-500 hover:text-[#D4AF37]'}`}
              >
                <Mic className="w-5 h-5" />
              </button>
              {isSearchFocused && (
                <button 
                  onClick={() => { setIsSearchFocused(false); setIsSuggestionsVisible(false); }}
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
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
                className="p-3 rounded-full bg-white/5 text-[#D4AF37] hover:bg-white/10 transition-all active:scale-95 mr-2 flex-shrink-0"
                title="Add current view or POI as waypoint"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button id="nav-search-button" data-testid="nav-search-button" onClick={() => {
                setIsSearchFocused(false);
                setIsSuggestionsVisible(false);
                handleNavigate().catch(err => {
                  console.error("Navigation failed from search button:", err instanceof Error ? err.message : String(err));
                  setError("Failed to calculate route. Please try again.");
                });
              }} disabled={!isMapReady} className={`flex items-center gap-2 md:gap-3 px-5 md:px-7 py-2.5 md:py-3 rounded-xl md:rounded-2xl transition-all active:scale-95 ${searchQuery.trim() && !isCalculating ? 'bg-[#D4AF37] text-black shadow-[0_4px_20px_rgba(212,175,55,0.25)]' : 'bg-zinc-900 text-zinc-700 border border-zinc-800'}`}>
                {isCalculating ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <NavIcon className="w-4 h-4 md:w-5 md:h-5" />}
                <span className="font-black uppercase tracking-widest text-xs md:text-sm">{isCalculating ? 'Routing' : 'Route'}</span>
              </button>
            </div>
          </div>
          {isSuggestionsVisible && suggestions.length > 0 && (
            <div className={`w-full bg-black/95 backdrop-blur-xl rounded-b-2xl md:rounded-b-3xl landscape:rounded-b-2xl border-x border-b border-[#D4AF37]/30 shadow-[0_20px_60px_rgba(0,0,0,0.6)] animate-in slide-in-from-top-2 duration-300 ${milesRemaining > 0 ? 'max-h-[150px] md:max-h-[200px] landscape:max-h-[100px]' : 'max-h-[250px] md:max-h-[400px] landscape:max-h-[200px]'} overflow-y-auto custom-scrollbar`}>
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
                          setIsSearchFocused(false);
                          setIsSuggestionsVisible(false);
                          // Optimization: Use coordinates from suggestion directly to avoid redundant search
                          setDestinationCoords([s.lat, s.lon]);
                          setCurrentDestination(s.display_name.split(',')[0]);
                          setSearchQuery(s.display_name);
                          handleNavigate(s.display_name, { lat: s.lat, lon: s.lon }).catch(err => {
                            console.error("Navigation failed from suggestion:", err instanceof Error ? err.message : String(err));
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
                            className="px-2 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 hover:text-white transition-all flex items-center gap-1 md:gap-2 border border-[#D4AF37]/20"
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
                            className="px-2 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 hover:text-white transition-all flex items-center gap-1 md:gap-2 border border-[#D4AF37]/20"
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

      {/* ── Compass Rose — bottom-right, above arrival HUD ── */}
      {hudLayout.showCompassRose && (
      <div
        className="absolute z-[2005] pointer-events-none"
        data-testid="compass-rose-container"
        style={{
          ...(hudPositions.compassRose && (hudPositions.compassRose.x !== DEFAULT_POSITIONS.compassRose.x || hudPositions.compassRose.y !== DEFAULT_POSITIONS.compassRose.y)
            ? { left: `${hudPositions.compassRose.x}%`, top: `${hudPositions.compassRose.y}%`, transform: `translate(-50%, -50%) scale(${autoScale('compassRose')})` }
            : { bottom: 'calc(7rem + env(safe-area-inset-bottom))', right: '4.5rem', transform: `scale(${autoScale('compassRose')})`, transformOrigin: 'bottom right' }
          ),
        }}
      >
        <CompassRose isCompassMode={isCompassMode} />
      </div>
      )}

      {hudLayout.showNextStop && isDriving && !isExploreMode && !is3DMode && waypoints.length > 0 && (
        <div
          data-testid="waypoint-action-panel"
          className="absolute z-[2012] w-full max-w-[650px] px-3 md:px-5 pointer-events-none"
          style={{
            ...(hudPositions.nextStop && (hudPositions.nextStop.x !== DEFAULT_POSITIONS.nextStop.x || hudPositions.nextStop.y !== DEFAULT_POSITIONS.nextStop.y)
              ? { left: `${hudPositions.nextStop.x}%`, top: `${hudPositions.nextStop.y}%`, transform: `translate(-50%, -50%) scale(${autoScale('nextStop')})` }
              : { bottom: 'calc(8rem + env(safe-area-inset-bottom))', left: '50%', transform: `translateX(-50%) scale(${autoScale('nextStop')})`, transformOrigin: 'bottom center' }
            ),
          }}
        >
          <div className="bg-black/95 backdrop-blur-xl border border-zinc-700/60 rounded-xl md:rounded-2xl shadow-[0_-4px_30px_rgba(0,0,0,0.7)] pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="flex items-center gap-3 p-2.5 md:p-3">
              {/* Waypoint info */}
              <div className={`p-2 rounded-lg shrink-0 ${waypoints[0].type === 'PAID' ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                {waypoints[0].type === 'PAID' ? <CircleDollarSign className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Next Stop</span>
                <span data-testid="next-waypoint-name" className="text-xs md:text-sm font-bold text-white truncate">{waypoints[0].address}</span>
              </div>
              {/* Action buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  data-testid="waypoint-arrived-btn"
                  onClick={() => {
                    speak(`Arrived at ${waypoints[0].address}.`);
                    removeWaypoint(waypoints[0].id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/25 hover:bg-[#D4AF37]/25 hover:border-[#D4AF37]/40 transition-all active:scale-95 text-[10px] md:text-xs font-black uppercase tracking-wider"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Arrived</span>
                </button>
                <button
                  data-testid="waypoint-skip-btn"
                  onClick={() => {
                    speak(`Skipping ${waypoints[0].address}.`);
                    removeWaypoint(waypoints[0].id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/25 transition-all active:scale-95 text-[10px] md:text-xs font-black uppercase tracking-wider"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Skip</span>
                </button>
              </div>
            </div>
            {/* Remaining stops indicator */}
            {waypoints.length > 1 && (
              <div className="px-3 pb-2 -mt-0.5">
                <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{waypoints.length - 1} more stop{waypoints.length > 2 ? 's' : ''} after this</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Speed Warning Banner */}
      {isSpeedWarning && hudLayout.showSpeedWarning && isDriving && (
        <div data-testid="speed-warning-banner" className="absolute z-[2015] left-1/2 -translate-x-1/2 animate-pulse pointer-events-none" style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-2 px-4 py-2 bg-red-600/95 border-2 border-red-400 rounded-full shadow-[0_0_30px_rgba(239,68,68,0.5)]">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span className="text-sm font-black text-white uppercase tracking-wider">Slow Down</span>
            <span className="text-sm font-black text-white tabular-nums">{speed} / {currentSpeedLimit} mph</span>
          </div>
        </div>
      )}

      {hudLayout.showArrivalHUD && isDriving && !isExploreMode && !is3DMode && (
        <div id="nav-arrival-hud" data-testid="nav-arrival-hud" className="absolute z-[2010] w-full max-w-[850px] px-2 md:px-4 pointer-events-none" style={{
          ...(hudPositions.arrivalHUD && (hudPositions.arrivalHUD.x !== DEFAULT_POSITIONS.arrivalHUD.x || hudPositions.arrivalHUD.y !== DEFAULT_POSITIONS.arrivalHUD.y)
            ? { left: `${hudPositions.arrivalHUD.x}%`, top: `${hudPositions.arrivalHUD.y}%`, transform: `translate(-50%, -50%) scale(${autoScale('arrivalHUD')})` }
            : { bottom: 'calc(0.5rem + env(safe-area-inset-bottom))', left: '50%', transform: `translateX(-50%) scale(${autoScale('arrivalHUD')})` }),
          transformOrigin: 'bottom center',
        }}>
          <div className="bg-black/95 backdrop-blur-xl border border-[#D4AF37]/20 rounded-2xl md:rounded-3xl landscape:rounded-2xl shadow-[0_-8px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(212,175,55,0.08)] pointer-events-auto transition-all">
            {/* Region Bar — top strip showing current state/road */}
            {(currentRegion.state || currentRoad) && (
              <div data-testid="region-indicator" className="flex items-center justify-between px-3 md:px-5 py-1 md:py-1.5 border-b border-white/5">
                <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                  <MapPinned className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#D4AF37] shrink-0" />
                  {currentRoad && (
                    <span className="text-[9px] md:text-[11px] font-black text-white uppercase tracking-wider truncate">
                      {currentRoad}
                    </span>
                  )}
                  {currentRoad && (() => {
                    const highwayMatch = currentRoad.match(/(I-|US-|SR-|Hwy|Route|State Route)\s*(\d+[A-Z]?)/i);
                    return highwayMatch ? (
                      <div className="scale-[0.6] md:scale-75 origin-left shrink-0 -ml-1">
                        <HighwayShield roadName={highwayMatch[0]} />
                      </div>
                    ) : null;
                  })()}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {currentRegion.state && (
                    <span className="text-[8px] md:text-[10px] font-black text-[#D4AF37]/80 uppercase tracking-[0.15em]">
                      {currentRegion.state}
                    </span>
                  )}
                  <div className={`w-1.5 h-1.5 rounded-full ${userLocation ? 'bg-[#D4AF37] shadow-[0_0_6px_rgba(212,175,55,0.6)]' : 'bg-zinc-700'}`} />
                </div>
              </div>
            )}
            {/* Main Stats Row */}
            <div className="flex items-center p-2 md:p-4 landscape:p-2 gap-1 md:gap-3">
              {/* Controls cluster */}
              <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
                <button id="nav-exit-button" data-testid="nav-exit-button" onClick={handleCancelRoute} className="p-2 md:p-3 landscape:p-2 rounded-xl bg-zinc-900/80 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 transition-all active:scale-90" title="Clear Route">
                  <X className="w-4 h-4 md:w-5 md:h-5 landscape:w-4 landscape:h-4" strokeWidth={3} />
                </button>
                <button id="nav-reroute-button" data-testid="nav-reroute-button" onClick={handleReroute} className="p-2 md:p-3 landscape:p-2 rounded-xl bg-zinc-900/80 text-zinc-500 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 border border-zinc-800 hover:border-[#D4AF37]/30 transition-all active:scale-90" title="Recalculate Route">
                  <RotateCcw className="w-4 h-4 md:w-5 md:h-5 landscape:w-4 landscape:h-4" strokeWidth={3} />
                </button>
              </div>

              {/* Divider */}
              <div className="h-8 md:h-12 landscape:h-8 w-px bg-zinc-800 shrink-0" />

              {/* Stats */}
              <div className="flex items-center gap-3 md:gap-6 landscape:gap-3 overflow-x-auto no-scrollbar flex-1 px-1">
                {/* Speed */}
                <div id="nav-stat-speed" data-testid="nav-stat-speed" className={`flex flex-col items-center shrink-0 min-w-[52px] md:min-w-[72px] ${isSpeedWarning ? 'animate-pulse' : ''}`}>
                  <span className="text-[7px] md:text-[9px] landscape:text-[7px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Speed</span>
                  <div className="flex items-baseline gap-0.5">
                    <span className={`text-xl md:text-3xl landscape:text-xl font-[900] tracking-tighter leading-none tabular-nums transition-colors duration-300 ${isSpeedWarning ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]' : currentSpeedLimit && speed > currentSpeedLimit ? 'text-red-400' : 'text-white'}`}>
                      {context?.unitSystem === 'metric' ? Math.round(speed * 1.60934) : speed}
                    </span>
                    <span className="text-[7px] md:text-[9px] landscape:text-[7px] text-zinc-600 font-bold uppercase">{context?.unitSystem === 'metric' ? 'km/h' : 'mph'}</span>
                  </div>
                  {currentSpeedLimit && (
                    <div className="mt-0.5 scale-[0.55] md:scale-[0.65] origin-top">
                      <SpeedLimitSign limit={context?.unitSystem === 'metric' ? Math.round(currentSpeedLimit * 1.60934) : currentSpeedLimit} currentSpeed={context?.unitSystem === 'metric' ? Math.round(speed * 1.60934) : speed} compact />
                    </div>
                  )}
                </div>

                <div className="h-8 md:h-10 landscape:h-8 w-px bg-zinc-800/60 shrink-0" />

                {/* Distance */}
                <div id="nav-stat-dist" data-testid="nav-stat-dist" className="flex flex-col items-center shrink-0 min-w-[52px] md:min-w-[72px]">
                  <span className="text-[7px] md:text-[9px] landscape:text-[7px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Distance</span>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-xl md:text-3xl landscape:text-xl font-[900] text-[#D4AF37] tracking-tighter leading-none tabular-nums">
                      {context?.unitSystem === 'metric' 
                        ? (milesRemaining > 0 ? (milesRemaining * 1.60934).toFixed(1) : '---')
                        : (milesRemaining > 0 ? milesRemaining.toFixed(1) : '---')
                      }
                    </span>
                    <span className="text-[7px] md:text-[9px] landscape:text-[7px] text-zinc-600 font-bold uppercase">{context?.unitSystem === 'metric' ? 'km' : 'mi'}</span>
                  </div>
                </div>

                <div className="h-8 md:h-10 landscape:h-8 w-px bg-zinc-800/60 shrink-0" />

                {/* Duration */}
                <div id="nav-stat-duration" data-testid="nav-stat-duration" className="flex flex-col items-center shrink-0 min-w-[52px] md:min-w-[72px]">
                  <span className="text-[7px] md:text-[9px] landscape:text-[7px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Time</span>
                  <span className="text-xl md:text-3xl landscape:text-xl font-[900] text-[#D4AF37] tracking-tighter leading-none tabular-nums">
                    {remainingDuration > 0 ? `${Math.floor(remainingDuration / 3600)}h ${Math.floor((remainingDuration % 3600) / 60)}m` : '---'}
                  </span>
                </div>

                <div className="h-8 md:h-10 landscape:h-8 w-px bg-zinc-800/60 shrink-0" />

                {/* Stops count (if waypoints) */}
                {waypoints.length > 0 && (
                  <>
                    <div id="nav-stat-stops" data-testid="nav-stat-stops" className="flex flex-col items-center shrink-0">
                      <span className="text-[7px] md:text-[9px] landscape:text-[7px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Stops</span>
                      <span className="text-xl md:text-3xl landscape:text-xl font-[900] text-[#D4AF37] tracking-tighter leading-none tabular-nums">{waypoints.length}</span>
                    </div>
                    <div className="h-8 md:h-10 landscape:h-8 w-px bg-zinc-800/60 shrink-0" />
                  </>
                )}

                {/* ETA */}
                <div id="nav-stat-eta" data-testid="nav-stat-eta" className="flex flex-col items-center shrink-0 min-w-[60px] md:min-w-[80px]">
                  <span className="text-[7px] md:text-[9px] landscape:text-[7px] font-bold text-zinc-600 uppercase tracking-[0.2em]">ETA</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${userLocation ? 'bg-[#D4AF37] animate-pulse shadow-[0_0_8px_#D4AF37]' : 'bg-zinc-800'}`} />
                    <span className="text-xl md:text-3xl landscape:text-xl font-[900] text-white tracking-tighter leading-none">{eta}</span>
                  </div>
                  <span className="text-[6px] md:text-[8px] landscape:text-[6px] font-bold text-[#D4AF37]/70 uppercase tracking-[0.2em] mt-0.5">LIVE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Region/State Indicator (idle mode — not driving) ── */}
      {!isDriving && !isExploreMode && currentRegion.state && (
        <div data-testid="idle-region-indicator" className="absolute bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-24 left-1/2 -translate-x-1/2 z-[2005] pointer-events-none">
          <div className="flex items-center gap-2 bg-black/80 backdrop-blur-xl border border-zinc-800 rounded-full px-3 py-1.5 md:px-4 md:py-2 shadow-lg">
            <MapPinned className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#D4AF37]" />
            <span className="text-[9px] md:text-[11px] font-black text-white/90 uppercase tracking-wider">
              {currentRegion.city ? `${currentRegion.city}, ` : ''}{currentRegion.state}
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_4px_rgba(212,175,55,0.5)]" />
          </div>
        </div>
      )}

      {hudLayout.showMapControls && <div
        style={{
          ...(hudPositions.mapControls && (hudPositions.mapControls.x !== DEFAULT_POSITIONS.mapControls.x || hudPositions.mapControls.y !== DEFAULT_POSITIONS.mapControls.y)
            ? { position: 'absolute' as const, left: `${hudPositions.mapControls.x}%`, top: `${hudPositions.mapControls.y}%`, transform: `translate(-50%, -50%)`, zIndex: 2000 }
            : {}
          ),
        }}
      ><MapControls
        mapInstanceRef={mapInstanceRef}
        mapboxMapRef={mapboxMapRef}
        isFilterMenuOpen={isFilterMenuOpen}
        setIsFilterMenuOpen={setIsFilterMenuOpen}
        poiFilters={poiFilters}
        setPoiFilters={setPoiFilters}
        minRatingFilter={minRatingFilter}
        setMinRatingFilter={setMinRatingFilter}
        isOverviewMode={isOverviewMode}
        setIsOverviewMode={setIsOverviewMode}
        setIsFollowMode={setIsFollowMode}
        isValidLatLng={isValidLatLng}
        userLocation={userLocation}
        isFollowMode={isFollowMode}
        isNorthUp={isNorthUp}
        setIsNorthUp={handleToggleNorthUp}
        showTrafficSigns={showTrafficSigns}
        setShowTrafficSigns={setShowTrafficSigns}
        is3DMode={is3DMode}
        setIs3DMode={setIs3DMode}
        isCompassMode={isCompassMode}
        setIsCompassMode={setIsCompassMode}
        showFacilities={showFacilities}
        setShowFacilities={setShowFacilities}
        onAddFacility={() => setShowAddFacility(true)}
        currentZoom={currentZoom}
        isDrivingMode={isDriving && milesRemaining > 0}
        showTrafficFlow={showTrafficFlow}
        setShowTrafficFlow={setShowTrafficFlow}
        showRouteReasoning={showRouteReasoning}
        setShowRouteReasoning={setShowRouteReasoning}
        isTilted={isTilted}
        setIsTilted={setIsTilted}
        hasActiveRoute={routePoints.length > 1}
        onRouteOverview={() => {
          if (mapInstanceRef.current && routePoints.length > 1) {
            const bounds = boundsFromCoords(routePoints);
            if (bounds) {
              mapInstanceRef.current.getViewModel().setLookAtData({ bounds }, true);
            }
            setIsFollowMode(false);
            setIsOverviewMode(true);
          }
        }}
        className={hudPositions.mapControls && (hudPositions.mapControls.x !== DEFAULT_POSITIONS.mapControls.x || hudPositions.mapControls.y !== DEFAULT_POSITIONS.mapControls.y) ? '' : `-translate-y-1/2 ${milesRemaining > 0 ? 'top-[55%]' : 'top-1/2'}`}
        hudScale={autoScale('mapControls')}
      /></div>}
              <RouteSettingsModal
        isOpen={isRouteSettingsOpen}
        onClose={() => setIsRouteSettingsOpen(false)}
        avoidTolls={avoidTolls}
        setAvoidTolls={setAvoidTolls}
        avoidFerries={avoidFerries}
        setAvoidFerries={setAvoidFerries}
        avoidUnpaved={avoidUnpaved}
        setAvoidUnpaved={setAvoidUnpaved}
        isCarPlayMode={isCarPlayMode}
        setIsCarPlayMode={setIsCarPlayMode}
      />

      {/* Alert Detail Modal */}
      {alertDetailModal && (
        <div data-testid="alert-detail-modal" className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setAlertDetailModal(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-80 max-w-[90vw] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-black text-base uppercase tracking-wide">{alertDetailModal.title}</h3>
              <button data-testid="alert-detail-close-btn" onClick={() => setAlertDetailModal(null)} className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {alertDetailModal.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-b-0">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{item.label}</span>
                  <span className={`text-sm font-bold ${item.color || 'text-white'}`}>{item.value}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setAlertDetailModal(null)} className="w-full mt-4 py-2.5 bg-[#D4AF37] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#c9a432] transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      )}
    
    </div>
  );
};

export default React.memo(NavigationView);