import { safeStringify } from './utils';
import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
const Dashboard = lazy(() => import('./components/Dashboard'));
const NavigationView = lazy(() => import('./components/NavigationView'));
const PaySummary = lazy(() => import('./components/PaySummary'));
const PredictiveParking = lazy(() => import('./components/PredictiveParking'));
const LoadBoard = lazy(() => import('./components/LoadBoard'));
const Maintenance = lazy(() => import('./components/Maintenance'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const RouteHistory = lazy(() => import('./components/RouteHistory'));
const GitHubUpdates = lazy(() => import('./components/GitHubUpdates'));

import { ViewType, AppContext, LocationContext, TelemetryContext } from './types';
import { HOSProvider } from './components/HOSProvider';
import { FirebaseProvider, useFirebase } from './components/FirebaseProvider';
import VoiceCommand from './components/VoiceCommand';
import { speak } from './services/speechService';

const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(() => {
    const saved = localStorage.getItem('user_location');
    return saved ? JSON.parse(saved) : null;
  });
  
  const speedRef = useRef<number>(0);
  const headingRef = useRef<number>(0);
  const listenersRef = useRef<Set<() => void>>(new Set());

  const notifyListeners = useCallback(() => {
    listenersRef.current.forEach(listener => listener());
  }, []);

  useEffect(() => {
    if (userLocation) {
      const str = safeStringify(userLocation);
      localStorage.setItem('user_location', str);
    }
  }, [userLocation ? userLocation[0] : null, userLocation ? userLocation[1] : null]);

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed: geoSpeed, heading: geoHeading } = position.coords;
        if (isNaN(latitude) || isNaN(longitude)) return;
        
        let telemetryChanged = false;

        if (geoSpeed !== null && !isNaN(geoSpeed)) {
          const mph = Math.round(geoSpeed * 2.23694);
          if (speedRef.current !== mph) {
            speedRef.current = mph;
            telemetryChanged = true;
          }
        } else {
          if (speedRef.current !== 0) {
            speedRef.current = 0;
            telemetryChanged = true;
          }
        }

        if (geoHeading !== null && !isNaN(geoHeading)) {
          if (headingRef.current !== geoHeading) {
            headingRef.current = geoHeading;
            telemetryChanged = true;
          }
        }

        if (telemetryChanged) {
          notifyListeners();
        }

        setUserLocation(prev => {
          const roundedLat = Math.round(latitude * 100000) / 100000;
          const roundedLon = Math.round(longitude * 100000) / 100000;
          if (prev && prev[0] === roundedLat && prev[1] === roundedLon) return prev;
          
          // Save last known location to localStorage
          const newLocation: [number, number] = [roundedLat, roundedLon];
          try {
            localStorage.setItem('trucker_last_location', JSON.stringify(newLocation));
          } catch (e) {
            console.warn('Failed to save last location:', e);
          }
          
          return newLocation;
        });
      },
      (error) => {
        console.error("watchPosition error:", error);
        setUserLocation(prev => {
          if (!prev) {
            // Try to load last known location from localStorage
            const saved = localStorage.getItem('trucker_last_location');
            try {
              if (saved) {
                const parsed = JSON.parse(saved);
                console.log('Using last known location:', parsed);
                return parsed;
              }
            } catch (e) {
              console.warn('Failed to parse saved location:', e);
            }
            // No fallback - return null to indicate no location available
            return null;
          }
          return prev;
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [notifyListeners]);

  const locationValue = useMemo(() => ({
    userLocation,
    setUserLocation
  }), [userLocation]);

  const telemetryValue = useMemo(() => ({
    speedRef,
    headingRef,
    subscribe: (callback: () => void) => {
      listenersRef.current.add(callback);
      return () => {
        listenersRef.current.delete(callback);
      };
    }
  }), []);

  return (
    <LocationContext.Provider value={locationValue}>
      <TelemetryContext.Provider value={telemetryValue}>
        {children}
      </TelemetryContext.Provider>
    </LocationContext.Provider>
  );
};

const AppContent: React.FC = React.memo(() => {
  const { user, profile, loading, signIn, signOut, updateProfile, authError } = useFirebase();
  const [activeView, setActiveView] = useState<ViewType>(ViewType.DASHBOARD);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [navTarget, setNavTarget] = useState<string | null>(null);

  // Sync profile data to local state or just use profile directly
  const truckProfile = useMemo(() => profile?.truckProfile || {
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
  }, [profile]);

  const setTruckProfile = useCallback((newProfile: any) => {
    const updatedProfile = typeof newProfile === 'function' ? newProfile(truckProfile) : newProfile;
    updateProfile({ truckProfile: updatedProfile });
  }, [truckProfile, updateProfile]);

  const autoReroute = profile?.autoReroute ?? true;
  const setAutoReroute = useCallback((val: boolean) => updateProfile({ autoReroute: val }), [updateProfile]);

  const weeklyEarnings = profile?.weeklyEarnings ?? 0;
  const setWeeklyEarnings = useCallback((val: any) => {
    const newVal = typeof val === 'function' ? val(weeklyEarnings) : val;
    updateProfile({ weeklyEarnings: newVal });
  }, [weeklyEarnings, updateProfile]);

  const milesThisWeek = profile?.milesThisWeek ?? 0;
  const setMilesThisWeek = useCallback((val: any) => {
    const newVal = typeof val === 'function' ? val(milesThisWeek) : val;
    updateProfile({ milesThisWeek: newVal });
  }, [milesThisWeek, updateProfile]);

  const fuelCost = profile?.fuelCost ?? 0;
  const setFuelCost = useCallback((val: any) => {
    const newVal = typeof val === 'function' ? val(fuelCost) : val;
    updateProfile({ fuelCost: newVal });
  }, [fuelCost, updateProfile]);

  const truckCost = profile?.truckCost ?? 0;
  const setTruckCost = useCallback((val: any) => {
    const newVal = typeof val === 'function' ? val(truckCost) : val;
    updateProfile({ truckCost: newVal });
  }, [truckCost, updateProfile]);

  const weekDeductions = profile?.weekDeductions ?? 0;
  const setWeekDeductions = useCallback((val: any) => {
    const newVal = typeof val === 'function' ? val(weekDeductions) : val;
    updateProfile({ weekDeductions: newVal });
  }, [weekDeductions, updateProfile]);

  const takeHomePercentage = profile?.takeHomePercentage ?? 100;
  const setTakeHomePercentage = useCallback((val: any) => {
    const newVal = typeof val === 'function' ? val(takeHomePercentage) : val;
    updateProfile({ takeHomePercentage: newVal });
  }, [takeHomePercentage, updateProfile]);

  // Persistence Effects
  const [isDriving, setIsDriving] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  useEffect(() => {
    if (!process.env.GEMINI_API_KEY || !process.env.HERE_API_KEY) {
      setApiKeyMissing(true);
    }
  }, []);

  
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
        reason: String(event.reason),
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

  useEffect(() => {
    if (!loading) {
      speak("Welcome to the home of the truckers. Keep on trucking.");
    }
  }, [loading]);

  const handleVoiceToggle = useCallback(() => setIsVoiceOpen(true), []);
  const handleToggleCollapse = useCallback(() => setIsSidebarCollapsed(prev => !prev), []);

  const renderContent = () => {
    console.log("App: renderContent, activeView:", activeView);
    switch (activeView) {
      case ViewType.DASHBOARD:
        return <Suspense fallback={<div>Loading...</div>}><Dashboard /></Suspense>;
      case ViewType.TRUCK_STOPS:
        return <Suspense fallback={<div>Loading...</div>}><PredictiveParking /></Suspense>;
      case ViewType.LOAD_BOARD:
        return <Suspense fallback={<div>Loading...</div>}><LoadBoard /></Suspense>;
      case ViewType.MAINTENANCE:
        return <Suspense fallback={<div>Loading...</div>}><Maintenance /></Suspense>;
      case ViewType.NAVIGATION:
        return null; // Handled separately to keep it mounted
      case ViewType.SETTINGS:
        return <Suspense fallback={<div>Loading...</div>}><SettingsView /></Suspense>;
      case ViewType.ROUTE_HISTORY:
        return <Suspense fallback={<div>Loading...</div>}><RouteHistory /></Suspense>;
      case ViewType.PAY_SUMMARY:
        return <Suspense fallback={<div>Loading...</div>}><PaySummary /></Suspense>;
      case ViewType.GITHUB_UPDATES:
        return <Suspense fallback={<div>Loading...</div>}><GitHubUpdates /></Suspense>;
      default:
        return <Suspense fallback={<div>Loading...</div>}><Dashboard /></Suspense>;
    }
  };

  const contextValue = useMemo(() => ({
      activeView, 
      setActiveView, 
      navTarget, 
      setNavTarget,
      isDriving,
      setIsDriving,
      autoReroute,
      setAutoReroute,
      truckProfile,
      setTruckProfile,
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
    }), [
      activeView, 
      navTarget, 
      isDriving,
      autoReroute,
      truckProfile,
      weeklyEarnings,
      milesThisWeek,
      fuelCost,
      truckCost,
      weekDeductions,
      takeHomePercentage
    ]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#050505] text-white">
        <div className="text-center">
          <div className="relative mb-6 h-24 w-24 mx-auto">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-[#D4AF37] border-t-transparent shadow-[0_0_15px_rgba(212,175,55,0.6)]"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[#D4AF37] font-black text-xl drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]">TUE</span>
            </div>
          </div>
          <p className="text-[#D4AF37] font-medium tracking-widest uppercase text-xs">Initializing System...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#050505] text-white p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter italic uppercase text-[#D4AF37] drop-shadow-[0_0_15px_rgba(212,175,55,0.8)]">TRUCKERS NAV By TUE</h1>
            <p className="text-[#D4AF37] text-sm uppercase tracking-widest">THE HOME OF THE TRUCKERS NEXT-GEN LOGISTICS PLATFORM</p>
          </div>
          
          <div className="bg-zinc-900/50 border border-[#D4AF37]/20 p-8 rounded-3xl space-y-6 backdrop-blur-xl">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[#D4AF37]">Welcome Back, Driver</h2>
              <p className="text-zinc-400 text-sm">Sign in with your Google account to access your logs, routes, and earnings.</p>
            </div>
            
            <button 
              onClick={signIn}
              className="w-full py-4 bg-[#D4AF37] text-black font-bold rounded-2xl transition-all flex items-center justify-center gap-3 hover:bg-[#D4AF37]/90"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign In with Google
            </button>
            
            {authError && (
              <p className="text-rose-500 text-sm mt-4">{authError}</p>
            )}
          </div>
          
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      <HOSProvider>
        <div className="flex h-screen w-screen bg-[#050505] text-white overflow-hidden">
            {apiKeyMissing && (
              <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-rose-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest shadow-2xl animate-bounce text-center">
                API Keys Missing - Voice & Search Features Limited
              </div>
            )}
            <Sidebar 
              activeView={activeView} 
              onViewChange={setActiveView} 
              onVoiceToggle={handleVoiceToggle} 
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={handleToggleCollapse}
              onSignOut={signOut}
            />
            
            <main className={`flex-1 relative ${activeView === ViewType.NAVIGATION ? 'overflow-hidden' : 'overflow-y-auto'} custom-scrollbar bg-[#050505] pb-20 md:pb-0`}>
              {console.log("App: Rendering activeView =", activeView)}
              <div className={`${activeView === ViewType.NAVIGATION ? 'block' : 'hidden'} h-full w-full`}>
                <ErrorBoundary>
                  <NavigationView initialTarget={navTarget} activeView={activeView} />
                </ErrorBoundary>
              </div>
              {activeView !== ViewType.NAVIGATION && (
                <ErrorBoundary>
                  {renderContent()}
                </ErrorBoundary>
              )}
            </main>

            {isVoiceOpen && (
              <VoiceCommand 
                onClose={() => setIsVoiceOpen(false)} 
                setActiveView={setActiveView}
                setNavTarget={setNavTarget}
              />
            )}
          </div>
        </HOSProvider>
    </AppContext.Provider>
  );
});

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <LocationProvider>
          <AppContent />
        </LocationProvider>
      </FirebaseProvider>
    </ErrorBoundary>
  );
};

export default App;
