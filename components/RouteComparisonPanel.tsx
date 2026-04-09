import React, { useMemo } from 'react';
import { Clock, DollarSign, Fuel, Route, ChevronRight, Shield, Zap, TrendingDown, Timer, MapPin } from 'lucide-react';

interface RouteOption {
  coords: [number, number][];
  distMi: number;
  durationSec: number;
  tolls?: { total?: { cost?: { value: number; currency: string } }; fares?: any[] };
  restrictions?: any[];
  alerts?: any[];
  hereFuelGallons?: number;
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

type BadgeType = 'FASTEST' | 'CHEAPEST' | 'SHORTEST' | 'SAFEST';

const BADGE_STYLES: Record<BadgeType, { bg: string; text: string; border: string }> = {
  FASTEST:  { bg: 'bg-[#D4AF37]/20', text: 'text-[#D4AF37]', border: 'border-[#D4AF37]/40' },
  CHEAPEST: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  SHORTEST: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  SAFEST:   { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
};

export const RouteComparisonPanel: React.FC<RouteComparisonPanelProps> = ({
  routes,
  selectedIndex,
  onSelectRoute,
  fuelPricePerGallon,
  truckMpg,
  onClose
}) => {
  if (!routes || routes.length <= 1) return null;

  const routeColors = ['#D4AF37', '#4A9EFF', '#FF6B4A', '#8B5CF6'];

  const analysis = useMemo(() => {
    const items = routes.map((route, idx) => {
      const fuelGallons = route.hereFuelGallons && route.hereFuelGallons > 0
        ? route.hereFuelGallons
        : route.distMi / truckMpg;
      const fuelCost = fuelGallons * fuelPricePerGallon;
      const tollCost = route.tolls?.total?.cost?.value
        ? route.tolls.total.cost.value / 100
        : 0;
      const totalCost = fuelCost + tollCost;
      const restrictionCount = route.restrictions?.filter((r: any) =>
        r.type === 'BRIDGE' || r.type === 'WEIGHT' || r.type === 'TUNNEL'
      ).length || 0;

      return { idx, fuelGallons, fuelCost, tollCost, totalCost, restrictionCount };
    });

    // Determine badges
    const fastest = items.reduce((a, b) => routes[a.idx].durationSec <= routes[b.idx].durationSec ? a : b);
    const cheapest = items.reduce((a, b) => a.totalCost <= b.totalCost ? a : b);
    const shortest = items.reduce((a, b) => routes[a.idx].distMi <= routes[b.idx].distMi ? a : b);
    const safest = items.reduce((a, b) => a.restrictionCount <= b.restrictionCount ? a : b);

    const slowest = items.reduce((a, b) => routes[a.idx].durationSec >= routes[b.idx].durationSec ? a : b);
    const mostExpensive = items.reduce((a, b) => a.totalCost >= b.totalCost ? a : b);

    const badges = new Map<number, BadgeType[]>();
    const addBadge = (idx: number, badge: BadgeType) => {
      if (!badges.has(idx)) badges.set(idx, []);
      badges.get(idx)!.push(badge);
    };

    // Only assign if there's a meaningful difference
    if (routes[slowest.idx].durationSec - routes[fastest.idx].durationSec > 120) {
      addBadge(fastest.idx, 'FASTEST');
    }
    if (mostExpensive.totalCost - cheapest.totalCost > 1) {
      addBadge(cheapest.idx, 'CHEAPEST');
    }
    if (routes[items.reduce((a, b) => routes[a.idx].distMi >= routes[b.idx].distMi ? a : b).idx].distMi - routes[shortest.idx].distMi > 2) {
      addBadge(shortest.idx, 'SHORTEST');
    }
    const maxRestrictions = Math.max(...items.map(i => i.restrictionCount));
    if (maxRestrictions > 0 && safest.restrictionCount < maxRestrictions) {
      addBadge(safest.idx, 'SAFEST');
    }

    return { items, badges, slowest, mostExpensive };
  }, [routes, fuelPricePerGallon, truckMpg]);

  return (
    <div data-testid="route-comparison-panel" className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1200] w-[95vw] max-w-[800px]">
      <div className="bg-black/95 backdrop-blur-xl border border-[#D4AF37]/40 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#D4AF37]/30 bg-[#D4AF37]/10">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-sm font-bold text-[#D4AF37] tracking-wide uppercase">Route Comparison</span>
            <span className="text-[10px] text-zinc-500 font-bold ml-1">{routes.length} routes</span>
          </div>
          <button
            data-testid="route-comparison-close"
            onClick={onClose}
            className="text-black bg-[#D4AF37] hover:bg-[#c9a432] text-xs px-4 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-colors shadow-[0_0_12px_rgba(212,175,55,0.3)]"
          >
            START NAV
          </button>
        </div>

        {/* Route cards */}
        <div className="flex overflow-x-auto gap-2 p-3 scrollbar-hide">
          {routes.map((route, idx) => {
            const isSelected = idx === selectedIndex;
            const data = analysis.items[idx];
            const badges = analysis.badges.get(idx) || [];

            // Time/cost savings vs worst
            const timeSavedSec = routes[analysis.slowest.idx].durationSec - route.durationSec;
            const costSaved = analysis.mostExpensive.totalCost - data.totalCost;

            return (
              <button
                key={idx}
                data-testid={`route-option-${idx}`}
                onClick={() => onSelectRoute(idx)}
                className={`flex-shrink-0 w-[220px] rounded-xl p-3 transition-all duration-200 text-left border relative ${
                  isSelected
                    ? 'bg-[#D4AF37]/10 border-[#D4AF37]/60 ring-1 ring-[#D4AF37]/30'
                    : 'bg-black/60 border-zinc-700/30 hover:bg-zinc-800/70 hover:border-[#D4AF37]/20'
                }`}
              >
                {/* Route label + color */}
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: routeColors[idx] }}
                  />
                  <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                    {idx === 0 ? 'Primary' : `Alt ${idx}`}
                  </span>
                  {isSelected && (
                    <ChevronRight className="w-3 h-3 text-[#D4AF37] ml-auto" />
                  )}
                </div>

                {/* Badges */}
                {badges.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {badges.map(badge => (
                      <span
                        key={badge}
                        data-testid={`badge-${badge.toLowerCase()}-${idx}`}
                        className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${BADGE_STYLES[badge].bg} ${BADGE_STYLES[badge].text} ${BADGE_STYLES[badge].border}`}
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                )}

                {/* Main metrics */}
                <div className="space-y-1.5">
                  {/* Duration */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-white font-bold text-sm">{formatDuration(route.durationSec)}</span>
                    </div>
                    {timeSavedSec > 120 && (
                      <span className="text-[9px] font-bold text-emerald-400">
                        -{formatDuration(timeSavedSec)}
                      </span>
                    )}
                  </div>

                  {/* Distance */}
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-zinc-300 text-xs font-medium">{route.distMi.toFixed(1)} mi</span>
                  </div>

                  {/* Fuel */}
                  <div className="flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-zinc-300 text-xs">
                      {data.fuelGallons.toFixed(1)} gal
                      <span className="text-zinc-500 ml-1">({formatCost(data.fuelCost)})</span>
                    </span>
                  </div>

                  {/* Tolls */}
                  {data.tollCost > 0 && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-amber-400 text-xs font-medium">Tolls: {formatCost(data.tollCost)}</span>
                    </div>
                  )}

                  {/* Restrictions */}
                  {data.restrictionCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-red-400 text-xs">{data.restrictionCount} restriction{data.restrictionCount > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>

                {/* Total cost footer */}
                <div className="mt-2 pt-2 border-t border-zinc-700/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Est. Total</span>
                    <span className="text-sm font-bold text-[#D4AF37]">{formatCost(data.totalCost)}</span>
                  </div>
                  {costSaved > 1 && (
                    <div className="flex items-center justify-end mt-0.5">
                      <TrendingDown className="w-3 h-3 text-emerald-400 mr-0.5" />
                      <span className="text-[9px] font-bold text-emerald-400">Save {formatCost(costSaved)}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
