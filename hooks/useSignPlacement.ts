import { useCallback, useRef } from 'react';
import { createDomMarker } from '../utils/hereMapUtils';
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
  'roadlabel': 'showHighwayShields', // road labels share visibility with shields
};

function getSignCategory(signId: string): string {
  const dash = signId.indexOf('-');
  return dash > 0 ? signId.substring(0, dash) : signId;
}

export function useSignPlacement(
  mapInstanceRef: { current: any },
  shieldLayerGroupRef: { current: any },
) {
  const signDataStoreRef = useRef<SignData[]>([]);
  const visibleSignMarkersRef = useRef<Map<string, any>>(new Map());
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

    // Get current viewport bounds from HERE Map
    let boundsRect: any = null;
    try {
      const vm = map.getViewModel().getLookAtData();
      boundsRect = vm?.bounds;
    } catch (_) {}

    const store = signDataStoreRef.current;
    const visible = visibleSignMarkersRef.current;
    const vis = signVisibilityRef.current;
    const newVisibleIds = new Set<string>();

    // Manual bounds check helper (H.geo.Rect may not have containsPoint)
    const isInBounds = (lat: number, lng: number) => {
      if (!boundsRect) return true;
      try {
        const top = boundsRect.getTop();
        const bottom = boundsRect.getBottom();
        const left = boundsRect.getLeft();
        const right = boundsRect.getRight();
        return lat >= bottom && lat <= top && lng >= left && lng <= right;
      } catch (_) { return true; }
    };

    for (const sign of store) {
      const category = getSignCategory(sign.id);
      const isAllowed = vis[category] !== false;
      const inBounds = isInBounds(sign.lat, sign.lon);
      if (isAllowed && inBounds) newVisibleIds.add(sign.id);
    }
    // Remove markers no longer visible
    for (const [id, marker] of visible) {
      if (!newVisibleIds.has(id)) {
        try { shieldLayerGroupRef.current!.removeObject(marker); } catch (_) {}
        visible.delete(id);
      }
    }
    // Add markers that should now be visible
    for (const sign of store) {
      if (newVisibleIds.has(sign.id) && !visible.has(sign.id)) {
        const marker = createDomMarker(sign.lat, sign.lon, sign.iconHtml, sign.iconSize, sign.iconAnchor, sign.zIndexOffset);
        shieldLayerGroupRef.current!.addObject(marker);
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
    if (shieldLayerGroupRef.current) shieldLayerGroupRef.current.removeAll();
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

  // ── Road Name Labels Along Route Polyline ─────────────────────────
  // Places inline road-name + mini highway emblem labels directly on the route,
  // oriented to match the road bearing so they rotate WITH the user's heading.
  const placeRoadLabels = useCallback((segments: {
    name: string;
    shieldType: 'interstate' | 'us' | 'state' | 'local';
    shieldLabel: string;
    direction: string;
    startIdx: number;
    endIdx: number;
    coords: [number, number][];
  }[]) => {
    if (!shieldLayerGroupRef.current || segments.length === 0) return;

    // Helper: bearing between two [lat,lng] points (degrees from north, clockwise)
    const bearing = (a: [number, number], b: [number, number]) => {
      const toRad = Math.PI / 180;
      const dLon = (b[1] - a[1]) * toRad;
      const y = Math.sin(dLon) * Math.cos(b[0] * toRad);
      const x = Math.cos(a[0] * toRad) * Math.sin(b[0] * toRad) - Math.sin(a[0] * toRad) * Math.cos(b[0] * toRad) * Math.cos(dLon);
      return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
    };

    let placedCount = 0;
    const LABEL_INTERVAL = 80; // Place a label every ~80 polyline points along each segment

    segments.forEach((seg) => {
      const segLen = seg.endIdx - seg.startIdx;
      if (segLen < 30) return; // Skip very short segments

      // How many labels to place for this segment
      const labelCount = Math.max(1, Math.floor(segLen / LABEL_INTERVAL));
      const step = Math.floor(segLen / (labelCount + 1));

      for (let i = 1; i <= labelCount; i++) {
        const idx = seg.startIdx + i * step;
        if (idx < 0 || idx >= seg.coords.length - 1) continue;
        const coord = seg.coords[idx];
        const nextCoord = seg.coords[Math.min(idx + 3, seg.coords.length - 1)];
        if (!coord || !nextCoord) continue;

        // Calculate road bearing at this point
        const deg = bearing(coord, nextCoord);
        // Adjust so text reads left-to-right (flip if facing left)
        const textAngle = (deg > 90 && deg < 270) ? deg - 180 : deg;

        // Build mini shield emblem
        let miniShield = '';
        if (seg.shieldType === 'interstate') {
          miniShield = `<svg width="26" height="20" viewBox="0 0 40 32"><polygon points="20,0 40,6 38,28 20,32 2,28 0,6" fill="#003DA5" stroke="white" stroke-width="2"/><text x="20" y="22" text-anchor="middle" fill="white" font-size="14" font-weight="900" font-family="Highway Gothic,Arial Black,sans-serif">${seg.shieldLabel}</text></svg>`;
        } else if (seg.shieldType === 'us') {
          miniShield = `<svg width="22" height="22" viewBox="0 0 36 36"><rect x="1" y="1" width="34" height="34" rx="2" fill="white" stroke="black" stroke-width="2"/><text x="18" y="25" text-anchor="middle" fill="black" font-size="15" font-weight="900" font-family="Highway Gothic,Arial Black,sans-serif">${seg.shieldLabel}</text></svg>`;
        } else if (seg.shieldType === 'state') {
          miniShield = `<svg width="22" height="22" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="white" stroke="black" stroke-width="2"/><text x="18" y="24" text-anchor="middle" fill="black" font-size="13" font-weight="900" font-family="Highway Gothic,Arial Black,sans-serif">${seg.shieldLabel}</text></svg>`;
        }

        // Build direction arrow
        const dirText = seg.direction ? ` ${seg.direction}` : '';

        // Build the road label HTML — NO counter-rotate so it rotates with the map heading
        const truncName = seg.name.length > 22 ? seg.name.substring(0, 20) + '…' : seg.name;
        const html = `<div data-testid="road-label-marker" style="
          transform: rotate(${textAngle - 90}deg);
          transform-origin: center center;
          white-space: nowrap;
          pointer-events: none;
          display: flex;
          align-items: center;
          gap: 4px;
          filter: drop-shadow(0 2px 6px rgba(0,0,0,0.95));
        ">
          ${miniShield ? `<span style="flex-shrink:0;line-height:0">${miniShield}</span>` : ''}
          <span style="
            font-family: 'Highway Gothic', 'Arial Black', sans-serif;
            font-size: 13px;
            font-weight: 900;
            color: #ffffff;
            letter-spacing: 0.8px;
            text-shadow: 0 0 8px rgba(0,0,0,1), 0 0 4px rgba(0,0,0,0.9), 1px 1px 2px rgba(0,0,0,1);
            background: rgba(0,0,0,0.7);
            padding: 2px 7px;
            border-radius: 3px;
            border: 1px solid rgba(255,255,255,0.15);
          ">${truncName}${dirText}</span>
        </div>`;

        registerSign(
          `roadlabel-${seg.shieldLabel || seg.name}-${idx}`,
          coord[0], coord[1],
          html,
          [160, 28],
          [80, 14],
          550 // Above route pane, visible on top of polyline
        );
        placedCount++;
      }
    });

    if (placedCount > 0) {
      syncVisibleSigns();
      console.log(`[RoadLabels] Placed ${placedCount} inline road name labels along route`);
    }
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
    placeRoadLabels,
  };
}
