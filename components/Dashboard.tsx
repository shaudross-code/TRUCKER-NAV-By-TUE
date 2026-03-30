import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  DollarSign, 
  Map as MapIcon, 
  Clock, 
  Fuel, 
  Plus,
  Minus,
  X,
  AlertTriangle,
  Coffee,
  Truck,
  Package,
  CheckCircle2,
  Navigation2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, CartesianGrid } from 'recharts';
import { speak } from '../services/speechService';
import { TelemetryContext, AppContext, HOSContext, FirebaseContext, ViewType } from '../types';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

import { ELDStatusCard } from './ELDStatusCard';
import { HOSAlertManager } from './HOSAlertManager';
import { TruckProfileCard } from './TruckProfileCard';
import { MetricCard } from './MetricCard';
import { WeatherAnalyticsCard } from './WeatherAnalyticsCard';
import { QuickActions } from './QuickActions';


const chartData = [
  { name: 'Mon', value: 850 },
  { name: 'Tue', value: 920 },
  { name: 'Wed', value: 780 },
  { name: 'Thu', value: 1100 },
  { name: 'Fri', value: 950 },
  { name: 'Sat', value: 450 },
  { name: 'Sun', value: 0 },
];

const PerformanceChart = React.memo(() => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 250);
    return () => clearTimeout(t);
  }, []);
  if (!mounted) return <div className="h-[300px] md:h-[400px] w-full" />;
  return (
    <div className="h-[300px] md:h-[400px] w-full min-h-[200px]">
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
            isAnimationActive={false}
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
  );
});

const SpeedDisplay = React.memo(() => {
  const telemetryContext = useContext(TelemetryContext);
  const appContext = useContext(AppContext);
  const isMetric = appContext?.unitSystem === 'metric';
  
  const speed = React.useSyncExternalStore(
    telemetryContext?.subscribe || (() => () => {}),
    () => telemetryContext?.speedRef.current || 0
  );

  const displaySpeed = isMetric ? Math.round(speed * 1.60934) : speed;

  return (
    <div className="flex flex-col items-center md:items-end">
      <span className="text-[8px] md:text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Current Speed</span>
      <span className="text-lg md:text-xl font-bold text-[#D4AF37] leading-none">{displaySpeed} <span className="text-[10px] text-zinc-600">{isMetric ? 'KM/H' : 'MPH'}</span></span>
    </div>
  );
});

const Dashboard: React.FC = React.memo(() => {
  console.log("Dashboard rendering");
  const context = useContext(AppContext);
  const hosContext = useContext(HOSContext);
  const firebaseContext = useContext(FirebaseContext);
  
  const profile = firebaseContext?.profile;
  const updateProfile = firebaseContext?.updateProfile;
  const user = firebaseContext?.user;

  const idleSeconds = hosContext?.idleSeconds ?? 0;
  const eldStatus = hosContext?.eldStatus;
  const setEldStatus = hosContext?.setEldStatus;
  const breakSuggestion = hosContext?.breakSuggestion || false;
  const setBreakSuggestion = hosContext?.setBreakSuggestion || (() => {});
  const hasViolation = hosContext?.hasViolation || false;

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

  // ELD Dynamic Timers
  // Removed local timers state as it's now global in AppContext

  const formatTime = React.useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }, []);

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
      setIsEarningsInputOpen(false);
    }
  };

  const handleAddMiles = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(newMilesEntry);
    if (!isNaN(amount) && amount > 0) {
      setMilesThisWeek(prev => prev + amount);
      setNewMilesEntry('');
      setIsMilesInputOpen(false);
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

  const handleCompleteLoad = useCallback(async () => {
    if (!profile?.currentLoad || !user || !updateProfile) return;

    try {
      const load = profile.currentLoad;
      const rateValue = parseFloat(load.rate.replace(/[^0-9.]/g, ''));
      
      // 1. Add to weekly earnings
      if (!isNaN(rateValue)) {
        setWeeklyEarnings(prev => prev + rateValue);
      }

      // 2. Add to history
      const historyRef = collection(db, 'users', user.uid, 'history');
      await addDoc(historyRef, {
        origin: load.origin,
        destination: load.destination,
        distance: 0, // We could calculate this if we had it
        duration: 0,
        date: new Date().toISOString(),
        status: 'COMPLETED',
        rate: load.rate,
        commodity: load.commodity
      });

      // 3. Clear current load
      await updateProfile({ currentLoad: undefined });
      
      speak("Load completed successfully. Earnings updated.");
    } catch (error) {
      console.error("Error completing load:", error);
    }
  }, [profile, user, updateProfile, setWeeklyEarnings]);

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
      speak("Command Center Active. System Online.");
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-4 md:p-10 max-w-[1400px] mx-auto bg-[#050505] relative">
      <HOSAlertManager eldStatus={eldStatus} />
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
            <SpeedDisplay />
          </div>
          <div className="flex-1 md:flex-none px-4 md:px-5 py-2 md:py-2.5 bg-[#0a0a0a] border border-zinc-900 rounded-xl md:rounded-2xl flex items-center justify-center md:justify-start gap-3">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#D4AF37] animate-ping" />
            <span className="text-[8px] md:text-[10px] font-bold text-white uppercase tracking-widest">Live Telemetry</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6 mb-10 relative">
        {/* Active Load Card */}
        {profile?.currentLoad && (
          <div className="md:col-span-2 lg:col-span-2 xl:col-span-2">
            <div className="bg-emerald-500/10 backdrop-blur-3xl border border-emerald-500/30 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] relative overflow-hidden group transition-all duration-500 hover:border-emerald-500/50">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-500 p-3 rounded-2xl text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Active Load</div>
                    <div className="text-2xl font-black text-white tracking-tighter uppercase italic">{profile.currentLoad.commodity}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Rate</div>
                  <div className="text-2xl font-black text-emerald-500 italic">{profile.currentLoad.rate}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-1">
                  <div className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">Origin</div>
                  <div className="text-white font-bold text-sm truncate">{profile.currentLoad.origin}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">Destination</div>
                  <div className="text-white font-bold text-sm truncate">{profile.currentLoad.destination}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => {
                    context?.setNavTarget(profile.currentLoad?.destination || null);
                    context?.setActiveView(ViewType.NAVIGATION);
                  }}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                >
                  <Navigation2 className="w-4 h-4" />
                  Navigate
                </button>
                <button 
                  onClick={handleCompleteLoad}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Complete Load
                </button>
              </div>

              {/* Decorative background element */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            </div>
          </div>
        )}

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
            label={context?.unitSystem === 'metric' ? 'KM This Week' : 'Miles This Week'} 
            value={context?.unitSystem === 'metric' ? formatNumber(milesThisWeek * 1.60934) : formatNumber(milesThisWeek)} 
            target={context?.unitSystem === 'metric' ? '5,150 km' : '3,200 mi'} 
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
          <ELDStatusCard eldStatus={eldStatus} setEldStatus={setEldStatus} formatTime={formatTime} />
          <div className="mb-6 md:mb-8">
            <WeatherAnalyticsCard />
          </div>
          <div className="mb-6 md:mb-8">
            <QuickActions setActiveView={context?.setActiveView} setNavTarget={context?.setNavTarget} setEldStatus={hosContext?.setEldStatus} />
          </div>
          <TruckProfileCard truckProfile={context?.truckProfile} setTruckProfile={context?.setTruckProfile} />
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
        <PerformanceChart />
      </div>
    </div>
  );
});

export default Dashboard;