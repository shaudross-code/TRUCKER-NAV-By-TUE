import React, { useEffect, useRef, useState } from 'react';
import { 
  Plus, 
  Minus, 
  Navigation, 
  Radar,
  MapPin,
  Map as MapIcon,
  Globe,
} from 'lucide-react';

const LayerToggle: React.FC<{ icon: any, label: string, active?: boolean, onClick?: () => void }> = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-5 px-6 py-5 rounded-3xl border transition-all duration-300 ${
      active 
        ? 'bg-[#d4af37]/10 border-[#d4af37]/40 text-[#d4af37] shadow-[0_0_30px_rgba(212,175,55,0.2)]' 
        : 'bg-white/50 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-400'
    }`}
  >
    <Icon className={`w-5 h-5 ${active ? 'text-[#d4af37]' : ''}`} />
    <span className="text-[11px] font-[1000] uppercase tracking-[0.3em] italic">{label}</span>
  </button>
);

const FullMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const labelsLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const hasCenteredInitially = useRef(false);
  
  const [activeLayers, setActiveLayers] = useState<string[]>(['POI', 'RADAR']);
  const [mapType, setMapType] = useState<'NORMAL' | 'SATELLITE'>('NORMAL');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const toggleLayer = (layer: string) => {
    setActiveLayers(prev => prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]);
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newPos: [number, number] = [latitude, longitude];
          setUserLocation(newPos);
          
          if (!hasCenteredInitially.current && mapInstance.current) {
            mapInstance.current.setView(newPos, 14);
            hasCenteredInitially.current = true;
          }
        },
        (error) => {
          if (!userLocation) setUserLocation([41.8781, -87.6298]); 
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setUserLocation([41.8781, -87.6298]);
    }
  }, []);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainer.current) return;
    
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapContainer.current!, {
        center: userLocation || [41.8781, -87.6298], 
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });
    }

    const map = mapInstance.current;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    if (labelsLayerRef.current) map.removeLayer(labelsLayerRef.current);

    if (mapType === 'NORMAL') {
      tileLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png').addTo(map);
      const tilePane = map.getPane('tilePane');
      if (tilePane) {
        tilePane.style.filter = 'sepia(0.9) contrast(1.4) brightness(0.85) saturate(1.8) hue-rotate(-15deg)';
      }
    } else {
      tileLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(map);
      labelsLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', { zIndex: 1000 }).addTo(map);
      const tilePane = map.getPane('tilePane');
      if (tilePane) tilePane.style.filter = 'none'; 
    }
  }, [mapType]);

  useEffect(() => {
    const L = (window as any).L;
    if (!mapInstance.current || !userLocation || !L) return;
    const map = mapInstance.current;

    if (activeLayers.includes('RADAR')) {
      const radarIcon = L.divIcon({
        className: 'user-radar-marker',
        html: `
          <div class="relative flex items-center justify-center w-[300px] h-[300px]">
            <div class="absolute inset-0 border border-[#d4af37]/20 rounded-full"></div>
            <div class="absolute inset-0 border-[1.5px] border-[#d4af37]/30 rounded-full animate-radar-pulse"></div>
            <div class="absolute inset-0 animate-radar-sweep flex items-center justify-center">
              <div class="w-[1.5px] h-[150px] bg-[#d4af37] absolute right-1/2 top-1/2 -translate-y-full origin-bottom-right shadow-[0_0_15px_#d4af37]"></div>
            </div>
            <div class="z-10 relative flex items-center justify-center">
              <div class="w-11 h-11 rounded-[1.2rem] bg-gradient-to-br from-[#FFD700] via-[#FFFACD] to-[#D4AF37] border-[3px] border-white shadow-[0_0_50px_rgba(255,215,0,1)] flex items-center justify-center transform rotate-45">
                <div class="w-3 h-3 bg-white rounded-full -rotate-45 shadow-[0_0_12px_white]"></div>
              </div>
            </div>
          </div>
        `,
        iconSize: [300, 300],
        iconAnchor: [150, 150]
      });

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker(userLocation, { icon: radarIcon, zIndexOffset: 3000 }).addTo(map);
      } else {
        userMarkerRef.current.setLatLng(userLocation);
        userMarkerRef.current.setIcon(radarIcon);
      }
    } else if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
    }
  }, [activeLayers, userLocation]);

  return (
    <div className="h-full w-full relative bg-[#fcf9f2] overflow-hidden">
      <div ref={mapContainer} className="h-full w-full z-0" />
      
      <div className="absolute top-12 left-12 z-10 space-y-8 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-3xl border border-[#d4af37]/40 p-10 rounded-[3rem] shadow-2xl w-[360px] pointer-events-auto">
          <div className="flex items-center gap-5 mb-10">
            <div className="p-4 bg-[#d4af37]/15 rounded-2xl border border-[#d4af37]/30">
              <Radar className="w-9 h-9 text-[#d4af37] animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-[1000] text-zinc-900 italic uppercase leading-none tracking-tighter">TRUCKERS NAV Radar</h2>
              <p className="text-[11px] text-[#b8860b] font-black uppercase tracking-[0.4em] mt-2.5">Active Monitoring</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-12 right-12 z-10 flex flex-col gap-8 items-end pointer-events-none">
        <div className="bg-white/90 backdrop-blur-3xl border border-[#d4af37]/40 p-10 rounded-[4rem] shadow-2xl w-[320px] pointer-events-auto">
          <div className="flex bg-zinc-100 p-1.5 rounded-2xl mb-4 border border-zinc-200/50">
            <button onClick={() => setMapType('NORMAL')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${mapType === 'NORMAL' ? 'bg-white shadow-md text-[#d4af37]' : 'text-zinc-400'}`}>
              <MapIcon className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Normal</span>
            </button>
            <button onClick={() => setMapType('SATELLITE')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${mapType === 'SATELLITE' ? 'bg-white shadow-md text-[#d4af37]' : 'text-zinc-400'}`}>
              <Globe className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Satellite</span>
            </button>
          </div>
          <div className="flex flex-col gap-4">
             <LayerToggle icon={Radar} label="Active Radar" active={activeLayers.includes('RADAR')} onClick={() => toggleLayer('RADAR')} />
             <LayerToggle icon={MapPin} label="Truck POIs" active={activeLayers.includes('POI')} onClick={() => toggleLayer('POI')} />
          </div>
        </div>
        
        <div className="bg-white/95 backdrop-blur-3xl border border-zinc-100 p-4 rounded-[3rem] flex flex-col gap-4 shadow-2xl pointer-events-auto border-[#d4af37]/20">
            <button onClick={() => userLocation && mapInstance.current?.setView(userLocation, 15)} className="p-6 bg-[#d4af37]/15 hover:bg-[#d4af37]/25 text-[#b8860b] rounded-[2rem] transition-all border border-[#d4af37]/30">
              <Navigation className="w-7 h-7" />
            </button>
            <button onClick={() => mapInstance.current?.zoomIn()} className="p-6 hover:bg-zinc-50 text-zinc-400 hover:text-[#d4af37] rounded-[2rem] border border-zinc-100"><Plus className="w-7 h-7" /></button>
            <button onClick={() => mapInstance.current?.zoomOut()} className="p-6 hover:bg-zinc-50 text-zinc-400 hover:text-[#d4af37] rounded-[2rem] border border-zinc-100"><Minus className="w-7 h-7" /></button>
        </div>
      </div>
    </div>
  );
};

export default FullMap;