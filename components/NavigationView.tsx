import React, { useEffect, useRef, useState, useContext } from 'react';
import { 
  Plus, 
  Minus, 
  X, 
  Search,
  Navigation as NavIcon,
  Loader2,
  Play,
  RotateCcw,
  ShieldCheck,
  Signal,
  Navigation,
  Wind,
  CloudSun,
  Eye,
  ArrowUp,
  AlertTriangle,
  Zap,
  TriangleAlert,
  Globe,
  Map as MapIcon,
  Layers
} from 'lucide-react';
import { AppContext } from '../App.tsx';
import { textToSpeech } from '../services/geminiService.ts';

interface NavigationViewProps {
  initialTarget?: string | null;
}

type MapStyle = 'NORMAL' | 'SATELLITE' | 'HYBRID';

const NavigationView: React.FC<NavigationViewProps> = ({ initialTarget }) => {
  const context = useContext(AppContext);
  const userLocation = context?.userLocation || [41.8781, -87.6298]; 
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const routeGroupRef = useRef<any>(null);
  const baseLayerGroupRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const simulationIntervalRef = useRef<any>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isDriving, setIsDriving] = useState(false);
  const [currentDestination, setCurrentDestination] = useState('Standby');
  const [milesRemaining, setMilesRemaining] = useState(0);
  const [initialMiles, setInitialMiles] = useState(0);
  const [eta, setEta] = useState('--:-- --');
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [isOverviewMode, setIsOverviewMode] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>('NORMAL');
  
  const [nextInstruction, setNextInstruction] = useState({ text: 'Ready for Route', distance: '0.0' });
  const [weather, setWeather] = useState({ temp: '42°', condition: 'Clear', wind: '12 MPH NW', visibility: '10 MI' });
  const [lanes, setLanes] = useState([true, true, false, false]);
  const [activeWarnings, setActiveWarnings] = useState([
    { id: 1, type: 'HAZARD', message: 'LOW CLEARANCE 13\'6"', icon: AlertTriangle, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
    { id: 2, type: 'WEATHER', message: 'HIGH WIND ADVISORY', icon: Wind, color: 'text-[#FFD700]', bg: 'bg-[#FFD700]/10' }
  ]);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current || !baseLayerGroupRef.current) return;
    baseLayerGroupRef.current.clearLayers();
    if (mapStyle === 'NORMAL') {
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(baseLayerGroupRef.current);
    } else if (mapStyle === 'SATELLITE') {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(baseLayerGroupRef.current);
    } else if (mapStyle === 'HYBRID') {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(baseLayerGroupRef.current);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', { zIndex: 1000 }).addTo(baseLayerGroupRef.current);
    }
  }, [mapStyle]);

  const lastSpokenRef = useRef('');
  useEffect(() => {
    if (isDriving && nextInstruction.text !== 'Ready for Route' && nextInstruction.text !== lastSpokenRef.current) {
      const phrase = `${nextInstruction.distance === '0.0' ? 'Now' : 'In ' + nextInstruction.distance + ' miles'}, ${nextInstruction.text}`;
      textToSpeech(phrase);
      lastSpokenRef.current = nextInstruction.text;
    }
  }, [nextInstruction.text, isDriving]);

  const handleNavigate = async (target?: string) => {
    const query = target || searchQuery;
    if (!query || !query.trim() || isCalculating) return;
    const L = (window as any).L;
    if (!L) return;
    setIsCalculating(true);
    setIsSearchFocused(false);
    setIsDriving(false);
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, { headers: { 'Accept-Language': 'en' } });
      const geoData = await geoRes.json();
      if (!geoData || geoData.length === 0) { alert("Location not found."); setIsCalculating(false); return; }
      const destLat = parseFloat(geoData[0].lat);
      const destLon = parseFloat(geoData[0].lon);
      const destName = geoData[0].display_name.split(',')[0];
      const routeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${userLocation[1]},${userLocation[0]};${destLon},${destLat}?overview=full&geometries=geojson&steps=true`);
      const routeData = await routeRes.json();
      if (!routeData.routes || routeData.routes.length === 0) { alert("No route found."); setIsCalculating(false); return; }
      const route = routeData.routes[0];
      const coords = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);
      const distMi = route.distance / 1609.34;
      const durationSec = route.duration;
      let firstManeuver = "Head towards route";
      let firstDist = "0.0";
      if (route.legs[0]?.steps[0]) {
        const step = route.legs[0].steps[0];
        firstManeuver = step.maneuver.instruction || "Proceed to the highlighted road";
        firstDist = (step.distance / 1609.34).toFixed(1);
      }
      setNextInstruction({ text: firstManeuver, distance: firstDist });
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
      L.polyline(coords, { color: '#D4AF37', weight: 14, opacity: 0.15, lineCap: 'round' }).addTo(routeGroupRef.current);
      L.polyline(coords, { color: '#D4AF37', weight: 6, opacity: 1, lineCap: 'round', lineJoin: 'round' }).addTo(routeGroupRef.current);
      setRoutePoints(coords);
      setMilesRemaining(parseFloat(distMi.toFixed(1)));
      setInitialMiles(distMi);
      setCurrentDestination(destName);
      setSearchQuery('');
      const arrival = new Date();
      arrival.setSeconds(arrival.getSeconds() + durationSec);
      setEta(arrival.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
      const bounds = routeGroupRef.current.getBounds();
      if (bounds.isValid()) { mapInstanceRef.current.flyToBounds(bounds, { padding: [120, 120], duration: 1.5 }); }
      setIsCalculating(false);
      if (context) context.setNavTarget(null);
      textToSpeech(`Route to ${destName} calculated. ${firstManeuver}.`);
      lastSpokenRef.current = firstManeuver; 
    } catch (err) { console.error("Routing Error:", err); setIsCalculating(false); }
  };

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || mapInstanceRef.current) return;
    const initialPos = userLocation;
    const map = L.map(mapRef.current, { center: initialPos, zoom: 15, zoomControl: false, attributionControl: false });
    mapInstanceRef.current = map;
    baseLayerGroupRef.current = L.layerGroup().addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(baseLayerGroupRef.current);
    routeGroupRef.current = L.featureGroup().addTo(map);
    const userIcon = L.divIcon({
      className: 'user-marker',
      html: `<div class="relative flex items-center justify-center">
          <div class="absolute w-12 h-12 bg-[#D4AF37]/10 rounded-full animate-ping"></div>
          <div class="w-10 h-10 bg-black rounded-full shadow-[0_0_20px_rgba(212,175,55,0.5)] flex items-center justify-center border-[3px] border-[#D4AF37] z-10">
            <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[12px] border-b-[#D4AF37] transform transition-transform duration-300 vehicle-pointer"></div>
          </div>
        </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
    userMarkerRef.current = L.marker(initialPos, { icon: userIcon, zIndexOffset: 2000 }).addTo(map);
    setIsMapReady(true);
    if (initialTarget) { setTimeout(() => handleNavigate(initialTarget), 500); }
    const interval = setInterval(() => map.invalidateSize(), 3000);
    return () => { clearInterval(interval); if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, []);

  useEffect(() => {
    if (userLocation && userMarkerRef.current && !isDriving) {
      userMarkerRef.current.setLatLng(userLocation);
      if (!isOverviewMode && mapInstanceRef.current) { mapInstanceRef.current.panTo(userLocation); }
    }
  }, [userLocation, isDriving, isOverviewMode]);

  useEffect(() => {
    if (isDriving && routePoints.length > 0 && milesRemaining > 0) {
      simulationIntervalRef.current = setInterval(() => {
        setMilesRemaining(prev => {
          const step = 0.05;
          const nextMiles = Math.max(0, parseFloat((prev - step).toFixed(2)));
          const progress = 1 - (nextMiles / initialMiles);
          const idx = Math.floor(progress * (routePoints.length - 1));
          if (routePoints[idx] && userMarkerRef.current) {
            const currentPos = routePoints[idx];
            userMarkerRef.current.setLatLng(currentPos);
            if (routePoints[idx + 1]) {
              const p1 = routePoints[idx];
              const p2 = routePoints[idx + 1];
              const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * (180 / Math.PI);
              const markerEl = userMarkerRef.current.getElement()?.querySelector('.vehicle-pointer');
              if (markerEl) markerEl.style.transform = `rotate(${angle + 90}deg)`;
            }
            if (!isOverviewMode && mapInstanceRef.current) { mapInstanceRef.current.panTo(currentPos, { animate: true, duration: 0.5 }); }
          }
          return nextMiles;
        });
      }, 500);
    } else { clearInterval(simulationIntervalRef.current); }
    return () => clearInterval(simulationIntervalRef.current);
  }, [isDriving, routePoints, initialMiles, isOverviewMode]);

  return (
    <div className="h-full w-full relative bg-[#050505] overflow-hidden font-sans">
      <div ref={mapRef} className={`h-full w-full transition-opacity duration-500 ${mapStyle === 'NORMAL' ? 'grayscale-[0.2] contrast-[1.1] brightness-[0.7]' : ''}`} />

      {/* Turn Instruction Header - Now Gold Themed */}
      <div className={`absolute top-0 left-0 right-0 z-[2100] transition-all duration-700 ease-in-out ${milesRemaining > 0 ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="bg-gradient-to-b from-black/95 to-black/60 backdrop-blur-3xl border-b border-[#D4AF37]/20 p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-10">
              <div className="bg-[#D4AF37] p-6 rounded-[2rem] shadow-2xl shadow-[#D4AF37]/30">
                <ArrowUp className="w-14 h-14 text-black" strokeWidth={4} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline gap-3">
                  <span className="text-7xl font-[1000] text-white tracking-tighter leading-none">{nextInstruction.distance}</span>
                  <span className="text-3xl font-black text-[#D4AF37] uppercase">mi</span>
                </div>
                <span className="text-2xl font-black text-white italic uppercase tracking-tight mt-1 truncate max-w-[500px]">
                  {nextInstruction.text}
                </span>
                
                <div className="flex gap-2.5 mt-4">
                  {lanes.map((isHighlighted, idx) => (
                    <div key={idx} className={`p-2.5 rounded-xl border transition-all duration-500 ${isHighlighted ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] scale-110' : 'bg-white/5 border-white/10 text-white/20'}`}>
                      <ArrowUp className="w-6 h-6" strokeWidth={4} />
                    </div>
                  ))}
                  <div className="ml-4 flex items-center gap-2">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Guidance: Optimal Lane Selection</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl px-5 py-3 mb-4 flex items-center gap-3">
                 <Zap className="w-4 h-4 text-[#D4AF37] animate-pulse" />
                 <span className="text-xs font-black text-white uppercase tracking-widest italic">TUE Fleet Protocol</span>
              </div>
              <span className="text-[12px] font-black text-zinc-500 uppercase tracking-[0.4em] mb-2">Primary Route</span>
              <span className="text-4xl font-[1000] text-[#D4AF37] tracking-tighter uppercase italic">{currentDestination}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Control - Now Gold Themed */}
      <div className="absolute top-48 right-10 z-[2010] flex flex-col gap-4 items-end">
        <div className="bg-black/80 backdrop-blur-2xl border border-[#D4AF37]/20 rounded-[2.5rem] p-4 shadow-2xl transition-all">
          <div className="flex flex-col gap-2">
            {[
              { id: 'NORMAL', icon: MapIcon, label: 'Normal' },
              { id: 'SATELLITE', icon: Globe, label: 'Satellite' },
              { id: 'HYBRID', icon: Layers, label: 'Hybrid' }
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
                <span className="text-[11px] font-black uppercase tracking-widest italic">{style.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 items-end mt-4">
          {activeWarnings.map((warning) => (
            <div key={warning.id} className={`${warning.bg} backdrop-blur-3xl border border-[#D4AF37]/20 rounded-[2rem] p-5 shadow-2xl flex items-center gap-5 max-w-[320px] animate-pulse`}>
              <div className={`p-4 rounded-2xl bg-black/40 ${warning.color}`}>
                <warning.icon className="w-8 h-8" strokeWidth={3} />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] mb-1">{warning.type}</span>
                <span className={`text-[15px] font-[1000] uppercase italic tracking-tighter leading-tight ${warning.color}`}>
                  {warning.message}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weather Overlay */}
      <div className="absolute top-48 left-10 z-[2000] flex flex-col gap-4">
        <div className="bg-black/80 backdrop-blur-2xl border border-[#D4AF37]/20 rounded-[2.5rem] p-6 shadow-2xl w-64 transition-all">
          <div className="flex items-center justify-between mb-8">
             <CloudSun className="w-8 h-8 text-[#D4AF37]" />
             <span className="text-4xl font-[1000] text-white tracking-tighter">{weather.temp}</span>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-zinc-500">
                <Wind className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Wind</span>
              </div>
              <span className="text-sm font-black text-white uppercase italic">{weather.wind}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-zinc-500">
                <Eye className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Visibility</span>
              </div>
              <span className="text-sm font-black text-white uppercase italic">{weather.visibility}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search HUD - Gold Bordered */}
      <div className={`absolute transition-all duration-700 z-[2005] left-1/2 -translate-x-1/2 w-full max-w-[550px] px-6 ${milesRemaining > 0 ? 'top-[440px]' : 'top-8'}`}>
        <div className={`w-full bg-black/90 backdrop-blur-3xl rounded-[2.5rem] border transition-all duration-500 ${isSearchFocused ? 'border-[#D4AF37] shadow-[0_0_50px_rgba(212,175,55,0.3)]' : 'border-[#D4AF37]/20 shadow-2xl'}`}>
          <div className="flex items-center p-2 pl-7">
            <Search className={`w-5 h-5 mr-5 transition-colors ${isSearchFocused ? 'text-[#D4AF37]' : 'text-zinc-700'}`} />
            <input type="text" placeholder={!isMapReady ? "System Booting..." : isCalculating ? "Mapping Path..." : "Enter Professional Destination..."} className="flex-1 bg-transparent border-none outline-none text-white text-lg font-black placeholder:text-zinc-800 tracking-tight py-4" value={searchQuery} disabled={isCalculating || !isMapReady} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)} onKeyDown={(e) => e.key === 'Enter' && handleNavigate()} />
            <button onClick={() => handleNavigate()} disabled={!isMapReady} className={`flex items-center gap-3 px-8 py-3.5 rounded-full transition-all active:scale-95 mr-1 ${searchQuery.trim() && !isCalculating ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' : 'bg-zinc-900 text-zinc-700'}`}>
              {isCalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <NavIcon className="w-4 h-4" />}
              <span className="text-[12px] font-black uppercase tracking-widest italic">{isCalculating ? 'Mapping' : 'Route'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="absolute right-10 top-2/3 z-[1000] flex flex-col gap-5">
        <button onClick={() => mapInstanceRef.current?.zoomIn()} className="p-6 bg-black/95 backdrop-blur-3xl border border-[#D4AF37]/20 rounded-[2rem] text-[#D4AF37] shadow-xl hover:bg-zinc-900 active:scale-90 transition-all"><Plus strokeWidth={4} /></button>
        <button onClick={() => mapInstanceRef.current?.zoomOut()} className="p-6 bg-black/95 backdrop-blur-3xl border border-[#D4AF37]/20 rounded-[2rem] text-[#D4AF37] shadow-xl hover:bg-zinc-900 active:scale-90 transition-all"><Minus strokeWidth={4} /></button>
        <button onClick={() => { if (userLocation && mapInstanceRef.current) { mapInstanceRef.current.setView(userLocation, 17, { animate: true }); setIsOverviewMode(false); } }} className="p-6 bg-black/95 backdrop-blur-3xl border border-[#D4AF37]/20 rounded-[2rem] text-[#D4AF37] shadow-xl hover:text-[#FFD700] active:scale-90 transition-all"><RotateCcw strokeWidth={4} /></button>
      </div>

      {/* Arrival HUD */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[2010] w-full max-w-[850px] px-6 pointer-events-none">
        <div className="bg-black border border-[#D4AF37]/30 rounded-[3.5rem] p-8 flex items-center justify-between shadow-[0_40px_100px_rgba(0,0,0,0.8)] pointer-events-auto transition-all hover:scale-[1.005]">
          <button onClick={() => window.location.reload()} className="p-8 rounded-[2.5rem] bg-zinc-900 text-zinc-600 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all active:scale-90">
            <X className="w-10 h-10" strokeWidth={5} />
          </button>

          <div className="flex items-center gap-16">
            <div className="flex flex-col">
              <span className="text-[12px] font-black text-zinc-500 uppercase tracking-[0.25em] mb-1">Target Dist</span>
              <span className="text-6xl font-[1000] text-[#D4AF37] tracking-tighter italic leading-none">
                {milesRemaining > 0 ? milesRemaining : '---'}
                <span className="text-sm text-zinc-600 ml-2 font-black uppercase">mi</span>
              </span>
            </div>
            <div className="h-20 w-px bg-[#D4AF37]/20" />
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-4">
                <div className={`w-5 h-5 rounded-full ${userLocation ? 'bg-[#D4AF37] animate-pulse shadow-[0_0_10px_#D4AF37]' : 'bg-zinc-800'}`} />
                <span className="text-5xl font-[1000] text-white tracking-tighter italic leading-none">{eta}</span>
              </div>
              <span className="text-[12px] font-black text-zinc-500 uppercase tracking-[0.25em] mt-2">Verified ETA • LIVE</span>
            </div>
          </div>

          <button onClick={() => milesRemaining > 0 ? setIsDriving(!isDriving) : {}} className={`p-10 rounded-[3rem] transition-all active:scale-95 shadow-2xl ${milesRemaining > 0 ? 'bg-[#D4AF37] text-black shadow-[#D4AF37]/30' : 'bg-zinc-900 text-zinc-800 cursor-not-allowed'}`}>
            {isDriving ? <X className="w-12 h-12" strokeWidth={4} /> : <Play className={`w-12 h-12 fill-black translate-x-1`} strokeWidth={4} />}
          </button>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_350px_rgba(0,0,0,0.95)]" />
    </div>
  );
};

export default NavigationView;