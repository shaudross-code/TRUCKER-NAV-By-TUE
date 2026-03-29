import { safeStringify } from './utils';
import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import { LoadingScreen } from './components/LoadingScreen';
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
import { LoginScreen } from './components/LoginScreen';
import VoiceCommand from './components/VoiceCommand';
import { speak } from './services/speechService';

const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(() => {
    // Check for saved location on initial load
    const saved = localStorage.getItem('trucker_last_location');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('Initial load: Found saved location', parsed);
        return parsed;
      } catch (e) {
        console.warn('Failed to parse initial saved location:', e);
      }
    }
    return null;
  });
  
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const speedRef = useRef<number>(0);
  const headingRef = useRef<number>(0);
  const listenersRef = useRef<Set<() => void>>(new Set());

  const notifyListeners = useCallback(() => {
    listenersRef.current.forEach(listener => listener());
  }, []);

  useEffect(() => {
    if (userLocation) {
      const str = safeStringify(userLocation);
      if (str) {
        // Save to consistent key for location persistence
        localStorage.setItem('trucker_last_location', str);
      }
    }
  }, [userLocation ? userLocation[0] : null, userLocation ? userLocation[1] : null]);

  useEffect(() => {
    // IP-based geolocation fallback
    const fetchIpLocation = async () => {
      try {
        const res = await fetch('/api/ip-location');
        if (res.ok) {
          const data = await res.json();
          if (data.lat && data.lon) {
            const loc: [number, number] = [data.lat, data.lon];
            console.log(`IP geolocation fallback: ${data.city}, ${data.region} (${loc})`);
            setUserLocation(prev => prev || loc);
            setLocationError(prev => prev ? `${prev} (using approximate location)` : null);
          }
        }
      } catch (e) {
        console.warn('IP geolocation fallback failed:', e);
      }
    };

    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser.");
      const saved = localStorage.getItem('trucker_last_location');
      if (saved) {
        try {
          setUserLocation(JSON.parse(saved));
        } catch (e) {}
      }
      fetchIpLocation();
      return;
    }

    let geoSucceeded = false;

    // First, try to get current position immediately
    console.log('Attempting to get current location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        geoSucceeded = true;
        const { latitude, longitude } = position.coords;
        if (!isNaN(latitude) && !isNaN(longitude)) {
          const roundedLat = Math.round(latitude * 100000) / 100000;
          const roundedLon = Math.round(longitude * 100000) / 100000;
          const newLocation: [number, number] = [roundedLat, roundedLon];
          setUserLocation(newLocation);
          setLocationError(null);
          try {
            localStorage.setItem('trucker_last_location', JSON.stringify(newLocation));
          } catch (e) {}
          console.log('Current location acquired:', newLocation);
        }
      },
      (error) => {
        console.warn("getCurrentPosition failed:", error.message, "Code:", error.code);
        setLocationError(
          error.code === 1 ? "Location permission denied. Using approximate location." :
          error.code === 2 ? "Location unavailable. Using approximate location." :
          "Location request timed out. Using approximate location."
        );
        
        // Try saved location first, then IP geolocation
        setUserLocation(prev => {
          if (!prev) {
            const saved = localStorage.getItem('trucker_last_location');
            if (saved) {
              try {
                return JSON.parse(saved);
              } catch (e) {}
            }
          }
          return prev;
        });
        // Always try IP fallback when getCurrentPosition fails
        fetchIpLocation();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );

    // Then start watching for position updates
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        geoSucceeded = true;
        const { latitude, longitude, speed: geoSpeed, heading: geoHeading } = position.coords;
        if (isNaN(latitude) || isNaN(longitude)) return;
        
        setLocationError(null);
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
          
          const newLocation: [number, number] = [roundedLat, roundedLon];
          try {
            localStorage.setItem('trucker_last_location', JSON.stringify(newLocation));
          } catch (e) {}
          
          return newLocation;
        });
      },
      (error) => {
        console.error("watchPosition error:", error);
        setUserLocation(prev => {
          if (!prev) {
            const saved = localStorage.getItem('trucker_last_location');
            try {
              if (saved) return JSON.parse(saved);
            } catch (e) {}
            return null;
          }
          return prev;
        });
        // Try IP fallback if we still have no location
        if (!geoSucceeded) fetchIpLocation();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
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
  const { user, profile, loading, signIn, signInWithEmail, signUpWithEmail, signInAsGuest, signOut, updateProfile, authError } = useFirebase();
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

  const mountTimeRef = useRef(Date.now());
  const MIN_SPLASH_MS = 2800;

  const [splashVisible, setSplashVisible] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);

  useEffect(() => {
    if (!loading) {
      const elapsed = Date.now() - mountTimeRef.current;
      const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
      const exitTimer = setTimeout(() => {
        setSplashExiting(true);
        const unmountTimer = setTimeout(() => setSplashVisible(false), 750);
        return () => clearTimeout(unmountTimer);
      }, remaining);
      return () => clearTimeout(exitTimer);
    }
  }, [loading]);

  if (splashVisible) {
    return <LoadingScreen isExiting={splashExiting} />;
  }

  if (!user) {
    return <LoginScreen signIn={signIn} signInWithEmail={signInWithEmail} signUpWithEmail={signUpWithEmail} signInAsGuest={signInAsGuest} authError={authError} />;
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
