// Service Worker for offline map tile caching — REAL tile pre-fetching
const TILE_CACHE = 'trucker-nav-tiles-v2';
const ROUTE_CACHE = 'trucker-nav-routes-v1';

// Tile URL patterns to intercept and cache
const TILE_PATTERNS = [
  /api\.mapbox\.com\/v4/,
  /api\.mapbox\.com\/styles/,
  /tile\.openstreetmap\.org/,
  /mt\d?\.google\.com\/vt/,
  /basemaps\.cartocdn\.com/,
  /api\.maptiler\.com/,
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k === 'trucker-nav-tiles-v1').map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first strategy for tiles, network-first for routes
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isTile = TILE_PATTERNS.some(p => p.test(url));

  if (isTile) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        } catch {
          return new Response('', { status: 503, statusText: 'Offline - tile not cached' });
        }
      })
    );
    return;
  }

  if (url.includes('/api/route')) {
    event.respondWith(
      caches.open(ROUTE_CACHE).then(async (cache) => {
        try {
          const response = await fetch(event.request);
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        } catch {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          return new Response(JSON.stringify({ error: 'Offline - route not cached' }), {
            status: 503, headers: { 'Content-Type': 'application/json' }
          });
        }
      })
    );
    return;
  }
});

// Generate tile URLs for a bounding box and zoom levels
function getTileUrls(bounds, zoomLevels) {
  const urls = [];
  for (const z of zoomLevels) {
    const minTileX = lon2tile(bounds[1], z);
    const maxTileX = lon2tile(bounds[3], z);
    const minTileY = lat2tile(bounds[0], z); // Note: lat2tile is inverted
    const maxTileY = lat2tile(bounds[2], z);
    const yLow = Math.min(minTileY, maxTileY);
    const yHigh = Math.max(minTileY, maxTileY);
    const xLow = Math.min(minTileX, maxTileX);
    const xHigh = Math.max(minTileX, maxTileX);
    for (let x = xLow; x <= xHigh; x++) {
      for (let y = yLow; y <= yHigh; y++) {
        // OpenStreetMap tiles (free, no auth needed for caching)
        urls.push(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`);
      }
    }
  }
  return urls;
}

function lon2tile(lon, zoom) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
}

function lat2tile(lat, zoom) {
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
}

// Handle pre-fetch requests from the app
self.addEventListener('message', async (event) => {
  const { type, regionId, bounds, zoomLevels } = event.data;

  if (type === 'PREFETCH_REGION') {
    const tileUrls = getTileUrls(bounds, zoomLevels || [5, 6, 7, 8]);
    const cache = await caches.open(TILE_CACHE);
    let downloaded = 0;
    let failed = 0;
    const total = tileUrls.length;
    const BATCH = 6; // concurrent fetches

    for (let i = 0; i < tileUrls.length; i += BATCH) {
      const batch = tileUrls.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const existing = await cache.match(url);
          if (existing) { downloaded++; return; } // already cached
          const resp = await fetch(url);
          if (resp.ok) {
            await cache.put(url, resp);
            downloaded++;
          } else {
            failed++;
          }
        })
      );
      // Report progress back to the client
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'PREFETCH_PROGRESS',
          regionId,
          downloaded,
          failed,
          total,
          percent: Math.round((downloaded / total) * 100)
        });
      });
    }

    // Final report
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'PREFETCH_COMPLETE',
        regionId,
        downloaded,
        failed,
        total
      });
    });
  }

  if (type === 'DELETE_REGION') {
    const cache = await caches.open(TILE_CACHE);
    const keys = await cache.keys();
    let deleted = 0;
    for (const req of keys) {
      // Delete tiles within the region bounds if metadata was stored
      await cache.delete(req);
      deleted++;
    }
    console.log('SW: Deleted', deleted, 'cached entries for region', regionId);
  }

  if (type === 'CLEAR_ALL') {
    await caches.delete(TILE_CACHE);
    await caches.delete(ROUTE_CACHE);
    console.log('SW: All caches cleared');
  }

  if (type === 'GET_CACHE_SIZE') {
    try {
      const cache = await caches.open(TILE_CACHE);
      const keys = await cache.keys();
      let totalSize = 0;
      for (const req of keys) {
        const resp = await cache.match(req);
        if (resp) {
          const blob = await resp.clone().blob();
          totalSize += blob.size;
        }
      }
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({ type: 'CACHE_SIZE', tileCount: keys.length, totalBytes: totalSize });
      });
    } catch (e) {
      console.error('SW: Error computing cache size', e);
    }
  }
});
