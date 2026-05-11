import { safeStringify } from './utils';
import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import { LoadingScreen } from './components/LoadingScreen';
import ComingSoonOverlay from './components/ComingSoonOverlay';
import TutorialOverlay from './components/TutorialOverlay';
import GuestSessionTimer from './components/GuestSessionTimer';
import { setCurrentUserId, migrateLocalStorageForUser, getUserStorageKey } from './utils/userStorage';
const Dashboard = lazy(() => import('./components/Dashboard'));
const NavigationView = lazy(() => import('./components/NavigationView'));
const PaySummary = lazy(() => import('./components/PaySummary'));
const PredictiveParking = lazy(() => import('./components/PredictiveParking'));
const LoadBoard = lazy(() => import('./components/LoadBoard'));
const Maintenance = lazy(() => import('./components/Maintenance'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const RouteHistory = lazy(() => import('./components/RouteHistory'));
const FuelNetwork = lazy(() => import('./components/FuelNetwork'));
const HudLayoutView = lazy(() => import('./components/HudLayoutView'));
const ELDLogView = lazy(() => import('./components/ELDLogView'));
const OfflineMapsView = lazy(() => import('./components/OfflineMapsView'));
const CommunityView = lazy(() => import('./components/CommunityView'));
const AnnouncementsView = lazy(() => import('./components/AnnouncementsView'));

import { ViewType, AppContext, LocationContext, TelemetryContext } from './types';

// Inline loading fallback matching the splash screen aesthetic
const ContentLoader = () => (
  <div className="flex-1 flex items-center justify-center bg-[#050505]">
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full" style={{ border: '3px solid transparent', borderTopColor: '#D4AF37', borderRightColor: 'rgba(212,175,55,0.4)', animation: 'spin 1s linear infinite' }} />
        <div className="absolute inset-2 rounded-full" style={{ border: '2px solid transparent', borderBottomColor: 'rgba(212,175,55,0.6)', animation: 'spin 1.5s linear infinite reverse' }} />
      </div>
      <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#D4AF37]/60">Loading</p>
    </div>
    <style>{'@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }'}</style>
  </div>
);
import { HOSProvider } from './components/HOSProvider';
import { FirebaseProvider, useFirebase } from './components/FirebaseProvider';
import { LoginScreen } from './components/LoginScreen';
import VoiceCommand from './components/VoiceCommand';
import { speak } from './services/speechService';
import useScreenWakeLock from './hooks/useScreenWakeLock';

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
  const gpsAccuracyRef = useRef<number | null>(null);
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
        const { latitude, longitude, speed: geoSpeed, heading: geoHeading, accuracy } = position.coords;
        if (isNaN(latitude) || isNaN(longitude)) return;
        
        setLocationError(null);
        
        // Track GPS accuracy for signal quality indicator
        if (accuracy !== undefined && !isNaN(accuracy)) {
          gpsAccuracyRef.current = accuracy;
        }

        if (geoSpeed !== null && !isNaN(geoSpeed)) {
          const mph = Math.round(geoSpeed * 2.23694);
          if (speedRef.current !== mph) {
            speedRef.current = mph;
          }
        } else {
          speedRef.current = 0;
        }

        if (geoHeading !== null && !isNaN(geoHeading)) {
          headingRef.current = geoHeading;
        }

        // Always notify on every position update so heading-up
        // rotation recalculates from route segments as user moves
        notifyListeners();

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
    gpsAccuracyRef,
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
  const { user, profile, loading, signIn, signInWithApple, signInWithEmail, signUpWithEmail, signInAsGuest, signOut, updateProfile, authError } = useFirebase();
  // Keep device screen awake while the app is open & visible.
  useScreenWakeLock(true);
  const [activeView, setActiveView] = useState<ViewType>(ViewType.DASHBOARD);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [navTarget, setNavTarget] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [forceTutorial, setForceTutorial] = useState(false);

  // Set the current user ID for storage scoping & migrate existing data
  useEffect(() => {
    if (user?.uid) {
      setCurrentUserId(user.uid);
      migrateLocalStorageForUser(user.uid);
    } else {
      setCurrentUserId(null);
    }
  }, [user?.uid]);

  // Sync profile data to local state or just use profile directly
  const truckProfile = useMemo(() => {
    const stored = profile?.truckProfile;
    if (!stored) return {
      height: 13.5, weight: 78500, length: 53, width: 8.5,
      hazmat: false, hazmatClasses: [], tunnelCategory: 'NONE',
      axleCount: 5, axleWeight: 12000, trailerCount: 1,
      model: '', year: 2024, make: '',
      truckNumber: '', trailerNumber: '', truckPlate: '', trailerPlate: ''
    };
    // Use nullish coalescing (??) instead of || to preserve valid 0 values
    return {
      ...stored,
      height: stored.height ?? 13.5,
      weight: stored.weight ?? 78500,
      length: stored.length ?? 53,
      width: stored.width ?? 8.5,
      axleCount: stored.axleCount ?? 5,
      axleWeight: stored.axleWeight ?? 12000,
      trailerCount: stored.trailerCount != null && stored.trailerCount > 0 ? stored.trailerCount : 1,
      model: stored.model ?? '',
      year: stored.year ?? 2024,
      make: stored.make ?? '',
      truckNumber: stored.truckNumber ?? '',
      trailerNumber: stored.trailerNumber ?? '',
      truckPlate: stored.truckPlate ?? '',
      trailerPlate: stored.trailerPlate ?? '',
    };
  }, [profile]);

  const setTruckProfile = useCallback((newProfile: any) => {
    const updatedProfile = typeof newProfile === 'function' ? newProfile(truckProfile) : newProfile;
    updateProfile({ truckProfile: updatedProfile });
  }, [truckProfile, updateProfile]);

  const autoReroute = profile?.autoReroute ?? true;
  const setAutoReroute = useCallback((val: boolean) => updateProfile({ autoReroute: val }), [updateProfile]);

  // Unit system preference (imperial/metric) - persisted in localStorage
  const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>(() => {
    try {
      const key = user?.uid ? getUserStorageKey(user.uid, 'trucker_unitSystem') : 'trucker_unitSystem';
      return (localStorage.getItem(key) as 'imperial' | 'metric') || 'imperial';
    } catch { return 'imperial'; }
  });
  useEffect(() => {
    try { const key = user?.uid ? getUserStorageKey(user.uid, 'trucker_unitSystem') : 'trucker_unitSystem'; localStorage.setItem(key, unitSystem); } catch {}
  }, [unitSystem, user?.uid]);

  const [dataSaver, setDataSaver] = useState<boolean>(() => {
    try { const key = user?.uid ? getUserStorageKey(user.uid, 'trucker_dataSaver') : 'trucker_dataSaver'; return localStorage.getItem(key) === 'true'; } catch { return false; }
  });
  useEffect(() => {
    try { const key = user?.uid ? getUserStorageKey(user.uid, 'trucker_dataSaver') : 'trucker_dataSaver'; localStorage.setItem(key, String(dataSaver)); } catch {}
  }, [dataSaver, user?.uid]);

  // Network status monitoring for reliability
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  // Dashboard financial metrics - use localStorage as primary store with Firestore sync
  const loadLocal = (key: string, fallback: number) => {
    try {
      const storageKey = user?.uid ? getUserStorageKey(user.uid, `trucker_${key}`) : `trucker_${key}`;
      const v = localStorage.getItem(storageKey);
      return v !== null ? parseFloat(v) : (profile as any)?.[key] ?? fallback;
    } catch { return fallback; }
  };

  const [weeklyEarnings, setWeeklyEarningsState] = useState(() => loadLocal('weeklyEarnings', 0));
  const [milesThisWeek, setMilesThisWeekState] = useState(() => loadLocal('milesThisWeek', 0));
  const [fuelCost, setFuelCostState] = useState(() => loadLocal('fuelCost', 0));
  const [truckCost, setTruckCostState] = useState(() => loadLocal('truckCost', 0));
  const [weekDeductions, setWeekDeductionsState] = useState(() => loadLocal('weekDeductions', 0));
  const [takeHomePercentage, setTakeHomePercentageState] = useState(() => loadLocal('takeHomePercentage', 100));
  const [maintenanceCpm, setMaintenanceCpmState] = useState(() => loadLocal('maintenanceCpm', 5)); // ¢/mile
  const [maintenanceAccount, setMaintenanceAccountState] = useState(() => loadLocal('maintenanceAccount', 0));
  const [maintenanceLedger, setMaintenanceLedgerState] = useState<import('./types').MaintenanceLedgerEntry[]>(() => {
    try {
      const storageKey = user?.uid ? getUserStorageKey(user.uid, `trucker_maintenanceLedger`) : `trucker_maintenanceLedger`;
      const v = localStorage.getItem(storageKey);
      if (v) return JSON.parse(v);
    } catch {}
    return [];
  });
  const [adminFee, setAdminFeeState] = useState(() => loadLocal('adminFee', 135));
  const [cashAdvance, setCashAdvanceState] = useState(() => loadLocal('cashAdvance', 0));
  const [insuranceFee, setInsuranceFeeState] = useState(() => loadLocal('insuranceFee', 350));
  const [iftaFee, setIftaFeeState] = useState(() => loadLocal('iftaFee', 35));
  const [physicalDamageFee, setPhysicalDamageFeeState] = useState(() => loadLocal('physicalDamageFee', 150));
  const [trailerCharge, setTrailerChargeState] = useState(() => loadLocal('trailerCharge', 200));
  const [escrowRate, setEscrowRateState] = useState(() => {
    // Legacy users had escrowRate default = 0. Treat saved 0 as "unconfigured"
    // and bump to 3% so escrow auto-accrues out of the box.
    const saved = loadLocal('escrowRate', 3);
    return (saved === 0 || saved === undefined || saved === null) ? 3 : saved;
  }); // % of weekly gross — defaults to 3% so escrow auto-accrues immediately
  const [escrowMax, setEscrowMaxState] = useState(() => loadLocal('escrowMax', 2500));
  const [escrowBalance, setEscrowBalanceState] = useState(() => loadLocal('escrowBalance', 0));
  const [escrowThisWeek, setEscrowThisWeekState] = useState(() => loadLocal('escrowThisWeek', 0));

  // Sync from Firestore profile on initial load (only once per session)
  const [profileSynced, setProfileSynced] = useState(false);
  useEffect(() => {
    if (profile && !profileSynced) {
      if (profile.weeklyEarnings !== undefined) setWeeklyEarningsState(profile.weeklyEarnings);
      if (profile.milesThisWeek !== undefined) setMilesThisWeekState(profile.milesThisWeek);
      if (profile.fuelCost !== undefined) setFuelCostState(profile.fuelCost);
      if (profile.truckCost !== undefined) setTruckCostState(profile.truckCost);
      if (profile.weekDeductions !== undefined) setWeekDeductionsState(profile.weekDeductions);
      if (profile.takeHomePercentage !== undefined) setTakeHomePercentageState(profile.takeHomePercentage);
      if ((profile as any).maintenanceCpm !== undefined) setMaintenanceCpmState((profile as any).maintenanceCpm);
      if ((profile as any).maintenanceAccount !== undefined) setMaintenanceAccountState((profile as any).maintenanceAccount);
      if (Array.isArray((profile as any).maintenanceLedger)) setMaintenanceLedgerState((profile as any).maintenanceLedger);
      if ((profile as any).adminFee !== undefined) setAdminFeeState((profile as any).adminFee);
      if ((profile as any).cashAdvance !== undefined) setCashAdvanceState((profile as any).cashAdvance);
      if ((profile as any).insuranceFee !== undefined) setInsuranceFeeState((profile as any).insuranceFee);
      if ((profile as any).iftaFee !== undefined) setIftaFeeState((profile as any).iftaFee);
      if ((profile as any).physicalDamageFee !== undefined) setPhysicalDamageFeeState((profile as any).physicalDamageFee);
      if ((profile as any).trailerCharge !== undefined) setTrailerChargeState((profile as any).trailerCharge);
      if ((profile as any).escrowRate !== undefined) setEscrowRateState((profile as any).escrowRate);
      if ((profile as any).escrowMax !== undefined) setEscrowMaxState((profile as any).escrowMax);
      if ((profile as any).escrowBalance !== undefined) setEscrowBalanceState((profile as any).escrowBalance);
      if ((profile as any).escrowThisWeek !== undefined) setEscrowThisWeekState((profile as any).escrowThisWeek);
      setProfileSynced(true);
    }
  }, [profile, profileSynced]);

  const saveLocal = (key: string, val: number) => {
    try { const storageKey = user?.uid ? getUserStorageKey(user.uid, `trucker_${key}`) : `trucker_${key}`; localStorage.setItem(storageKey, String(val)); } catch {}
  };

  const setWeeklyEarnings = useCallback((val: any) => {
    setWeeklyEarningsState((prev: number) => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      if (isNaN(newVal)) return prev;
      saveLocal('weeklyEarnings', newVal);
      updateProfile({ weeklyEarnings: newVal }).catch(() => {});
      // Note: escrow contribution is now computed by a derived useEffect that
      // recalculates `escrowThisWeek = weeklyEarnings × rate%` on every change,
      // so increases AND decreases to gross both reflect immediately.
      return newVal;
    });
  }, [updateProfile]);

  // Forward-declared ref so setMilesThisWeek can push ledger entries without
  // creating a circular dep (pushLedgerEntry is defined later in this component).
  const pushLedgerEntryRef = useRef<((e: Omit<import('./types').MaintenanceLedgerEntry, 'id' | 'date'>) => void) | null>(null);

  const setMilesThisWeek = useCallback((val: any) => {
    setMilesThisWeekState((prev: number) => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      if (isNaN(newVal)) return prev;
      saveLocal('milesThisWeek', newVal);
      updateProfile({ milesThisWeek: newVal }).catch(() => {});
      const delta = newVal - prev;
      if (delta > 0) {
        setMaintenanceAccountState((bal: number) => {
          const cpm = maintenanceCpmRef.current;
          const accrued = (delta * cpm) / 100;
          const newBal = +(bal + accrued).toFixed(2);
          saveLocal('maintenanceAccount', newBal);
          updateProfile({ maintenanceAccount: newBal } as any).catch(() => {});
          pushLedgerEntryRef.current?.({
            type: 'accrual',
            amount: +accrued.toFixed(2),
            miles: delta,
            cpm,
            balanceAfter: newBal,
          });
          return newBal;
        });
      }
      return newVal;
    });
  }, [updateProfile]);

  const setFuelCost = useCallback((val: any) => {
    setFuelCostState((prev: number) => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      if (isNaN(newVal)) return prev;
      saveLocal('fuelCost', newVal);
      updateProfile({ fuelCost: newVal }).catch(() => {});
      return newVal;
    });
  }, [updateProfile]);

  const setTruckCost = useCallback((val: any) => {
    setTruckCostState((prev: number) => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      if (isNaN(newVal)) return prev;
      saveLocal('truckCost', newVal);
      updateProfile({ truckCost: newVal }).catch(() => {});
      return newVal;
    });
  }, [updateProfile]);

  const setWeekDeductions = useCallback((val: any) => {
    setWeekDeductionsState((prev: number) => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      if (isNaN(newVal)) return prev;
      saveLocal('weekDeductions', newVal);
      updateProfile({ weekDeductions: newVal }).catch(() => {});
      return newVal;
    });
  }, [updateProfile]);

  const setTakeHomePercentage = useCallback((val: any) => {
    setTakeHomePercentageState((prev: number) => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      if (isNaN(newVal)) return prev;
      saveLocal('takeHomePercentage', newVal);
      updateProfile({ takeHomePercentage: newVal }).catch(() => {});
      return newVal;
    });
  }, [updateProfile]);

  // Refs so that setMilesThisWeek's auto-accrual always sees the latest cpm + ledger pusher
  // without having to depend on them (which would change its identity on every edit).
  const maintenanceCpmRef = useRef<number>(maintenanceCpm);
  useEffect(() => { maintenanceCpmRef.current = maintenanceCpm; }, [maintenanceCpm]);

  const setMaintenanceCpm = useCallback((val: any) => {
    setMaintenanceCpmState((prev: number) => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      if (isNaN(newVal) || newVal < 0) return prev;
      saveLocal('maintenanceCpm', newVal);
      updateProfile({ maintenanceCpm: newVal } as any).catch(() => {});
      return newVal;
    });
  }, [updateProfile]);

  const setMaintenanceAccount = useCallback((val: any) => {
    setMaintenanceAccountState((prev: number) => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      if (isNaN(newVal)) return prev;
      const rounded = +newVal.toFixed(2);
      saveLocal('maintenanceAccount', rounded);
      updateProfile({ maintenanceAccount: rounded } as any).catch(() => {});
      return rounded;
    });
  }, [updateProfile]);

  // Ledger helpers ----------------------------------------------------------
  const saveLedger = useCallback((entries: import('./types').MaintenanceLedgerEntry[]) => {
    try {
      const storageKey = user?.uid ? getUserStorageKey(user.uid, `trucker_maintenanceLedger`) : `trucker_maintenanceLedger`;
      localStorage.setItem(storageKey, JSON.stringify(entries));
    } catch {}
    updateProfile({ maintenanceLedger: entries } as any).catch(() => {});
  }, [user?.uid, updateProfile]);

  const pushLedgerEntry = useCallback((entry: Omit<import('./types').MaintenanceLedgerEntry, 'id' | 'date'>) => {
    setMaintenanceLedgerState((prev) => {
      const full: import('./types').MaintenanceLedgerEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: new Date().toISOString(),
      };
      const next = [full, ...prev].slice(0, 100); // cap at 100 most recent
      saveLedger(next);
      return next;
    });
  }, [saveLedger]);

  // Wire the ref so setMilesThisWeek's accrual callback can push to the ledger
  useEffect(() => { pushLedgerEntryRef.current = pushLedgerEntry; }, [pushLedgerEntry]);

  const depositMaintenance = useCallback((amount: number) => {
    if (!isFinite(amount) || amount <= 0) return;
    setMaintenanceAccountState((bal) => {
      const newBal = +(bal + amount).toFixed(2);
      saveLocal('maintenanceAccount', newBal);
      updateProfile({ maintenanceAccount: newBal } as any).catch(() => {});
      pushLedgerEntry({ type: 'deposit', amount: +amount.toFixed(2), balanceAfter: newBal });
      return newBal;
    });
  }, [pushLedgerEntry, updateProfile]);

  const withdrawMaintenance = useCallback((amount: number) => {
    if (!isFinite(amount) || amount <= 0) return;
    setMaintenanceAccountState((bal) => {
      const newBal = +(bal - amount).toFixed(2);
      saveLocal('maintenanceAccount', newBal);
      updateProfile({ maintenanceAccount: newBal } as any).catch(() => {});
      pushLedgerEntry({ type: 'withdraw', amount: +amount.toFixed(2), balanceAfter: newBal });
      return newBal;
    });
  }, [pushLedgerEntry, updateProfile]);

  const resetMaintenanceAccount = useCallback(() => {
    setMaintenanceAccountState((bal) => {
      saveLocal('maintenanceAccount', 0);
      updateProfile({ maintenanceAccount: 0 } as any).catch(() => {});
      pushLedgerEntry({ type: 'reset', amount: bal, balanceAfter: 0 });
      return 0;
    });
  }, [pushLedgerEntry, updateProfile]);

  // Admin Fee + Escrow setters -------------------------------------------
  const setAdminFee = useCallback((val: any) => {
    setAdminFeeState((prev: number) => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      if (isNaN(newVal) || newVal < 0) return prev;
      saveLocal('adminFee', newVal);
      updateProfile({ adminFee: newVal } as any).catch(() => {});
      return newVal;
    });
  }, [updateProfile]);

  // Generic factory for flat fee setters — all share the same shape:
  // localStorage-backed + Firestore-synced + non-negative.
  const makeFeeSetter = useCallback(
    (key: string, setter: React.Dispatch<React.SetStateAction<number>>) =>
      (val: any) => {
        setter((prev: number) => {
          const newVal = typeof val === 'function' ? val(prev) : val;
          if (isNaN(newVal) || newVal < 0) return prev;
          saveLocal(key, newVal);
          updateProfile({ [key]: newVal } as any).catch(() => {});
          return newVal;
        });
      },
    [updateProfile]
  );

  const setCashAdvance       = useCallback(makeFeeSetter('cashAdvance', setCashAdvanceState),             [makeFeeSetter]);
  const setInsuranceFee      = useCallback(makeFeeSetter('insuranceFee', setInsuranceFeeState),           [makeFeeSetter]);
  const setIftaFee           = useCallback(makeFeeSetter('iftaFee', setIftaFeeState),                     [makeFeeSetter]);
  const setPhysicalDamageFee = useCallback(makeFeeSetter('physicalDamageFee', setPhysicalDamageFeeState), [makeFeeSetter]);
  const setTrailerCharge     = useCallback(makeFeeSetter('trailerCharge', setTrailerChargeState),         [makeFeeSetter]);

  const setEscrowRate = useCallback((val: any) => {
    setEscrowRateState((prev: number) => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      if (isNaN(newVal) || newVal < 0 || newVal > 100) return prev;
      saveLocal('escrowRate', newVal);
      updateProfile({ escrowRate: newVal } as any).catch(() => {});
      return newVal;
    });
  }, [updateProfile]);

  const setEscrowMax = useCallback((val: any) => {
    setEscrowMaxState((prev: number) => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      if (isNaN(newVal) || newVal < 0) return prev;
      saveLocal('escrowMax', newVal);
      updateProfile({ escrowMax: newVal } as any).catch(() => {});
      return newVal;
    });
  }, [updateProfile]);

  const setEscrowBalance = useCallback((val: any) => {
    setEscrowBalanceState((prev: number) => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      if (isNaN(newVal)) return prev;
      const rounded = +newVal.toFixed(2);
      saveLocal('escrowBalance', rounded);
      updateProfile({ escrowBalance: rounded } as any).catch(() => {});
      return rounded;
    });
  }, [updateProfile]);

  const setEscrowThisWeek = useCallback((val: any) => {
    setEscrowThisWeekState((prev: number) => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      if (isNaN(newVal)) return prev;
      const rounded = +newVal.toFixed(2);
      saveLocal('escrowThisWeek', rounded);
      updateProfile({ escrowThisWeek: rounded } as any).catch(() => {});
      return rounded;
    });
  }, [updateProfile]);

  // Refs so the escrow auto-accrual inside setWeeklyEarnings always sees latest values
  const escrowRateRef = useRef<number>(escrowRate);
  const escrowMaxRef = useRef<number>(escrowMax);
  useEffect(() => { escrowRateRef.current = escrowRate; }, [escrowRate]);
  useEffect(() => { escrowMaxRef.current = escrowMax; }, [escrowMax]);

  // Derived recompute: keep `escrowThisWeek` in lockstep with weekly gross.
  // escrowThisWeek = clamp(weeklyEarnings × rate%, 0, escrowMax − priorWeeksBalance)
  // escrowBalance  = priorWeeksBalance + escrowThisWeek
  // where priorWeeksBalance = (escrowBalance − escrowThisWeek). This ensures both
  // INCREASES and DECREASES (or full replacements) of weekly gross are reflected.
  useEffect(() => {
    if (!profileSynced) return;
    if (escrowRate < 0) return;
    const priorWeeksBalance = +(escrowBalance - escrowThisWeek).toFixed(2);
    const target = +((weeklyEarnings * escrowRate) / 100).toFixed(2);
    const room = Math.max(0, +(escrowMax - priorWeeksBalance).toFixed(2));
    const newThisWeek = +Math.min(Math.max(0, target), room).toFixed(2);
    const newBalance = +(priorWeeksBalance + newThisWeek).toFixed(2);
    // Skip write if both values already match (avoids loops)
    if (Math.abs(newThisWeek - escrowThisWeek) < 0.005 && Math.abs(newBalance - escrowBalance) < 0.005) return;
    setEscrowThisWeekState(newThisWeek);
    setEscrowBalanceState(newBalance);
    saveLocal('escrowThisWeek', newThisWeek);
    saveLocal('escrowBalance', newBalance);
    updateProfile({ escrowThisWeek: newThisWeek, escrowBalance: newBalance } as any).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyEarnings, escrowRate, escrowMax, profileSynced]);

  // One-time migration: legacy users had `escrowRate=0` stored. The init logic
  // bumps it to 3% if 0, but we still need to persist the upgrade so the next
  // mount doesn't re-trigger it. The derived effect above handles the actual
  // escrow recompute, so no retroactive accrual is needed here.
  const escrowMigrationRanRef = useRef(false);
  useEffect(() => {
    if (escrowMigrationRanRef.current) return;
    if (!profileSynced) return;
    escrowMigrationRanRef.current = true;
    try {
      const migrationKey = user?.uid ? getUserStorageKey(user.uid, `trucker_escrowMigrated_v2`) : `trucker_escrowMigrated_v2`;
      if (localStorage.getItem(migrationKey) === 'true') return;
      if (escrowRate > 0) {
        saveLocal('escrowRate', escrowRate);
        updateProfile({ escrowRate } as any).catch(() => {});
      }
      localStorage.setItem(migrationKey, 'true');
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileSynced]);

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
      // Suppress Firestore permission errors (expected for guest/email users)
      const reason = String(event.reason);
      if (reason.includes('permission') || reason.includes('Permission')) {
        event.preventDefault();
        return;
      }
      console.error("Unhandled Rejection Detail:", {
        reason,
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
        return <Suspense fallback={<ContentLoader />}><Dashboard /></Suspense>;
      case ViewType.TRUCK_STOPS:
        return <Suspense fallback={<ContentLoader />}><ComingSoonOverlay title="Truck Stops"><PredictiveParking /></ComingSoonOverlay></Suspense>;
      case ViewType.LOAD_BOARD:
        return <Suspense fallback={<ContentLoader />}><ComingSoonOverlay title="Load Board"><LoadBoard /></ComingSoonOverlay></Suspense>;
      case ViewType.MAINTENANCE:
        return <Suspense fallback={<ContentLoader />}><ComingSoonOverlay title="Maintenance"><Maintenance /></ComingSoonOverlay></Suspense>;
      case ViewType.NAVIGATION:
        return null; // Handled separately to keep it mounted
      case ViewType.SETTINGS:
        return <Suspense fallback={<ContentLoader />}><SettingsView onReplayTutorial={handleReplayTutorial} /></Suspense>;
      case ViewType.ROUTE_HISTORY:
        return <Suspense fallback={<ContentLoader />}><RouteHistory /></Suspense>;
      case ViewType.PAY_SUMMARY:
        return <Suspense fallback={<ContentLoader />}><PaySummary /></Suspense>;
      case ViewType.GITHUB_UPDATES:
      case ViewType.FUEL_NETWORK:
        return <Suspense fallback={<ContentLoader />}><FuelNetwork /></Suspense>;
      case ViewType.HUD_LAYOUT:
        return <Suspense fallback={<ContentLoader />}><HudLayoutView /></Suspense>;
      case ViewType.ELD_LOGS:
        return <Suspense fallback={<ContentLoader />}><ELDLogView /></Suspense>;
      case ViewType.OFFLINE_MAPS:
        return <Suspense fallback={<ContentLoader />}><ComingSoonOverlay title="Offline Maps"><OfflineMapsView /></ComingSoonOverlay></Suspense>;
      case ViewType.COMMUNITY:
        return <Suspense fallback={<ContentLoader />}><CommunityView /></Suspense>;
      case ViewType.ANNOUNCEMENTS:
        return <Suspense fallback={<ContentLoader />}><AnnouncementsView /></Suspense>;
      default:
        return <Suspense fallback={<ContentLoader />}><Dashboard /></Suspense>;
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
      setTakeHomePercentage,
      maintenanceCpm,
      setMaintenanceCpm,
      maintenanceAccount,
      setMaintenanceAccount,
      maintenanceLedger,
      depositMaintenance,
      withdrawMaintenance,
      resetMaintenanceAccount,
      adminFee,
      setAdminFee,
      cashAdvance,
      setCashAdvance,
      insuranceFee,
      setInsuranceFee,
      iftaFee,
      setIftaFee,
      physicalDamageFee,
      setPhysicalDamageFee,
      trailerCharge,
      setTrailerCharge,
      escrowRate,
      setEscrowRate,
      escrowMax,
      setEscrowMax,
      escrowBalance,
      setEscrowBalance,
      escrowThisWeek,
      setEscrowThisWeek,
      unitSystem,
      setUnitSystem,
      dataSaver,
      setDataSaver,
      gpsAccuracy: null, // Read from TelemetryContext.gpsAccuracyRef in NavigationView
      isOnline
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
      takeHomePercentage,
      unitSystem,
      dataSaver,
      isOnline,
      maintenanceCpm,
      maintenanceAccount,
      maintenanceLedger,
      adminFee,
      escrowRate,
      escrowMax,
      escrowBalance,
      escrowThisWeek,
      cashAdvance,
      insuranceFee,
      iftaFee,
      physicalDamageFee,
      trailerCharge
    ]);

  const mountTimeRef = useRef(Date.now());
  const MIN_SPLASH_MS = 3500;

  const [splashVisible, setSplashVisible] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);
  const [contentReady, setContentReady] = useState(false);

  // Preload the main lazy components during splash
  useEffect(() => {
    Promise.all([
      import('./components/Dashboard'),
      import('./components/NavigationView'),
    ]).then(() => setContentReady(true))
      .catch(() => setContentReady(true)); // Don't block on error
  }, []);

  useEffect(() => {
    // Wait for BOTH loading=false AND components preloaded
    if (!loading && contentReady) {
      const elapsed = Date.now() - mountTimeRef.current;
      const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
      const exitTimer = setTimeout(() => {
        setSplashExiting(true);
        const unmountTimer = setTimeout(() => setSplashVisible(false), 750);
        return () => clearTimeout(unmountTimer);
      }, remaining);
      return () => clearTimeout(exitTimer);
    }
  }, [loading, contentReady]);

  // Guest session handlers (must be before early returns to satisfy React hooks rules)
  const handleGuestExpired = useCallback(() => {
    sessionStorage.removeItem('guest_session_start');
    signOut();
  }, [signOut]);

  const handleGuestCreateAccount = useCallback(() => {
    sessionStorage.removeItem('guest_session_start');
    signOut();
  }, [signOut]);

  const handleGuestGoogleSignIn = useCallback(() => {
    sessionStorage.removeItem('guest_session_start');
    signOut();
  }, [signOut]);

  if (splashVisible) {
    return <LoadingScreen isExiting={splashExiting} />;
  }

  if (!user) {
    return <LoginScreen signIn={signIn} signInWithApple={signInWithApple} signInWithEmail={signInWithEmail} signUpWithEmail={signUpWithEmail} signInAsGuest={signInAsGuest} authError={authError} />;
  }

  const handleReplayTutorial = () => {
    setForceTutorial(true);
    setShowTutorial(true);
  };

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

            {/* Tutorial Overlay */}
            <TutorialOverlay
              userId={user.uid}
              forceShow={forceTutorial}
              onComplete={() => { setShowTutorial(false); setForceTutorial(false); }}
            />

            {/* Guest Session Timer */}
            {user.isAnonymous && (
              <GuestSessionTimer
                onExpired={handleGuestExpired}
                onCreateAccount={handleGuestCreateAccount}
                onGoogleSignIn={handleGuestGoogleSignIn}
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
