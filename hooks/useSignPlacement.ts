import { useCallback, useRef } from 'react';
import L from 'leaflet';
import {
  interstateShield, usRouteShield, stateRouteShield, speedLimitSign,
  curveWarning, exitGuideSign, directionBadge, directionLabel,
  steepGradeWarning, rolloverWarning, windingRoadWarning,
  lowClearanceWarning, weightLimitSign, tunnelWarning,
  noHazmatSign, noTrucksSign, noticeWarning
} from '../utils/mutcdSigns';

interface SignData {
  id: string;
  lat: number;
  lon: number;
  iconHtml: string;
  iconSize: [number, number];
  iconAnchor: [number, number];
  zIndexOffset: number;
}

// Map sign ID prefix → hudLayout key for visibility filtering
const SIGN_PREFIX_TO_HUD_KEY: Record<string, string> = {
  'shield': 'showHighwayShields',
  'exit': 'showExitSigns',
  'curve': 'showCurveWarnings',
  'speed': 'showSpeedLimitSigns',
  'slowdown': 'showTrafficIncidents',
  'cmv': 'showCmvWarnings',
  'truckwarn': 'showTruckRestrictions',
};

function getSignCategory(signId: string): string {
  const dash = signId.indexOf('-');
  return dash > 0 ? signId.substring(0, dash) : signId;
}

export function useSignPlacement(
  mapInstanceRef: { current: any },
  shieldLayerGroupRef: { current: L.LayerGroup | null },
) {
  const signDataStoreRef = useRef<SignData[]>([]);
  const visibleSignMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const syncVisibleSignsRef = useRef<() => void>(() => {});
  const shieldBlobCacheRef = useRef<Map<string, string>>(new Map());
  const regionStateRef = useRef('');
  const dataSaverRef = useRef(false);
  // Tracks which sign categories are visible based on hudLayout
  const signVisibilityRef = useRef<Record<string, boolean>>({});

  const setRegionState = useCallback((state: string) => { regionStateRef.current = state; }, []);
  const setDataSaver = useCallback((ds: boolean) => { dataSaverRef.current = ds; }, []);

  // Update sign visibility filter from hudLayout and re-sync the map
  const updateSignVisibility = useCallback((hudLayout: Record<string, any>) => {
    const vis: Record<string, boolean> = {};
    for (const prefix of Object.keys(SIGN_PREFIX_TO_HUD_KEY)) {
      const key = SIGN_PREFIX_TO_HUD_KEY[prefix];
      vis[prefix] = hudLayout[key] !== false; // default true if undefined
    }
    signVisibilityRef.current = vis;
  }, []);

  const getShieldBlobUrl = useCallback(async (shieldUrl: string): Promise<string> => {
    if (shieldBlobCacheRef.current.has(shieldUrl)) return shieldBlobCacheRef.current.get(shieldUrl)!;
    try {
      const resp = await fetch(shieldUrl);
      if (!resp.ok || resp.status === 204) return '';
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      shieldBlobCacheRef.current.set(shieldUrl, blobUrl);
      return blobUrl;
    } catch { return ''; }
  }, []);

  const syncVisibleSigns = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !shieldLayerGroupRef.current) return;
    const bounds = map.getBounds();
    const padded = bounds.pad(0.2);
    const store = signDataStoreRef.current;
    const visible = visibleSignMarkersRef.current;
    const vis = signVisibilityRef.current;
    const newVisibleIds = new Set<string>();

    for (const sign of store) {
      // Check both viewport bounds AND hudLayout visibility
      const category = getSignCategory(sign.id);
      const isAllowed = vis[category] !== false; // default true
      if (isAllowed && padded.contains([sign.lat, sign.lon])) newVisibleIds.add(sign.id);
    }
    // Remove markers that should no longer be visible
    for (const [id, marker] of visible) {
      if (!newVisibleIds.has(id)) { shieldLayerGroupRef.current!.removeLayer(marker); visible.delete(id); }
    }
    // Add markers that should now be visible
    for (const sign of store) {
      if (newVisibleIds.has(sign.id) && !visible.has(sign.id)) {
        const icon = L.divIcon({ html: sign.iconHtml, className: 'highway-shield-icon', iconSize: sign.iconSize, iconAnchor: sign.iconAnchor });
        const marker = L.marker([sign.lat, sign.lon], { icon, interactive: false, zIndexOffset: sign.zIndexOffset, pane: 'signPane' }).addTo(shieldLayerGroupRef.current!);
        visible.set(sign.id, marker);
      }
    }
  }, [mapInstanceRef, shieldLayerGroupRef]);

  syncVisibleSignsRef.current = syncVisibleSigns;

  const registerSign = useCallback((id: string, lat: number, lon: number, iconHtml: string, iconSize: [number, number], iconAnchor: [number, number], zIndexOffset: number) => {
    signDataStoreRef.current.push({ id, lat, lon, iconHtml, iconSize, iconAnchor, zIndexOffset });
  }, []);

  const clearSigns = useCallback(() => {
    signDataStoreRef.current = [];
    visibleSignMarkersRef.current.clear();
    if (shieldLayerGroupRef.current) shieldLayerGroupRef.current.clearLayers();
  }, [shieldLayerGroupRef]);

  const placeHighwayShields = useCallback((shields: { label: string; routeLevel: number; type: string; coord: [number, number]; pointIndex: number; direction?: string }[]) => {
    if (!shieldLayerGroupRef.current || shields.length === 0) return;
    const currentRegionState = regionStateRef.current;
    const dataSaver = dataSaverRef.current;
    const uniqueUrls = new Map<string, string>();
    shields.forEach((shield) => {
      const stateCode = currentRegionState || '';
      const params = new URLSearchParams({ label: shield.label, countryCode: 'USA', routeLevel: String(shield.routeLevel), width: '64' });
      if (stateCode && stateCode.length === 2) params.append('stateCode', stateCode.toUpperCase());
      uniqueUrls.set(`${shield.label}-${shield.routeLevel}-${stateCode}`, `/api/road-shield?${params.toString()}`);
    });
    const fetchPromises = Array.from(uniqueUrls.values()).map(url => dataSaver ? Promise.resolve('') : getShieldBlobUrl(url));
    Promise.all(fetchPromises).then(() => {
      shields.forEach((shield) => {
        const { label, routeLevel, type, coord, direction } = shield;
        if (!coord || !coord[0] || !coord[1]) return;
        const stateCode = currentRegionState || '';
        const params = new URLSearchParams({ label, countryCode: 'USA', routeLevel: String(routeLevel), width: '64' });
        if (stateCode && stateCode.length === 2) params.append('stateCode', stateCode.toUpperCase());
        const shieldUrl = `/api/road-shield?${params.toString()}`;
        const dirBadge = directionBadge(direction || '');
        const dirLabelHtml = directionLabel(direction || '');
        let fallbackHtml = '';
        if (type === 'interstate') fallbackHtml = interstateShield(label, 44);
        else if (type === 'us') fallbackHtml = usRouteShield(label, 40);
        else fallbackHtml = stateRouteShield(label, 34);
        const cachedBlobUrl = shieldBlobCacheRef.current.get(shieldUrl) || '';
        const iconHtml = dataSaver
          ? `<div class="counter-rotate" data-testid="highway-shield-marker" style="position:relative;cursor:default">${dirBadge}<div style="display:flex;align-items:center;justify-content:center">${fallbackHtml}</div>${dirLabelHtml}</div>`
          : cachedBlobUrl
            ? `<div class="counter-rotate" data-testid="highway-shield-marker" style="position:relative;cursor:default">${dirBadge}<img src="${cachedBlobUrl}" style="width:40px;height:auto;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.6))" alt="${type === 'interstate' ? 'I-' : type === 'us' ? 'US-' : ''}${label}"/>${dirLabelHtml}</div>`
            : `<div class="counter-rotate" data-testid="highway-shield-marker" style="position:relative;cursor:default">${dirBadge}<div style="display:flex;align-items:center;justify-content:center">${fallbackHtml}</div>${dirLabelHtml}</div>`;
        registerSign(`shield-${label}-${routeLevel}-${coord[0].toFixed(4)}`, coord[0], coord[1], iconHtml, [48, 52], [24, 26], 500);
      });
      syncVisibleSigns();
      console.log(`[Shields] Placed ${shields.length} highway shield markers`);
    }).catch(err => console.error('[Shields] Failed:', err));
  }, [getShieldBlobUrl, registerSign, syncVisibleSigns, shieldLayerGroupRef]);

  const placeExitSigns = useCallback((exits: { name: string; exitNumber?: string; coord: [number, number] }[]) => {
    if (!shieldLayerGroupRef.current || exits.length === 0) return;
    exits.forEach(({ name, exitNumber, coord }) => {
      if (!coord || !coord[0] || !coord[1]) return;
      const iconHtml = `<div class="counter-rotate" data-testid="exit-sign-marker" style="cursor:default">${exitGuideSign(name, exitNumber)}</div>`;
      registerSign(`exit-${exitNumber || name}-${coord[0].toFixed(4)}`, coord[0], coord[1], iconHtml, [120, 56], [60, 56], 490);
    });
    syncVisibleSigns();
  }, [registerSign, syncVisibleSigns, shieldLayerGroupRef]);

  const placeCurveSigns = useCallback((curves: { severity: string; direction: string; coord: [number, number] }[]) => {
    if (!shieldLayerGroupRef.current || curves.length === 0) return;
    curves.forEach(({ direction, coord }) => {
      if (!coord || !coord[0] || !coord[1]) return;
      const iconHtml = `<div class="counter-rotate" data-testid="curve-sign-marker" style="cursor:default">${curveWarning(direction === 'left' ? 'left' : 'right', 40)}</div>`;
      registerSign(`curve-${direction}-${coord[0].toFixed(4)}`, coord[0], coord[1], iconHtml, [40, 40], [20, 20], 450);
    });
    syncVisibleSigns();
  }, [registerSign, syncVisibleSigns, shieldLayerGroupRef]);

  const placeSpeedLimitSigns = useCallback((signs: { speed: number; coord: [number, number] }[]) => {
    if (!shieldLayerGroupRef.current || signs.length === 0) return;
    signs.forEach(({ speed, coord }, idx) => {
      if (!coord || !coord[0] || !coord[1]) return;
      const iconHtml = `<div class="counter-rotate" data-testid="speed-limit-sign-marker" style="cursor:default">${speedLimitSign(speed, 42)}</div>`;
      // First sign (route start): offset anchor to the right so sign appears LEFT of user icon
      const isFirst = idx === 0;
      const anchorX = isFirst ? 58 : 21;
      registerSign(`speed-${speed}-${coord[0].toFixed(4)}`, coord[0], coord[1], iconHtml, [42, 54], [anchorX, 27], 460);
    });
    syncVisibleSigns();
  }, [registerSign, syncVisibleSigns, shieldLayerGroupRef]);

  const placeTrafficSlowdowns = useCallback((slowdowns: { severity: string; message: string; coord: [number, number] }[]) => {
    if (!shieldLayerGroupRef.current || slowdowns.length === 0) return;
    slowdowns.forEach(({ severity, message, coord }) => {
      if (!coord || !coord[0] || !coord[1]) return;
      const sevColor = severity === 'high' || severity === 'critical' ? '#dc2626' : severity === 'medium' ? '#f59e0b' : '#ef4444';
      const shortMsg = message.length > 30 ? message.substring(0, 28) + '...' : message;
      const iconHtml = `<div class="counter-rotate" data-testid="traffic-slowdown-marker" style="cursor:default;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.6))"><div style="background:${sevColor};border:2px solid #fff;border-radius:4px;padding:2px 5px;text-align:center;max-width:90px"><div style="display:flex;align-items:center;gap:2px;justify-content:center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M4.93 19h14.14c1.34 0 2.17-1.46 1.49-2.63L13.49 4.63a1.7 1.7 0 0 0-2.98 0L3.44 16.37C2.76 17.54 3.59 19 4.93 19z" stroke="white" stroke-width="2" stroke-linecap="round"/></svg><span style="font-size:7px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:0.5px">Slowdown</span></div><div style="font-size:6px;color:rgba(255,255,255,0.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px">${shortMsg}</div></div><div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:4px solid ${sevColor};margin:0 auto"></div></div>`;
      registerSign(`slowdown-${severity}-${coord[0].toFixed(4)}`, coord[0], coord[1], iconHtml, [94, 34], [47, 34], 470);
    });
    syncVisibleSigns();
  }, [registerSign, syncVisibleSigns, shieldLayerGroupRef]);

  const placeCmvWarnings = useCallback((warnings: { type: string; severity: string; message: string; grade?: number; coord: [number, number]; progress?: number }[]) => {
    if (!shieldLayerGroupRef.current || warnings.length === 0) return;
    warnings.forEach((w) => {
      const { type, severity, message, coord } = w;
      if (!coord || !coord[0] || !coord[1]) return;
      const sevBorder = severity === 'critical' ? '#dc2626' : severity === 'high' ? '#f59e0b' : '#eab308';
      let signHtml = '';
      if (type === 'STEEP_DOWNGRADE') signHtml = steepGradeWarning('down', w.grade, 44);
      else if (type === 'STEEP_HILL') signHtml = steepGradeWarning('up', w.grade, 44);
      else if (type === 'ROLLOVER_RISK') signHtml = rolloverWarning(42);
      else if (type === 'WINDING_ROAD') signHtml = windingRoadWarning(40);
      const labelMap: Record<string, string> = { 'STEEP_DOWNGRADE': 'STEEP GRADE', 'STEEP_HILL': 'HILL', 'ROLLOVER_RISK': 'ROLLOVER', 'WINDING_ROAD': 'WINDING' };
      const iconHtml = `<div class="counter-rotate" data-testid="cmv-warning-marker" data-warning-type="${type}" style="cursor:default"><div style="display:flex;flex-direction:column;align-items:center">${signHtml}<div style="background:rgba(0,0,0,0.85);border:1px solid ${sevBorder};border-radius:3px;padding:1px 4px;margin-top:2px;text-align:center;max-width:80px"><div style="font-size:6px;font-weight:900;color:${sevBorder};letter-spacing:0.5px;white-space:nowrap">${labelMap[type] || type}</div><div style="font-size:5px;color:rgba(255,255,255,0.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:76px">${message}</div></div></div></div>`;
      registerSign(`cmv-${type}-${coord[0].toFixed(4)}`, coord[0], coord[1], iconHtml, [44, 60], [22, 30], 550);
    });
    syncVisibleSigns();
  }, [registerSign, syncVisibleSigns, shieldLayerGroupRef]);

  const placeTruckWarnings = useCallback((restrictions: { type: string; message: string; coords?: [number, number]; progress?: number }[]) => {
    if (!shieldLayerGroupRef.current || restrictions.length === 0) return;
    let placed = 0;
    restrictions.forEach((r) => {
      if (!r.coords || !r.coords[0] || !r.coords[1]) return;
      let signHtml = '', labelText = '', labelColor = '#f59e0b';
      if (r.type === 'BRIDGE') { signHtml = lowClearanceWarning(undefined, 40); labelText = 'LOW CLEARANCE'; labelColor = '#dc2626'; }
      else if (r.type === 'WEIGHT') { signHtml = weightLimitSign(r.message.length > 15 ? 'RESTRICTED' : r.message, 34); labelText = 'WEIGHT LIMIT'; labelColor = '#f59e0b'; }
      else if (r.type === 'TUNNEL') { signHtml = tunnelWarning(40); labelText = 'TUNNEL'; labelColor = '#8b5cf6'; }
      else if (r.type === 'HAZMAT') { signHtml = noHazmatSign(40); labelText = 'NO HAZMAT'; labelColor = '#dc2626'; }
      else if (r.type === 'TRUCK_PROHIBITED') { signHtml = noTrucksSign(40); labelText = 'NO TRUCKS'; labelColor = '#dc2626'; }
      else if (r.type === 'NOTICE') { signHtml = noticeWarning(38); labelText = 'NOTICE'; labelColor = '#f59e0b'; }
      else return;
      const shortMsg = r.message.length > 35 ? r.message.substring(0, 33) + '...' : r.message;
      const iconHtml = `<div class="counter-rotate" data-testid="truck-warning-marker" data-warning-type="${r.type}" style="cursor:default"><div style="display:flex;flex-direction:column;align-items:center">${signHtml}<div style="background:rgba(0,0,0,0.9);border:1px solid ${labelColor};border-radius:3px;padding:1px 4px;margin-top:2px;text-align:center;max-width:90px"><div style="font-size:6px;font-weight:900;color:${labelColor};letter-spacing:0.5px;white-space:nowrap">${labelText}</div><div style="font-size:5.5px;color:rgba(255,255,255,0.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:86px">${shortMsg}</div></div></div></div>`;
      registerSign(`truckwarn-${r.type}-${r.coords[0].toFixed(4)}`, r.coords[0], r.coords[1], iconHtml, [44, 55], [22, 27], 520);
      placed++;
    });
    if (placed > 0) { syncVisibleSigns(); console.log(`[Signs] Placed ${placed} truck warning signs`); }
  }, [registerSign, syncVisibleSigns, shieldLayerGroupRef]);

  return {
    signDataStoreRef,
    visibleSignMarkersRef,
    syncVisibleSignsRef,
    syncVisibleSigns,
    clearSigns,
    setRegionState,
    setDataSaver,
    updateSignVisibility,
    placeHighwayShields,
    placeExitSigns,
    placeCurveSigns,
    placeSpeedLimitSigns,
    placeTrafficSlowdowns,
    placeCmvWarnings,
    placeTruckWarnings,
  };
}
