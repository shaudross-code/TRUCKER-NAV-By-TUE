/**
 * HERE Maps Utility Module
 * Provides helper functions that bridge HERE Maps JS API v3 with the existing codebase.
 */

const HERE_MAP_API_KEY = 'Hl5tRH0k6AOm2-XpzP95ADCabelFTPLUyQF_ISOvgwg';

let _platform: any = null;
let _defaultLayers: any = null;

/** Initialize (or reuse) the HERE platform + default layers */
export function getHerePlatform() {
  if (!_platform) {
    _platform = new H.service.Platform({ apikey: HERE_MAP_API_KEY });
    _defaultLayers = _platform.createDefaultLayers();
  }
  return { platform: _platform, defaultLayers: _defaultLayers };
}

/** Create a HERE Map on a DOM element with logistics trucking layer */
export function createHereMap(
  element: HTMLElement,
  center: { lat: number; lng: number },
  zoom: number
): { map: any; platform: any; defaultLayers: any; behavior: any; ui: any } {
  const { platform, defaultLayers } = getHerePlatform();

  // Use logistics layer optimised for trucking, fallback to normal map
  const baseLayer = defaultLayers.vector?.normal?.logistics
    || defaultLayers.vector?.normal?.map
    || defaultLayers.raster?.normal?.map;

  const map = new H.Map(element, baseLayer, {
    center,
    zoom,
    pixelRatio: window.devicePixelRatio || 1,
  });

  // Resize listener
  const onResize = () => map.getViewPort().resize();
  window.addEventListener('resize', onResize);
  (map as any).__resizeHandler = onResize;

  // Interactivity
  const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

  // Default UI (zoom, scale bar)
  const ui = H.ui.UI.createDefault(map, defaultLayers);

  // Enable vehicle restrictions feature if available
  try {
    const provider = map.getBaseLayer().getProvider();
    if (provider?.getStyle) {
      const style = provider.getStyle();
      style.addEventListener('change', () => {
        try {
          const config = style.getConfig();
          // Enable vehicle restriction layers (truck overlays)
          if (config) {
            // This attempts to make truck-relevant features visible
            style.setProperty('global.vehicle', 'truck');
          }
        } catch (_) { /* style API varies by version */ }
      });
    }
  } catch (_) {}

  // Add traffic flow layer
  try {
    if (defaultLayers.vector?.traffic?.map) {
      map.addLayer(defaultLayers.vector.traffic.map);
    } else if (defaultLayers.vector?.normal?.traffic) {
      map.addLayer(defaultLayers.vector.normal.traffic);
    }
  } catch (_) {}

  // Add truck restrictions layer if available
  try {
    if (defaultLayers.vector?.normal?.truck) {
      map.addLayer(defaultLayers.vector.normal.truck);
    }
  } catch (_) {}

  return { map, platform, defaultLayers, behavior, ui };
}

/** Dispose a HERE Map cleanly */
export function disposeHereMap(map: any) {
  if (!map) return;
  try {
    const handler = (map as any).__resizeHandler;
    if (handler) window.removeEventListener('resize', handler);
    map.dispose();
  } catch (_) {}
}

/** Create H.map.Group (equivalent of L.layerGroup) */
export function createGroup(): any {
  return new H.map.Group();
}

/** Create a polyline from [lat,lng][] coords */
export function createPolyline(
  coords: [number, number][],
  color: string,
  width: number,
  opts?: { opacity?: number; dash?: number[]; cap?: string; join?: string; zIndex?: number }
): any {
  const ls = new H.geo.LineString();
  for (const c of coords) {
    ls.pushLatLngAlt(c[0], c[1], 0);
  }
  const rgba = hexToRgba(color, opts?.opacity ?? 1);
  const style: any = {
    strokeColor: rgba,
    lineWidth: width,
    lineCap: opts?.cap || 'round',
    lineJoin: opts?.join || 'round',
  };
  if (opts?.dash && opts.dash.length > 0) {
    style.lineDash = opts.dash;
  }
  return new H.map.Polyline(ls, {
    style,
    zIndex: opts?.zIndex,
  });
}

/** Update an existing polyline's geometry */
export function updatePolylineCoords(polyline: any, coords: [number, number][]) {
  const ls = new H.geo.LineString();
  for (const c of coords) {
    ls.pushLatLngAlt(c[0], c[1], 0);
  }
  polyline.setGeometry(ls);
}

/** Create an HTML-based DomMarker (equivalent of L.marker with L.divIcon) */
export function createDomMarker(
  lat: number,
  lng: number,
  html: string,
  iconSize: [number, number],
  iconAnchor: [number, number],
  zIndex?: number
): any {
  const el = document.createElement('div');
  el.innerHTML = html;
  el.style.position = 'relative';
  el.style.width = iconSize[0] + 'px';
  el.style.height = iconSize[1] + 'px';
  el.style.marginLeft = -iconAnchor[0] + 'px';
  el.style.marginTop = -iconAnchor[1] + 'px';
  el.style.pointerEvents = 'none';

  const icon = new H.map.DomIcon(el);
  return new H.map.DomMarker({ lat, lng }, { icon, zIndex: zIndex || 0 });
}

/** Create an SVG-based Marker (for simple icons) */
export function createSvgMarker(
  lat: number,
  lng: number,
  svgHtml: string,
  size: [number, number],
  anchor: [number, number],
  zIndex?: number
): any {
  const icon = new H.map.Icon(svgHtml, {
    size: { w: size[0], h: size[1] },
    anchor: { x: anchor[0], y: anchor[1] },
  });
  return new H.map.Marker({ lat, lng }, { icon, zIndex: zIndex || 0 });
}

/** Compute a bounding rect from [lat,lng][] coords */
export function boundsFromCoords(coords: [number, number][]): any {
  if (!coords || coords.length === 0) return null;
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const [lat, lng] of coords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return new H.geo.Rect(maxLat, minLng, minLat, maxLng);
}

/** FitBounds helper */
export function fitBounds(map: any, coords: [number, number][], padding?: number) {
  const rect = boundsFromCoords(coords);
  if (!rect || !map) return;
  map.getViewModel().setLookAtData({ bounds: rect }, true);
}

/** Convert hex color to rgba string */
function hexToRgba(hex: string, opacity: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    // Already rgba/rgb, inject opacity
    if (opacity < 1 && hex.startsWith('rgb(')) {
      return hex.replace('rgb(', 'rgba(').replace(')', `,${opacity})`);
    }
    return hex;
  }
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${opacity})`;
}

/** Check if a point is within the map's current viewport (rough) */
export function isInViewport(map: any, lat: number, lng: number): boolean {
  if (!map) return false;
  try {
    const bounds = map.getViewModel().getLookAtData().bounds;
    if (!bounds) return true;
    const top = bounds.getTop();
    const bottom = bounds.getBottom();
    const left = bounds.getLeft();
    const right = bounds.getRight();
    return lat >= bottom && lat <= top && lng >= left && lng <= right;
  } catch {
    return true;
  }
}
