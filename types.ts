import React from 'react';

export enum ViewType {
  DASHBOARD = 'DASHBOARD',
  NAVIGATION = 'NAVIGATION',
  LOAD_BOARD = 'LOAD_BOARD',
  TRUCK_STOPS = 'TRUCK_STOPS',
  MAINTENANCE = 'MAINTENANCE',
  SETTINGS = 'SETTINGS',
  TRUCK_PROFILE = 'TRUCK_PROFILE'
}

export interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
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