import React, { useState, useEffect, useContext } from 'react';
import { 
  DollarSign, 
  Map as MapIcon, 
  Clock, 
  Fuel, 
  TrendingUp,
  Plus,
  Minus,
  X,
  CloudSun,
  Wind,
  Droplets,
  Cloud,
  Sun,
  CloudRain,
  Navigation,
  Coffee,
  Truck,
  AlertTriangle,
  Wrench
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, CartesianGrid } from 'recharts';
import { AppContext } from '../types';
import { textToSpeech } from '../services/geminiService';
import TruckProfileModal from './TruckProfileModal';
import { ViewType } from '../types';

const TruckProfileCard: React.FC = () => {
  const context = useContext(AppContext);
  const truckProfile = context?.truckProfile;
  const setTruckProfile = context?.setTruckProfile;
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!truckProfile || !setTruckProfile) return null;

  return (
    <>
      <div className="bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] md:rounded-[3rem] p-6 md:p-10 flex flex-col shadow-2xl group hover:border-[#D4AF37]/30 transition-all duration-700">
        <div className="flex justify-between items-center mb-8 md:mb-12">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="bg-[#D4AF37] p-3 md:p-4 rounded-xl md:rounded-2xl text-black shadow-[0_0_20px_rgba(212,175,55,0.3)]">
              <Truck className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight">Truck Profile</h2>
              <p className="text-[8px] md:text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest">Active Unit 702</p>
            </div>
          </div>
        </div>
        <div className="space-y-6 md:space-y-8 flex-1">
          <div className="flex justify-between items-end border-b border-white/5 pb-3 md:pb-4">
            <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-zinc-600">Max Height</span>
            <span className="text-2xl md:text-3xl font-bold text-white tracking-tight">{truckProfile.height}<span className="text-xs text-zinc-700 ml-1">FT</span></span>
          </div>
          <div className="flex justify-between items-end border-b border-white/5 pb-3 md:pb-4">
            <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-zinc-600">Gross Weight</span>
            <span className="text-2xl md:text-3xl font-bold text-white tracking-tight">{truckProfile.weight.toLocaleString()}<span className="text-xs text-zinc-700 ml-1">LBS</span></span>
          </div>
          <div className="flex justify-between items-end border-b border-white/5 pb-3 md:pb-4">
            <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-zinc-600">Total Length</span>
            <span className="text-2xl md:text-3xl font-bold text-white tracking-tight">{truckProfile.length}<span className="text-xs text-zinc-700 ml-1">FT</span></span>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-zinc-600">Hazmat Status</span>
            <span className={`text-lg md:text-xl font-bold uppercase tracking-widest ${truckProfile.hazmat ? 'text-rose-500' : 'text-emerald-500'}`}>
              {truckProfile.hazmat ? 'Restricted' : 'Cleared'}
            </span>
          </div>
        </div>
        <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">System Verified</span>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 md:px-6 py-1.5 md:py-2 bg-white/5 hover:bg-[#D4AF37] hover:text-black rounded-full text-[8px] md:text-[10px] font-bold text-white uppercase tracking-widest transition-all"
          >
            Modify
          </button>
        </div>
      </div>
      <TruckProfileModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        profile={truckProfile} 
        onSave={setTruckProfile} 
      />
    </>
  );
};


const chartData = [
  { name: 'Mon', value: 850 },
  { name: 'Tue', value: 920 },
  { name: 'Wed', value: 780 },
  { name: 'Thu', value: 1100 },
  { name: 'Fri', value: 950 },
  { name: 'Sat', value: 450 },
  { name: 'Sun', value: 0 },
];

const MetricCard: React.FC<{ 
  icon: any, 
  label: string, 
  value: string, 
  trend?: string, 
  target?: string, 
  iconBg: string, 
  iconColor: string,
  progress?: number,
  onClick?: () => void,
  isInteractive?: boolean
}> = ({ icon: Icon, label, value, trend, target, iconBg, iconColor, progress, onClick, isInteractive }) => (
  <div 
    onClick={onClick}
    className={`bg-black/80 backdrop-blur-3xl border border-white/10 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] relative overflow-hidden group transition-all duration-500 ${isInteractive ? 'cursor-pointer hover:border-[#D4AF37]/50 hover:bg-zinc-900/50' : ''}`}
  >
    <div className="flex justify-between items-start mb-4 md:mb-6">
      <div>
        <div className="text-zinc-600 text-[8px] md:text-[10px] font-bold uppercase tracking-widest mb-1 md:mb-2">{label}</div>
        <div className="text-2xl md:text-4xl font-bold text-white tracking-tight leading-none">{value}</div>
      </div>
      <div className={`${iconBg} ${iconColor} p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/5 shadow-inner transition-transform group-hover:scale-110`}>
        <Icon className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
      </div>
    </div>
    
    {progress !== undefined && (
      <div className="mt-6">
        <div className="flex justify-between items-end mb-2">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{target || 'Target Progress'}</span>
          <span className="text-[11px] font-bold text-[#D4AF37]">{progress.toFixed(2)}%</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <div 
            className={`h-full ${iconBg} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(212,175,55,0.3)]`} 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>
    )}

    {trend && (
      <div className="mt-4 flex items-center gap-2">
        <TrendingUp className="w-3 h-3 text-emerald-500" />
        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{trend}</span>
      </div>
    )}

    {target && !progress && (
      <div className="text-[11px] text-zinc-600 font-bold uppercase tracking-widest mt-4">
        Target: <span className="text-white ml-1">{target}</span>
      </div>
    )}

    {isInteractive && (
      <div className="absolute bottom-3 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Update Entry</div>
      </div>
    )}
  </div>
);

interface WeatherData {
  temp: number;
  condition: string;
  windSpeed: number;
  windDir: string;
  precip: number;
  locationName: string;
}

const WeatherAnalyticsCard: React.FC = () => {
  const context = useContext(AppContext);
  const userLocation = context?.userLocation;
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lastFetchPos = React.useRef<[number, number] | null>(null);

  useEffect(() => {
    async function fetchWeather() {
      if (!userLocation) return;
      
      const [lat, lon] = userLocation;
      
      // Only fetch if we haven't fetched yet or if moved > 5km (~0.045 degrees)
      if (lastFetchPos.current) {
        const [lastLat, lastLon] = lastFetchPos.current;
        const dist = Math.sqrt(Math.pow(lat - lastLat, 2) + Math.pow(lon - lastLon, 2));
        if (dist < 0.045) return;
      }

      try {
        // Only show loading pulse on initial load
        if (!weather) setLoading(true);
        
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
           headers: { 
             'Accept-Language': 'en',
             'User-Agent': 'TruckersNav/1.0'
           }
        });
        const geoData = await geoRes.json();
        if (!geoData || !geoData.address) {
          throw new Error("Invalid geolocation data received");
        }
        const city = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.suburb || "Unknown Site";

        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph`);
        const weatherData = await weatherRes.json();
        if (!weatherData || !weatherData.current_weather) {
            throw new Error("Invalid weather data received");
        }
        const current = weatherData.current_weather;
        lastFetchPos.current = [lat, lon];
        
        setWeather({
          temp: Math.round(current.temperature),
          condition: getWeatherCondition(current.weathercode),
          windSpeed: Math.round(current.windspeed),
          windDir: getWindDirection(current.winddirection),
          precip: 0,
          locationName: city
        });
      } catch (err) {
        console.error("Weather fetch failed", err);
        setError("Weather data unavailable.");
        setWeather(null);
      } finally {
        setLoading(false);
      }
    }
    fetchWeather().catch(err => console.error("Dashboard weather fetch failed:", err));
  }, [userLocation]);

  const getWeatherCondition = (code: number) => {
    if (code === 0) return "Clear";
    if (code <= 3) return "Partly Cloudy";
    if (code <= 48) return "Foggy";
    if (code <= 67) return "Rainy";
    if (code <= 77) return "Snowy";
    return "Stormy";
  };

  const getWindDirection = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(deg / 45) % 8];
  };

  const WeatherIcon = () => {
    if (!weather) return <CloudSun className="w-6 h-6 md:w-8 md:h-8" />;
    if (weather.condition === "Clear") return <Sun className="w-6 h-6 md:w-8 md:h-8 text-[#D4AF37]" />;
    if (weather.condition.includes("Cloudy")) return <CloudSun className="w-6 h-6 md:w-8 md:h-8 text-[#D4AF37]" />;
    if (weather.condition.includes("Rainy") || weather.condition.includes("Stormy")) return <CloudRain className="w-6 h-6 md:w-8 md:h-8 text-[#D4AF37]" />;
    return <Cloud className="w-6 h-6 md:w-8 md:h-8 text-zinc-500" />;
  };

  return (
    <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] group transition-all hover:border-[#D4AF37]/30 flex flex-col justify-between shadow-2xl">
      <div>
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <div className="flex-1">
            <div className="text-zinc-600 text-[8px] md:text-[10px] font-bold uppercase tracking-widest mb-2 md:mb-3 flex items-center gap-2">
              <Navigation className="w-3 h-3 text-[#D4AF37]" />
              Local Environment
            </div>
            {loading ? (
              <div className="h-8 md:h-12 w-24 md:w-32 bg-white/5 rounded-xl md:rounded-2xl animate-pulse mb-1" />
            ) : (
              <div className="text-2xl md:text-4xl font-bold text-white tracking-tight flex items-baseline gap-2 md:gap-3 leading-none">
                {weather?.temp}°F
                <span className="text-[#D4AF37] font-bold text-[8px] md:text-xs uppercase tracking-widest">
                  {weather?.condition}
                </span>
              </div>
            )}
          </div>
          <div className="bg-[#D4AF37] p-3 md:p-4 rounded-xl md:rounded-2xl text-black shadow-[0_0_20px_rgba(212,175,55,0.3)]">
            <WeatherIcon />
          </div>
        </div>

        {error ? (
          <div className="text-center py-6">
            <p className="text-rose-500 text-xs font-black uppercase tracking-widest">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl flex items-center gap-4 border border-white/5">
              <Wind className="w-5 h-5 text-[#D4AF37]" />
              <div>
                <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Wind</div>
                <div className="text-xs font-bold text-white uppercase">
                  {loading ? "..." : `${weather?.windSpeed} mph ${weather?.windDir}`}
                </div>
              </div>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl flex items-center gap-4 border border-white/5">
              <Droplets className="w-5 h-5 text-[#D4AF37]" />
              <div>
                <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Precip</div>
                <div className="text-xs font-bold text-white uppercase">{loading ? "..." : `${weather?.precip}%`}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse shadow-[0_0_15px_#D4AF37]" />
            <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">
              {weather && weather.temp > 0 ? "Optimal Surface" : "Caution: Icy"}
            </span>
         </div>
         <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest truncate max-w-[120px]">
           {loading ? "Locating..." : (weather?.locationName || "Unknown")}
         </span>
      </div>
    </div>
  );
};

const QuickActions: React.FC = () => {
  const context = useContext(AppContext);
  const setActiveView = context?.setActiveView;
  const setNavTarget = context?.setNavTarget;
  const setEldStatus = context?.setEldStatus;

  const actions = [
    { 
      label: 'Find Fuel', 
      icon: Fuel, 
      color: 'text-yellow-400', 
      bg: 'bg-yellow-400/10',
      onClick: () => {
        setNavTarget?.('truck stops');
        setActiveView?.(ViewType.NAVIGATION);
      }
    },
    { 
      label: 'Start Break', 
      icon: Coffee, 
      color: 'text-blue-400', 
      bg: 'bg-blue-400/10',
      onClick: () => {
        setEldStatus?.(prev => ({ ...prev, status: 'OFF' }));
      }
    },
    { 
      label: 'Load Board', 
      icon: TrendingUp, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-400/10',
      onClick: () => setActiveView?.(ViewType.LOAD_BOARD)
    },
    { 
      label: 'Maintenance', 
      icon: Wrench, 
      color: 'text-rose-400', 
      bg: 'bg-rose-400/10',
      onClick: () => setActiveView?.(ViewType.MAINTENANCE)
    },
  ];

  return (
    <div className="bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl group hover:border-[#D4AF37]/30 transition-all duration-700">
      <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight mb-8">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-[#D4AF37]/30 hover:bg-white/10 transition-all group/btn"
          >
            <div className={`${action.bg} ${action.color} p-4 rounded-2xl mb-3 group-hover/btn:scale-110 transition-transform`}>
              <action.icon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest group-hover/btn:text-white transition-colors">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const context = useContext(AppContext);
  const eldStatus = context?.eldStatus;
  const setEldStatus = context?.setEldStatus;
  const speed = context?.speed || 0;
  const idleSeconds = context?.idleSeconds || 0;
  const breakSuggestion = context?.breakSuggestion || false;
  const setBreakSuggestion = context?.setBreakSuggestion || (() => {});
  const hasViolation = context?.hasViolation || false;

  const weeklyEarnings = context?.weeklyEarnings || 0;
  const setWeeklyEarnings = context?.setWeeklyEarnings || (() => {});
  const milesThisWeek = context?.milesThisWeek || 0;
  const setMilesThisWeek = context?.setMilesThisWeek || (() => {});
  const fuelCost = context?.fuelCost || 0;
  const setFuelCost = context?.setFuelCost || (() => {});
  const truckCost = context?.truckCost || 0;
  const setTruckCost = context?.setTruckCost || (() => {});
  const weekDeductions = context?.weekDeductions || 0;
  const setWeekDeductions = context?.setWeekDeductions || (() => {});

  const [isEarningsInputOpen, setIsEarningsInputOpen] = useState(false);
  const [newEntryValue, setNewEntryValue] = useState('');

  const [isMilesInputOpen, setIsMilesInputOpen] = useState(false);
  const [newMilesEntry, setNewMilesEntry] = useState('');

  const [isFuelInputOpen, setIsFuelInputOpen] = useState(false);
  const [newFuelEntry, setNewFuelEntry] = useState('');

  const [isTruckCostInputOpen, setIsTruckCostInputOpen] = useState(false);
  const [newTruckCostEntry, setNewTruckCostEntry] = useState('');

  const [isDeductionsInputOpen, setIsDeductionsInputOpen] = useState(false);
  const [newDeductionsEntry, setNewDeductionsEntry] = useState('');

  const lastViolationRef = React.useRef(false);
  const lastSuggestionRef = React.useRef(false);
  const playedAlertsRef = React.useRef<Record<string, Set<number>>>({});

  useEffect(() => {
    if (hasViolation && !lastViolationRef.current) {
      textToSpeech("Attention: Hours of Service violation detected. Immediate stop required.").catch(err => console.error("Violation TTS failed:", err));
    }
    lastViolationRef.current = hasViolation;
  }, [hasViolation]);

  useEffect(() => {
    if (breakSuggestion && !lastSuggestionRef.current) {
      textToSpeech("Stationary detected. Would you like to switch to on duty status?").catch(err => console.error("Break suggestion TTS failed:", err));
    }
    lastSuggestionRef.current = breakSuggestion;
  }, [breakSuggestion]);

  useEffect(() => {
    if (!eldStatus || eldStatus.status === 'OFF' || eldStatus.status === 'SB') {
      // Clear alerts when off duty
      playedAlertsRef.current = {};
      return;
    }

    eldStatus.timers.forEach(timer => {
      const { label, seconds } = timer;
      if (!playedAlertsRef.current[label]) {
        playedAlertsRef.current[label] = new Set();
      }

      // Check thresholds: 1 hour (3600), 30 min (1800), 15 min (900)
      const thresholds = [3600, 1800, 900];
      thresholds.forEach(threshold => {
        if (seconds <= threshold && seconds > 0 && !playedAlertsRef.current[label].has(threshold)) {
          const minutes = threshold / 60;
          const timeText = minutes >= 60 ? "1 hour" : `${minutes} minutes`;
          textToSpeech(`HOS Warning: ${timeText} remaining for ${label}.`).catch(err => console.error("HOS Warning TTS failed:", err));
          playedAlertsRef.current[label].add(threshold);
        }
      });

      // Reset threshold if timer is replenished (e.g. after a break)
      if (seconds > 3600) {
        playedAlertsRef.current[label].delete(3600);
      }
      if (seconds > 1800) {
        playedAlertsRef.current[label].delete(1800);
      }
      if (seconds > 900) {
        playedAlertsRef.current[label].delete(900);
      }
    });
  }, [eldStatus]);

  // ELD Dynamic Timers
  // Removed local timers state as it's now global in AppContext

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const getHOSMetric = () => {
    if (!eldStatus) return { label: 'Drive Time Left', value: '00:00', progress: 0 };

    // 10 Hour Reset (Off Duty or Sleeper Berth)
    if (eldStatus.status === 'OFF' || eldStatus.status === 'SB') {
      const progress = ((36000 - eldStatus.resetSeconds) / 36000) * 100;
      return { 
        label: '10 HOUR RESET', 
        value: formatTime(eldStatus.resetSeconds), 
        progress 
      };
    }

    // Break Time Left (Stationary for > 10 minutes)
    if (idleSeconds > 600) {
      const breakRemaining = Math.max(0, 1800 - idleSeconds);
      const progress = ((1800 - breakRemaining) / 1800) * 100;
      return {
        label: 'BREAK TIME LEFT',
        value: formatTime(breakRemaining),
        progress
      };
    }

    const driveTimer = eldStatus.timers.find(t => t.label === 'Drive Time');

    return { 
      label: 'DRIVE TIME LEFT', 
      value: driveTimer ? formatTime(driveTimer.seconds) : '00:00', 
      progress: driveTimer ? (driveTimer.seconds / driveTimer.total) * 100 : 0 
    };
  };

  const hosMetric = getHOSMetric();

  const handleAdjustEarnings = (mode: 'add' | 'subtract') => {
    const amount = parseFloat(newEntryValue);
    if (!isNaN(amount) && amount > 0) {
      setWeeklyEarnings(prev => mode === 'add' ? prev + amount : Math.max(0, prev - amount));
      setNewEntryValue('');
      setShowEarningsInput(false);
    }
  };

  const handleAddMiles = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(newMilesEntry);
    if (!isNaN(amount) && amount > 0) {
      setMilesThisWeek(prev => prev + amount);
      setNewMilesEntry('');
      setShowMilesInput(false);
    }
  };

  const handleAddFuel = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newFuelEntry);
    if (!isNaN(amount) && amount > 0) {
      setFuelCost(prev => prev + amount);
      setNewFuelEntry('');
      setIsFuelInputOpen(false);
    }
  };

  const handleAddTruckCost = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newTruckCostEntry);
    if (!isNaN(amount) && amount > 0) {
      setTruckCost(prev => prev + amount);
      setNewTruckCostEntry('');
      setIsTruckCostInputOpen(false);
    }
  };

  const handleAddDeductions = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newDeductionsEntry);
    if (!isNaN(amount) && amount > 0) {
      setWeekDeductions(prev => prev + amount);
      setNewDeductionsEntry('');
      setIsDeductionsInputOpen(false);
    }
  };

  const handleNewWeek = () => {
    setWeeklyEarnings(0);
    setMilesThisWeek(0);
    setFuelCost(0);
    setTruckCost(0);
    setWeekDeductions(0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  useEffect(() => {
    // Welcome message to initialize audio on first load
    const timer = setTimeout(() => {
      textToSpeech("Command Center Active. System Online.").catch(err => console.error("Welcome TTS failed:", err));
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-4 md:p-10 max-w-[1400px] mx-auto bg-[#050505] relative">
      {/* HOS Violation Warning */}
      {hasViolation && (
        <div className="mb-6 md:mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-rose-500/10 border border-rose-500/50 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between shadow-[0_0_50px_rgba(244,63,94,0.1)] gap-4">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="bg-rose-500 p-3 md:p-4 rounded-xl md:rounded-2xl text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse">
                <AlertTriangle className="w-6 h-6 md:w-8 md:h-8" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-rose-500 text-xl md:text-2xl font-bold uppercase leading-none mb-1">HOS Violation Detected</h2>
                <p className="text-zinc-400 font-bold text-[10px] md:text-sm uppercase tracking-widest">Immediate Action Required: Pull over and switch to Off-Duty status</p>
              </div>
            </div>
            <div className="w-full md:w-auto text-center px-6 md:px-8 py-3 md:py-4 bg-rose-500 rounded-xl md:rounded-2xl text-white font-bold uppercase tracking-widest text-[10px] md:text-sm shadow-lg shadow-rose-500/20">
              Critical Warning
            </div>
          </div>
        </div>
      )}

      {/* Break Suggestion Prompt */}
      {breakSuggestion && (
        <div className="fixed bottom-20 lg:bottom-10 right-4 lg:right-10 z-[5000] w-[calc(100%-2rem)] md:w-[400px] animate-in slide-in-from-right-10 duration-500">
          <div className="bg-black border border-[#D4AF37] rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 shadow-[0_0_50px_rgba(212,175,55,0.2)] backdrop-blur-3xl">
            <div className="flex items-start gap-4">
              <div className="bg-[#D4AF37] p-3 rounded-xl text-black">
                <Coffee className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold uppercase text-lg">Stationary Detected</h3>
                <p className="text-zinc-500 text-sm mt-1 font-bold">You've been stationary for 5 minutes. Would you like to switch to On-Duty status?</p>
                <div className="flex gap-3 mt-4">
                  <button 
                    onClick={() => {
                      setEldStatus?.(prev => ({ ...prev, status: 'ON' }));
                      setBreakSuggestion(false);
                    }}
                    className="flex-1 bg-[#D4AF37] text-black py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#B8860B] transition-all"
                  >
                    Go On Duty
                  </button>
                  <button 
                    onClick={() => setBreakSuggestion(false)}
                    className="flex-1 bg-zinc-900 text-zinc-500 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:text-white transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-1 md:mb-2 uppercase italic tracking-tighter">Command Center</h1>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-[10px] md:text-sm font-bold uppercase tracking-widest">System Status:</span>
            <span className="text-[#D4AF37] font-bold uppercase text-[10px] md:text-sm tracking-widest animate-pulse">Online</span>
          </div>
        </div>
        <div className="flex gap-3 md:gap-4 w-full md:w-auto">
          <button
            onClick={handleNewWeek}
            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all border border-rose-500/20"
          >
            New Week
          </button>
          <div className="flex-1 md:flex-none px-4 md:px-5 py-2 md:py-2.5 bg-[#0a0a0a] border border-zinc-900 rounded-xl md:rounded-2xl flex items-center justify-center md:justify-start gap-3">
            <div className="flex flex-col items-center md:items-end">
              <span className="text-[8px] md:text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Current Speed</span>
              <span className="text-lg md:text-xl font-bold text-[#D4AF37] leading-none">{speed} <span className="text-[10px] text-zinc-600">MPH</span></span>
            </div>
          </div>
          <div className="flex-1 md:flex-none px-4 md:px-5 py-2 md:py-2.5 bg-[#0a0a0a] border border-zinc-900 rounded-xl md:rounded-2xl flex items-center justify-center md:justify-start gap-3">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#D4AF37] animate-ping" />
            <span className="text-[8px] md:text-[10px] font-bold text-white uppercase tracking-widest">Live Telemetry</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6 mb-10 relative">
        <div className="relative">
          <MetricCard 
            icon={DollarSign} 
            label="Weekly Gross" 
            value={formatCurrency(weeklyEarnings)} 
            trend="+12.5% vs last week" 
            iconBg="bg-[#D4AF37]/10"
            iconColor="text-[#D4AF37]"
            isInteractive={true}
            onClick={() => {
              setIsEarningsInputOpen(!isEarningsInputOpen);
              setIsMilesInputOpen(false);
              setIsFuelInputOpen(false);
            }}
          />
          {isEarningsInputOpen && (
            <div className="absolute top-full left-0 right-0 mt-3 z-50 bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Adjust Weekly Earnings</span>
                <button onClick={() => setIsEarningsInputOpen(false)} className="text-zinc-600 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</div>
                  <input autoFocus type="number" step="0.01" value={newEntryValue} onChange={(e) => setNewEntryValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdjustEarnings('add')} placeholder="0.00" className="w-full bg-[#050505] border border-zinc-800 rounded-xl py-2.5 pl-7 pr-3 text-white text-sm font-bold focus:border-[#D4AF37] focus:outline-none transition-colors placeholder:text-zinc-800" />
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => handleAdjustEarnings('subtract')} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white p-2.5 rounded-xl transition-all"><Minus className="w-5 h-5" /></button>
                  <button onClick={() => handleAdjustEarnings('add')} className="bg-[#D4AF37] hover:bg-[#B8860B] text-black p-2.5 rounded-xl transition-all shadow-lg shadow-[#D4AF37]/20"><Plus className="w-5 h-5" /></button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <MetricCard 
            icon={MapIcon} 
            label="Miles This Week" 
            value={formatNumber(milesThisWeek)} 
            target="3,200 mi" 
            iconBg="bg-[#D4AF37]/10"
            iconColor="text-[#D4AF37]"
            isInteractive={true}
            onClick={() => {
              setIsMilesInputOpen(!isMilesInputOpen);
              setIsEarningsInputOpen(false);
              setIsFuelInputOpen(false);
            }}
          />
          {isMilesInputOpen && (
            <div className="absolute top-full left-0 right-0 mt-3 z-50 bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Add Manual Miles</span>
                <button onClick={() => setIsMilesInputOpen(false)} className="text-zinc-600 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddMiles} className="flex gap-2">
                <input autoFocus type="number" value={newMilesEntry} onChange={(e) => setNewMilesEntry(e.target.value)} placeholder="Enter miles" className="flex-1 bg-[#050505] border border-zinc-800 rounded-xl py-2.5 px-4 text-white text-sm font-bold focus:border-[#D4AF37] focus:outline-none transition-colors placeholder:text-zinc-800" />
                <button type="submit" className="bg-[#D4AF37] hover:bg-[#B8860B] text-black p-2.5 rounded-xl transition-all shadow-lg shadow-[#D4AF37]/20"><Plus className="w-5 h-5" /></button>
              </form>
            </div>
          )}
        </div>

        <MetricCard 
          icon={Clock} 
          label={hosMetric.label} 
          value={hosMetric.value} 
          progress={hosMetric.progress}
          iconBg="bg-[#D4AF37]/10"
          iconColor="text-[#D4AF37]"
        />

        <div className="relative">
          <MetricCard 
            icon={Fuel} 
            label="FUEL COST" 
            value={formatCurrency(fuelCost)} 
            iconBg="bg-[#D4AF37]/10"
            iconColor="text-[#D4AF37]"
            isInteractive={true}
            onClick={() => {
              setIsFuelInputOpen(!isFuelInputOpen);
              setIsEarningsInputOpen(false);
              setIsMilesInputOpen(false);
              setIsDeductionsInputOpen(false);
            }}
          />
          {isFuelInputOpen && (
            <div className="absolute top-full left-0 right-0 mt-3 z-50 bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Add Fuel Expense</span>
                <button onClick={() => setIsFuelInputOpen(false)} className="text-zinc-600 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddFuel} className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</div>
                  <input autoFocus type="number" step="0.01" value={newFuelEntry} onChange={(e) => setNewFuelEntry(e.target.value)} placeholder="0.00" className="w-full bg-[#050505] border border-zinc-800 rounded-xl py-2.5 pl-7 pr-3 text-white text-sm font-bold focus:border-[#D4AF37] focus:outline-none transition-colors placeholder:text-zinc-800" />
                </div>
                <button type="submit" className="bg-[#D4AF37] hover:bg-[#B8860B] text-black p-2.5 rounded-xl transition-all shadow-lg shadow-[#D4AF37]/20"><Plus className="w-5 h-5" /></button>
              </form>
            </div>
          )}
        </div>

        <div className="relative">
          <MetricCard 
            icon={Truck} 
            label="TRUCK COST" 
            value={formatCurrency(truckCost)} 
            iconBg="bg-blue-400/10"
            iconColor="text-blue-400"
            isInteractive={true}
            onClick={() => {
              setIsTruckCostInputOpen(!isTruckCostInputOpen);
              setIsEarningsInputOpen(false);
              setIsMilesInputOpen(false);
              setIsFuelInputOpen(false);
              setIsDeductionsInputOpen(false);
            }}
          />
          {isTruckCostInputOpen && (
            <div className="absolute top-full left-0 right-0 mt-3 z-50 bg-[#0a0a0a] border border-blue-400/30 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Add Truck Cost</span>
                <button onClick={() => setIsTruckCostInputOpen(false)} className="text-zinc-600 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddTruckCost} className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</div>
                  <input autoFocus type="number" step="0.01" value={newTruckCostEntry} onChange={(e) => setNewTruckCostEntry(e.target.value)} placeholder="0.00" className="w-full bg-[#050505] border border-zinc-800 rounded-xl py-2.5 pl-7 pr-3 text-white text-sm font-bold focus:border-blue-400 focus:outline-none transition-colors placeholder:text-zinc-800" />
                </div>
                <button type="submit" className="bg-blue-400 hover:bg-blue-500 text-black p-2.5 rounded-xl transition-all shadow-lg shadow-blue-400/20"><Plus className="w-5 h-5" /></button>
              </form>
            </div>
          )}
        </div>

        <div className="relative">
          <MetricCard 
            icon={Minus} 
            label="WEEK DEDUCTIONS" 
            value={formatCurrency(weekDeductions)} 
            iconBg="bg-rose-400/10"
            iconColor="text-rose-400"
            isInteractive={true}
            onClick={() => {
              setIsDeductionsInputOpen(!isDeductionsInputOpen);
              setIsEarningsInputOpen(false);
              setIsMilesInputOpen(false);
              setIsFuelInputOpen(false);
            }}
          />
          {isDeductionsInputOpen && (
            <div className="absolute top-full left-0 right-0 mt-3 z-50 bg-[#0a0a0a] border border-rose-400/30 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Add Deduction</span>
                <button onClick={() => setIsDeductionsInputOpen(false)} className="text-zinc-600 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddDeductions} className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</div>
                  <input autoFocus type="number" step="0.01" value={newDeductionsEntry} onChange={(e) => setNewDeductionsEntry(e.target.value)} placeholder="0.00" className="w-full bg-[#050505] border border-zinc-800 rounded-xl py-2.5 pl-7 pr-3 text-white text-sm font-bold focus:border-rose-400 focus:outline-none transition-colors placeholder:text-zinc-800" />
                </div>
                <button type="submit" className="bg-rose-400 hover:bg-rose-500 text-black p-2.5 rounded-xl transition-all shadow-lg shadow-rose-400/20"><Plus className="w-5 h-5" /></button>
              </form>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-5">
          <div className="bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] md:rounded-[3rem] p-6 md:p-10 flex flex-col shadow-2xl mb-6 md:mb-8 group hover:border-[#D4AF37]/30 transition-all duration-700">
            <div className="flex justify-between items-center mb-8 md:mb-12">
              <div className="flex items-center gap-4 md:gap-5">
                <div className="bg-[#D4AF37] p-3 md:p-4 rounded-xl md:rounded-2xl text-black shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                  <Clock className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight">ELD Status</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#D4AF37] animate-pulse shadow-[0_0_8px_#D4AF37]" />
                    <p className="text-[8px] md:text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest">Active</p>
                  </div>
                </div>
              </div>
              <span className={`px-4 md:px-6 py-1.5 md:py-2 ${eldStatus?.status === 'DRIVE' ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.3)]'} text-[8px] md:text-[10px] font-bold rounded-full uppercase tracking-widest`}>
                {eldStatus?.status === 'DRIVE' ? 'Driving' : eldStatus?.status === 'ON' ? 'On Duty' : eldStatus?.status === 'SB' ? 'Sleeper' : 'Off Duty'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 md:gap-3 mb-8 md:mb-12">
              {(['OFF', 'SB', 'ON', 'DRIVE'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setEldStatus?.(prev => ({ ...prev, status: s }))}
                  className={`py-2 md:py-3 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-bold uppercase tracking-widest transition-all border ${
                    eldStatus?.status === s 
                      ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20' 
                      : 'bg-white/5 text-zinc-600 border-white/5 hover:border-white/10 hover:text-white'
                  }`}
                >
                  {s === 'SB' ? 'Sleeper' : s === 'DRIVE' ? 'Drive' : s === 'ON' ? 'On Duty' : 'Off'}
                </button>
              ))}
            </div>

            <div className="space-y-8 md:space-y-12 flex-1">
              {eldStatus?.timers?.map((timer) => (
                <div key={timer.label} className="relative">
                  <div className="flex justify-between items-end mb-3 md:mb-4">
                    <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-zinc-600">{timer.label}</span>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl md:text-4xl font-bold tracking-tight ${timer.label === 'Until Break' ? 'text-[#D4AF37]' : 'text-white'}`}>{formatTime(timer.seconds)}</span>
                      <span className="text-[8px] md:text-[10px] font-bold text-zinc-700 uppercase tracking-widest">REM</span>
                    </div>
                  </div>
                  <div className="h-1.5 md:h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${timer.color} rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(212,175,55,0.2)]`} style={{ width: `${(timer.seconds / timer.total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#D4AF37] animate-pulse" />
                <span className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cycle resets in 34h</span>
              </div>
              <button className="px-4 md:px-6 py-1.5 md:py-2 bg-white/5 hover:bg-[#D4AF37] hover:text-black rounded-full text-[8px] md:text-[10px] font-bold text-white uppercase tracking-widest transition-all">View Logs</button>
            </div>
          </div>
          <div className="mb-6 md:mb-8">
            <WeatherAnalyticsCard />
          </div>
          <div className="mb-6 md:mb-8">
            <QuickActions />
          </div>
          <TruckProfileCard />
        </div>
      </div>

      {/* Weekly Earnings Performance Chart */}
      <div className="mt-8 bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl group hover:border-[#D4AF37]/30 transition-all duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 gap-4">
          <div>
            <h2 className="text-xl md:text-3xl font-bold text-white tracking-tight uppercase font-['Space_Grotesk']">Weekly Earnings Performance</h2>
            <p className="text-[8px] md:text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest mt-1">Daily Revenue Breakdown • Last 7 Days</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[8px] md:text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Average Daily</span>
              <span className="text-lg md:text-xl font-bold text-white tracking-tight">$711.42</span>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex flex-col items-end">
              <span className="text-[8px] md:text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Peak Day</span>
              <span className="text-lg md:text-xl font-bold text-[#D4AF37] tracking-tight">Thursday</span>
            </div>
          </div>
        </div>
        <div className="h-[300px] md:h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity={1} />
                  <stop offset="100%" stopColor="#D4AF37" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#52525b', fontSize: 11, fontWeight: 700 }} 
                dy={15} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#52525b', fontSize: 11, fontWeight: 700 }} 
                tickFormatter={(value) => `$${value}`}
                dx={-10}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(212, 175, 55, 0.05)' }} 
                contentStyle={{ 
                  backgroundColor: '#000', 
                  border: '1px solid rgba(212, 175, 55, 0.2)', 
                  borderRadius: '16px',
                  padding: '12px 16px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                }}
                itemStyle={{ color: '#D4AF37', fontWeight: 'bold' }}
                labelStyle={{ color: '#fff', marginBottom: '4px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.1em' }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Daily Earnings']}
              />
              <Bar 
                dataKey="value" 
                fill="url(#goldGradient)" 
                radius={[6, 6, 0, 0]}
                barSize={window.innerWidth < 768 ? 30 : 50}
                animationDuration={2000}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.value > 0 ? 'url(#goldGradient)' : 'rgba(255,255,255,0.05)'} 
                    className="transition-all duration-500 hover:opacity-80"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;