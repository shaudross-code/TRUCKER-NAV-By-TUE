import React, { useState, useEffect, useContext } from 'react';
import { 
  ShowerHead, 
  Wifi, 
  Utensils, 
  Scale, 
  Wrench, 
  Coffee, 
  WashingMachine, 
  MapPin, 
  Loader2
} from 'lucide-react';
import { fetchTruckStops } from '../services/geminiService';
import { AppContext, LocationContext } from '../types';
import { ViewType } from '../types';

const AmenityIcon: React.FC<{ name: string }> = ({ name }) => {
  const map: Record<string, any> = {
    'Showers': ShowerHead,
    'WiFi': Wifi,
    'Restaurant': Utensils,
    'Scale': Scale,
    'Tire Care': Wrench,
    'Arby\'s': Coffee,
    'Subway': Coffee,
    'Lounge': Coffee,
    'Diner': Utensils,
    'Laundry': WashingMachine
  };
  const Icon = map[name] || Coffee;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] rounded-lg text-[11px] font-semibold text-zinc-300 border border-zinc-800/50 hover:border-[#D4AF37]/30 transition-colors">
      <Icon className="w-3.5 h-3.5 text-[#D4AF37]" />
      {name}
    </div>
  );
};

interface ParkingData {
  name: string;
  location: string;
  distance: string;
  status: 'LIKELY OPEN' | 'FULL SOON' | 'FILLING UP';
  available: number;
  total: number;
  amenities: string[];
}

const ParkingCard: React.FC<ParkingData & { onClick?: () => void }> = ({ name, location, distance, status, available, total, amenities, onClick }) => {
  const progress = (available / total) * 100;
  
  const statusConfig = {
    'LIKELY OPEN': {
      text: 'text-[#D4AF37]',
      bg: 'bg-[#D4AF37]/10',
      border: 'border-[#D4AF37]/20',
      bar: 'bg-[#D4AF37]'
    },
    'FULL SOON': {
      text: 'text-rose-500',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      bar: 'bg-rose-500'
    },
    'FILLING UP': {
      text: 'text-zinc-400',
      bg: 'bg-zinc-800',
      border: 'border-zinc-700',
      bar: 'bg-zinc-600'
    }
  };

  const config = statusConfig[status] || statusConfig['FILLING UP'];

  return (
    <div 
      className="bg-[#0a0a0a] border border-zinc-900 rounded-[1.5rem] p-7 transition-all hover:border-[#D4AF37]/30 group cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-1.5 group-hover:text-[#D4AF37] transition-colors">{name}</h3>
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <MapPin className="w-3.5 h-3.5 text-[#D4AF37]/60" />
            <span>{location}</span>
            <span className="text-zinc-700">•</span>
            <span>{distance} away</span>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest border uppercase ${config.text} ${config.bg} ${config.border} shadow-lg shadow-black/50`}>
          {status}
        </span>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-end mb-3">
          <span className="text-zinc-500 text-[11px] font-black uppercase tracking-widest">Availability</span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black ${config.text}`}>{available}</span>
            <span className="text-zinc-500 font-bold">/</span>
            <span className="text-zinc-400 font-bold">{total} spots</span>
          </div>
        </div>
        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden shadow-inner">
          <div 
            className={`h-full ${config.bar} rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(212,175,55,0.4)]`} 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-6 border-t border-zinc-900/50">
        {amenities.map(a => <AmenityIcon key={a} name={a} />)}
      </div>
    </div>
  );
};

const PredictiveParking: React.FC = () => {
  const context = useContext(AppContext);
  const locationContext = useContext(LocationContext);
  const userLocation = locationContext?.userLocation;
  const [stops, setStops] = useState<ParkingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getStops() {
      if (!userLocation) return;
      try {
        setLoading(true);
        const data = await fetchTruckStops(userLocation[0], userLocation[1]);
        setStops(data);
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        setError('Failed to load parking data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    getStops().catch(err => console.error("Fetch stops failed:", err));
  }, [userLocation ? userLocation[0] : null, userLocation ? userLocation[1] : null]);

  const handleCardClick = (stop: ParkingData) => {
    if (context) {
      context.setNavTarget(`${stop.name}, ${stop.location}`);
      context.setActiveView(ViewType.NAVIGATION);
    }
  };

  return (
    <div className="p-10 max-w-[1400px] mx-auto bg-[#050505]">
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2 uppercase italic tracking-tighter">
            Predictive Parking<span className="text-lg align-top ml-0.5 text-[#D4AF37]">™</span>
          </h1>
          <p className="text-zinc-500 font-medium text-lg uppercase tracking-widest italic opacity-50">Real-time availability forecast for the next 2 hours.</p>
        </div>
        {loading && (
          <div className="flex items-center gap-3 text-[#D4AF37] font-black uppercase text-xs tracking-widest italic animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin" />
            Scanning Radius...
          </div>
        )}
      </div>

      {loading && stops.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-[#0a0a0a] border border-zinc-900 rounded-[1.5rem] p-7 h-64 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {stops.map((stop, i) => (
            <ParkingCard key={i} {...stop} onClick={() => handleCardClick(stop)} />
          ))}
        </div>
      )}
      {error && (
        <div className="text-center py-20">
          <p className="text-rose-500 font-bold">{error}</p>
        </div>
      )}
    </div>
  );
};

export default PredictiveParking;