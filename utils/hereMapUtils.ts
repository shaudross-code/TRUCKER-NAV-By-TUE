/**
 * Map Utility Module — TRUCKERS NAV BY TUE (Mapbox GL JS Edition)
 * Satellite hybrid base with dark-gold branding + clustering support.
 * Drop-in replacement for HERE Maps utils — same exported API surface.
 */

import mapboxgl from 'mapbox-gl';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.REACT_APP_MAPBOX_TOKEN || 'pk.eyJ1IjoicmFzaGF1ZHJvc3MxIiwiYSI6ImNtbjVwanI0YjBlZ2UycG14OTRiMnVyazMifQ.GD_qnfQBIT_iRxdU72LaPg';
mapboxgl.accessToken = MAPBOX_TOKEN;

// ─── Compatibility wrapper for HERE-like map API ──────────────────────
// NavigationView.tsx calls map.addObject(), map.removeObject(), map.getViewModel(), etc.
// This wrapper makes Mapbox GL JS respond to those calls.

class MapGroup {
  _objects: any[] = [];
  _map: WrappedMap | null = null;
  _zIndex: number = 0;

  addObject(obj: any) {
    this._objects.push(obj);
    if (this._map) obj._addToMap?.(this._map);
  }

  removeObject(obj: any) {
    const idx = this._objects.indexOf(obj);
    if (idx >= 0) this._objects.splice(idx, 1);
    obj._removeFromMap?.();
  }

  removeAll() {
    for (const obj of [...this._objects]) {
      obj._removeFromMap?.();
    }
    this._objects = [];
  }

  getObjects() { return [...this._objects]; }

  setZIndex(z: number) {
    this._zIndex = z;
  }
  
  _addToMap(map: WrappedMap) {
    this._map = map;
    for (const obj of this._objects) obj._addToMap?.(map);
  }

  _removeFromMap() {
    for (const obj of this._objects) obj._removeFromMap?.();
    this._map = null;
  }

  dispose() { this.removeAll(); }
}

class WrappedMarker {
  _marker: mapboxgl.Marker;
  _map: WrappedMap | null = null;
  _data: any = null;
  _zIndex: number;

  constructor(lat: number, lng: number, el: HTMLElement, zIndex: number = 0) {
    this._marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([lng, lat]);
    this._zIndex = zIndex;
    el.style.zIndex = String(zIndex);
  }

  setGeometry(coords: { lat: number; lng: number } | any) {
    if (coords.lat !== undefined && coords.lng !== undefined) {
      this._marker.setLngLat([coords.lng, coords.lat]);
    } else if (coords.lat !== undefined && coords.lon !== undefined) {
      this._marker.setLngLat([coords.lon, coords.lat]);
    }
  }

  getGeometry() {
    const ll = this._marker.getLngLat();
    return { lat: ll.lat, lng: ll.lng };
  }

  setData(d: any) { this._data = d; }
  getData() { return this._data; }

  _addToMap(map: WrappedMap) {
    this._map = map;
    if (map._mbMap) this._marker.addTo(map._mbMap);
  }

  _removeFromMap() {
    this._marker.remove();
    this._map = null;
  }

  dispose() { this._marker.remove(); }
  getElement() { return this._marker.getElement(); }
}

class WrappedPolyline {
  _id: string;
  _coords: [number, number][];
  _color: string;
  _width: number;
  _opacity: number;
  _dash: number[];
  _zIndex: number;
  _map: WrappedMap | null = null;

  constructor(coords: [number, number][], color: string, width: number, opts?: any) {
    this._id = 'polyline-' + Math.random().toString(36).substring(2, 10);
    this._coords = coords;
    this._color = color;
    this._width = width;
    this._opacity = opts?.opacity ?? 1;
    this._dash = opts?.dash || [];
    this._zIndex = opts?.zIndex ?? 0;
  }

  setGeometry(coords: [number, number][]) {
    this._coords = coords;
    if (this._map?._mbMap?.getSource(this._id)) {
      (this._map._mbMap.getSource(this._id) as mapboxgl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords.map(c => [c[1], c[0]]) }
      });
    }
  }

  _addToMap(map: WrappedMap) {
    this._map = map;
    const mb = map._mbMap;
    if (!mb) return;
    try {
      if (mb.getSource(this._id)) return;
      mb.addSource(this._id, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: this._coords.map(c => [c[1], c[0]])
          }
        }
      });
      const paintProps: any = {
        'line-color': this._color,
        'line-width': this._width,
        'line-opacity': this._opacity,
      };
      if (this._dash.length > 0) {
        paintProps['line-dasharray'] = this._dash;
      }
      mb.addLayer({
        id: this._id,
        type: 'line',
        source: this._id,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: paintProps,
      });
    } catch (e) { console.warn('addPolyline:', e); }
  }

  _removeFromMap() {
    if (this._map?._mbMap) {
      try {
        if (this._map._mbMap.getLayer(this._id)) this._map._mbMap.removeLayer(this._id);
        if (this._map._mbMap.getSource(this._id)) this._map._mbMap.removeSource(this._id);
      } catch {}
    }
    this._map = null;
  }

  dispose() { this._removeFromMap(); }
}

class ViewModel {
  _map: WrappedMap;
  constructor(map: WrappedMap) { this._map = map; }

  setLookAtData(data: any, _animate?: boolean) {
    const mb = this._map._mbMap;
    if (!mb) return;

    if (data.bounds) {
      const b = data.bounds;
      const container = mb.getContainer();
      const cw = container?.clientWidth || 1920;
      const ch = container?.clientHeight || 800;
      // Account for sidebar (~200px left) and bottom bar (~140px bottom)
      const padLeft = Math.min(220, cw * 0.14);
      const padRight = Math.min(60, cw * 0.04);
      const padTop = Math.min(60, ch * 0.08);
      const padBottom = Math.min(160, ch * 0.22);
      
      mb.fitBounds([[b._minLng, b._minLat], [b._maxLng, b._maxLat]], {
        padding: { top: padTop, bottom: padBottom, left: padLeft, right: padRight },
        duration: _animate ? 1000 : 0,
        bearing: 0,
        pitch: 0,
      });
      return;
    }

    const opts: any = {};
    if (data.position) {
      opts.center = [data.position.lng, data.position.lat];
    }
    if (data.zoom !== undefined) opts.zoom = data.zoom;
    if (data.heading !== undefined) opts.bearing = -data.heading;
    if (data.tilt !== undefined) opts.pitch = data.tilt;

    if (_animate) {
      mb.easeTo({ ...opts, duration: 500 });
    } else {
      mb.jumpTo(opts);
    }
  }

  getLookAtData() {
    const mb = this._map._mbMap;
    if (!mb) return { position: { lat: 0, lng: 0 }, zoom: 10, heading: 0, tilt: 0, bounds: null };
    const c = mb.getCenter();
    const bounds = mb.getBounds();
    return {
      position: { lat: c.lat, lng: c.lng },
      zoom: mb.getZoom(),
      heading: -mb.getBearing(),
      tilt: mb.getPitch(),
      bounds: bounds ? {
        getTop: () => bounds.getNorth(),
        getBottom: () => bounds.getSouth(),
        getLeft: () => bounds.getWest(),
        getRight: () => bounds.getEast(),
      } : null,
    };
  }
}

class WrappedMap {
  _mbMap: mapboxgl.Map;
  _viewModel: ViewModel;
  _objects: any[] = [];
  __resizeHandler: (() => void) | null = null;
  _eventMap: Map<string, Map<Function, Function>> = new Map();

  constructor(mbMap: mapboxgl.Map) {
    this._mbMap = mbMap;
    this._viewModel = new ViewModel(this);
  }

  // Map HERE event names to Mapbox equivalents
  private _mbEventName(hereName: string): string {
    const mapping: Record<string, string> = {
      'mapviewchangeend': 'moveend',
      'dragstart': 'dragstart',
      'contextmenu': 'contextmenu',
      'tap': 'click',
      'pointerup': 'mouseup',
      'pointerdown': 'mousedown',
    };
    return mapping[hereName] || hereName;
  }

  addEventListener(hereName: string, fn: Function) {
    const mbName = this._mbEventName(hereName);
    // Wrap the callback to adapt Mapbox event shape to HERE-like shape
    const wrapper = (e: any) => {
      const adapted: any = { ...e, originalEvent: e.originalEvent };
      if (e.point) {
        adapted.viewportX = e.point.x;
        adapted.viewportY = e.point.y;
      }
      if (e.lngLat) {
        adapted.lat = e.lngLat.lat;
        adapted.lng = e.lngLat.lng;
      }
      fn(adapted);
    };
    if (!this._eventMap.has(hereName)) this._eventMap.set(hereName, new Map());
    this._eventMap.get(hereName)!.set(fn, wrapper);
    this._mbMap.on(mbName as any, wrapper as any);
  }

  removeEventListener(hereName: string, fn: Function) {
    const mbName = this._mbEventName(hereName);
    const wrapper = this._eventMap.get(hereName)?.get(fn);
    if (wrapper) {
      this._mbMap.off(mbName as any, wrapper as any);
      this._eventMap.get(hereName)!.delete(fn);
    }
  }

  addObject(obj: any) {
    this._objects.push(obj);
    obj._addToMap?.(this);
  }

  removeObject(obj: any) {
    const idx = this._objects.indexOf(obj);
    if (idx >= 0) this._objects.splice(idx, 1);
    obj._removeFromMap?.();
  }

  addLayer(layer: any) {
    // Compatibility for HERE's addLayer — delegate to _addToMap if available
    if (layer && typeof layer._addToMap === 'function') {
      layer._addToMap(this);
    }
  }

  removeLayer(layer: any) {
    if (layer && typeof layer._removeFromMap === 'function') {
      layer._removeFromMap();
    }
  }

  getViewModel() { return this._viewModel; }
  getZoom() { return this._mbMap.getZoom(); }
  setZoom(z: number) { this._mbMap.setZoom(z); }
  getCenter() {
    const c = this._mbMap.getCenter();
    return { lat: c.lat, lng: c.lng };
  }

  getViewPort() {
    return { resize: () => this._mbMap.resize() };
  }

  setBearing(bearing: number) {
    this._mbMap.setBearing(bearing);
  }

  getBearing() {
    return this._mbMap.getBearing();
  }

  screenToGeo(x: number, y: number) {
    const ll = this._mbMap.unproject([x, y]);
    return { lat: ll.lat, lng: ll.lng };
  }

  geoToScreen(coords: { lat: number; lng: number }) {
    const pt = this._mbMap.project([coords.lng, coords.lat]);
    return { x: pt.x, y: pt.y };
  }

  dispose() {
    for (const obj of [...this._objects]) obj._removeFromMap?.();
    this._objects = [];
    this._eventMap.clear();
    try { this._mbMap.remove(); } catch {}
  }
}

// ─── Exported API (same signatures as before) ────────────────────────

export function getHerePlatform() {
  return { platform: null, defaultLayers: null };
}

export function createHereMap(
  element: HTMLElement,
  center: { lat: number; lng: number },
  zoom: number
): { map: any; platform: any; defaultLayers: any; behavior: any; ui: any } {
  const mbMap = new mapboxgl.Map({
    container: element,
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
    center: [center.lng, center.lat],
    zoom,
    pitch: 0,
    bearing: 0,
    attributionControl: false,
    maxZoom: 20,
    minZoom: 2,
    fadeDuration: 0,
  });

  // Add compact attribution
  mbMap.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

  // Navigation control (zoom buttons)
  mbMap.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

  const wrapped = new WrappedMap(mbMap);

  // Resize listener
  const onResize = () => mbMap.resize();
  window.addEventListener('resize', onResize);
  wrapped.__resizeHandler = onResize;

  return {
    map: wrapped,
    platform: null,
    defaultLayers: { vector: { normal: { truck: null }, traffic: { map: null } } },
    behavior: null,
    ui: null,
  };
}

/* ----------------------------------------------------------------------
 * Roads & Highways highlight layer
 *
 * Adds a styled overlay of motorway/trunk/primary roads (pulled from
 * Mapbox's built-in `composite` source's `road` source-layer that ships
 * with the satellite-streets-v12 style). Designed to be toggled in sync
 * with the active route polyline so drivers see a clear "follow the
 * gold line, stay on these roads" emphasis.
 * ---------------------------------------------------------------------- */
const ROADS_LAYER_ID = 'tue-highways-highlight';
const ROADS_CASING_LAYER_ID = 'tue-highways-highlight-casing';

export function setRoadsHighlight(map: any, enabled: boolean, color: string = '#22ff88'): void {
  if (!map) return;
  const mb: mapboxgl.Map | undefined = map._mbMap;
  if (!mb) return;
  const apply = () => {
    try {
      const hasComposite = !!mb.getSource('composite');
      if (!hasComposite) return; // style not ready or non-Mapbox style
      // Remove any existing copies first to keep things idempotent
      if (mb.getLayer(ROADS_LAYER_ID)) mb.removeLayer(ROADS_LAYER_ID);
      if (mb.getLayer(ROADS_LAYER_ID + '-glow')) mb.removeLayer(ROADS_LAYER_ID + '-glow');
      if (mb.getLayer(ROADS_CASING_LAYER_ID)) mb.removeLayer(ROADS_CASING_LAYER_ID);
      if (!enabled) return;

      // Find the route polyline layer (created by createPolyline) and insert
      // the road highlight BENEATH it so the active route stays on top.
      const style = mb.getStyle();
      let beforeId: string | undefined;
      if (style && style.layers) {
        const routeLayer = style.layers.find((l: any) => l.id && /^route-/.test(l.id));
        if (routeLayer) beforeId = routeLayer.id;
      }

      // Dark casing for contrast against the satellite imagery
      mb.addLayer({
        id: ROADS_CASING_LAYER_ID,
        type: 'line',
        source: 'composite',
        'source-layer': 'road',
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'motorway_link', 'trunk_link']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#000000',
          'line-opacity': 0.55,
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            5, 1.5,
            10, 4,
            14, 9,
            18, 18,
          ],
        },
      } as any, beforeId);

      // Outer glow halo — wider, more transparent green to create the "neon" feel
      mb.addLayer({
        id: ROADS_LAYER_ID + '-glow',
        type: 'line',
        source: 'composite',
        'source-layer': 'road',
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'motorway_link', 'trunk_link']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': color,
          'line-opacity': 0.35,
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            5, 3,
            10, 6,
            14, 14,
            18, 28,
          ],
          'line-blur': 6,
        },
      } as any, beforeId);

      // Solid bright green core line on top — synced with route polyline by default
      mb.addLayer({
        id: ROADS_LAYER_ID,
        type: 'line',
        source: 'composite',
        'source-layer': 'road',
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'motorway_link', 'trunk_link']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': color,
          'line-opacity': 0.95,
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            5, 0.8,
            10, 1.8,
            14, 4.5,
            18, 10,
          ],
          'line-blur': 0.3,
        },
      } as any, beforeId);
    } catch (err) {
      console.warn('[setRoadsHighlight] failed:', (err as any)?.message || err);
    }
  };
  if (mb.isStyleLoaded()) apply();
  else mb.once('styledata', apply);
}



export function disposeHereMap(map: any) {
  if (!map) return;
  try {
    const handler = map.__resizeHandler;
    if (handler) window.removeEventListener('resize', handler);
    map.dispose();
  } catch {}
}

export function createGroup(): any {
  return new MapGroup();
}

export function createPolyline(
  coords: [number, number][],
  color: string,
  width: number,
  opts?: { opacity?: number; dash?: number[]; cap?: string; join?: string; zIndex?: number }
): any {
  return new WrappedPolyline(coords, color, width, opts);
}

export function updatePolylineCoords(polyline: any, coords: [number, number][]) {
  polyline.setGeometry(coords);
}

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
  el.style.pointerEvents = 'none';

  return new WrappedMarker(lat, lng, el, zIndex || 0);
}

export function createSvgMarker(
  lat: number,
  lng: number,
  svgHtml: string,
  size: [number, number],
  anchor: [number, number],
  zIndex?: number
): any {
  const el = document.createElement('div');
  el.innerHTML = svgHtml;
  el.style.width = size[0] + 'px';
  el.style.height = size[1] + 'px';
  el.style.pointerEvents = 'none';

  return new WrappedMarker(lat, lng, el, zIndex || 0);
}

export function boundsFromCoords(coords: [number, number][]): any {
  if (!coords || coords.length === 0) return null;
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const [lat, lng] of coords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return { _minLat: minLat, _maxLat: maxLat, _minLng: minLng, _maxLng: maxLng };
}

export function fitBounds(map: any, coords: [number, number][], padding?: number) {
  const rect = boundsFromCoords(coords);
  if (!rect || !map) return;
  map.getViewModel().setLookAtData({ bounds: rect }, true);
}

// ─── Clustering (Mapbox native clustering) ────────────────────────────

let _clusterCounter = 0;

export function createClusterProvider(): { provider: any; layer: any } {
  const id = 'cluster-' + (++_clusterCounter);
  // Return a mock provider that stores data points and renders them when added to map
  const provider = {
    _id: id,
    _dataPoints: [] as any[],
    _markers: [] as any[],
    _map: null as WrappedMap | null,
    setDataPoints(points: any[]) {
      // Remove old markers
      for (const m of this._markers) m._removeFromMap?.();
      this._markers = [];
      this._dataPoints = points;
      // Create simple markers for each point (no WebGL clustering, just DOM markers)
      for (const pt of points) {
        const data = pt._data || {};
        const html = data.iconHtml || '';
        let el: HTMLElement;
        if (html) {
          el = document.createElement('div');
          el.innerHTML = `<div class="custom-poi-icon">${html}</div>`;
          el.style.width = '40px';
          el.style.height = '40px';
        } else {
          el = document.createElement('div');
          el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="8" fill="#D4AF37" stroke="#050505" stroke-width="2"/></svg>`;
          el.style.width = '20px';
          el.style.height = '20px';
        }
        // Make POI markers clickable & ensure they sit on top of map layers
        el.style.pointerEvents = 'auto';
        el.style.cursor = 'pointer';
        el.style.zIndex = '10';
        el.classList.add('poi-cluster-marker');
        if (data.name) el.setAttribute('data-poi-name', data.name);
        if (data.poi) {
          el.setAttribute('data-poi-lat', String(data.poi.lat));
          el.setAttribute('data-poi-lon', String(data.poi.lon));
        }
        const marker = new WrappedMarker(pt._lat, pt._lng, el, 1);
        marker.setData(data);
        this._markers.push(marker);
        if (this._map) marker._addToMap(this._map);
      }
    },
    addEventListener() {},
    removeEventListener() {},
  };

  const layer = {
    _provider: provider,
    _addToMap(map: WrappedMap) {
      provider._map = map;
      for (const m of provider._markers) m._addToMap(map);
    },
    _removeFromMap() {
      for (const m of provider._markers) m._removeFromMap?.();
      provider._map = null;
    },
    dispose() { this._removeFromMap(); },
  };

  return { provider, layer };
}

export function buildClusterDataPoints(
  pois: { lat: number; lon: number; iconHtml?: string; name?: string; type?: string; [key: string]: any }[]
): any[] {
  return pois.map(poi => ({
    _lat: poi.lat,
    _lng: poi.lon,
    _data: { iconHtml: poi.iconHtml, name: poi.name, type: poi.type, poi },
  }));
}

export function isInViewport(map: any, lat: number, lng: number): boolean {
  if (!map?._mbMap) return true;
  try {
    const bounds = map._mbMap.getBounds();
    return lat >= bounds.getSouth() && lat <= bounds.getNorth() &&
           lng >= bounds.getWest() && lng <= bounds.getEast();
  } catch {
    return true;
  }
}
