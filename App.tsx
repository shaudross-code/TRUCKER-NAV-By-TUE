
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PredictiveParking from './components/PredictiveParking';
import LoadBoard from './components/LoadBoard';
import Maintenance from './components/Maintenance';
import NavigationView from './components/NavigationView';
import VoiceCommand from './components/VoiceCommand';
import SettingsView from './components/SettingsView';
import RouteHistory from './components/RouteHistory';
import PaySummary from './components/PaySummary';

import { ViewType, AppContext } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>(ViewType.DASHBOARD);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [navTarget, setNavTarget] = useState<string | null>(null);
  const [autoReroute, setAutoReroute] = useState(() => {
    const saved = localStorage.getItem('trucker_auto_reroute');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [truckProfile, setTruckProfile] = useState(() => {
    const saved = localStorage.getItem('trucker_profile');
    return saved ? JSON.parse(saved) : {
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
  });

  const [eldStatus, setEldStatus] = useState(() => {
    const saved = localStorage.getItem('trucker_eld_status');
    return saved ? JSON.parse(saved) : {
      status: 'OFF' as 'OFF' | 'SB' | 'ON' | 'DRIVE',
      resetSeconds: 36000,
      timers: [
        { label: 'Until Break', seconds: 28800, total: 28800, color: 'bg-rose-500' }, 
        { label: 'Drive Time', seconds: 39600, total: 39600, color: 'bg-[#D4AF37]' }, 
        { label: 'On-Duty Shift', seconds: 50400, total: 50400, color: 'bg-zinc-700' }, 
        { label: '70h Cycle', seconds: 252000, total: 252000, color: 'bg-[#B8860B]' }, 
      ]
    };
  });

  const [weeklyEarnings, setWeeklyEarnings] = useState(() => {
    const saved = localStorage.getItem('trucker_weekly_earnings');
    return saved ? JSON.parse(saved) : 4980.00;
  });
  const [milesThisWeek, setMilesThisWeek] = useState(() => {
    const saved = localStorage.getItem('trucker_miles_this_week');
    return saved ? JSON.parse(saved) : 2845;
  });
  const [fuelCost, setFuelCost] = useState(() => {
    const saved = localStorage.getItem('trucker_fuel_cost');
    return saved ? JSON.parse(saved) : 1240.50;
  });
  const [truckCost, setTruckCost] = useState(() => {
    const saved = localStorage.getItem('trucker_truck_cost');
    return saved ? JSON.parse(saved) : 500.00;
  });
  const [weekDeductions, setWeekDeductions] = useState(() => {
    const saved = localStorage.getItem('trucker_week_deductions');
    return saved ? JSON.parse(saved) : 0;
  });
  const [takeHomePercentage, setTakeHomePercentage] = useState(() => {
    const saved = localStorage.getItem('trucker_take_home_percentage');
    return saved ? JSON.parse(saved) : 100;
  });

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('trucker_profile', JSON.stringify(truckProfile));
  }, [truckProfile]);
  
  useEffect(() => {
    localStorage.setItem('trucker_take_home_percentage', JSON.stringify(takeHomePercentage));
  }, [takeHomePercentage]);

  useEffect(() => {
    localStorage.setItem('trucker_eld_status', JSON.stringify(eldStatus));
  }, [eldStatus]);

  useEffect(() => {
    localStorage.setItem('trucker_weekly_earnings', JSON.stringify(weeklyEarnings));
  }, [weeklyEarnings]);

  useEffect(() => {
    localStorage.setItem('trucker_miles_this_week', JSON.stringify(milesThisWeek));
  }, [milesThisWeek]);

  useEffect(() => {
    localStorage.setItem('trucker_fuel_cost', JSON.stringify(fuelCost));
  }, [fuelCost]);

  useEffect(() => {
    localStorage.setItem('trucker_truck_cost', JSON.stringify(truckCost));
  }, [truckCost]);

  useEffect(() => {
    localStorage.setItem('trucker_week_deductions', JSON.stringify(weekDeductions));
  }, [weekDeductions]);

  useEffect(() => {
    localStorage.setItem('trucker_auto_reroute', JSON.stringify(autoReroute));
  }, [autoReroute]);

  useEffect(() => {
    if (userLocation) {
      localStorage.setItem('trucker_last_location', JSON.stringify(userLocation));
    }
  }, [userLocation]);

  const [isDriving, setIsDriving] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState(0);
  const speedRef = useRef(0);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const [idleSeconds, setIdleSeconds] = useState(0);
  const [breakSuggestion, setBreakSuggestion] = useState(false);

  useEffect(() => {
    // Initial view set to Dashboard
    setActiveView(ViewType.DASHBOARD);
  }, []);

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
      const saved = localStorage.getItem('trucker_last_location');
      setUserLocation(prev => prev || (saved ? JSON.parse(saved) : [41.8781, -87.6298]));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed: geoSpeed, heading: geoHeading } = position.coords;
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
        } else {
          setSpeed(0);
        }

        if (geoHeading !== null && !isNaN(geoHeading)) {
          setHeading(geoHeading);
        }
      },
      (error) => {
        console.warn("GPS Signal Issue:", error.message);
        if (!userLocation) {
          const saved = localStorage.getItem('trucker_last_location');
          setUserLocation(saved ? JSON.parse(saved) : [41.8781, -87.6298]);
        }
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
      case ViewType.ROUTE_HISTORY:
        return <RouteHistory />;
      case ViewType.PAY_SUMMARY:
        return <PaySummary />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppContext.Provider value={{ 
      activeView, 
      setActiveView, 
      userLocation, 
      setUserLocation,
      navTarget, 
      setNavTarget,
      isDriving,
      setIsDriving,
      speed,
      setSpeed,
      heading,
      setHeading,
      idleSeconds,
      breakSuggestion,
      setBreakSuggestion,
      hasViolation,
      autoReroute,
      setAutoReroute,
      truckProfile,
      setTruckProfile,
      eldStatus,
      setEldStatus,
      weeklyEarnings,
      setWeeklyEarnings,
      milesThisWeek,
      setMilesThisWeek,
      fuelCost,
      setFuelCost,
      truckCost,
      setTruckCost,
      weekDeductions,
      setWeekDeductions,
      takeHomePercentage,
      setTakeHomePercentage
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
