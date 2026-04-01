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
