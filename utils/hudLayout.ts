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
