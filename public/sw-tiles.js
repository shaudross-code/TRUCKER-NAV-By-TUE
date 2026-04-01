// Service Worker for offline map tile caching
const TILE_CACHE = 'trucker-nav-tiles-v1';
const ROUTE_CACHE = 'trucker-nav-routes-v1';

// Tile URL patterns to intercept
const TILE_PATTERNS = [
  /api\.mapbox\.com\/v4/,
  /api\.mapbox\.com\/styles/,
  /tile\.openstreetmap\.org/,
  /mt\d?\.google\.com\/vt/,
  /basemaps\.cartocdn\.com/,
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Intercept fetch requests for tile caching
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Check if this is a tile request
  const isTile = TILE_PATTERNS.some(pattern => pattern.test(url));
  
  if (isTile) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        // Try cache first
        const cached = await cache.match(event.request);
        if (cached) return cached;
        
        // Fetch from network and cache
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch (err) {
          // If offline and not cached, return a placeholder
          return new Response('', { status: 503, statusText: 'Offline - tile not cached' });
        }
      })
    );
    return;
  }
  
  // Check if this is a route API request
  if (url.includes('/api/route')) {
    event.respondWith(
      caches.open(ROUTE_CACHE).then(async (cache) => {
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch (err) {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          return new Response(JSON.stringify({ error: 'Offline - route not cached' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      })
    );
    return;
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  const { type, regionId } = event.data;
  
  if (type === 'CACHE_REGION') {
    // Region caching handled by intercepting tile fetches
    console.log('SW: Caching region', event.data.region?.id);
  }
  
  if (type === 'DELETE_REGION') {
    caches.open(TILE_CACHE).then(cache => {
      cache.keys().then(keys => {
        // Delete tiles matching the region (simplified - in production would use bounds)
        console.log('SW: Deleting region cache', regionId, keys.length, 'tiles');
      });
    });
  }
  
  if (type === 'CLEAR_ALL') {
    caches.delete(TILE_CACHE);
    caches.delete(ROUTE_CACHE);
    console.log('SW: All caches cleared');
  }
});
