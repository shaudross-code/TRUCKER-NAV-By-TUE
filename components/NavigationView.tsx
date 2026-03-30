import { getRoute } from '../src/services/hereRoutingService';
import { safeStringify, isValidLatLng, calcDistMi } from '../utils';
import React, { useEffect, useLayoutEffect, useRef, useState, useContext, useMemo, useCallback } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as L from 'leaflet';
import { MaptilerLayer } from "@maptiler/leaflet-maptilersdk";
import 'leaflet/dist/leaflet.css';
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
  Mic
} from 'lucide-react';
import { fetchTrafficInfrastructure, playTrafficAlert, TrafficInfrastructure } from '../services/trafficInfrastructure';
import { TrafficIcon } from './TrafficIcon';
import { Navigation3DView } from './Navigation3DView';
import { PoiDetailModal } from './PoiDetailModal';
import { RouteStepsModal } from './RouteStepsModal';
import { NavigationHUD } from './NavigationHUD';
import { WarningBanners } from './WarningBanners';

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
import { TruckStopReputation } from './ReputationScore';
import { RouteSettingsModal } from './RouteSettingsModal';
import { getPoiIcon, getPoiCategory, getEntranceIcon, getExitIcon } from './PoiIcon';
import { decode } from '@here/flexpolyline';

import { ViewType } from '../types';

interface NavigationViewProps {
  initialTarget?: string | null;
  userLocation: [number, number] | null;
  activeView?: ViewType;
}

const MAPTILER_KEY = process.env.MAPTILER_API_KEY || '';
const HERE_API_KEY = process.env.HERE_API_KEY || '';
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

const SpeedLimitMarker = React.memo(({ mapInstance, currentSpeedLimit, userLocation }: { mapInstance: any, currentSpeedLimit: number | null, userLocation: [number, number] | null }) => {
  const telemetryContext = useContext(TelemetryContext);
  const speed = React.useSyncExternalStore(
    telemetryContext?.subscribe || (() => () => {}),
    () => telemetryContext?.speedRef.current || 0
  );
  
  const speedLimitMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapInstance || !currentSpeedLimit) {
      if (speedLimitMarkerRef.current && mapInstance) {
        mapInstance.removeLayer(speedLimitMarkerRef.current);
      }
      if (!currentSpeedLimit) {
        speedLimitMarkerRef.current = null;
      }
      return;
    }

    const el = document.createElement('div');
    el.className = 'speed-limit-marker';
    el.innerHTML = `<div class="counter-rotate">${renderToStaticMarkup(<SpeedLimitSign limit={currentSpeedLimit} currentSpeed={speed} />)}</div>`;

    if (!speedLimitMarkerRef.current) {
      if (isValidLatLng(userLocation)) {
        speedLimitMarkerRef.current = L.marker([userLocation[0], userLocation[1]], { icon: L.divIcon({ html: el, className: 'speed-limit-marker', iconAnchor: [12, 12] }) });
        speedLimitMarkerRef.current.addTo(mapInstance);
      }
    } else {
      if (isValidLatLng(userLocation)) {
        speedLimitMarkerRef.current.setLatLng([userLocation[0], userLocation[1]]);
        speedLimitMarkerRef.current.setIcon(L.divIcon({ html: el, className: 'speed-limit-marker', iconAnchor: [12, 12] }));
      }
    }
  }, [mapInstance, currentSpeedLimit, speed, userLocation ? userLocation[0] : null, userLocation ? userLocation[1] : null]);

  return null;
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

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-xs text-center">
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
  const routeGroupRef = useRef<L.LayerGroup | null>(null);
  const markerClusterGroupRef = useRef<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerElRef = useRef<HTMLElement | null>(null);
  const mapLayersRef = useRef<Record<string, L.Polyline>>({});
  const poiMarkersRef = useRef<L.Marker[]>([]);
  const userLocation = useMemo(() => {
    // console.log("NavigationView: userLocation calculation", { propUserLocation, locationContextUserLocation: locationContext?.userLocation });
    return propUserLocation || locationContext?.userLocation || FALLBACK_LOCATION;
  }, [propUserLocation, locationContext?.userLocation]); 
  const truckProfile = context?.truckProfile || { 
    height: 13.5, 
    weight: 78500, 
    length: 53, 
    width: 8.5, 
    hazmat: false, 
    hazmatClasses: [], 
    tunnelCategory: 'NONE', 
    axleCount: 5, 
    axleWeight: 12000, 
    trailerCount: 1 
  };
  const routeDistancesRef = useRef<number[]>([]);
  const routeCoordsRef = useRef<[number, number][]>([]);
  const routeLineRef = useRef<any>(null);
  const currentSegmentLineRef = useRef<any>(null);
  const totalRouteDistanceRef = useRef(0);
  const lastSimIdxRef = useRef(-1);
  const routeDurationRef = useRef<number>(0);
  const routeSavedRef = useRef<boolean>(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  const [mapCenter, setMapCenter] = useState<[number, number]>(userLocation);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const isDriving = context?.isDriving || false;
  const setIsDriving = context?.setIsDriving || (() => {});
  const setUserLocation = locationContext?.setUserLocation || noop;
  const hosContext = useContext(HOSContext);
  const eldStatus = hosContext?.eldStatus;
  const setEldStatus = hosContext?.setEldStatus;
  const hasViolation = hosContext?.hasViolation || false;

  const [currentDestination, setCurrentDestination] = useState(() => localStorage.getItem('nav_current_destination') || 'Standby');
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(() => {
    const saved = localStorage.getItem('nav_destination_coords');
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

  const [isNorthUp, setIsNorthUp] = useState(() => localStorage.getItem('nav_north_up') === 'true');
  const manualRotationRef = useRef(0);
  const [manualRotation, setManualRotation] = useState(0);
  const [isCompassMode, setIsCompassMode] = useState(false);
  const compassHeadingRef = useRef(0);

  // Handle orientation mode changes and apply rotation
  useEffect(() => {
    manualRotationRef.current = manualRotation;
    const mapPane = mapInstanceRef.current?.getPane('mapPane');
    if (!mapPane) return;

    if (isNorthUp && !isCompassMode) {
      // North-up mode: apply manual rotation (or 0 if just switched to north-up)
      mapPane.style.setProperty('--map-rotation', `${manualRotation}deg`);
    }
  }, [manualRotation, isNorthUp, isCompassMode]);

  // When switching TO north-up, reset rotation to 0
  const handleToggleNorthUp = useCallback(() => {
    const newVal = !isNorthUp;
    setIsNorthUp(newVal);
    if (newVal) {
      // Switching to North Up — reset rotation to face north
      setManualRotation(0);
      const mapPane = mapInstanceRef.current?.getPane('mapPane');
      if (mapPane) {
        mapPane.style.setProperty('--map-rotation', '0deg');
      }
    }
  }, [isNorthUp]);

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
      if (e.touches.length === 2) {
        e.preventDefault();
        isRotatingRef.current = true;
        initialAngleRef.current = getAngle(e.touches);
        initialRotationRef.current = manualRotationRef.current;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRotatingRef.current && e.touches.length === 2) {
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
  }, []);

  // Device compass mode — uses DeviceOrientationEvent for physical compass heading
  useEffect(() => {
    if (!isCompassMode) return;

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

      compassHeadingRef.current = bearing;

      // Rotate vehicle icon to match compass bearing
      if (userMarkerElRef.current) {
        userMarkerElRef.current.style.setProperty('--vehicle-rotation', `${bearing}deg`);
      }

      // Rotate map pane
      const mapPane = mapInstanceRef.current?.getPane('mapPane');
      if (mapPane) {
        const rotation = manualRotationRef.current;
        mapPane.style.setProperty('--map-rotation', `${-bearing + rotation}deg`);
      }
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
    };

    setup();

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as any);
      window.removeEventListener('deviceorientation', handleOrientation as any);
    };
  }, [isCompassMode]);
  const [showTruckRestrictions] = useState(() => {
    const saved = localStorage.getItem('nav_show_truck_restrictions');
    return saved === null ? true : saved === 'true';
  });
  
  const [avoidTolls, setAvoidTolls] = useState(() => localStorage.getItem('nav_avoid_tolls') === 'true');
  const [avoidFerries, setAvoidFerries] = useState(() => localStorage.getItem('nav_avoid_ferries') === 'true');
  const [avoidUnpaved, setAvoidUnpaved] = useState(() => localStorage.getItem('nav_avoid_unpaved') === 'true');

  const [alternativeRoutes, setAlternativeRoutes] = useState<any[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isCarPlayMode, setIsCarPlayMode] = useState(() => localStorage.getItem('nav_carplay_mode') === 'true');
  const [isRouteSettingsOpen, setIsRouteSettingsOpen] = useState(false);
  const [isRoutePreview, setIsRoutePreview] = useState(false);
  const [isExploreMode, setIsExploreMode] = useState(false);
  const [trafficCams, setTrafficCams] = useState<any[]>([]);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [pois, setPois] = useState<any[]>(() => {
    // Clear any old fake POIs from localStorage
    localStorage.removeItem('truck_pois');
    console.log('Cleared old POI cache - will fetch fresh real data from HERE Maps');
    return [];
  });

  const [trafficInfrastructure, setTrafficInfrastructure] = useState<any[]>([]);
  const [showTrafficSigns, setShowTrafficSigns] = useState(() => 
    localStorage.getItem('nav_show_traffic_signs') !== 'false'
  );
  const alertedTrafficItems = useRef<Set<string>>(new Set());
  
  const [is3DMode, setIs3DMode] = useState(() => 
    localStorage.getItem('nav_3d_mode') === 'true'
  );
  const was3DRef = useRef(is3DMode);

  // Re-initialize Leaflet map when switching from 3D back to 2D
  useEffect(() => {
    const wasIn3D = was3DRef.current;
    was3DRef.current = is3DMode;
    
    // Only act when transitioning FROM 3D TO 2D (not on initial mount)
    if (wasIn3D && !is3DMode) {
      // Destroy old disconnected Leaflet instance
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch (e) { /* already disconnected from DOM */ }
        mapInstanceRef.current = null;
      }
      // Reset all map-attached refs so they get recreated on the new instance
      routeGroupRef.current = null;
      markerClusterGroupRef.current = null;
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

  useEffect(() => {
    // Save only real POIs fetched from APIs
    const str = safeStringify(pois);
    if (str && pois.length > 0) {
      localStorage.setItem('truck_pois', str);
    }
  }, [pois]);
  const isFetchingPoisRef = useRef(false);
  const lastPoiFetchRef = useRef<{ time: number, lat: number, lon: number } | null>(null);
  const smoothedHeadingRef = useRef(0);
  const [showPois] = useState(() => localStorage.getItem('nav_show_pois') !== 'false');

  // ─── Facility state ──────────────────────────────────────────────────────
  const [showFacilities, setShowFacilities] = useState(() => localStorage.getItem('nav_show_facilities') !== 'false');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [showAddFacility, setShowAddFacility] = useState(false);
  const facilityLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const facilityMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  const [poiFilters, setPoiFilters] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('poi_filters');
    const brandIds = ['loves', 'pilot', 'flying_j', 'petro', 'ta', 'road_ranger', 'kwik_trip', 'bucees', 'speedway', 'caseys', 'wawa', 'sheetz', 'quiktrip', 'racetrac', 'conoco', 'exxon', 'shell', 'bp', 'marathon', 'circle_k', 'seven_eleven', 'walmart', 'lowes', 'home_depot', 'truck_wash'];
    try {
      return saved ? new Set(JSON.parse(saved)) : new Set([...brandIds, 'fuel', 'parking', 'rest_area', 'weigh_station', 'food', 'distribution', 'low_clearance', 'other']);
    } catch (e) {
      console.error("Failed to parse poi_filters from localStorage", e);
      return new Set([...brandIds, 'fuel', 'parking', 'rest_area', 'weigh_station', 'food', 'distribution', 'low_clearance', 'other']);
    }
  });

  useEffect(() => {
    const str = safeStringify(Array.from(poiFilters));
    if (str) localStorage.setItem('poi_filters', str);
  }, [poiFilters]);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapInitError, setMapInitError] = useState<string | null>(null);
  useEffect(() => {
    if (error) console.log("NavigationView: error state updated", error);
  }, [error]);
  const [showSteps, setShowSteps] = useState(false);
  const [routeSteps, setRouteSteps] = useState<any[]>([]);
  const [currentManeuverIndex, setCurrentManeuverIndex] = useState(-1);
  const [waypoints, setWaypoints] = useState<Waypoint[]>(() => {
    const saved = localStorage.getItem('nav_waypoints');
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
    if (str) localStorage.setItem('nav_waypoints', str);
  }, [waypoints]);

  useEffect(() => {
    const str = safeStringify(destinationCoords);
    if (str) localStorage.setItem('nav_destination_coords', str);
  }, [destinationCoords]);

  useEffect(() => {
    localStorage.setItem('nav_current_destination', currentDestination);
  }, [currentDestination]);

  useEffect(() => {
    // console.log("NavigationView: activeView changed to", activeView);
    if (activeView === ViewType.NAVIGATION) {
      if (!mapInstanceRef.current) {
        initializeMap();
      } else {
        mapInstanceRef.current.invalidateSize();
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

          const L_obj = (window as any).L || L;
          
          if (!mapRef.current) {
            // console.log("NavigationView: mapRef.current is null before map initialization");
            return;
          }
          if ((mapRef.current as any)._leaflet_id) {
            // console.log("NavigationView: deleting _leaflet_id");
            delete (mapRef.current as any)._leaflet_id;
          }

          // console.log("NavigationView: initializing map with center", isValidLatLng(userLocation) ? userLocation : FALLBACK_LOCATION);
          let map;
          try {
            // console.log("NavigationView: calling L.map");
            map = L.map(mapRef.current!, {
              center: isValidLatLng(userLocation) ? userLocation : FALLBACK_LOCATION,
              zoom: 13,
              maxZoom: 20,
              zoomControl: false,
            });
            // console.log("NavigationView: map initialized successfully");
          } catch (e) {
            console.error("NavigationView: L.map() failed", e);
            throw e;
          }
          // console.log("NavigationView: map initialized, setting up event listeners");
          
          map.on('dragstart', () => {
            setIsFollowMode(false);
          });
          map.on('moveend', () => {
            const center = map.getCenter();
            setMapCenter([center.lat, center.lng]);
          });
          // console.log("Map created successfully");

          mapInstanceRef.current = map;
          
          // Initialize routeGroup
          routeGroupRef.current = L.layerGroup().addTo(map);

          // Add rotation class to the main pane
          map.getPane('mapPane')?.classList.add('leaflet-rotate-pane');

          // Log layers
          map.eachLayer((_layer) => {
            // console.log("Layer:", layer);
          });

          const L_any = L_obj as any;
          // Initialize POI layer group (static, no clustering)
          try {
            markerClusterGroupRef.current = L.layerGroup();
            map.addLayer(markerClusterGroupRef.current);
          } catch (e) {
            console.error("NavigationView: POI layer group initialization failed", e);
          }

          clearTimeout(timeoutId);
          setIsMapReady(true);
          setTimeout(() => {
            map.invalidateSize();
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
      map.invalidateSize();
    });
    
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, [isMapReady]);

  // Persist user preferences to localStorage
  useEffect(() => {
    localStorage.setItem('nav_north_up', isNorthUp.toString());
    localStorage.setItem('nav_avoid_tolls', avoidTolls.toString());
    localStorage.setItem('nav_avoid_ferries', avoidFerries.toString());
    localStorage.setItem('nav_avoid_unpaved', avoidUnpaved.toString());
    localStorage.setItem('nav_carplay_mode', isCarPlayMode.toString());
    localStorage.setItem('nav_show_pois', showPois.toString());
    localStorage.setItem('nav_show_truck_restrictions', showTruckRestrictions.toString());
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
  const restrictionAlertMarkersRef = useRef<L.Marker[]>([]);
  const trafficAlertMarkersRef = useRef<L.Marker[]>([]);
  const weatherAlertMarkersRef = useRef<L.Marker[]>([]);
  const [weighStationAlert, setWeighStationAlert] = useState<{ distance: number, status: 'OPEN' | 'CLOSED' | 'BYPASS' } | null>(null);
  
  const [currentRoad, setCurrentRoad] = useState<string | null>(null);
  const [currentSpeedLimit, setCurrentSpeedLimit] = useState<number | null>(null);
  const routeSpansRef = useRef<any[]>([]);

  const lastViolationRef = useRef(false);
  const playedAlertsRef = useRef<Record<string, Set<number>>>({});

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
                amenities: details.categories?.map((c: any) => c.name) || prev.amenities
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

  const updateMapLine = (map: L.Map | null, id: string, coords: [number, number][], color: string, width: number) => {
    if (!map) return;
    
    if (id === 'route' && routeGroupRef.current) {
      // Clear any existing route lines
      routeGroupRef.current.clearLayers();
      
      // 1. Outer black border line (creates the outline effect)
      L.polyline(coords, { 
        color: 'black', 
        weight: 18, 
        opacity: 0.8, 
        lineCap: 'round', 
        lineJoin: 'round' 
      }).addTo(routeGroupRef.current);

      // 2. Inner gold route line (the main navigation path)
      L.polyline(coords, { 
        color: color, 
        weight: 12, 
        opacity: 1, 
        lineCap: 'round', 
        lineJoin: 'round' 
      }).addTo(routeGroupRef.current);
      return;
    }

    const layer = mapLayersRef.current[id];
    if (layer) {
      layer.setLatLngs(coords);
      return;
    }
    
    const polyline = L.polyline(coords, {
      color: color,
      weight: width
    });
    polyline.addTo(map);
    mapLayersRef.current[id] = polyline;
  };

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    map.on('contextmenu', (e: L.LeafletMouseEvent) => {
      console.log('contextmenu at:', e.latlng);
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

    let moveEndTimeout: any = null;
    map.on('moveend', () => {
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
    });

    return () => {
      map.off('contextmenu');
      map.off('moveend');
      Object.values(mapLayersRef.current).forEach(layer => layer.remove());
      mapLayersRef.current = {};
    };
  }, [isMapReady]);

  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady || !userLocation) return;

    // Remove old marker
    if (userMarkerRef.current) {
        mapInstanceRef.current.removeLayer(userMarkerRef.current);
    }
    
    const el = document.createElement('div');
    el.className = 'user-marker-wrapper';
    el.innerHTML = `<div class="relative flex items-center justify-center w-full h-full">
      <div class="absolute w-14 h-14 bg-[#D4AF37]/10 rounded-full animate-ping"></div>
      <div class="absolute w-10 h-10 bg-[#D4AF37]/20 rounded-full animate-pulse"></div>
      <div class="w-10 h-10 bg-black rounded-full shadow-[0_0_25px_rgba(212,175,55,0.8)] flex items-center justify-center border-[2.5px] border-[#D4AF37] z-10 overflow-visible">
        <div class="relative w-full h-full flex items-center justify-center vehicle-pointer transition-transform duration-300" style="transform: rotate(var(--vehicle-rotation, 0deg))">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="#D4AF37" class="drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
          </svg>
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-[#D4AF37]/30 blur-md rounded-full"></div>
        </div>
      </div>
    </div>`;
    
    userMarkerRef.current = L.marker([userLocation[0], userLocation[1]], { icon: L.divIcon({ html: el, className: 'user-marker-container', iconSize: [60, 60], iconAnchor: [30, 30] }) }).addTo(mapInstanceRef.current);
    userMarkerElRef.current = el.querySelector('.vehicle-pointer') as HTMLElement;

    // POI fetch logic
    if (isFetchingPoisRef.current) return;

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


  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;
    
    const map = mapInstanceRef.current;
    
    // Remove existing tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer || (layer as any).options?.style) {
        map.removeLayer(layer);
      }
    });

    // Reset filter
    (map.getContainer() as HTMLElement).style.filter = 'none';
    console.log("NavigationView: map container style", (map.getContainer() as HTMLElement).style.cssText);
    console.log("NavigationView: map container visibility", (map.getContainer() as HTMLElement).style.visibility);

    if (showTruckRestrictions && HERE_API_KEY) {
      console.log("Adding MapTiler truck/roads layer (HERE tiles deprecated)");
      // HERE Maps v1 tile API deprecated — use MapTiler truck-friendly style as base
      try {
        if (typeof MaptilerLayer === 'function') {
          new MaptilerLayer({ apiKey: MAPTILER_KEY, style: MAPTILER_STYLE_ID }).addTo(map);
        } else {
          L.tileLayer(`https://api.maptiler.com/maps/${MAPTILER_STYLE_ID}/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`, {
            attribution: '&copy; MapTiler &copy; OpenStreetMap',
            maxZoom: 20
          }).addTo(map);
        }
      } catch {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors', maxZoom: 20
        }).addTo(map);
      }
    } else {
      console.log("Adding MapTiler vector layer");
      try {
        let _mtLayer;
        // Try direct import first
        if (typeof MaptilerLayer === 'function') {
          console.log("NavigationView: Using imported MaptilerLayer");
          _mtLayer = new MaptilerLayer({
            apiKey: MAPTILER_KEY,
            style: MAPTILER_STYLE_ID,
          }).addTo(map);
        } else {
          // Fallback to L.maptilerLayer or L.MaptilerLayer
          const L_any = L as any;
          const maptilerLayer = L_any.maptilerLayer || L_any.MaptilerLayer || (window as any).L?.maptilerLayer || (window as any).L?.MaptilerLayer;
          
          if (typeof maptilerLayer === 'function') {
            console.log("NavigationView: Using L.maptilerLayer");
            _mtLayer = new (maptilerLayer as any)({
              apiKey: MAPTILER_KEY,
              style: MAPTILER_STYLE_ID,
            }).addTo(map);
          } else {
            // Check for L.maptiler.MaptilerLayer (some versions)
            const maptilerObj = L_any.maptiler || (window as any).L?.maptiler;
            if (maptilerObj && (maptilerObj.MaptilerLayer || maptilerObj.maptilerLayer)) {
              const constructor = maptilerObj.MaptilerLayer || maptilerObj.maptilerLayer;
              console.log("NavigationView: Using L.maptiler.MaptilerLayer");
              _mtLayer = new constructor({
                apiKey: MAPTILER_KEY,
                style: MAPTILER_STYLE_ID,
              }).addTo(map);
            } else {
              throw new Error("MaptilerLayer is not available on L or window.L");
            }
          }
        }
        console.log("MapTiler layer added successfully");
      } catch (e) {
        console.error("Failed to add MapTiler layer, falling back to raster", e);
        // Fallback logic...
        const styleRasterUrl = `https://api.maptiler.com/maps/${MAPTILER_STYLE_ID}/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`;
        const fallbackRasterUrl = `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`;
        const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        
        console.log("NavigationView: falling back to raster");
        L.tileLayer(styleRasterUrl, { 
          attribution: MAPTILER_STYLE.attribution,
          maxZoom: 20
        }).addTo(map).on('tileerror', () => {
          console.warn("MapTiler custom raster failed, falling back to streets-v2");
          L.tileLayer(fallbackRasterUrl, {
            attribution: MAPTILER_STYLE.attribution,
            maxZoom: 20
          }).addTo(map).on('tileerror', (err) => {
            console.warn("MapTiler fallback raster failed, falling back to OSM", err);
            L.tileLayer(osmUrl, {
              attribution: '&copy; OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);
          });
        });
      }
    }
    map.invalidateSize();
  }, [isMapReady, showTruckRestrictions]);

  useEffect(() => {
    if (!mapRef.current || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, [isMapReady]);

  // ─── Facility layer group setup ──────────────────────────────────────────
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;
    const group = L.layerGroup().addTo(mapInstanceRef.current);
    facilityLayerGroupRef.current = group;
    return () => { group.remove(); facilityLayerGroupRef.current = null; };
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
    facilityLayerGroupRef.current.clearLayers();
    facilityMarkersRef.current.clear();
    if (!showFacilities) return;

    facilities.forEach(facility => {
      const type = facility.majority?.type || 'both';
      const iconEl = document.createElement('div');
      iconEl.style.cssText = 'cursor:pointer;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.6))';
      iconEl.innerHTML = facilityIconSVG(type, 32);

      const marker = L.marker([facility.lat, facility.lon], {
        icon: L.divIcon({ html: iconEl, className: '', iconSize: [32, 36], iconAnchor: [16, 36] }),
        zIndexOffset: 200,
      });

      marker.on('click', () => setSelectedFacility(facility));
      marker.addTo(facilityLayerGroupRef.current!);
      facilityMarkersRef.current.set(facility.id, marker);
    });
  }, [facilities, showFacilities]);

  // When isNorthUp changes, reset map rotation accordingly
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const mapPane = map.getPane('mapPane');
    if (!mapPane) return;

    if (isNorthUp) {
      // North-up: reset rotation to 0
      mapPane.style.setProperty('--map-rotation', '0deg');
    }
    map.invalidateSize();
  }, [isNorthUp]);

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
        
        const finalResults = [...nearby, ...uniqueResults.slice(0, 10)];
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

  const getLaneGuidancePhrase = (lanes: any[]) => {
    if (!lanes || lanes.length === 0) return '';
    
    const recommendedLanes = lanes.filter(l => l.matches.includes('selected') || l.active);
    if (recommendedLanes.length === 0) return '';
    if (recommendedLanes.length === lanes.length) return ''; // All lanes are fine

    const totalLanes = lanes.length;
    const recommendedCount = recommendedLanes.length;
    
    // Find if they are contiguous and where they are
    let firstIdx = -1;
    let lastIdx = -1;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i].matches.includes('selected') || lanes[i].active) {
        if (firstIdx === -1) firstIdx = i;
        lastIdx = i;
      }
    }

    const isLeft = firstIdx === 0;
    const isRight = lastIdx === totalLanes - 1;
    
    const position = isLeft ? 'left' : isRight ? 'right' : 'middle';
    if (isLeft && isRight) return ''; // Should not happen if recommendedCount < totalLanes

    const laneWord = recommendedCount === 1 ? 'lane' : 'lanes';
    const countWord = recommendedCount === 1 ? 'the' : `the ${recommendedCount}`;
    
    return `Use ${countWord} ${position} ${laneWord}.`;
  };

  const lastSpokenRef = useRef('');
  const spokenDistancesRef = useRef<Set<string>>(new Set());
  const lastLaneSpokenRef = useRef('');

  useEffect(() => {
    if (!isDriving || nextInstruction.text === 'Ready for Route') {
      if (isDriving && nextInstruction.text === 'Ready for Route') {
        console.log("Navigation Speak Effect: isDriving is true but instruction is 'Ready for Route'");
      }
      return;
    }

    const dist = parseFloat(nextInstruction.distance);
    if (isNaN(dist)) {
      console.warn("Navigation Speak Effect: distance is NaN", nextInstruction.distance);
      return;
    }
    let shouldSpeak = false;
    let phrase = "";

    const lanePhrase = getLaneGuidancePhrase(nextInstruction.lanes || []);
    console.log(`Navigation Speak Effect: dist=${dist}, text="${nextInstruction.text}", lanePhrase="${lanePhrase}"`);

    if (nextInstruction.text !== lastSpokenRef.current) {
      lastSpokenRef.current = nextInstruction.text;
      spokenDistancesRef.current.clear();
      lastLaneSpokenRef.current = '';
      
      shouldSpeak = true;
      if (dist > 2) {
        phrase = `Continue for ${dist} miles, then ${nextInstruction.text}. ${lanePhrase}`;
      } else {
        phrase = `In ${dist} miles, ${nextInstruction.text}. ${lanePhrase}`;
        if (dist <= 2) spokenDistancesRef.current.add('2');
        if (dist <= 1) spokenDistancesRef.current.add('1');
        if (dist <= 0.2) spokenDistancesRef.current.add('0.2');
      }
    }

    if (dist <= 2.0 && dist > 1.9 && !spokenDistancesRef.current.has('2')) {
      shouldSpeak = true;
      phrase = `In 2 miles, ${nextInstruction.text}. ${lanePhrase}`;
      spokenDistancesRef.current.add('2');
    } else if (dist <= 1.0 && dist > 0.9 && !spokenDistancesRef.current.has('1')) {
      shouldSpeak = true;
      phrase = `In 1 mile, ${nextInstruction.text}. ${lanePhrase}`;
      spokenDistancesRef.current.add('1');
    } else if (dist <= 0.5 && dist > 0.4 && lanePhrase && lastLaneSpokenRef.current !== lanePhrase) {
      // Speak lane guidance specifically at 0.5 miles if not already spoken recently
      shouldSpeak = true;
      phrase = lanePhrase;
      lastLaneSpokenRef.current = lanePhrase;
    } else if (dist <= 0.2 && !spokenDistancesRef.current.has('0.2')) {
      shouldSpeak = true;
      phrase = `Now, ${nextInstruction.text}. ${lanePhrase}`;
      spokenDistancesRef.current.add('0.2');
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

    const saved = localStorage.getItem('trucker_route_history');
    const history = saved ? JSON.parse(saved) : [];
    const str = safeStringify([historyItem, ...history]);
    if (str) localStorage.setItem('trucker_route_history', str);
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
      }

      if (routeCoordsRef.current.length > nearestIndex + 1) {
        const segmentCoords = [currentLocation, routeCoordsRef.current[nearestIndex + 1]];
        if (!currentSegmentLineRef.current) {
          updateMapLine(mapInstanceRef.current, 'segment', segmentCoords, '#ffffff', 12);
          currentSegmentLineRef.current = 'segment';
        } else {
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
        
        // Weigh Station Alert Simulation
        if (initialMilesRef.current > 5 && poiFiltersRef.current.has('weigh_station')) {
          const weighStationPoint = initialMilesRef.current * 0.5; // Halfway point
          const distToWeighStation = remainingMiles - weighStationPoint;
          
          if (distToWeighStation > 0 && distToWeighStation <= 2) {
            if (!weighStationAlertRef.current || weighStationAlertRef.current.distance !== distToWeighStation) {
              // Determine status randomly once when it first appears, or just set it to BYPASS/OPEN
              const status = weighStationAlertRef.current?.status || (Math.random() > 0.3 ? 'BYPASS' : 'OPEN');
              setWeighStationAlert({ distance: distToWeighStation, status });
              
              if (distToWeighStation <= 2 && distToWeighStation > 1.9 && !spokenDistancesRef.current.has('ws_2')) {
                speak(`Weigh station ahead in 2 miles. Status is ${status}.`);
                spokenDistancesRef.current.add('ws_2');
              } else if (distToWeighStation <= 0.5 && distToWeighStation > 0.4 && !spokenDistancesRef.current.has('ws_0.5')) {
                speak(`Weigh station in half a mile. ${status === 'BYPASS' ? 'Bypass granted.' : 'Pull in.'}`);
                spokenDistancesRef.current.add('ws_0.5');
              }
            }
          } else if (distToWeighStation <= 0 && weighStationAlertRef.current) {
            setWeighStationAlert(null); // Clear alert after passing
          }
        } else if (weighStationAlertRef.current) {
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
        trafficAlerts.forEach((alert, idx) => {
          if (!alert.progress) return;
          const alertDistMi = initialMilesRef.current * alert.progress;
          const distToAlert = alertDistMi - (initialMilesRef.current - remainingMiles);
          
          if (distToAlert > 0 && distToAlert <= 0.5) {
            const alertKey = `traffic_${alert.type}_${idx}`;
            if (distToAlert <= 0.5 && distToAlert > 0.4 && !spokenDistancesRef.current.has(`${alertKey}_0.5`)) {
              speak(`Upcoming ${alert.message} in half a mile.`);
              spokenDistancesRef.current.add(`${alertKey}_0.5`);
            } else if (distToAlert <= 0.1 && distToAlert > 0.05 && !spokenDistancesRef.current.has(`${alertKey}_0.1`)) {
              speak(`${alert.message} ahead.`);
              spokenDistancesRef.current.add(`${alertKey}_0.1`);
            }
          }
        });
      }

      let maneuverIndex = -1;
      let traveledForStep = 0;
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
    
    // Clear map layers
    if (mapLayersRef.current) {
      Object.values(mapLayersRef.current).forEach(layer => {
        try {
          layer.remove();
        } catch (e) {
          console.warn("Failed to remove layer:", e);
        }
      });
      mapLayersRef.current = {};
    }
    
    clearRouteMarkers();
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
    spans: any[] 
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

        const section = route.sections[0];
        const summary = section.summary;
        if (!summary || isNaN(summary.length) || isNaN(summary.duration)) {
          console.warn(`Frontend: Route ${routeIdx} section 0 has invalid summary`, summary);
          return null;
        }

        const distMi = summary.length / 1609.34;
        const durationSec = summary.duration;
        
        const steps = section.actions.map((action: any) => {
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
            offset: action.offset ?? 0,
            lanes: (action.lanes || []).map((lane: any) => ({
              direction: (lane.directions || lane.indications || []).join(';'),
              matches: (lane.isRecommended || lane.recommendation === 'recommended') ? ['selected'] : []
            }))
          };
        });

        if (!section.polyline) {
          console.error(`Frontend: Route ${routeIdx} section 0 has no polyline`);
          return null;
        }

        // @ts-expect-error: Polyline decoding library type definition is missing
        const decoded = decode(section.polyline);
        console.log(`Frontend: Decoded polyline for route ${routeIdx}`, decoded);
        
        if (!decoded || !decoded.polyline || decoded.polyline.length === 0) {
          console.error(`Frontend: Decoded polyline for route ${routeIdx} is empty or invalid`);
          return null;
        }

        const coords = decoded.polyline.map((c: any) => [c[0], c[1]]);
        console.log(`Frontend: Processed ${coords.length} coordinates for route ${routeIdx}`);

        const allIncidents = section.incidents || [];
        const alerts = allIncidents.filter((incident: any) => incident?.from?.offset != null).map((incident: any) => {
          const progress = incident.from.offset / (summary.length || 1);
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
            if (instruction.includes('stop sign') || action.action === 'stop') {
              const progress = (action.offset ?? 0) / (summary.length || 1);
              trafficAlertsList.push({
                type: 'STOP_SIGN',
                message: 'Stop Sign',
                icon: Octagon,
                color: 'text-red-600',
                bg: 'bg-red-600/10',
                progress,
                coords: coords[action.offset ?? 0] || coords[Math.floor((action.offset ?? 0) * (coords.length - 1) / (summary.length || 1))]
              });
            }
          });
        }

        if (section.spans) {
          let currentPointIndex = 0;
          const totalPoints = decoded.polyline.length;
          
          section.spans.forEach((span: any) => {
            const progress = currentPointIndex / totalPoints;

            if (span.streetAttributes && span.streetAttributes.includes('trafficLight')) {
              trafficAlertsList.push({
                type: 'TRAFFIC_LIGHT',
                message: 'Traffic Light',
                icon: TrafficCone,
                color: 'text-emerald-500',
                bg: 'bg-emerald-500/10',
                progress,
                coords: coords[currentPointIndex]
              });
            }

            if (span.truckAttributes) {
              const attrs = span.truckAttributes;
              const progress = currentPointIndex / totalPoints;
              
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
            }
            currentPointIndex += (span.length || 0);
          });
        }

        return { coords, distMi, durationSec, steps, alerts, restrictions, trafficAlerts: trafficAlertsList, spans: route.sections[0].spans };
      }).filter(Boolean);

      if (processedRoutes.length === 0) return null;

      // For now, return the first one as primary, but we'll store others in state
      const primaryRoute = processedRoutes[0];
      setWeatherAlerts(primaryRoute.alerts.sort((a: any, b: any) => a.progress - b.progress));
      setRestrictionAlerts(primaryRoute.restrictions.sort((a: any, b: any) => a.progress - b.progress));
      setTrafficAlerts(primaryRoute.trafficAlerts.sort((a: any, b: any) => a.progress - b.progress));
      if (primaryRoute.spans) {
        routeSpansRef.current = primaryRoute.spans;
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
            maneuver: { instruction: step.maneuver.instruction, type: step.maneuver.type },
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
        maneuver: { instruction: step.maneuver.instruction, type: step.maneuver.type },
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
          layer.remove();
        } catch (e) {
          console.warn("Failed to remove layer:", e);
        }
      });
      mapLayersRef.current = {};
    }
    currentSegmentLineRef.current = null;
    
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
          mapLayersRef.current['route'].remove();
          delete mapLayersRef.current['route'];
        }
        if (mapLayersRef.current['segment']) {
          mapLayersRef.current['segment'].remove();
          delete mapLayersRef.current['segment'];
        }
        currentSegmentLineRef.current = null;
        
        // Draw route polyline using updateMapLine for consistency
        updateMapLine(mapInstanceRef.current, 'route', coords, '#D4AF37', 12);
        routeLineRef.current = { id: 'route', color: '#D4AF37' };
        
        // Fit map to route
        const bounds = L.latLngBounds(coords.map(c => [c[0], c[1]]));
        mapInstanceRef.current.fitBounds(bounds, { 
          padding: [100, 100], 
          animate: true, 
          duration: 1.5 
        });

        // After a short delay, zoom into the starting position
        setTimeout(() => {
          try {
            if (isValidLatLng(userLocation) && mapInstanceRef.current) {
              mapInstanceRef.current.flyTo([userLocation[0], userLocation[1]], 17, {
                duration: 1.5
              }); 
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
      if (firstDistNum <= 2) spokenDistancesRef.current.add('2');
      if (firstDistNum <= 1) spokenDistancesRef.current.add('1');
      if (firstDistNum <= 0.2) spokenDistancesRef.current.add('0.2');

      if (alternativeRoutes.length > 1) {
        setIsRoutePreview(true);
        setIsDriving(false);
      } else if (!isDriving) {
        toggleDriving();
      }
      
      setIsDriving(true);
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

    restrictionAlertMarkersRef.current.forEach(m => m.remove());
    restrictionAlertMarkersRef.current = [];

    restrictionAlerts.forEach((alert) => {
      if (!alert.coords) return;

      const iconHtml = renderToStaticMarkup(
        <div className="flex flex-col items-center group">
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
      
      const marker = L.marker([alert.coords[0], alert.coords[1]], { 
        icon: L.divIcon({ 
          html: iconHtml, 
          className: 'restriction-marker', 
          iconAnchor: [12, 24] 
        }) 
      });

      if (mapInstanceRef.current) {
        marker.addTo(mapInstanceRef.current);
      }
      
      const popup = L.popup({ offset: [0, -25] }).setContent(`
          <div class="p-3 min-w-[150px]">
            <div class="flex items-center gap-2 mb-2">
              <div class="p-1.5 rounded-lg ${alert.type === 'BRIDGE' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="3" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <div class="font-black text-zinc-900 text-sm uppercase tracking-tight">${alert.type === 'BRIDGE' ? 'Low Bridge' : 'Weight Limit'}</div>
            </div>
            <div class="p-2 bg-zinc-50 rounded-xl border border-zinc-100 mb-3">
              <div class="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Restriction</div>
              <div class="text-xs font-bold text-zinc-900">${alert.message}</div>
            </div>
          </div>
        `);
      marker.bindPopup(popup);
      restrictionAlertMarkersRef.current.push(marker);
    });
  }, [restrictionAlerts, isMapReady]);

  useEffect(() => {
    if (!isMapReady) return;

    trafficAlertMarkersRef.current.forEach(m => m.remove());
    trafficAlertMarkersRef.current = [];

    trafficAlerts.forEach((alert) => {
      if (!alert.coords) return;

      const iconHtml = renderToStaticMarkup(
        <div className="flex flex-col items-center group">
          <div className={`px-2 py-1 rounded-lg border shadow-xl mb-1 whitespace-nowrap transition-all group-hover:scale-110 ${
            alert.type === 'STOP_SIGN' ? 'bg-red-700 border-red-500 text-white' : 'bg-emerald-600 border-emerald-400 text-white'
          }`}>
            <div className="flex items-center gap-1.5">
              {alert.type === 'STOP_SIGN' ? <Octagon className="w-3 h-3" /> : <TrafficCone className="w-3 h-3" />}
              <span className="text-[8px] font-black uppercase tracking-tighter">{alert.message}</span>
            </div>
          </div>
          <div className={`w-6 h-6 rounded-full shadow-lg flex items-center justify-center border-2 border-black transition-all group-hover:scale-110 ${
            alert.type === 'STOP_SIGN' ? 'bg-red-700' : 'bg-emerald-600'
          }`}>
            {alert.type === 'STOP_SIGN' ? <Octagon className="w-3 h-3 text-white" /> : <TrafficCone className="w-3 h-3 text-white" />}
          </div>
        </div>
      );
      
      const marker = L.marker([alert.coords[0], alert.coords[1]], { 
        icon: L.divIcon({ 
          html: iconHtml, 
          className: 'traffic-marker', 
          iconAnchor: [12, 24] 
        }) 
      });

      if (mapInstanceRef.current) {
        marker.addTo(mapInstanceRef.current);
      }
      
      const popup = L.popup({ offset: [0, -25] }).setContent(`
          <div class="p-3 min-w-[150px]">
            <div class="flex items-center gap-2 mb-2">
              <div class="p-1.5 rounded-lg ${alert.type === 'STOP_SIGN' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}">
                ${alert.type === 'STOP_SIGN' ? '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="3" fill="none"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon></svg>' : '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="3" fill="none"><path d="M9.47 20.28l-6.75-6.75a2.5 2.5 0 0 1 0-3.54l6.75-6.75a2.5 2.5 0 0 1 3.54 0l6.75 6.75a2.5 2.5 0 0 1 0 3.54l-6.75 6.75a2.5 2.5 0 0 1-3.54 0z"></path></svg>'}
              </div>
              <div class="font-black text-zinc-900 text-sm uppercase tracking-tight">${alert.type === 'STOP_SIGN' ? 'Stop Sign' : 'Traffic Light'}</div>
            </div>
            <div class="p-2 bg-zinc-50 rounded-xl border border-zinc-100 mb-3">
              <div class="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Alert</div>
              <div class="text-xs font-bold text-zinc-900">${alert.message}</div>
            </div>
          </div>
        `);
      marker.bindPopup(popup);
      trafficAlertMarkersRef.current.push(marker);
    });
  }, [trafficAlerts, isMapReady]);

  useEffect(() => {
    if (!isMapReady) return;

    weatherAlertMarkersRef.current.forEach(m => m.remove());
    weatherAlertMarkersRef.current = [];

    weatherAlerts.forEach((alert) => {
      const cacheKey = `${alert.type}-${alert.severity}`;
      if (!weatherIconsCacheRef.current[cacheKey]) {
        weatherIconsCacheRef.current[cacheKey] = renderToStaticMarkup(
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
        );
      }
      
      const marker = L.marker([alert.lat, alert.lon], { icon: L.divIcon({ html: weatherIconsCacheRef.current[cacheKey], className: 'alert-marker', iconAnchor: [12, 24] }) });
      if (mapInstanceRef.current) {
        marker.addTo(mapInstanceRef.current);
      }
      
      const popup = L.popup({ offset: [0, -25] }).setContent(`
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
        `);
      marker.bindPopup(popup);
      weatherAlertMarkersRef.current.push(marker);
    });
  }, [weatherAlerts, isMapReady]);



  useEffect(() => {
    if (isOverviewMode && mapInstanceRef.current) {
      const bounds = routeCoordsRef.current.length > 0 ? L.latLngBounds(routeCoordsRef.current.map(c => [c[0], c[1]])) : null;
      if (bounds) {
        mapInstanceRef.current.fitBounds(bounds, {
          padding: [50, 50],
          animate: true,
          duration: 1.5
        });
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

  useEffect(() => {
    if (isValidLatLng(userLocation) && userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation[0], userLocation[1]]);
    }
    if (isDriving && userLocation) {
      updateNavigationState(userLocation).catch(err => console.error("Navigation update failed:", err));
    }
  }, [isDriving, userLocation ? userLocation[0] : null, userLocation ? userLocation[1] : null, updateNavigationState]);

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

    const updateRotationAndPan = () => {
      const currentLoc = userLocationRef.current;
      if (!currentLoc) return;

      // Compass mode handles its own rotation — only do the follow-pan here
      if (isCompassMode) {
        if (isFollowMode && mapInstanceRef.current) {
          const now = Date.now();
          if (now - lastPanRef.current > 500) {
            lastPanRef.current = now;
            try {
              const compassH = compassHeadingRef.current;
              const zoom = mapInstanceRef.current.getZoom();
              const offsetPixels = window.innerHeight * 0.2;
              const point = mapInstanceRef.current.project(currentLoc, zoom);
              const compassRad = compassH * Math.PI / 180;
              const offsetPoint = point.add(L.point(
                offsetPixels * Math.sin(compassRad),
                -offsetPixels * Math.cos(compassRad)
              ));
              const unprojected = mapInstanceRef.current.unproject(offsetPoint, zoom);
              mapInstanceRef.current.panTo([unprojected.lat, unprojected.lng], { animate: true, duration: 0.8, easeLinearity: 0.25 });
            } catch (e) { /* ignore */ }
          }
        }
        return;
      }

      let rawHeading = telemetryContext.headingRef.current || 0;
      const speed = telemetryContext.speedRef.current || 0;

      // If simulating, calculate heading from route
      if (isDriving && !telemetryContext.headingRef.current) {
        const currentIdx = lastSimIdxRef.current;
        if (currentIdx >= 0 && currentIdx < routeCoordsRef.current.length - 1) {
          const p1 = routeCoordsRef.current[currentIdx];
          const p2 = routeCoordsRef.current[currentIdx + 1];
          const dy = p2[0] - p1[0];
          const dx = Math.cos(Math.PI / 180 * p1[0]) * (p2[1] - p1[1]);
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          rawHeading = (90 - angle + 360) % 360;
        }
      }

      // Smooth the heading and lock at low speeds
      if (speed > 2) { // Only update if speed > 2 m/s (~4.5 mph)
        smoothedHeadingRef.current = 0.9 * smoothedHeadingRef.current + 0.1 * rawHeading;
      }

      const currentHeading = smoothedHeadingRef.current;

      if (userMarkerElRef.current) {
        userMarkerElRef.current.style.setProperty('--vehicle-rotation', `${currentHeading}deg`);
      }

      // Update map rotation if in follow mode
      const mapPane = mapInstanceRef.current?.getPane('mapPane');
      if (mapPane) {
        const rotation = manualRotationRef.current;
        if (isFollowMode && !isNorthUp) {
          mapPane.style.setProperty('--map-rotation', `${-currentHeading + rotation}deg`);
        } else {
          mapPane.style.setProperty('--map-rotation', `${rotation}deg`);
        }
      }

      if (isFollowMode && mapInstanceRef.current) { 
        const now = Date.now();
        if (now - lastPanRef.current > 500) { // Further reduced throttle for even smoother tracking
          lastPanRef.current = now;
          try {
            // In Heading Up mode, we offset the center slightly to see more ahead
            let center: [number, number] = [currentLoc[0], currentLoc[1]];
            
            if (!isNorthUp) {
              const zoom = mapInstanceRef.current.getZoom();
              const offsetPixels = window.innerHeight * 0.2; // Offset by 20% of screen height
              const point = mapInstanceRef.current.project(center, zoom);
              
              const headingRad = currentHeading * Math.PI / 180;
              const offsetPoint = point.add(L.point(
                offsetPixels * Math.sin(headingRad),
                -offsetPixels * Math.cos(headingRad)
              ));
              const unprojected = mapInstanceRef.current.unproject(offsetPoint, zoom);
              center = [unprojected.lat, unprojected.lng];
            }
            
            mapInstanceRef.current.panTo(center, { animate: true, duration: 0.8, easeLinearity: 0.25 }); 
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
      markerClusterGroupRef.current?.clearLayers();
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
    markerClusterGroupRef.current?.clearLayers();
    poiMarkersRef.current = [];

    let validPoisCount = 0;
    // Pre-filter POIs to only those within 100 miles of map center to avoid heavy iteration
    const nearbyPois = pois.filter(poi => {
      if (typeof poi.lat !== 'number' || typeof poi.lon !== 'number' || isNaN(poi.lat) || isNaN(poi.lon)) return false;
      const category = getPoiCategory(poi.type, poi.name);
      if (!poiFilters.has(category)) return false;
      
      const distance = calcDistMi(mapCenter[0], mapCenter[1], poi.lat, poi.lon);
      return distance <= 100;
    });

    nearbyPois.forEach(poi => {
        try {
          validPoisCount++;
          const iconHtml = getCachedPoiIcon(poi.type, poi.name);
          if (iconHtml) {
            const marker = L.marker([poi.lat, poi.lon], { icon: L.divIcon({ html: `<div class="custom-poi-icon"><div class="counter-rotate">${iconHtml}</div></div>`, className: 'poi-marker', iconAnchor: [12, 24] }) });
            if (markerClusterGroupRef.current) {
              marker.addTo(markerClusterGroupRef.current);
            } else {
              marker.addTo(mapInstanceRef.current!);
            }
            
            marker.on('click', () => {
              setSelectedPoi(poi);
            });

            const popup = L.popup({ offset: [0, -25] }).setContent(`
              <div class="p-3 min-w-[180px]">
                <div class="font-black text-zinc-900 text-sm mb-1">${poi.name}</div>
                <div class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">${poi.type}</div>
                ${poi.address ? `<div class="text-[9px] text-zinc-600 mb-2">${poi.address}</div>` : ''}
                ${poi.amenities && poi.amenities.length > 0 ? `
                  <div class="flex flex-wrap gap-1 mb-2">
                    ${poi.amenities.map((a: string) => `<span class="text-[8px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-bold">${a}</span>`).join('')}
                  </div>
                ` : ''}
                ${poi.distance ? `<div class="text-[9px] text-zinc-500 mb-2">📍 ${(poi.distance / 1000).toFixed(1)} km away</div>` : ''}
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
            marker.bindPopup(popup);
            poiMarkersRef.current.push(marker);

            // Add Entrance Marker if available
            if (poi.entrance) {
              if (!poiIconsCacheRef.current['entrance']) {
                poiIconsCacheRef.current['entrance'] = renderToStaticMarkup(getEntranceIcon());
              }
              const entranceMarker = L.marker([poi.entrance.lat, poi.entrance.lon], { icon: L.divIcon({ html: `<div class="custom-entrance-icon">${poiIconsCacheRef.current['entrance']}</div>`, className: 'entrance-marker', iconAnchor: [12, 12] }) });
              if (markerClusterGroupRef.current) {
                entranceMarker.addTo(markerClusterGroupRef.current);
              } else {
                entranceMarker.addTo(mapInstanceRef.current!);
              }
              entranceMarker.bindPopup(`<div class="p-2 font-bold text-xs">${poi.name} Entrance</div>`);
              poiMarkersRef.current.push(entranceMarker);
            }

            // Add Exit Marker if available
            if (poi.exit) {
              if (!poiIconsCacheRef.current['exit']) {
                poiIconsCacheRef.current['exit'] = renderToStaticMarkup(getExitIcon());
              }
              const exitMarker = L.marker([poi.exit.lat, poi.exit.lon], { icon: L.divIcon({ html: `<div class="custom-exit-icon">${poiIconsCacheRef.current['exit']}</div>`, className: 'exit-marker', iconAnchor: [12, 12] }) });
              if (markerClusterGroupRef.current) {
                exitMarker.addTo(markerClusterGroupRef.current);
              } else {
                exitMarker.addTo(mapInstanceRef.current!);
              }
              exitMarker.bindPopup(`<div class="p-2 font-bold text-xs">${poi.name} Exit</div>`);
              poiMarkersRef.current.push(exitMarker);
            }
          }
        } catch (err) {
          console.error("Failed to render POI icon:", err instanceof Error ? err.message : String(err), poi.id);
        }
      });

      console.log(`Rendering ${poiMarkersRef.current.length} POI markers out of ${validPoisCount} valid POIs within range`);
      console.log("Show POIs:", showPois);
      console.log("POI Filters:", Array.from(poiFilters).join(', '));
      console.log("Marker Cluster Group:", markerClusterGroupRef.current ? "exists" : "null");

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
      
      return () => document.removeEventListener('click', handlePopupClick);
  }, [pois, showPois, poiFilters, mapCenter, isMapReady]);

  // Render traffic infrastructure markers — only on-route, only next 15 ahead, smaller icons
  useEffect(() => {
    const trafficMarkersRef: L.Marker[] = [];

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

        const marker = L.marker([item.position[0], item.position[1]], {
          icon: L.divIcon({
            html: `<div class="traffic-infrastructure-icon">${iconHtml}</div>`,
            className: 'traffic-marker',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          }),
          zIndexOffset: 500
        });

        marker.addTo(mapInstanceRef.current!);
        marker.bindTooltip(`<span class="text-xs font-bold">${item.name}</span>`, { permanent: false, direction: 'top', offset: [0, -12] });
        trafficMarkersRef.push(marker);
      } catch (error) {
        console.error('Error rendering traffic marker:', error);
      }
    });

    return () => {
      trafficMarkersRef.forEach(marker => marker.remove());
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
        
        // Pre-filter: corridor POIs get wider range (100mi), others 50mi
        const distToUser = calcDistMi(userLocation[0], userLocation[1], poi.lat, poi.lon);
        const maxDist = poi.corridorPoi ? 100 : 50;
        if (distToUser > maxDist) return false;

        const category = getPoiCategory(poi.type, poi.name);
        return poiFilters.has(category);
      })
      .slice(0, 80) // Limit to first 80 POIs within range to avoid heavy calculation
      .map(poi => {
        // Find POI's closest point on route
        let poiMinDist = Infinity;
        let poiRouteIdx = 0;
        
        // Optimization: search only a window ahead of the user (approx 150 miles / 2500 points)
        const searchStart = Math.max(0, userRouteIdx - 10);
        const searchEnd = Math.min(routePoints.length, userRouteIdx + 2500);
        
        for (let i = searchStart; i < searchEnd; i++) {
          const d = Math.pow(routePoints[i][0] - poi.lat, 2) + Math.pow(routePoints[i][1] - poi.lon, 2);
          if (d < poiMinDist) {
            poiMinDist = d;
            poiRouteIdx = i;
          }
        }
        
        // Calculate corridor distance (distance from route line in miles)
        const corridorDist = Math.sqrt(poiMinDist) * 69; // Rough deg to miles
        const distance = calcDistMi(userLocation[0], userLocation[1], poi.lat, poi.lon);

        return {
          ...poi,
          routeIdx: poiRouteIdx,
          distance,
          corridorDist
        };
      })
      // Only show POIs ahead of user AND within 10mi of route line
      .filter(poi => poi.routeIdx >= userRouteIdx - 5 && poi.distance > 0.5 && poi.corridorDist < 10)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 6);

    // Match fuel prices to upcoming POIs
    const withPrices = upcoming.map(poi => {
      const matched = fuelStations.find(s => matchFuelStationToPoi(s, poi.lat, poi.lon));
      return { ...poi, dieselPrice: matched?.dieselPrice || null };
    });

    setUpcomingPois(withPrices);
  }, [isDriving, pois.length, routePoints.length, userLocation ? userLocation[0] : null, userLocation ? userLocation[1] : null, Array.from(poiFilters).join(','), fuelStations.length]);;


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
            mapInstanceRef.current.flyTo([startPosition.lat, startPosition.lng], 17, {
              animate: true,
              duration: 1.5 
            });
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
              currentSpeed={telemetryContext?.speedRef.current || 0}
              trafficSigns={trafficInfrastructure.slice(0, 1)}
              eta={eta}
              milesRemaining={milesRemaining}
              timeRemaining={remainingDuration}
              streetName={nextInstruction.text || undefined}
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
          <>
            <div id="nav-map-container" ref={mapRef} className={`h-full w-full transition-opacity duration-500`}>
              {/* The contents of this div are dynamically generated by Leaflet at runtime */}
            </div>
            <SpeedLimitMarker mapInstance={isMapReady ? mapInstanceRef.current : null} currentSpeedLimit={currentSpeedLimit} userLocation={userLocation} />
          </>
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
      {isRoutePreview && alternativeRoutes.length > 1 && (
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
                    setRemainingDuration(route.durationSec);
                    
                    if (mapInstanceRef.current) {
                      clearRouteMarkers();
                      currentSegmentLineRef.current = null;
                      updateMapLine(mapInstanceRef.current, 'route', route.coords, idx === selectedRouteIndex ? '#D4AF37' : '#555', 8);
                      routeLineRef.current = { id: 'route', color: idx === selectedRouteIndex ? '#D4AF37' : '#555' };
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

      {/* Modern Navigation HUD */}
      {!isExploreMode && milesRemaining > 0 && !is3DMode && (
        <NavigationHUD nextInstruction={nextInstruction} parseLane={parseLane} />
      )}

      {/* Trip Progress HUD removed in favor of nav-arrival-hud */}


      {/* Map Controls consolidated in nav-map-controls below */}

      {/* Weather & Restriction Overlay */}
      {!selectedPoi && !isExploreMode && (
        <div id="nav-weather-overlay" className={`absolute left-2 md:left-4 z-[2000] flex flex-col gap-1 md:gap-2 transition-all duration-700 -translate-y-1/2 ${milesRemaining > 0 ? 'top-[55%]' : 'top-1/2'} scale-90 md:scale-100 origin-left`}>
          {restrictionAlerts.length > 0 && (
            <div className="bg-black/90 backdrop-blur-2xl border border-orange-500/30 rounded-xl md:rounded-2xl p-2 md:p-3 shadow-2xl w-36 md:w-64">
              <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 border-b border-orange-500/20 pb-1.5">
                <div className="p-1 md:p-1.5 bg-orange-500 rounded-lg">
                  <Truck className="w-3 h-3 md:w-4 md:h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] md:text-[10px] font-black text-orange-500 uppercase tracking-wider">Truck Restrictions ({restrictionAlerts.length})</span>
                  <span className="text-[6px] md:text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Safety Critical Alerts</span>
                </div>
              </div>
              <div className="space-y-1.5 max-h-32 md:max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {restrictionAlerts.map((alert, idx) => {
                  const Icon = alert.type === 'BRIDGE' ? Truck : Scale;
                  return (
                    <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                      alert.type === 'BRIDGE' ? 'bg-red-500/10 border-red-500/20' : 'bg-orange-500/10 border-orange-500/20'
                    }`}>
                      <div className={`p-1 rounded-md ${alert.type === 'BRIDGE' ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'}`}>
                        <Icon className="w-3 h-3 md:w-4 md:h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col">
                          <span className="text-[8px] md:text-[10px] font-black text-white uppercase truncate">{alert.type === 'BRIDGE' ? 'Low Bridge' : 'Weight Limit'}</span>
                          <span className="text-[7px] md:text-[9px] font-bold text-[#D4AF37] uppercase tracking-tighter">{alert.message}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {trafficAlerts.length > 0 && (
            <div className="bg-black/90 backdrop-blur-2xl border border-emerald-500/30 rounded-xl md:rounded-2xl p-2 md:p-3 shadow-2xl w-36 md:w-64">
              <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 border-b border-emerald-500/20 pb-1.5">
                <div className="p-1 md:p-1.5 bg-emerald-500 rounded-lg">
                  <TrafficCone className="w-3 h-3 md:w-4 md:h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] md:text-[10px] font-black text-emerald-500 uppercase tracking-wider">Traffic Alerts ({trafficAlerts.length})</span>
                  <span className="text-[6px] md:text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Road Features</span>
                </div>
              </div>
              <div className="space-y-1.5 max-h-32 md:max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {trafficAlerts.map((alert, idx) => {
                  const Icon = alert.type === 'STOP_SIGN' ? Octagon : TrafficCone;
                  return (
                    <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                      alert.type === 'STOP_SIGN' ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
                    }`}>
                      <div className={`p-1 rounded-md ${alert.type === 'STOP_SIGN' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
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
          )}

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
                <span className="text-[8px] md:text-[10px] font-black text-[#D4AF37] uppercase tracking-wider">Along Route</span>
              </div>
              {/* Cheapest Fuel Banner */}
              {(() => {
                const cheapest = findCheapestDiesel(fuelStations);
                if (!cheapest) return null;
                return (
                  <div data-testid="cheapest-fuel-banner" className="flex items-center gap-1.5 p-1.5 md:p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mb-1.5 cursor-pointer hover:bg-emerald-500/15 transition-colors"
                    onClick={() => {
                      const matchedPoi = pois.find(p => matchFuelStationToPoi(cheapest, p.lat, p.lon));
                      if (matchedPoi) setSelectedPoi(matchedPoi);
                    }}>
                    <Fuel className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="text-[7px] md:text-[8px] font-black text-emerald-400 truncate">Best: ${cheapest.dieselPrice?.toFixed(2)}</span>
                    <span className="text-[6px] md:text-[7px] text-zinc-500 truncate ml-auto">{cheapest.name}</span>
                  </div>
                );
              })()}
              <div className="flex flex-col gap-1 md:gap-1.5">
                {upcomingPois.map((poi, idx) => {
                  const category = getPoiCategory(poi.type, poi.name);
                  let Icon = MapIcon;
                  let iconColor = "text-zinc-400";
                  
                  const brandIds = ['loves', 'pilot', 'flying_j', 'petro', 'ta', 'road_ranger', 'kwik_trip', 'bucees', 'speedway', 'caseys', 'wawa', 'sheetz', 'quiktrip', 'racetrac', 'conoco'];
                  if (category === 'fuel' || brandIds.includes(category)) { Icon = Fuel; iconColor = "text-yellow-400"; }
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
                          <div className="flex items-center gap-1.5">
                            <span className="text-[6px] md:text-[8px] font-black text-zinc-500 uppercase truncate">{poi.type}</span>
                            {poi.dieselPrice && (
                              <span className="text-[7px] md:text-[9px] font-black text-emerald-400 tabular-nums">
                                ${poi.dieselPrice.toFixed(2)}
                              </span>
                            )}
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
                  onClick={clearRoute}
                  className="text-[8px] md:text-[9px] landscape:text-[7px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
                >
                  Clear All
                </button>
              </div>
              {waypoints.map((wp, index) => (
                <div key={wp.id} className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-4">
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
                    <div className={`p-3 rounded-xl ${wp.type === 'PAID' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'}`}>
                      {wp.type === 'PAID' ? <CircleDollarSign className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-0.5">{wp.type} STOP {index + 1}</span>
                      <span className="text-sm font-bold text-white truncate max-w-[250px]">{wp.address}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeWaypoint(wp.id)} 
                    className="p-2 rounded-xl bg-white/5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => handleNavigate().catch(err => {
                  console.error("Navigation failed from start route button:", err instanceof Error ? err.message : String(err));
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

          <div className={`w-full bg-black ${isSuggestionsVisible && suggestions.length > 0 ? 'rounded-t-2xl md:rounded-t-[2.5rem]' : 'rounded-2xl md:rounded-[2.5rem]'} border transition-all duration-500 ${isSearchFocused ? 'border-[#D4AF37] shadow-[0_40px_100px_rgba(212,175,55,0.4)] scale-[1.01]' : 'border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)]'}`}>
            <div className="flex items-center p-2 pl-6">
              <Search className={`w-5 h-5 mr-4 transition-colors ${isSearchFocused ? 'text-[#D4AF37]' : 'text-zinc-600'}`} />
              <input 
                id="nav-search-input"
                type="text" 
                placeholder={!isMapReady ? "System Booting..." : isCalculating ? "Mapping Path..." : "Search Address or POI..."} 
                className="flex-1 bg-transparent border-none outline-none text-white text-lg font-medium placeholder:text-zinc-700 tracking-tight py-4" 
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
              <button id="nav-search-button" onClick={() => {
                setIsSearchFocused(false);
                setIsSuggestionsVisible(false);
                handleNavigate().catch(err => {
                  console.error("Navigation failed from search button:", err instanceof Error ? err.message : String(err));
                  setError("Failed to calculate route. Please try again.");
                });
              }} disabled={!isMapReady} className={`flex items-center gap-3 px-8 py-4 rounded-2xl transition-all active:scale-95 ${searchQuery.trim() && !isCalculating ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' : 'bg-zinc-900 text-zinc-700'}`}>
                {isCalculating ? <Loader2 className="w-5 h-5 animate-spin" /> : <NavIcon className="w-5 h-5" />}
                <span className="font-black uppercase tracking-widest italic">{isCalculating ? 'Mapping' : 'Route'}</span>
              </button>
            </div>
          </div>
          {isSuggestionsVisible && suggestions.length > 0 && (
            <div className={`w-full bg-black rounded-b-2xl md:rounded-b-[2.5rem] landscape:rounded-b-2xl border-x border-b border-[#D4AF37]/40 shadow-[0_40px_100px_rgba(0,0,0,0.8)] animate-in slide-in-from-top-2 duration-300 ${milesRemaining > 0 ? 'max-h-[150px] md:max-h-[200px] landscape:max-h-[100px]' : 'max-h-[250px] md:max-h-[400px] landscape:max-h-[200px]'} overflow-y-auto custom-scrollbar`}>
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

      {/* ── Compass Rose — always visible, bottom-left of map ── */}
      <div
        className="absolute bottom-[calc(7rem+env(safe-area-inset-bottom))] left-3 md:left-5 z-[2005] pointer-events-none"
        data-testid="compass-rose-container"
      >
        <CompassRose isCompassMode={isCompassMode} />
      </div>

      {isDriving && !isExploreMode && !is3DMode && (
        <div id="nav-arrival-hud" className="absolute bottom-[calc(0.5rem+env(safe-area-inset-bottom))] md:bottom-8 landscape:bottom-[calc(0.25rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[2010] w-full max-w-[750px] px-2 md:px-6 pointer-events-none">
          <div className="bg-black border border-[#D4AF37]/30 rounded-2xl md:rounded-[2.5rem] landscape:rounded-2xl p-2 md:p-6 landscape:p-2 flex items-center justify-between shadow-[0_40px_100px_rgba(0,0,0,0.8)] pointer-events-auto transition-all hover:scale-[1.005]">
            <div className="flex items-center gap-2 shrink-0">
              <button id="nav-exit-button" onClick={handleCancelRoute} className="p-2 md:p-6 landscape:p-3 rounded-xl md:rounded-[1.5rem] landscape:rounded-xl bg-zinc-900 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90" title="Clear Route">
                <X className="w-4 h-4 md:w-7 md:h-7 landscape:w-5 landscape:h-5" strokeWidth={5} />
              </button>
              
              <button id="nav-reroute-button" onClick={handleReroute} className="p-2 md:p-6 landscape:p-3 rounded-xl md:rounded-[1.5rem] landscape:rounded-xl bg-zinc-900 text-zinc-600 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all active:scale-90" title="Recalculate Route">
                <RotateCcw className="w-4 h-4 md:w-7 md:h-7 landscape:w-5 landscape:h-5" strokeWidth={5} />
              </button>
            </div>

            <div className="flex items-center gap-2 md:gap-12 landscape:gap-4 overflow-x-auto no-scrollbar px-1 md:px-2">
              <div id="nav-stat-speed" className="flex flex-col items-center shrink-0">
                <span className="text-[7px] md:text-[10px] landscape:text-[8px] font-bold text-zinc-500 uppercase tracking-[0.25em] mb-0.5 md:mb-1 landscape:mb-0 h-3">Speed</span>
                <div className="flex items-center">
                  <span className={`text-lg md:text-4xl landscape:text-2xl font-bold tracking-tight leading-none ${currentSpeedLimit && speed > currentSpeedLimit ? 'text-red-500' : 'text-[#D4AF37]'}`}>
                    {context?.unitSystem === 'metric' ? Math.round(speed * 3.6) : Math.round(speed * 2.23694)}
                    <span className="text-[8px] md:text-xs landscape:text-[9px] text-zinc-600 ml-0.5 md:ml-1 font-bold uppercase">{context?.unitSystem === 'metric' ? 'km/h' : 'mph'}</span>
                  </span>
                  {currentSpeedLimit && (
                    <div className="ml-2">
                      <SpeedLimitSign limit={context?.unitSystem === 'metric' ? Math.round(currentSpeedLimit * 1.60934) : currentSpeedLimit} currentSpeed={context?.unitSystem === 'metric' ? Math.round(speed * 3.6) : Math.round(speed * 2.23694)} compact />
                    </div>
                  )}
                </div>
              </div>
              <div className="h-6 md:h-14 landscape:h-8 w-px bg-[#D4AF37]/20 shrink-0" />
              <div id="nav-stat-dist" className="flex flex-col shrink-0">
                <span className="text-[7px] md:text-[10px] landscape:text-[8px] font-bold text-zinc-500 uppercase tracking-[0.25em] mb-0.5 md:mb-1 landscape:mb-0">Target Dist</span>
                <span className="text-xl md:text-5xl landscape:text-3xl font-bold text-[#D4AF37] tracking-tight leading-none">
                  {context?.unitSystem === 'metric' 
                    ? (milesRemaining > 0 ? (milesRemaining * 1.60934).toFixed(1) : '---')
                    : (milesRemaining > 0 ? milesRemaining.toFixed(1) : '---')
                  }
                  <span className="text-[8px] md:text-xs landscape:text-[9px] text-zinc-600 ml-0.5 md:ml-1 font-bold uppercase">{context?.unitSystem === 'metric' ? 'km' : 'mi'}</span>
                </span>
              </div>
              <div className="h-6 md:h-14 landscape:h-8 w-px bg-[#D4AF37]/20 shrink-0" />
              <div id="nav-stat-duration" className="flex flex-col shrink-0">
                <span className="text-[7px] md:text-[10px] landscape:text-[8px] font-bold text-zinc-500 uppercase tracking-[0.25em] mb-0.5 md:mb-1 landscape:mb-0">Time</span>
                <span className="text-xl md:text-5xl landscape:text-3xl font-bold text-[#D4AF37] tracking-tight leading-none">
                  {remainingDuration > 0 ? `${Math.floor(remainingDuration / 3600)}h ${Math.floor((remainingDuration % 3600) / 60)}m` : '---'}
                </span>
              </div>
              <div className="h-6 md:h-14 landscape:h-8 w-px bg-[#D4AF37]/20 shrink-0" />
              {waypoints.length > 0 && (
                <>
                  <div id="nav-stat-stops" className="flex flex-col items-center shrink-0">
                    <span className="text-[7px] md:text-[10px] landscape:text-[8px] font-bold text-zinc-500 uppercase tracking-[0.25em] mb-0.5 md:mb-1 landscape:mb-0">Stops</span>
                    <span className="text-lg md:text-4xl landscape:text-2xl font-bold text-[#D4AF37] tracking-tight leading-none">
                      {waypoints.length}
                      <span className="text-[8px] md:text-xs landscape:text-[9px] text-zinc-600 ml-0.5 md:ml-1 font-bold uppercase">pts</span>
                    </span>
                  </div>
                  <div className="h-6 md:h-14 landscape:h-8 w-px bg-[#D4AF37]/20 shrink-0" />
                </>
              )}
              <div id="nav-stat-eta" className="flex flex-col items-end shrink-0">
                <div className="flex items-center gap-1 md:gap-3 landscape:gap-1.5">
                  <div className={`w-1.5 h-1.5 md:w-4 md:h-4 landscape:w-2 landscape:h-2 rounded-full ${userLocation ? 'bg-[#D4AF37] animate-pulse shadow-[0_0_10px_#D4AF37]' : 'bg-zinc-800'}`} />
                  <span className="text-lg md:text-4xl landscape:text-2xl font-bold text-white tracking-tight leading-none">{eta}</span>
                </div>
                <span className="text-[6px] md:text-[10px] landscape:text-[7px] font-bold text-zinc-500 uppercase tracking-[0.25em] mt-0.5 md:mt-1.5 landscape:mt-0.5">Verified ETA • LIVE</span>
              </div>
              {currentDestination !== 'Standby' && currentRoad && (
                <>
                  <div className="h-6 md:h-14 landscape:h-8 w-px bg-[#D4AF37]/20 shrink-0" />
                  <div className="flex items-center gap-4 md:gap-6 pr-2 md:pr-4 shrink-0">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
                        <span className="text-[#D4AF37] text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-60">Current Road</span>
                      </div>
                      <span className="text-white font-black text-sm md:text-2xl uppercase tracking-widest truncate max-w-[150px] md:max-w-md">
                        {currentRoad}
                      </span>
                    </div>
                    
                    {(() => {
                      const highwayMatch = currentRoad.match(/(I-|US-|SR-|Hwy|Route|State Route)\s*(\d+[A-Z]?)/i);
                      return highwayMatch ? (
                        <div className="scale-75 md:scale-110 origin-right">
                          <HighwayShield roadName={highwayMatch[0]} />
                        </div>
                      ) : null;
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <MapControls
        mapInstanceRef={mapInstanceRef}
        isFilterMenuOpen={isFilterMenuOpen}
        setIsFilterMenuOpen={setIsFilterMenuOpen}
        poiFilters={poiFilters}
        setPoiFilters={setPoiFilters}
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
        className={`-translate-y-1/2 ${milesRemaining > 0 ? 'top-[55%]' : 'top-1/2'}`}
      />
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

    
    </div>
  );
};

export default React.memo(NavigationView);