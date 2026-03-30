
import React from 'react';
import { User } from 'firebase/auth';

export interface POI {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  address?: string;
  rating?: number;
  isCustom?: boolean;
  place_id?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  detailsFetched?: boolean;
  amenities?: string[];
  entrance?: { lat: number, lon: number };
  exit?: { lat: number, lon: number };
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  truckProfile?: {
    height: number;
    weight: number;
    length: number;
    width: number;
    hazmat: boolean;
    hazmatClasses: string[];
    tunnelCategory: string;
    axleCount: number;
    axleWeight: number;
    trailerCount: number;
    make: string;
    model: string;
    year: number;
  };
  autoReroute?: boolean;
  weeklyEarnings?: number;
  fuelCost?: number;
  truckCost?: number;
  weekDeductions?: number;
  takeHomePercentage?: number;
  milesThisWeek?: number;
  role?: 'admin' | 'user';
  currentLoad?: {
    origin: string;
    destination: string;
    commodity: string;
    rate: string;
    total: string;
    bookedAt: string;
  };
  customPois?: POI[];
}

export interface FirebaseContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  authError: string | null;
}

export const FirebaseContext = React.createContext<FirebaseContextType | undefined>(undefined);

export enum ViewType {
  DASHBOARD = 'DASHBOARD',
  NAVIGATION = 'NAVIGATION',
  LOAD_BOARD = 'LOAD_BOARD',
  TRUCK_STOPS = 'TRUCK_STOPS',
  MAINTENANCE = 'MAINTENANCE',
  SETTINGS = 'SETTINGS',
  ROUTE_HISTORY = 'ROUTE_HISTORY',
  PAY_SUMMARY = 'PAY_SUMMARY',
  GITHUB_UPDATES = 'GITHUB_UPDATES',
  FUEL_NETWORK = 'FUEL_NETWORK'
}

export interface TelemetryContextType {
  speedRef: React.MutableRefObject<number>;
  headingRef: React.MutableRefObject<number>;
  subscribe: (callback: () => void) => () => void;
}

export const TelemetryContext = React.createContext<TelemetryContextType | undefined>(undefined);

export interface LocationContextType {
  userLocation: [number, number] | null;
  setUserLocation: (location: [number, number] | null) => void;
}

export const LocationContext = React.createContext<LocationContextType | undefined>(undefined);

export interface AppContextType {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  navTarget: string | null;
  setNavTarget: (target: string | null) => void;
  isDriving: boolean;
  setIsDriving: (val: boolean) => void;
  autoReroute: boolean;
  setAutoReroute: (val: boolean) => void;
  truckProfile: {
    height: number;
    weight: number;
    length: number;
    width: number;
    hazmat: boolean;
    hazmatClasses: string[];
    tunnelCategory: string;
    axleCount: number;
    axleWeight: number;
    trailerCount: number;
  };
  setTruckProfile: React.Dispatch<React.SetStateAction<{
    height: number;
    weight: number;
    length: number;
    width: number;
    hazmat: boolean;
    hazmatClasses: string[];
    tunnelCategory: string;
    axleCount: number;
    axleWeight: number;
    trailerCount: number;
  }>>;
  weeklyEarnings: number;
  setWeeklyEarnings: React.Dispatch<React.SetStateAction<number>>;
  milesThisWeek: number;
  setMilesThisWeek: React.Dispatch<React.SetStateAction<number>>;
  fuelCost: number;
  setFuelCost: React.Dispatch<React.SetStateAction<number>>;
  truckCost: number;
  setTruckCost: React.Dispatch<React.SetStateAction<number>>;
  weekDeductions: number;
  setWeekDeductions: React.Dispatch<React.SetStateAction<number>>;
  takeHomePercentage: number;
  setTakeHomePercentage: React.Dispatch<React.SetStateAction<number>>;
  unitSystem: 'imperial' | 'metric';
  setUnitSystem: React.Dispatch<React.SetStateAction<'imperial' | 'metric'>>;
}

export interface HOSContextType {
  idleSeconds: number;
  setIdleSeconds: React.Dispatch<React.SetStateAction<number>>;
  breakSuggestion: boolean;
  setBreakSuggestion: (val: boolean) => void;
  hasViolation: boolean;
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

export const AppContext = React.createContext<AppContextType | undefined>(undefined);
export const HOSContext = React.createContext<HOSContextType | undefined>(undefined);

export interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  // Fix: use React.ReactNode after importing React
  icon: React.ReactNode;
  trend?: {
    value: string;
    positive: boolean;
  };
}

export interface ParkingCardProps {
  name: string;
  location: string;
  distance: string;
  status: 'LIKELY OPEN' | 'FULL SOON' | 'FILLING UP';
  available: number;
  total: number;
  amenities: string[];
}

export interface ELDTimerProps {
  label: string;
  time: string;
  percentage: number;
  color: string;
}

export interface MaintenanceRecord {
  id: string;
  title: string;
  urgency: 'High' | 'Medium' | 'Low';
  date: string;
  type: 'Repair' | 'Scheduled' | 'Maintenance';
  status: 'Active' | 'Scheduled' | 'Completed';
  cost?: string;
}

export interface RouteHistoryItem {
  id: string;
  origin: string;
  destination: string;
  distance: number; // miles
  duration: number; // seconds
  date: string; // ISO string
  status: 'COMPLETED' | 'CANCELLED';
}

export interface RestrictionAlert {
  type: 'BRIDGE' | 'WEIGHT' | 'TUNNEL' | 'HAZMAT' | 'RESTRICTION';
  message: string;
  icon: any;
  color: string;
  bg: string;
  progress: number;
  value?: number;
  coords?: [number, number];
}
