import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  useMap, 
  useAdvancedMarkerRef
} from '@vis.gl/react-google-maps';
import { 
  X, 
  Search,
  Navigation as NavIcon,
  Loader2,
  Map as MapIcon,
  Truck,
  MapPin
} from 'lucide-react';
import { getRoute } from '../src/services/hereRoutingService';
import { AppContext, LocationContext, TelemetryContext, RouteHistoryItem, POI } from '../types';
import { speak } from '../services/speechService';
import { SpeedLimitSign } from './MapUI';
import { getPoiIcon, getPoiCategory } from './PoiIcon';
import { decode } from '@here/flexpolyline';
import { useFirebase } from './FirebaseProvider';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { safeStringify } from '../utils';

interface NavigationViewProps {
  initialTarget?: string | null;
  userLocation: [number, number] | null;
}

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

const FALLBACK_LOCATION: [number, number] = [39.0119, -98.4842];

import React, { useEffect, useRef, useMemo } from 'react';
import { 
  AdvancedMarker, 
  useMap, 
  useAdvancedMarkerRef
} from '@vis.gl/react-google-maps';
import { Truck, MapPin } from 'lucide-react';
import { getPoiIcon, getPoiCategory } from './PoiIcon';

const FALLBACK_LOCATION: [number, number] = [39.0119, -98.4842];

export const GoogleMap: React.FC<{
  userLocation: [number, number] | null;
  destinationCoords: [number, number] | null;
  routePoints: [number, number][];
  pois: any[];
  poiFilters: Set<string>;
  isFollowMode: boolean;
  onMarkerClick: (poi: any) => void;
}> = ({ 
  userLocation, 
  destinationCoords, 
  routePoints, 
  pois, 
  poiFilters, 
  isFollowMode, 
  onMarkerClick
}) => {
  const map = useMap();
  const [userMarkerRef] = useAdvancedMarkerRef();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  const safeUserLocation = useMemo(() => {
    if (userLocation && Array.isArray(userLocation) && typeof userLocation[0] === 'number') return userLocation;
    return FALLBACK_LOCATION;
  }, [userLocation]);

  // Update polyline
  useEffect(() => {
    if (!map || routePoints.length < 2) {
      if (polylineRef.current) polylineRef.current.setMap(null);
      return;
    }

    if (polylineRef.current) polylineRef.current.setMap(null);

    polylineRef.current = new google.maps.Polyline({
      path: routePoints.map(p => ({ lat: p[0], lng: p[1] })),
      geodesic: true,
      strokeColor: '#D4AF37',
      strokeOpacity: 0.8,
      strokeWeight: 6,
      map: map
    });

    return () => {
      if (polylineRef.current) polylineRef.current.setMap(null);
    };
  }, [map, routePoints]);

  // Follow mode
  useEffect(() => {
    if (map && isFollowMode && safeUserLocation) {
      map.panTo({ lat: safeUserLocation[0], lng: safeUserLocation[1] });
    }
  }, [map, isFollowMode, safeUserLocation]);

  return (
    <>
      <AdvancedMarker
        ref={userMarkerRef}
        position={{ lat: safeUserLocation[0], lng: safeUserLocation[1] }}
        title="Your Location"
      >
        <div className="relative">
          <div className="w-8 h-8 bg-[#D4AF37] rounded-full border-4 border-white shadow-xl flex items-center justify-center">
            <Truck className="w-4 h-4 text-black" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
        </div>
      </AdvancedMarker>

      {destinationCoords && (
        <AdvancedMarker
          position={{ lat: destinationCoords[0], lng: destinationCoords[1] }}
          title="Destination"
        >
          <div className="w-8 h-8 bg-rose-500 rounded-full border-4 border-white shadow-xl flex items-center justify-center">
            <MapPin className="w-4 h-4 text-white" />
          </div>
        </AdvancedMarker>
      )}

      {pois.filter(p => poiFilters.has(getPoiCategory(p.type, p.name))).map(poi => (
        <AdvancedMarker
          key={poi.id}
          position={{ lat: poi.lat, lng: poi.lon }}
          onClick={() => onMarkerClick(poi)}
        >
          <div className="p-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg hover:border-[#D4AF37]/50 transition-all">
             {getPoiIcon(poi.type, poi.name)}
          </div>
        </AdvancedMarker>
      ))}
    </>
  );
};

const GoogleMapsNavigationView: React.FC<NavigationViewProps> = ({ initialTarget, userLocation: propUserLocation }) => {
  const { user, profile, updateProfile } = useFirebase();
  const context = useContext(AppContext);
  const locationContext = useContext(LocationContext);
  const telemetryContext = useContext(TelemetryContext);
  const speed = React.useSyncExternalStore(
    telemetryContext?.subscribe || (() => () => {}),
    () => telemetryContext?.speedRef.current || 0
  );

  const userLocation = useMemo(() => {
    return propUserLocation || locationContext?.userLocation || FALLBACK_LOCATION;
  }, [propUserLocation, locationContext?.userLocation]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [currentDestination, setCurrentDestination] = useState(() => localStorage.getItem('nav_current_destination') || 'Standby');
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(() => {
    const saved = localStorage.getItem('nav_destination_coords');
    return saved ? JSON.parse(saved) : null;
  });
  const [milesRemaining, setMilesRemaining] = useState(0);
  const [eta, setEta] = useState('--:-- --');
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [isFollowMode, setIsFollowMode] = useState(true);
  const [pois, setPois] = useState<POI[]>([]); // Start with empty array, fetch real POIs only

  // Persistence for destination
  useEffect(() => {
    localStorage.setItem('nav_current_destination', currentDestination);
  }, [currentDestination]);

  useEffect(() => {
    if (destinationCoords) {
      localStorage.setItem('nav_destination_coords', safeStringify(destinationCoords));
    } else {
      localStorage.removeItem('nav_destination_coords');
    }
  }, [destinationCoords]);

  // Use only custom POIs from profile (no static fake POIs)
  useEffect(() => {
    const customPois = profile?.customPois || [];
    setPois(customPois);
  }, [profile?.customPois]);

  const brandIds = ['loves', 'pilot', 'flying_j', 'petro', 'ta', 'road_ranger', 'kwik_trip', 'bucees', 'speedway', 'caseys', 'wawa', 'sheetz', 'quiktrip', 'racetrac', 'conoco'];
  const [poiFilters] = useState<Set<string>>(new Set([...brandIds, 'fuel', 'parking', 'rest_area', 'weigh_station', 'food', 'service', 'distribution', 'other']));
  const [selectedPoi, setSelectedPoi] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveCustomPOI = async (poi: Omit<POI, 'id' | 'isCustom'>) => {
    if (!user || !profile) return;
    const newPoi: POI = {
      ...poi,
      id: `custom-${Date.now()}`,
      isCustom: true
    };
    const updatedPois = [...(profile.customPois || []), newPoi];
    try {
      await updateProfile({ customPois: updatedPois });
      speak(`Saved ${poi.name} to your custom locations.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleNavigate = async (target: string) => {
    setIsCalculating(true);
    setError(null);
    try {
      const data = await getRoute(
        `${userLocation[0]},${userLocation[1]}`,
        target,
        context?.truckProfile
      );

      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        const polyline = route.sections[0].polyline;
        const decodedPoints = decode(polyline).polyline;
        setRoutePoints(decodedPoints as [number, number][]);
        
        const summary = route.sections[0].summary;
        setMilesRemaining(Math.round(summary.length / 1609.34));
        
        const arrivalTime = new Date(Date.now() + summary.duration * 1000);
        setEta(arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        
        setCurrentDestination(target);
        const lastPoint = decodedPoints[decodedPoints.length - 1];
        setDestinationCoords([lastPoint[0], lastPoint[1]]);

        // Save to Route History in Firestore
        if (user) {
          const historyItem: Omit<RouteHistoryItem, 'id'> = {
            origin: 'Current Location',
            destination: target,
            distance: Math.round(summary.length / 1609.34),
            duration: summary.duration,
            date: new Date().toISOString(),
            status: 'COMPLETED' // For now, we'll just mark it as completed when started for history
          };
          try {
            await addDoc(collection(db, 'users', user.uid, 'history'), {
              ...historyItem,
              createdAt: serverTimestamp()
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/history`);
          }
        }
      } else {
        throw new Error('No route found');
      }
    } catch (err) {
      console.error('Navigation error:', err);
      setError('Failed to calculate route');
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    if (initialTarget && initialTarget !== currentDestination) {
      handleNavigate(initialTarget);
    }
  }, [initialTarget]);

  if (!hasValidKey) {
    return (
      <div className="flex items-center justify-center h-full bg-[#050505] font-sans p-6">
        <div className="text-center max-w-lg bg-black/40 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
          <div className="bg-[#D4AF37]/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#D4AF37]">
            <MapIcon className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4 uppercase tracking-widest italic">Google Maps API Key Required</h2>
          <p className="text-zinc-400 mb-8 leading-relaxed">To enable professional navigation, please add your Google Maps Platform API key as a secret in AI Studio.</p>
          
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="bg-[#D4AF37] text-black w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <p className="text-sm text-zinc-300">Get an API Key from the <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noopener" className="text-[#D4AF37] hover:underline">Google Cloud Console</a></p>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="bg-[#D4AF37] text-black w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</div>
              <div className="text-sm text-zinc-300">
                <p className="mb-2">Open <strong>Settings</strong> (⚙️ gear icon, top-right) → <strong>Secrets</strong></p>
                <p>Add <code>GOOGLE_MAPS_PLATFORM_KEY</code> as the name and paste your key as the value.</p>
              </div>
            </div>
          </div>
          
          <p className="mt-8 text-[10px] text-zinc-500 uppercase tracking-[0.2em]">The application will rebuild automatically after you add the secret.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#050505]">
      <APIProvider apiKey={API_KEY} version="weekly" onLoad={() => console.log("Google Maps API loaded")}>
        <Map
          defaultCenter={{ lat: userLocation?.[0] ?? FALLBACK_LOCATION[0], lng: userLocation?.[1] ?? FALLBACK_LOCATION[1] }}
          defaultZoom={13}
          mapId="DEMO_MAP_ID"
          disableDefaultUI={true}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          onDragstart={() => setIsFollowMode(false)}
          style={{ width: '100%', height: '100%' }}
        >
          <MapContent 
            userLocation={userLocation}
            destinationCoords={destinationCoords}
            routePoints={routePoints}
            pois={pois}
            poiFilters={poiFilters}
            isFollowMode={isFollowMode}
            onMarkerClick={setSelectedPoi}
          />
        </Map>
      </APIProvider>

      {/* Navigation UI Overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 pointer-events-none flex justify-between items-start">
        {/* Search Bar */}
        <div className="w-96 pointer-events-auto">
          <div className="relative group">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNavigate(searchQuery)}
              placeholder="Search Destination..."
              className="w-full bg-[#0a0a0a]/90 backdrop-blur-xl border border-zinc-800 rounded-2xl px-12 py-4 text-white font-bold placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/50 transition-all shadow-2xl"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-[#D4AF37] transition-colors" />
            {isCalculating && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D4AF37] animate-spin" />
            )}
          </div>
        </div>

        {/* Speed & Heading */}
        <div className="flex flex-col items-end gap-4 pointer-events-auto">
          <div className="bg-[#0a0a0a]/90 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 flex flex-col items-center shadow-2xl">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">Speed</span>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black text-white italic tracking-tighter">{Math.round(speed)}</span>
              <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">MPH</span>
            </div>
          </div>
          <SpeedLimitSign limit={65} currentSpeed={speed} />
        </div>
      </div>

      {/* Bottom Navigation Info */}
      {routePoints.length > 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl pointer-events-auto">
          <div className="bg-[#0a0a0a]/95 backdrop-blur-2xl border border-zinc-800 rounded-[2.5rem] p-8 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-8">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">Destination</span>
                <span className="text-xl font-black text-white italic truncate max-w-[200px]">{currentDestination}</span>
              </div>
              <div className="w-px h-12 bg-zinc-800" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">Distance</span>
                <span className="text-xl font-black text-[#D4AF37] italic">{milesRemaining} MI</span>
              </div>
              <div className="w-px h-12 bg-zinc-800" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">Arrival</span>
                <span className="text-xl font-black text-white italic">{eta}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setIsFollowMode(!isFollowMode)}
                className={`p-4 rounded-2xl border transition-all ${isFollowMode ? 'bg-[#D4AF37] border-[#D4AF37] text-black' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
              >
                <NavIcon className="w-6 h-6" />
              </button>
              <button 
                onClick={() => {
                  setRoutePoints([]);
                  setCurrentDestination('Standby');
                  setDestinationCoords(null);
                }}
                className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POI Info Window */}
      {selectedPoi && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 pointer-events-auto">
          <div className="bg-[#0a0a0a] border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800">
                  {getPoiIcon(selectedPoi.type, selectedPoi.name)}
                </div>
                <button onClick={() => setSelectedPoi(null)} className="p-2 text-zinc-600 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-1">{selectedPoi.name}</h3>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">{selectedPoi.type}</p>
              
              <button 
                onClick={() => {
                  handleNavigate(selectedPoi.name);
                  setSelectedPoi(null);
                }}
                className="w-full bg-[#D4AF37] text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#FFD700] transition-all mb-3"
              >
                Route to POI
              </button>

              {!selectedPoi.isCustom && (
                <button 
                  onClick={() => {
                    saveCustomPOI({
                      name: selectedPoi.name,
                      lat: selectedPoi.lat,
                      lon: selectedPoi.lon,
                      type: selectedPoi.type,
                      address: selectedPoi.address,
                      rating: selectedPoi.rating
                    });
                    setSelectedPoi(null);
                  }}
                  className="w-full bg-zinc-900 text-[#D4AF37] border border-[#D4AF37]/20 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#D4AF37]/10 transition-all"
                >
                  Save to Favorites
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest shadow-2xl animate-pulse">
          {error}
        </div>
      )}
    </div>
  );
};

export default GoogleMapsNavigationView;
