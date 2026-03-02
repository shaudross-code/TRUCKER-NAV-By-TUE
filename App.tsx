
import React, { useState, useEffect, createContext, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PredictiveParking from './components/PredictiveParking';
import LoadBoard from './components/LoadBoard';
import Maintenance from './components/Maintenance';
import NavigationView from './components/NavigationView';
import VoiceCommand from './components/VoiceCommand';
import SettingsView from './components/SettingsView';

import { ViewType } from './types';

interface AppContextType {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  userLocation: [number, number] | null;
  navTarget: string | null;
  setNavTarget: (target: string | null) => void;
  isDriving: boolean;
  setIsDriving: (val: boolean) => void;
  speed: number;
  setSpeed: (val: number) => void;
  idleSeconds: number;
  breakSuggestion: boolean;
  setBreakSuggestion: (val: boolean) => void;
  hasViolation: boolean;
  truckProfile: {
    height: number; // in feet
    weight: number; // in lbs
    length: number; // in feet
    hazmat: boolean;
  };
  setTruckProfile: React.Dispatch<React.SetStateAction<{
    height: number;
    weight: number;
    length: number;
    hazmat: boolean;
  }>>;
  eldStatus: {
    status: 'OFF' | 'SB' | 'ON' | 'DRIVE';
    timers: { label: string; seconds: number; total: number; color: string }[];
    resetSeconds: number;
  };
  setEldStatus: React.Dispatch<React.SetStateAction<{
    status: 'OFF' | 'SB' | 'ON' | 'DRIVE';
    timers: { label: string; seconds: number; total: number; color: string }[];
    resetSeconds: number;
  }>>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>(ViewType.DASHBOARD);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [navTarget, setNavTarget] = useState<string | null>(null);

  useEffect(() => {
    // Initial view set to Dashboard
    setActiveView(ViewType.DASHBOARD);
  }, []);
  const [isDriving, setIsDriving] = useState(false);
  const [speed, setSpeed] = useState(0);
  const speedRef = useRef(0);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const [idleSeconds, setIdleSeconds] = useState(0);
  const [breakSuggestion, setBreakSuggestion] = useState(false);

  const [truckProfile, setTruckProfile] = useState({
    height: 13.5, // 13' 6"
    weight: 78500,
    length: 53,
    hazmat: false
  });

  const [eldStatus, setEldStatus] = useState({
    status: 'OFF' as 'OFF' | 'SB' | 'ON' | 'DRIVE',
    resetSeconds: 36000, // 10 Hours
    timers: [
      { label: 'Until Break', seconds: 28800, total: 28800, color: 'bg-rose-500' }, 
      { label: 'Drive Time', seconds: 39600, total: 39600, color: 'bg-[#D4AF37]' }, 
      { label: 'On-Duty Shift', seconds: 50400, total: 50400, color: 'bg-zinc-700' }, 
      { label: '70h Cycle', seconds: 252000, total: 252000, color: 'bg-[#B8860B]' }, 
    ]
  });

  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  useEffect(() => {
    if (!process.env.GEMINI_API_KEY) {
      setApiKeyMissing(true);
    }
  }, []);

  const hasViolation = eldStatus.timers.some(t => t.seconds <= 0) && (eldStatus.status === 'DRIVE' || eldStatus.status === 'ON');
  
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const { message, filename, lineno, colno, error } = event;
      console.error("Global Error Detail:", {
        message,
        source: filename,
        line: lineno,
        column: colno,
        stack: error ? error.stack : 'No stack trace'
      });
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled Rejection Detail:", {
        reason: event.reason,
        promise: event.promise,
        stack: event.reason?.stack || 'No stack trace'
      });
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // HOS Logic Engine
  useEffect(() => {
    const interval = setInterval(() => {
      const currentSpeed = speedRef.current;
      // Track idle time
      if (currentSpeed <= 5) {
        setIdleSeconds(prev => {
          const next = prev + 1;
          if (next === 300) {
            setEldStatus(current => {
              if (current.status !== 'OFF' && current.status !== 'SB') {
                setBreakSuggestion(true);
              }
              return current;
            });
          }
          
          // Reset 'Until Break' timer if stationary for 30 minutes
          if (next === 1800) {
            setEldStatus(current => ({
              ...current,
              timers: current.timers.map(t => 
                t.label === 'Until Break' ? { ...t, seconds: t.total } : t
              )
            }));
          }
          return next;
        });
      } else {
        setIdleSeconds(0);
        setBreakSuggestion(false);
      }

      setEldStatus(prev => {
        // Automatic Driving Detection: Switch to DRIVE if speed > 5
        if (speedRef.current > 5 && prev.status !== 'DRIVE') {
          return { ...prev, status: 'DRIVE' };
        }
        
        if (prev.status === 'OFF' || prev.status === 'SB') {
          // Increment reset timer (or decrement if we want a countdown)
          // Let's decrement from 10 hours
          const newReset = Math.max(0, prev.resetSeconds - 1);
          
          // If reset reaches 0, we could potentially reset other timers, 
          // but for now let's just track it.
          if (newReset === 0 && prev.resetSeconds > 0) {
             // Reset HOS clocks if 10h reset is complete
             return {
               ...prev,
               resetSeconds: 0,
               timers: prev.timers.map(t => ({ ...t, seconds: t.total }))
             };
          }

          return { ...prev, resetSeconds: newReset };
        }

        // If we are ON or DRIVE, reset the 10h reset clock
        const newTimers = prev.timers.map(t => {
          let shouldDecrement = false;
          
          if (t.label === '70h Cycle') shouldDecrement = true; // Always runs when not off-duty
          if (t.label === 'On-Duty Shift') shouldDecrement = true; // Runs when ON or DRIVE
          if (t.label === 'Drive Time' && prev.status === 'DRIVE') shouldDecrement = true;
          if (t.label === 'Until Break' && prev.status === 'DRIVE') shouldDecrement = true;

          return {
            ...t,
            seconds: shouldDecrement ? Math.max(0, t.seconds - 1) : t.seconds
          };
        });

        return { ...prev, timers: newTimers, resetSeconds: 36000 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Global High-Accuracy Geolocation Tracking
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setUserLocation(prev => prev || [41.8781, -87.6298]);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed: geoSpeed } = position.coords;
        if (isNaN(latitude) || isNaN(longitude)) {
          console.warn("Received NaN coordinates from GPS");
          return;
        }
        setUserLocation(prev => {
          if (prev && prev[0] === latitude && prev[1] === longitude) return prev;
          return [latitude, longitude];
        });
        
        if (geoSpeed !== null && !isNaN(geoSpeed)) {
          // Convert m/s to mph
          const mph = Math.round(geoSpeed * 2.23694);
          setSpeed(mph);
        }
      },
      (error) => {
        console.warn("GPS Signal Issue:", error.message);
        if (!userLocation) setUserLocation([41.8781, -87.6298]);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 0 
      }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const renderContent = () => {
    switch (activeView) {
      case ViewType.DASHBOARD:
        return <Dashboard />;
      case ViewType.TRUCK_STOPS:
        return <PredictiveParking />;
      case ViewType.LOAD_BOARD:
        return <LoadBoard />;
      case ViewType.MAINTENANCE:
        return <Maintenance />;
      case ViewType.NAVIGATION:
        return null; // Handled separately to keep it mounted
      case ViewType.SETTINGS:
        return <SettingsView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppContext.Provider value={{ 
      activeView, 
      setActiveView, 
      userLocation, 
      navTarget, 
      setNavTarget,
      isDriving,
      setIsDriving,
      speed,
      setSpeed,
      idleSeconds,
      breakSuggestion,
      setBreakSuggestion,
      hasViolation,
      truckProfile,
      setTruckProfile,
      eldStatus,
      setEldStatus
    }}>
      <div className="flex h-screen w-screen bg-[#050505] text-white overflow-hidden">
        {apiKeyMissing && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-rose-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest shadow-2xl animate-bounce">
            API Key Missing - Voice Features Disabled
          </div>
        )}
        <Sidebar 
          activeView={activeView} 
          onViewChange={setActiveView} 
          onVoiceToggle={() => setIsVoiceOpen(true)} 
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        
        <main className="flex-1 relative overflow-y-auto custom-scrollbar bg-[#050505] pb-20 md:pb-0">
          <div className={activeView === ViewType.NAVIGATION ? 'h-full w-full' : 'hidden'}>
            <NavigationView initialTarget={navTarget} isSidebarCollapsed={isSidebarCollapsed} />
          </div>
          {activeView !== ViewType.NAVIGATION && renderContent()}
        </main>

        {isVoiceOpen && (
          <VoiceCommand 
            onClose={() => setIsVoiceOpen(false)} 
            setActiveView={setActiveView}
            setNavTarget={setNavTarget}
          />
        )}
      </div>
    </AppContext.Provider>
  );
};

export default App;