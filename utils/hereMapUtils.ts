/**
 * HERE Maps Utility Module — TRUCKERS NAV BY TUE Signature Edition
 * Satellite hybrid base with dark-gold branding + clustering support.
 */

const HERE_MAP_API_KEY = 'Hl5tRH0k6AOm2-XpzP95ADCabelFTPLUyQF_ISOvgwg';
const MAPBOX_TOKEN = 'pk.eyJ1IjoicmFzaGF1ZHJvc3MxIiwiYSI6ImNtbjVwanI0YjBlZ2UycG14OTRiMnVyazMifQ.GD_qnfQBIT_iRxdU72LaPg';

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

/** Create a HERE Map on a DOM element — TRUCKERS NAV dark-gold signature theme */
export function createHereMap(
  element: HTMLElement,
  center: { lat: number; lng: number },
  zoom: number
): { map: any; platform: any; defaultLayers: any; behavior: any; ui: any } {
  const { platform, defaultLayers } = getHerePlatform();

  // Mapbox satellite-streets as base layer (HERE tile APIs return 401 for this key)
  const tileProvider = new H.map.provider.ImageTileProvider({
    label: 'Satellite Streets',
    min: 1,
    max: 20,
    getURL: (col: number, row: number, level: number) =>
      `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/${level}/${col}/${row}?access_token=${MAPBOX_TOKEN}`,
  });
  const baseLayer = new H.map.layer.TileLayer(tileProvider);

  const map = new H.Map(element, baseLayer, {
    center,
    zoom,
    pixelRatio: window.devicePixelRatio || 1,
  });

  // Apply the dark-gold CSS class for the TRUCKERS NAV signature look
  element.classList.add('here-map-satellite-dark');

  // Resize listener
  const onResize = () => map.getViewPort().resize();
  window.addEventListener('resize', onResize);
  (map as any).__resizeHandler = onResize;

  // Interactivity
  const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

  // Default UI (zoom, scale bar)
  const ui = H.ui.UI.createDefault(map, defaultLayers);

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

// ─── POI Clustering ───────────────────────────────────────────────────

/** TRUCKERS NAV gold/black cluster theme */
const CLUSTER_THEME = {
  getClusterPresentation(cluster: any) {
    const weight = cluster.getWeight();
    const pos = cluster.getPosition();
    const size = weight < 10 ? 36 : weight < 50 ? 44 : weight < 100 ? 52 : 60;
    const fontSize = weight < 10 ? 12 : weight < 50 ? 13 : weight < 100 ? 14 : 15;
    const label = weight > 999 ? Math.round(weight / 1000) + 'k' : String(weight);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <radialGradient id="cg" cx="40%" cy="35%">
          <stop offset="0%" stop-color="#F5D76E"/>
          <stop offset="60%" stop-color="#D4AF37"/>
          <stop offset="100%" stop-color="#8A6914"/>
        </radialGradient>
        <filter id="gs"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="url(#cg)" stroke="#D4AF37" stroke-width="2" filter="url(#gs)"/>
      <text x="${size/2}" y="${size/2 + fontSize * 0.36}" text-anchor="middle" font-family="Space Grotesk,Inter,sans-serif" font-size="${fontSize}" font-weight="900" fill="#050505">${label}</text>
    </svg>`;

    const icon = new H.map.Icon(svg, {
      size: { w: size, h: size },
      anchor: { x: size / 2, y: size / 2 },
    });
    const marker = new H.map.Marker(pos, { icon, min: cluster.getMinZoom(), max: cluster.getMaxZoom() });
    marker.setData(cluster);
    return marker;
  },

  getNoisePresentation(noisePoint: any) {
    const pos = noisePoint.getPosition();
    const data = noisePoint.getData();

    // Use custom POI icon if provided in the data, otherwise default gold dot
    const html = data?.iconHtml || '';
    if (html) {
      const el = document.createElement('div');
      el.innerHTML = `<div class="custom-poi-icon">${html}</div>`;
      el.style.position = 'relative';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.marginLeft = '-12px';
      el.style.marginTop = '-24px';
      el.style.pointerEvents = 'none';
      const domIcon = new H.map.DomIcon(el);
      const marker = new H.map.DomMarker(pos, { icon: domIcon, min: noisePoint.getMinZoom() });
      marker.setData(noisePoint.getData());
      return marker;
    }

    // Fallback: small gold dot
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><circle cx="6" cy="6" r="5" fill="#D4AF37" stroke="#050505" stroke-width="1.5"/></svg>`;
    const icon = new H.map.Icon(svg, { size: { w: 12, h: 12 }, anchor: { x: 6, y: 6 } });
    const marker = new H.map.Marker(pos, { icon, min: noisePoint.getMinZoom() });
    marker.setData(noisePoint.getData());
    return marker;
  }
};

/**
 * Create a clustered POI layer.
 * Returns { provider, layer } — add layer to map, use provider to setDataPoints().
 */
export function createClusterProvider(): { provider: any; layer: any } {
  const provider = new H.clustering.Provider([], {
    clusteringOptions: {
      eps: 48,
      minWeight: 2,
    },
    theme: CLUSTER_THEME,
  });
  const layer = new H.map.layer.ObjectLayer(provider);
  return { provider, layer };
}

/**
 * Build an array of H.clustering.DataPoint from POI data.
 * Each DataPoint carries the iconHtml for use in the noise theme.
 */
export function buildClusterDataPoints(
  pois: { lat: number; lon: number; iconHtml?: string; name?: string; type?: string; [key: string]: any }[]
): any[] {
  return pois.map(poi =>
    new H.clustering.DataPoint(poi.lat, poi.lon, 1, { iconHtml: poi.iconHtml, name: poi.name, type: poi.type, poi })
  );
}

/** Convert hex color to rgba string */
function hexToRgba(hex: string, opacity: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
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
