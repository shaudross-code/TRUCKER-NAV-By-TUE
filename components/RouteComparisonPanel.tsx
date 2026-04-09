import React from 'react';
import { Clock, DollarSign, Fuel, Route, ChevronRight, Shield, Zap, Timer, TrendingDown, Ban } from 'lucide-react';

interface RouteOption {
  coords: [number, number][];
  distMi: number;
  durationSec: number;
  tolls?: { total?: { cost?: { value: number; currency: string } }; fares?: any[] };
  restrictions?: any[];
  alerts?: any[];
}

interface RouteComparisonPanelProps {
  routes: RouteOption[];
  selectedIndex: number;
  onSelectRoute: (index: number) => void;
  fuelPricePerGallon: number;
  truckMpg: number;
  onClose: () => void;
}

const formatDuration = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const formatCost = (val: number) => `$${val.toFixed(2)}`;

type RouteTag = { label: string; color: string; bg: string; border: string };

function computeRouteTags(routes: RouteOption[], fuelPricePerGallon: number, truckMpg: number): RouteTag[][] {
  if (!routes || routes.length < 2) return routes.map(() => []);

  const costs = routes.map(r => {
    const fuelCost = (r.distMi / truckMpg) * fuelPricePerGallon;
    const tollCost = r.tolls?.total?.cost?.value ? r.tolls.total.cost.value / 100 : 0;
    return fuelCost + tollCost;
  });
  const times = routes.map(r => r.durationSec);
  const dists = routes.map(r => r.distMi);
  const tolls = routes.map(r => r.tolls?.total?.cost?.value ? r.tolls.total.cost.value / 100 : 0);

  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  const minDist = Math.min(...dists);

  return routes.map((r, idx) => {
    const tags: RouteTag[] = [];
    if (times[idx] === minTime && minTime !== maxTime) {
      tags.push({ label: 'Fastest', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' });
    }
    if (times[idx] === maxTime && minTime !== maxTime) {
      tags.push({ label: 'Slowest', color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' });
    }
    if (costs[idx] === minCost && minCost !== maxCost) {
      tags.push({ label: 'Cheapest', color: '#D4AF37', bg: 'rgba(212,175,55,0.12)', border: 'rgba(212,175,55,0.3)' });
    }
    if (costs[idx] === maxCost && minCost !== maxCost) {
      tags.push({ label: 'Most Expensive', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' });
    }
    if (dists[idx] === minDist && dists.filter(d => d === minDist).length === 1) {
      tags.push({ label: 'Shortest', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' });
    }
    if (tolls[idx] === 0 && tolls.some(t => t > 0)) {
      tags.push({ label: 'No Tolls', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' });
    }
    return tags;
  });
}

export const RouteComparisonPanel: React.FC<RouteComparisonPanelProps> = ({
  routes,
  selectedIndex,
  onSelectRoute,
  fuelPricePerGallon,
  truckMpg,
  onClose
}) => {
  if (!routes || routes.length <= 1) return null;

  const routeLabels = ['Primary', 'Alt 1', 'Alt 2', 'Alt 3'];
  const routeColors = ['#D4AF37', '#4A9EFF', '#FF6B4A', '#8B5CF6'];
  const allTags = computeRouteTags(routes, fuelPricePerGallon, truckMpg);

  // Compute time/cost diffs relative to the fastest/cheapest
  const minTime = Math.min(...routes.map(r => r.durationSec));
  const costs = routes.map(r => {
    const fuelCost = (r.distMi / truckMpg) * fuelPricePerGallon;
    const tollCost = r.tolls?.total?.cost?.value ? r.tolls.total.cost.value / 100 : 0;
    return fuelCost + tollCost;
  });
  const minCost = Math.min(...costs);

  return (
    <div data-testid="route-comparison-panel" className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1200] w-[95vw] max-w-[780px]">
      <div className="bg-black/95 backdrop-blur-xl border border-[#D4AF37]/20 rounded-2xl shadow-2xl overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.1)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#D4AF37]/10">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-sm font-black text-[#D4AF37] tracking-widest uppercase italic">Route Comparison</span>
          </div>
          <button
            data-testid="route-comparison-start-nav"
            onClick={onClose}
            className="flex items-center gap-1.5 text-black text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#C5A028] transition-all shadow-[0_0_12px_rgba(212,175,55,0.3)]"
          >
            <Zap className="w-3 h-3" strokeWidth={3} />
            Start Nav
          </button>
        </div>

        <div className="flex overflow-x-auto gap-2 p-3 scrollbar-hide">
          {routes.map((route, idx) => {
            const isSelected = idx === selectedIndex;
            const fuelGallons = route.distMi / truckMpg;
            const fuelCost = fuelGallons * fuelPricePerGallon;
            
            const tollCost = route.tolls?.total?.cost?.value 
              ? route.tolls.total.cost.value / 100 
              : 0;
            const totalCost = fuelCost + tollCost;
            const restrictionCount = route.restrictions?.filter((r: any) => 
              r.type === 'BRIDGE' || r.type === 'WEIGHT' || r.type === 'TUNNEL'
            ).length || 0;

            const tags = allTags[idx];
            const timeDiff = route.durationSec - minTime;
            const costDiff = costs[idx] - minCost;

            return (
              <button
                key={idx}
                data-testid={`route-option-${idx}`}
                onClick={() => onSelectRoute(idx)}
                className={`flex-shrink-0 w-[210px] rounded-xl p-3 transition-all duration-200 text-left border ${
                  isSelected 
                    ? 'bg-[#D4AF37]/10 border-[#D4AF37]/60 ring-1 ring-[#D4AF37]/30' 
                    : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div 
                    className="w-3 h-3 rounded-full shrink-0" 
                    style={{ backgroundColor: routeColors[idx] }}
                  />
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    {routeLabels[idx]}
                  </span>
                  {isSelected && (
                    <ChevronRight className="w-3 h-3 text-[#D4AF37] ml-auto" />
                  )}
                </div>

                {/* Smart Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {tags.map((tag, tidx) => (
                      <span
                        key={tidx}
                        data-testid={`route-tag-${idx}-${tag.label.toLowerCase().replace(/\s+/g, '-')}`}
                        className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border"
                        style={{ color: tag.color, backgroundColor: tag.bg, borderColor: tag.border }}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-white font-semibold text-sm">{formatDuration(route.durationSec)}</span>
                    {timeDiff > 0 && (
                      <span className="text-[8px] font-bold text-orange-400/80 ml-auto">+{formatDuration(timeDiff)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Route className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-zinc-300 text-xs">{route.distMi.toFixed(1)} mi</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-zinc-300 text-xs">
                      {fuelGallons.toFixed(1)} gal ({formatCost(fuelCost)})
                    </span>
                  </div>
                  {tollCost > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-amber-400 text-xs">Tolls: {formatCost(tollCost)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Ban className="w-3.5 h-3.5 text-zinc-600" />
                      <span className="text-zinc-600 text-xs">No Tolls</span>
                    </div>
                  )}
                  {restrictionCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-red-400 text-xs">{restrictionCount} restriction{restrictionCount > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-zinc-700/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 uppercase">Est. Total</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-[#D4AF37]">{formatCost(totalCost)}</span>
                      {costDiff > 0 && (
                        <span className="text-[8px] font-bold text-red-400/80">+{formatCost(costDiff)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
