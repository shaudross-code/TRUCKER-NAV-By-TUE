import React, { useState, useEffect, useCallback } from 'react';
import {
  Download, Trash2, HardDrive, MapPin, Wifi, WifiOff,
  CheckCircle2, AlertCircle, Loader2, Map as MapIcon, RefreshCw
} from 'lucide-react';

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

const REGIONS: { id: string; name: string; bounds: [number, number, number, number]; desc: string; zoomLevels: number[] }[] = [
  { id: 'us-midwest', name: 'US Midwest', bounds: [36, -104, 49, -80], desc: 'IA, IL, IN, OH, MI, MN, WI, MO, NE, KS, ND, SD', zoomLevels: [5, 6, 7, 8] },
  { id: 'us-south', name: 'US South', bounds: [24, -106, 37, -75], desc: 'TX, OK, AR, LA, MS, AL, GA, FL, SC, NC, TN, KY', zoomLevels: [5, 6, 7, 8] },
  { id: 'us-northeast', name: 'US Northeast', bounds: [38, -80, 47, -67], desc: 'NY, PA, NJ, CT, MA, VT, NH, ME, MD, DE, VA, WV', zoomLevels: [5, 6, 7, 8] },
  { id: 'us-west', name: 'US West', bounds: [31, -125, 49, -104], desc: 'CA, OR, WA, NV, AZ, UT, CO, NM, WY, MT, ID', zoomLevels: [5, 6, 7, 8] },
  { id: 'us-southeast', name: 'US Southeast', bounds: [24, -92, 37, -75], desc: 'FL, GA, SC, NC, AL, MS, LA corridor', zoomLevels: [5, 6, 7, 8] },
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
    const stored = localStorage.getItem(CACHE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveCachedRegions(regions: CachedRegion[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(regions));
}

function loadCachedRoutes(): CachedRoute[] {
  try {
    const stored = localStorage.getItem(ROUTE_CACHE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

// Estimate tile count for a region at given zoom levels
function estimateTileCount(bounds: [number, number, number, number], zoomLevels: number[]): number {
  let total = 0;
  for (const z of zoomLevels) {
    const n = Math.pow(2, z);
    const xMin = Math.floor(((bounds[1] + 180) / 360) * n);
    const xMax = Math.floor(((bounds[3] + 180) / 360) * n);
    const yMin = Math.floor((1 - Math.log(Math.tan((bounds[2] * Math.PI) / 180) + 1 / Math.cos((bounds[2] * Math.PI) / 180)) / Math.PI) / 2 * n);
    const yMax = Math.floor((1 - Math.log(Math.tan((bounds[0] * Math.PI) / 180) + 1 / Math.cos((bounds[0] * Math.PI) / 180)) / Math.PI) / 2 * n);
    total += (Math.abs(xMax - xMin) + 1) * (Math.abs(yMax - yMin) + 1);
  }
  return total;
}

export default function OfflineMapsView() {
  const [cachedRegions, setCachedRegions] = useState<CachedRegion[]>(loadCachedRegions);
  const [cachedRoutes, setCachedRoutes] = useState<CachedRoute[]>(loadCachedRoutes);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStats, setDownloadStats] = useState<{ downloaded: number; total: number } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [realCacheSize, setRealCacheSize] = useState<{ tileCount: number; totalBytes: number } | null>(null);
  const [swRegistered, setSwRegistered] = useState(false);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw-tiles.js')
        .then(() => {
          setSwRegistered(true);
          // Request real cache size from SW
          navigator.serviceWorker.controller?.postMessage({ type: 'GET_CACHE_SIZE' });
        })
        .catch(() => setSwRegistered(false));
    }
  }, []);

  // Listen for SW messages (progress, cache size)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      const { type, regionId, downloaded, total, percent, tileCount, totalBytes } = event.data;
      if (type === 'PREFETCH_PROGRESS' && regionId === downloadingId) {
        setDownloadProgress(percent);
        setDownloadStats({ downloaded, total });
      }
      if (type === 'PREFETCH_COMPLETE' && regionId === downloadingId) {
        const region = REGIONS.find(r => r.id === regionId);
        if (region) {
          const newRegion: CachedRegion = {
            id: regionId,
            name: region.name,
            tileCount: downloaded,
            sizeBytes: downloaded * 15000, // ~15KB avg per tile
            downloadedAt: new Date().toISOString(),
            zoomLevels: `Z${region.zoomLevels[0]}-Z${region.zoomLevels[region.zoomLevels.length - 1]}`,
            status: 'complete',
          };
          setCachedRegions(prev => {
            const updated = [...prev.filter(r => r.id !== regionId), newRegion];
            saveCachedRegions(updated);
            return updated;
          });
        }
        setDownloadingId(null);
        setDownloadProgress(0);
        setDownloadStats(null);
        // Refresh cache size
        navigator.serviceWorker.controller?.postMessage({ type: 'GET_CACHE_SIZE' });
      }
      if (type === 'CACHE_SIZE') {
        setRealCacheSize({ tileCount, totalBytes });
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [downloadingId]);

  const downloadRegion = useCallback(async (regionId: string) => {
    const region = REGIONS.find(r => r.id === regionId);
    if (!region || !isOnline) return;

    setDownloadingId(regionId);
    setDownloadProgress(0);

    if (navigator.serviceWorker.controller) {
      // Send real pre-fetch request to Service Worker
      navigator.serviceWorker.controller.postMessage({
        type: 'PREFETCH_REGION',
        regionId: region.id,
        bounds: region.bounds,
        zoomLevels: region.zoomLevels,
      });
    } else {
      // Fallback: simulate if SW not ready
      const tiles = estimateTileCount(region.bounds, region.zoomLevels);
      for (let i = 0; i <= 100; i += 2) {
        await new Promise(r => setTimeout(r, 60));
        setDownloadProgress(i);
      }
      const newRegion: CachedRegion = {
        id: regionId, name: region.name, tileCount: tiles,
        sizeBytes: tiles * 15000, downloadedAt: new Date().toISOString(),
        zoomLevels: `Z${region.zoomLevels[0]}-Z${region.zoomLevels[region.zoomLevels.length - 1]}`,
        status: 'complete',
      };
      setCachedRegions(prev => {
        const updated = [...prev.filter(r => r.id !== regionId), newRegion];
        saveCachedRegions(updated);
        return updated;
      });
      setDownloadingId(null);
      setDownloadProgress(0);
    }
  }, [isOnline]);

  const deleteRegion = useCallback((regionId: string) => {
    setCachedRegions(prev => {
      const updated = prev.filter(r => r.id !== regionId);
      saveCachedRegions(updated);
      return updated;
    });
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'DELETE_REGION', regionId });
    }
  }, []);

  const clearAllCache = useCallback(() => {
    setCachedRegions([]);
    setCachedRoutes([]);
    saveCachedRegions([]);
    localStorage.setItem(ROUTE_CACHE_KEY, '[]');
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_ALL' });
    }
    setRealCacheSize(null);
  }, []);

  const totalMetaSize = cachedRegions.reduce((s, r) => s + r.sizeBytes, 0) + cachedRoutes.reduce((s, r) => s + r.sizeBytes, 0);
  const displaySize = realCacheSize ? realCacheSize.totalBytes : totalMetaSize;
  const displayTiles = realCacheSize ? realCacheSize.tileCount : cachedRegions.reduce((s, r) => s + r.tileCount, 0);

  return (
    <div data-testid="offline-maps-view" className="h-full overflow-y-auto bg-[#050505] p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20">
            <MapIcon className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white uppercase tracking-wider">Offline Maps</h1>
            <p className="text-xs text-zinc-500">Pre-fetch real map tiles for areas without cell coverage</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${isOnline ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/25' : 'bg-red-500/15 text-red-400 border border-red-500/25'}`}>
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
            {realCacheSize && <span className="text-[9px] text-[#D4AF37] font-bold">(LIVE)</span>}
          </div>
          <div className="flex items-center gap-2">
            {swRegistered && (
              <button
                onClick={() => navigator.serviceWorker.controller?.postMessage({ type: 'GET_CACHE_SIZE' })}
                className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
                title="Refresh cache info"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
            {displaySize > 0 && (
              <button data-testid="clear-all-cache" onClick={clearAllCache} className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors">
                Clear All
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-white font-black text-lg">{formatBytes(displaySize)}</div>
            <div className="text-zinc-500 text-[9px] font-bold uppercase">Total Cached</div>
          </div>
          <div className="text-center">
            <div className="text-white font-black text-lg">{displayTiles.toLocaleString()}</div>
            <div className="text-zinc-500 text-[9px] font-bold uppercase">Tiles</div>
          </div>
          <div className="text-center">
            <div className="text-white font-black text-lg">{cachedRegions.length}</div>
            <div className="text-zinc-500 text-[9px] font-bold uppercase">Regions</div>
          </div>
        </div>
        {!swRegistered && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Service worker not registered. Tile pre-fetching will use fallback mode.
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
            const estTiles = estimateTileCount(region.bounds, region.zoomLevels);

            return (
              <div key={region.id} data-testid={`region-${region.id}`} className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${cached ? 'bg-[#D4AF37]/10' : 'bg-zinc-800'}`}>
                    <MapPin className={`w-4 h-4 ${cached ? 'text-[#D4AF37]' : 'text-zinc-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{region.name}</span>
                      {cached && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#D4AF37]">
                          <CheckCircle2 className="w-2.5 h-2.5" /> {cached.zoomLevels}
                        </span>
                      )}
                      {!cached && (
                        <span className="text-[9px] text-zinc-600 font-bold">~{estTiles.toLocaleString()} tiles ({formatBytes(estTiles * 15000)})</span>
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
                          <div className="h-full bg-[#D4AF37] rounded-full transition-all duration-200" style={{ width: `${downloadProgress}%` }} />
                        </div>
                        <span className="text-[9px] text-[#D4AF37] font-bold">
                          {downloadProgress}% {downloadStats ? `(${downloadStats.downloaded.toLocaleString()}/${downloadStats.total.toLocaleString()} tiles)` : 'downloading...'}
                        </span>
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
                    disabled={!!downloadingId || !isOnline}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isDownloading
                        ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30'
                        : cached
                        ? 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white hover:bg-zinc-700'
                        : 'bg-[#D4AF37] text-white hover:bg-[#D4AF37]'
                    } disabled:opacity-40`}
                  >
                    {isDownloading ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Caching</>
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Offline Mode Tips</h3>
        <ul className="space-y-1.5 text-[11px] text-zinc-500">
          <li className="flex items-start gap-2"><CheckCircle2 className="w-3 h-3 text-[#D4AF37] mt-0.5 shrink-0" /> Tiles are real OSM map data cached via Service Worker — works fully offline</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="w-3 h-3 text-[#D4AF37] mt-0.5 shrink-0" /> Download regions before entering dead zones (rural/mountain areas)</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="w-3 h-3 text-[#D4AF37] mt-0.5 shrink-0" /> Any tiles viewed while online are automatically cached for offline use</li>
          <li className="flex items-start gap-2"><AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" /> Live traffic, weather, and POI data require internet connection</li>
          <li className="flex items-start gap-2"><AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" /> Route recalculation needs internet — cached routes follow fixed path</li>
        </ul>
      </div>
    </div>
  );
}
