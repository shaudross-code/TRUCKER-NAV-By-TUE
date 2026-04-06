import React from 'react';
import { Clock, DollarSign, Fuel, Route, ChevronRight, Shield, Zap } from 'lucide-react';

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

  return (
    <div data-testid="route-comparison-panel" className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1200] w-[95vw] max-w-[720px]">
      <div className="bg-black/95 backdrop-blur-xl border border-[#D4AF37]/40 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#D4AF37]/30 bg-[#D4AF37]/10">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-sm font-bold text-[#D4AF37] tracking-wide uppercase">Route Comparison</span>
          </div>
          <button
            data-testid="route-comparison-close"
            onClick={onClose}
            className="text-[#D4AF37] hover:text-white text-xs px-2 py-1 rounded bg-black/50 hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/30 transition-colors font-bold uppercase tracking-wider"
          >
            GO
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

            return (
              <button
                key={idx}
                data-testid={`route-option-${idx}`}
                onClick={() => onSelectRoute(idx)}
                className={`flex-shrink-0 w-[200px] rounded-xl p-3 transition-all duration-200 text-left border ${
                  isSelected 
                    ? 'bg-[#D4AF37]/10 border-[#D4AF37]/60 ring-1 ring-[#D4AF37]/30' 
                    : 'bg-zinc-900/60 border-zinc-700/30 hover:bg-zinc-800/70 hover:border-[#D4AF37]/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: routeColors[idx] }}
                  />
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    {routeLabels[idx]}
                  </span>
                  {isSelected && (
                    <ChevronRight className="w-3 h-3 text-[#D4AF37] ml-auto" />
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-white font-semibold text-sm">{formatDuration(route.durationSec)}</span>
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
                  {tollCost > 0 && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-amber-400 text-xs">Tolls: {formatCost(tollCost)}</span>
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
                    <span className="text-sm font-bold text-[#D4AF37]">{formatCost(totalCost)}</span>
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
