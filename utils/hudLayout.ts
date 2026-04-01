import type { HudLayoutConfig } from '../types';

export const DEFAULT_HUD_LAYOUT: HudLayoutConfig = {
  showNavigationHUD: true,
  showSpeedOverlay: true,
  showArrivalHUD: true,
  showFuelCost: true,
  showHosStatus: true,
  showMapControls: true,
  showWeatherOverlay: true,
  showTruckRestrictions: true,
  showHighwayShields: true,
  showSpeedLimitSigns: true,
  showExitSigns: true,
  showCmvWarnings: true,
  showCurveWarnings: true,
  showTrafficIncidents: true,
  showWaypointMarkers: true,
  showManeuverPreview: true,
  showRouteComparison: true,
  showLaneGuidance: true,
  showCompassRose: true,
  showNextStop: true,
  tripPanelPosition: 'right',
};

const STORAGE_KEY = 'nav_hud_layout';
const ORDER_KEY = 'nav_hud_order';

export type HudElementOrder = Record<string, string[]>;

export const DEFAULT_ORDER: HudElementOrder = {
  Navigation: ['showNavigationHUD', 'showLaneGuidance', 'showSpeedOverlay', 'showArrivalHUD', 'showManeuverPreview', 'showCompassRose', 'showNextStop'],
  Panels: ['showFuelCost', 'showHosStatus', 'showMapControls', 'showRouteComparison', 'showWeatherOverlay'],
  Signs: ['showHighwayShields', 'showSpeedLimitSigns', 'showExitSigns', 'showCurveWarnings', 'showCmvWarnings', 'showTruckRestrictions', 'showTrafficIncidents', 'showWaypointMarkers'],
};

export function loadHudLayout(): HudLayoutConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_HUD_LAYOUT, ...JSON.parse(stored) };
    }
  } catch {}
  return { ...DEFAULT_HUD_LAYOUT };
}

export function saveHudLayout(config: HudLayoutConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

export function loadHudOrder(): HudElementOrder {
  try {
    const stored = localStorage.getItem(ORDER_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const merged: HudElementOrder = {};
      for (const cat of Object.keys(DEFAULT_ORDER)) {
        const savedKeys = parsed[cat] || [];
        const defaultKeys = DEFAULT_ORDER[cat];
        const missing = defaultKeys.filter((k: string) => !savedKeys.includes(k));
        merged[cat] = [...savedKeys.filter((k: string) => defaultKeys.includes(k)), ...missing];
      }
      return merged;
    }
  } catch {}
  return { ...DEFAULT_ORDER };
}

export function saveHudOrder(order: HudElementOrder): void {
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  } catch {}
}

/* ─── Position Storage ─── */
const POS_KEY = 'nav_hud_positions';

export interface HudPosition { x: number; y: number }
export type HudPositions = Record<string, HudPosition>;

export const DEFAULT_POSITIONS: HudPositions = {
  navigationHUD:    { x: 50, y: 3 },
  speedOverlay:     { x: 3, y: 72 },
  maneuverPreview:  { x: 82, y: 3 },
  weatherPanel:     { x: 3, y: 42 },
  tripPanel:        { x: 82, y: 55 },
  mapControls:      { x: 92, y: 38 },
  routeComparison:  { x: 50, y: 14 },
  arrivalHUD:       { x: 50, y: 90 },
  compassRose:      { x: 3, y: 85 },
  nextStop:         { x: 50, y: 82 },
};

export function loadHudPositions(): HudPositions {
  try {
    const stored = localStorage.getItem(POS_KEY);
    if (stored) {
      return { ...DEFAULT_POSITIONS, ...JSON.parse(stored) };
    }
  } catch {}
  return { ...DEFAULT_POSITIONS };
}

export function saveHudPositions(positions: HudPositions): void {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(positions));
  } catch {}
}

/* ─── Scale Storage ─── */
const SCALE_KEY = 'nav_hud_scales';

export type HudScales = Record<string, number>;

export const DEFAULT_SCALES: HudScales = {
  navigationHUD: 1,
  speedOverlay: 1,
  arrivalHUD: 1,
  maneuverPreview: 1,
  weatherPanel: 1,
  fuelCost: 1,
  hosStatus: 1,
  mapControls: 1,
  compassRose: 1,
  nextStop: 1,
  routeComparison: 1,
};

export const SCALE_OPTIONS = [
  { value: 0.7, label: 'XS' },
  { value: 0.85, label: 'S' },
  { value: 1.0, label: 'M' },
  { value: 1.15, label: 'L' },
  { value: 1.3, label: 'XL' },
];

export function loadHudScales(): HudScales {
  try {
    const stored = localStorage.getItem(SCALE_KEY);
    if (stored) {
      return { ...DEFAULT_SCALES, ...JSON.parse(stored) };
    }
  } catch {}
  return { ...DEFAULT_SCALES };
}

export function saveHudScales(scales: HudScales): void {
  try {
    localStorage.setItem(SCALE_KEY, JSON.stringify(scales));
  } catch {}
}
