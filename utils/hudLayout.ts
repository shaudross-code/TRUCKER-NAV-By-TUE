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
  tripPanelPosition: 'right',
};

const STORAGE_KEY = 'nav_hud_layout';
const ORDER_KEY = 'nav_hud_order';

export type HudElementOrder = Record<string, string[]>;

export const DEFAULT_ORDER: HudElementOrder = {
  Navigation: ['showNavigationHUD', 'showLaneGuidance', 'showSpeedOverlay', 'showArrivalHUD', 'showManeuverPreview'],
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
      // Merge with defaults to ensure new keys are included
      const merged: HudElementOrder = {};
      for (const cat of Object.keys(DEFAULT_ORDER)) {
        const savedKeys = parsed[cat] || [];
        const defaultKeys = DEFAULT_ORDER[cat];
        // Keep saved order, append any missing keys from defaults
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
