import React, { useState, useEffect, useContext } from 'react';
import { 
  DollarSign, 
  Map as MapIcon, 
  Clock, 
  Fuel, 
  ChevronDown, 
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
  Navigation
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, CartesianGrid } from 'recharts';
import { AppContext } from '../App.tsx';

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
    className={`bg-[#0a0a0a] border border-zinc-900 p-6 rounded-3xl relative overflow-hidden group transition-all duration-300 ${isInteractive ? 'cursor-pointer hover:border-[#D4AF37]/50 hover:bg-[#0f0f0f]' : ''}`}
  >
    <div className="flex justify-between items-start mb-4">
      <div>
        <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">{label}</div>
        <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
      </div>
      <div className={`${iconBg} ${iconColor} p-2 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    
    {trend && (
      <div className="text-[11px] font-bold text-[#D4AF37] flex items-center gap-1.5 bg-[#D4AF37]/10 w-fit px-2.5 py-1 rounded-lg mt-2">
        <TrendingUp className="w-3 h-3" />
        {trend}
      </div>
    )}
    
    {target && (
      <div className="text-[11px] text-zinc-500 font-medium mt-2">
        Target: <span className="text-zinc-300 font-bold">{target}</span>
      </div>
    )}

    {progress !== undefined && (
      <div className="mt-5">
        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
          <div className="h-full bg-[#D4AF37] rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>
    )}

    {label === "FUEL COST" && (
      <div className="text-[11px] text-zinc-500 font-medium mt-2">
        Avg <span className="text-zinc-300 font-bold">$4.12/gal</span>
      </div>
    )}

    {isInteractive && (
      <div className="absolute bottom-2 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest">Update Entry</div>
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

  useEffect(() => {
    async function fetchWeather() {
      if (!userLocation) return;
      try {
        setLoading(true);
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${userLocation[0]}&lon=${userLocation[1]}`, {
           headers: { 'Accept-Language': 'en' }
        });
        const geoData = await geoRes.json();
        const city = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.suburb || "Unknown Site";

        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${userLocation[0]}&longitude=${userLocation[1]}&current_weather=true`);
        const weatherData = await weatherRes.json();
        
        const current = weatherData.current_weather;
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
      } finally {
        setLoading(false);
      }
    }
    fetchWeather();
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
    if (!weather) return <CloudSun className="w-6 h-6" />;
    if (weather.condition === "Clear") return <Sun className="w-6 h-6 text-[#D4AF37]" />;
    if (weather.condition.includes("Cloudy")) return <CloudSun className="w-6 h-6 text-[#D4AF37]" />;
    if (weather.condition.includes("Rainy") || weather.condition.includes("Stormy")) return <CloudRain className="w-6 h-6 text-[#D4AF37]" />;
    return <Cloud className="w-6 h-6 text-zinc-500" />;
  };

  return (
    <div className="bg-[#0a0a0a] border border-zinc-900 p-6 rounded-3xl group transition-all hover:border-[#D4AF37]/30 h-full flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1">
            <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-2">
              <Navigation className="w-3 h-3 text-[#D4AF37]" />
              Local Environment
            </div>
            {loading ? (
              <div className="h-10 w-32 bg-zinc-900 rounded animate-pulse mb-1" />
            ) : (
              <div className="text-3xl font-bold text-white tracking-tight flex items-baseline gap-2">
                {weather?.temp}°C
                <span className="text-zinc-600 font-black text-xs uppercase tracking-tighter italic">
                  {weather?.condition}
                </span>
              </div>
            )}
          </div>
          <div className="bg-[#D4AF37]/10 p-3 rounded-2xl border border-[#D4AF37]/20">
            <WeatherIcon />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900/40 p-3 rounded-2xl flex items-center gap-3 border border-zinc-800/30">
            <Wind className="w-4 h-4 text-[#D4AF37]" />
            <div>
              <div className="text-[9px] font-black text-zinc-600 uppercase">Wind</div>
              <div className="text-xs font-bold text-white">
                {loading ? "..." : `${weather?.windSpeed} km/h ${weather?.windDir}`}
              </div>
            </div>
          </div>
          <div className="bg-zinc-900/40 p-3 rounded-2xl flex items-center gap-3 border border-zinc-800/30">
            <Droplets className="w-4 h-4 text-[#D4AF37]" />
            <div>
              <div className="text-[9px] font-black text-zinc-600 uppercase">Precip</div>
              <div className="text-xs font-bold text-white">{loading ? "..." : `${weather?.precip}%`}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-zinc-900 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-pulse shadow-[0_0_8px_#D4AF37]" />
            <span className="text-[10px] font-black text-[#D4AF37] uppercase italic">
              {weather && weather.temp > 0 ? "Safe Road Conditions" : "Caution: Cold Surface"}
            </span>
         </div>
         <span className="text-[10px] font-bold text-zinc-500 uppercase truncate max-w-[100px]">
           {loading ? "Locating..." : weather?.locationName}
         </span>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [weeklyEarnings, setWeeklyEarnings] = useState(4980.00);
  const [showEarningsInput, setShowEarningsInput] = useState(false);
  const [newEntryValue, setNewEntryValue] = useState('');

  const [milesThisWeek, setMilesThisWeek] = useState(2845);
  const [showMilesInput, setShowMilesInput] = useState(false);
  const [newMilesEntry, setNewMilesEntry] = useState('');

  const [fuelCost, setFuelCost] = useState(1240.50);
  const [showFuelInput, setShowFuelInput] = useState(false);
  const [newFuelEntry, setNewFuelEntry] = useState('');

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
      setShowFuelInput(false);
    }
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

  return (
    <div className="p-10 max-w-[1400px] mx-auto bg-[#050505]">
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-white mb-2 uppercase italic tracking-tighter">Command Center</h1>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-sm font-bold uppercase tracking-widest">System Status:</span>
            <span className="text-[#D4AF37] font-black uppercase text-sm tracking-widest animate-pulse">Online</span>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="px-5 py-2.5 bg-[#0a0a0a] border border-zinc-900 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest italic">Live Telemetry</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-10 relative">
        <div className="relative">
          <MetricCard 
            icon={DollarSign} 
            label="Weekly Earnings" 
            value={formatCurrency(weeklyEarnings)} 
            trend="+12.5% vs last week" 
            iconBg="bg-[#D4AF37]/10"
            iconColor="text-[#D4AF37]"
            isInteractive={true}
            onClick={() => {
              setShowEarningsInput(!showEarningsInput);
              setShowMilesInput(false);
              setShowFuelInput(false);
            }}
          />
          {showEarningsInput && (
            <div className="absolute top-full left-0 right-0 mt-3 z-50 bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Adjust Weekly Earnings</span>
                <button onClick={() => setShowEarningsInput(false)} className="text-zinc-600 hover:text-white"><X className="w-4 h-4" /></button>
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
              setShowMilesInput(!showMilesInput);
              setShowEarningsInput(false);
              setShowFuelInput(false);
            }}
          />
          {showMilesInput && (
            <div className="absolute top-full left-0 right-0 mt-3 z-50 bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Add Manual Miles</span>
                <button onClick={() => setShowMilesInput(false)} className="text-zinc-600 hover:text-white"><X className="w-4 h-4" /></button>
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
          label="Drive Time Left" 
          value="04:30" 
          progress={65}
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
              setShowFuelInput(!showFuelInput);
              setShowEarningsInput(false);
              setShowMilesInput(false);
            }}
          />
          {showFuelInput && (
            <div className="absolute top-full left-0 right-0 mt-3 z-50 bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Add Fuel Expense</span>
                <button onClick={() => setShowFuelInput(false)} className="text-zinc-600 hover:text-white"><X className="w-4 h-4" /></button>
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

        <WeatherAnalyticsCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 bg-[#0a0a0a] border border-zinc-900 rounded-[2.5rem] p-8 flex flex-col shadow-lg">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-3">
              <div className="bg-[#D4AF37]/10 p-2 rounded-lg text-[#D4AF37] border border-[#D4AF37]/20">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">ELD Status</h2>
              <span className="px-3 py-1 bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-black rounded-full uppercase tracking-widest border border-[#D4AF37]/20">Active</span>
            </div>
          </div>

          <div className="space-y-10 flex-1">
            {[
              { label: 'Until Break', time: '1h 30m', pct: 25, color: 'bg-rose-500' },
              { label: 'Drive Time', time: '4h 30m', pct: 60, color: 'bg-[#D4AF37]' },
              { label: 'On-Duty Shift', time: '5h 45m', pct: 45, color: 'bg-zinc-700' },
              { label: '70h Cycle', time: '27h 30m', pct: 40, color: 'bg-[#B8860B]' },
            ].map((timer) => (
              <div key={timer.label} className="relative">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">{timer.label}</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-2xl font-bold ${timer.label === 'Until Break' ? 'text-[#D4AF37]' : 'text-zinc-100'}`}>{timer.time}</span>
                    <span className="text-[10px] font-bold text-zinc-600 uppercase">REM</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div className={`h-full ${timer.color} rounded-full transition-all duration-1000`} style={{ width: `${timer.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 pt-8 border-t border-zinc-900 flex justify-between items-center">
            <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest italic">Cycle resets in 34h</span>
            <button className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest hover:underline">View Logs</button>
          </div>
        </div>

        <div className="lg:col-span-7 bg-[#0a0a0a] border border-zinc-900 rounded-[2.5rem] p-8 flex flex-col shadow-lg">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-lg font-bold text-white tracking-tight italic">Revenue Analytics</h2>
            <button className="flex items-center gap-2 px-4 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl text-[11px] font-bold text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors uppercase tracking-widest">
              This Week
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} stroke="#18181b" strokeDasharray="3 3" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 11, fontWeight: 700 }} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 11, fontWeight: 700 }} dx={-10} />
                <Tooltip cursor={{ fill: 'rgba(212, 175, 55, 0.05)' }} contentStyle={{ backgroundColor: '#000', border: '1px solid #D4AF37', borderRadius: '12px' }} itemStyle={{ color: '#D4AF37', fontWeight: 800 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#D4AF37' : '#18181b'} fillOpacity={1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;