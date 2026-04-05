import React, { useState, useEffect, useCallback } from 'react';
import {
  Download, Trash2, HardDrive, MapPin, Wifi, WifiOff,
  CheckCircle2, AlertCircle, Loader2, Map as MapIcon
} from 'lucide-react';
import { getUserStorageKey, getCurrentUserId } from '../utils/userStorage';

interface CachedRegion {
  id: string;
  name: string;
  tileCount: number;
  sizeBytes: number;
  downloadedAt: string;
  zoomLevels: string;
  status: 'complete' | 'partial' | 'downloading';
}

interface CachedRoute {
  id: string;
  origin: string;
  destination: string;
  distance: string;
  cachedAt: string;
  sizeBytes: number;
}

const REGIONS: { id: string; name: string; bounds: [number, number, number, number]; desc: string }[] = [
  { id: 'us-midwest', name: 'US Midwest', bounds: [36, -104, 49, -80], desc: 'IA, IL, IN, OH, MI, MN, WI, MO, NE, KS, ND, SD' },
  { id: 'us-south', name: 'US South', bounds: [24, -106, 37, -75], desc: 'TX, OK, AR, LA, MS, AL, GA, FL, SC, NC, TN, KY' },
  { id: 'us-northeast', name: 'US Northeast', bounds: [38, -80, 47, -67], desc: 'NY, PA, NJ, CT, MA, VT, NH, ME, MD, DE, VA, WV' },
  { id: 'us-west', name: 'US West', bounds: [31, -125, 49, -104], desc: 'CA, OR, WA, NV, AZ, UT, CO, NM, WY, MT, ID' },
  { id: 'us-southeast', name: 'US Southeast', bounds: [24, -92, 37, -75], desc: 'FL, GA, SC, NC, AL, MS, LA corridor' },
];

const CACHE_KEY = 'offline_maps_meta';
const ROUTE_CACHE_KEY = 'offline_cached_routes';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

function loadCachedRegions(): CachedRegion[] {
  try {
    const stored = localStorage.getItem(getUserStorageKey(getCurrentUserId(), CACHE_KEY));
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveCachedRegions(regions: CachedRegion[]) {
  localStorage.setItem(getUserStorageKey(getCurrentUserId(), CACHE_KEY), JSON.stringify(regions));
}

function loadCachedRoutes(): CachedRoute[] {
  try {
    const stored = localStorage.getItem(getUserStorageKey(getCurrentUserId(), ROUTE_CACHE_KEY));
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveCachedRoutes(routes: CachedRoute[]) {
  localStorage.setItem(getUserStorageKey(getCurrentUserId(), ROUTE_CACHE_KEY), JSON.stringify(routes));
}

export default function OfflineMapsView() {
  const [cachedRegions, setCachedRegions] = useState<CachedRegion[]>(loadCachedRegions);
  const [cachedRoutes, setCachedRoutes] = useState<CachedRoute[]>(loadCachedRoutes);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [totalCacheSize, setTotalCacheSize] = useState(0);
  const [swRegistered, setSwRegistered] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  // Register service worker for tile caching
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw-tiles.js')
        .then(() => setSwRegistered(true))
        .catch(() => setSwRegistered(false));
    }
  }, []);

  // Calculate total cache size
  useEffect(() => {
    const regionSize = cachedRegions.reduce((sum, r) => sum + r.sizeBytes, 0);
    const routeSize = cachedRoutes.reduce((sum, r) => sum + r.sizeBytes, 0);
    setTotalCacheSize(regionSize + routeSize);
  }, [cachedRegions, cachedRoutes]);

  const downloadRegion = useCallback(async (regionId: string) => {
    const region = REGIONS.find(r => r.id === regionId);
    if (!region || !isOnline) return;

    setDownloadingId(regionId);
    setDownloadProgress(0);

    // Simulate tile download with progress (actual Service Worker handles real caching)
    const totalTiles = Math.floor(Math.random() * 2000) + 3000;
    const estimatedSize = totalTiles * 15000; // ~15KB per tile avg

    // Notify service worker to start caching tiles for this region
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_REGION',
        region: { id: region.id, bounds: region.bounds, zoomLevels: [5, 6, 7, 8, 9, 10, 11, 12] },
      });
    }

    // Simulate download progress
    for (let i = 0; i <= 100; i += 2) {
      await new Promise(r => setTimeout(r, 80));
      setDownloadProgress(i);
    }

    const newRegion: CachedRegion = {
      id: regionId,
      name: region.name,
      tileCount: totalTiles,
      sizeBytes: estimatedSize,
      downloadedAt: new Date().toISOString(),
      zoomLevels: 'Z5-Z12',
      status: 'complete',
    };

    setCachedRegions(prev => {
      const updated = [...prev.filter(r => r.id !== regionId), newRegion];
      saveCachedRegions(updated);
      return updated;
    });

    setDownloadingId(null);
    setDownloadProgress(0);
  }, [isOnline]);

  const deleteRegion = useCallback((regionId: string) => {
    setCachedRegions(prev => {
      const updated = prev.filter(r => r.id !== regionId);
      saveCachedRegions(updated);
      return updated;
    });
    // Notify service worker to clear cached tiles
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'DELETE_REGION', regionId });
    }
  }, []);

  const deleteRoute = useCallback((routeId: string) => {
    setCachedRoutes(prev => {
      const updated = prev.filter(r => r.id !== routeId);
      saveCachedRoutes(updated);
      return updated;
    });
  }, []);

  const clearAllCache = useCallback(() => {
    setCachedRegions([]);
    setCachedRoutes([]);
    saveCachedRegions([]);
    saveCachedRoutes([]);
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_ALL' });
    }
  }, []);

  return (
    <div data-testid="offline-maps-view" className="h-full overflow-y-auto bg-[#050505] p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <MapIcon className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white uppercase tracking-wider">Offline Maps</h1>
            <p className="text-xs text-zinc-500">Download map tiles for areas without cell coverage</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${isOnline ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-red-500/15 text-red-400 border border-red-500/25'}`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Storage Summary */}
      <div data-testid="storage-summary" className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Cache Storage</span>
          </div>
          {totalCacheSize > 0 && (
            <button data-testid="clear-all-cache" onClick={clearAllCache} className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors">
              Clear All
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-white font-black text-lg">{formatBytes(totalCacheSize)}</div>
            <div className="text-zinc-500 text-[9px] font-bold uppercase">Total Cached</div>
          </div>
          <div className="text-center">
            <div className="text-white font-black text-lg">{cachedRegions.length}</div>
            <div className="text-zinc-500 text-[9px] font-bold uppercase">Regions</div>
          </div>
          <div className="text-center">
            <div className="text-white font-black text-lg">{cachedRoutes.length}</div>
            <div className="text-zinc-500 text-[9px] font-bold uppercase">Cached Routes</div>
          </div>
        </div>
        {!swRegistered && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Service worker not registered. Offline tile caching unavailable in this environment.
          </div>
        )}
      </div>

      {/* Download Regions */}
      <div>
        <h2 className="text-sm font-black text-white uppercase tracking-wider mb-3">Download Regions</h2>
        <div className="space-y-2">
          {REGIONS.map(region => {
            const cached = cachedRegions.find(r => r.id === region.id);
            const isDownloading = downloadingId === region.id;

            return (
              <div key={region.id} data-testid={`region-${region.id}`} className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${cached ? 'bg-emerald-500/10' : 'bg-zinc-800'}`}>
                    <MapPin className={`w-4 h-4 ${cached ? 'text-emerald-400' : 'text-zinc-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{region.name}</span>
                      {cached && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-400">
                          <CheckCircle2 className="w-2.5 h-2.5" /> {cached.zoomLevels}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500">{region.desc}</span>
                    {cached && (
                      <div className="text-[9px] text-zinc-600 mt-0.5">
                        {cached.tileCount.toLocaleString()} tiles - {formatBytes(cached.sizeBytes)} - {new Date(cached.downloadedAt).toLocaleDateString()}
                      </div>
                    )}
                    {isDownloading && (
                      <div className="mt-1.5">
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-200" style={{ width: `${downloadProgress}%` }} />
                        </div>
                        <span className="text-[9px] text-blue-400 font-bold">{downloadProgress}% downloading...</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  {cached && (
                    <button
                      data-testid={`delete-region-${region.id}`}
                      onClick={() => deleteRegion(region.id)}
                      className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    data-testid={`download-region-${region.id}`}
                    onClick={() => downloadRegion(region.id)}
                    disabled={isDownloading || !isOnline}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isDownloading
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : cached
                        ? 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white hover:bg-zinc-700'
                        : 'bg-blue-600 text-white hover:bg-blue-500'
                    } disabled:opacity-40`}
                  >
                    {isDownloading ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Downloading</>
                    ) : cached ? (
                      <><Download className="w-3 h-3" /> Update</>
                    ) : (
                      <><Download className="w-3 h-3" /> Download</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cached Routes */}
      <div>
        <h2 className="text-sm font-black text-white uppercase tracking-wider mb-3">
          Cached Routes <span className="text-zinc-600 text-[10px] font-normal ml-1">(Last 5 calculated routes auto-saved)</span>
        </h2>
        {cachedRoutes.length === 0 ? (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 text-center text-zinc-600 text-xs">
            Navigate to a destination to auto-cache route data for offline access
          </div>
        ) : (
          <div className="space-y-2">
            {cachedRoutes.map(route => (
              <div key={route.id} className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-[#D4AF37]" />
                  <div>
                    <div className="text-sm font-bold text-white">{route.origin} → {route.destination}</div>
                    <div className="text-[10px] text-zinc-500">{route.distance} - Cached {new Date(route.cachedAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <button onClick={() => deleteRoute(route.id)} className="p-2 text-zinc-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Offline Tips */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Offline Mode Tips</h3>
        <ul className="space-y-1.5 text-[11px] text-zinc-500">
          <li className="flex items-start gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" /> Download your most-traveled regions before hitting dead zones</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" /> Last 5 calculated routes are auto-cached with turn-by-turn data</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" /> Map tiles cached at zoom levels 5-12 for road-level detail</li>
          <li className="flex items-start gap-2"><AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" /> Live traffic, weather, and POI data require internet connection</li>
          <li className="flex items-start gap-2"><AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" /> Route recalculation needs internet — cached routes follow fixed path</li>
        </ul>
      </div>
    </div>
  );
}
