
import React from 'react';

export enum ViewType {
  DASHBOARD = 'DASHBOARD',
  NAVIGATION = 'NAVIGATION',
  LOAD_BOARD = 'LOAD_BOARD',
  TRUCK_STOPS = 'TRUCK_STOPS',
  MAINTENANCE = 'MAINTENANCE',
  SETTINGS = 'SETTINGS',
  ROUTE_HISTORY = 'ROUTE_HISTORY',
  PAY_SUMMARY = 'PAY_SUMMARY'
}

export interface AppContextType {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  userLocation: [number, number] | null;
  setUserLocation: React.Dispatch<React.SetStateAction<[number, number] | null>>;
  navTarget: string | null;
  setNavTarget: (target: string | null) => void;
  isDriving: boolean;
  setIsDriving: (val: boolean) => void;
  speed: number;
  setSpeed: (val: number) => void;
  heading: number;
  setHeading: (val: number) => void;
  idleSeconds: number;
  breakSuggestion: boolean;
  setBreakSuggestion: (val: boolean) => void;
  hasViolation: boolean;
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
}

export const AppContext = React.createContext<AppContextType | undefined>(undefined);

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

export interface RouteHistoryItem {
  id: string;
  origin: string;
  destination: string;
  distance: number; // miles
  duration: number; // seconds
  date: string; // ISO string
  status: 'COMPLETED' | 'CANCELLED';
}
