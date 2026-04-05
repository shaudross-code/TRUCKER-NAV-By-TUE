import React, { useState, useMemo } from 'react';
import { Fuel, Calculator, TrendingDown, DollarSign, Gauge } from 'lucide-react';

interface FuelCostCalculatorProps {
  routeDistanceMi: number;
  onFuelPriceChange?: (price: number) => void;
  onMpgChange?: (mpg: number) => void;
  initialFuelPrice?: number;
  initialMpg?: number;
}

const NATIONAL_AVG_DIESEL = 3.52; // EIA Jan 2026 national average $/gal
const DEFAULT_TRUCK_MPG = 6.5;

export const FuelCostCalculator: React.FC<FuelCostCalculatorProps> = ({
  routeDistanceMi,
  onFuelPriceChange,
  onMpgChange,
  initialFuelPrice = NATIONAL_AVG_DIESEL,
  initialMpg = DEFAULT_TRUCK_MPG
}) => {
  const [fuelPrice, setFuelPrice] = useState(initialFuelPrice);
  const [mpg, setMpg] = useState(initialMpg);
  const [isExpanded, setIsExpanded] = useState(false);

  const calculations = useMemo(() => {
    const gallonsNeeded = routeDistanceMi / mpg;
    const totalCost = gallonsNeeded * fuelPrice;
    const costPerMile = fuelPrice / mpg;
    return { gallonsNeeded, totalCost, costPerMile };
  }, [routeDistanceMi, fuelPrice, mpg]);

  const handleFuelPriceChange = (val: number) => {
    setFuelPrice(val);
    onFuelPriceChange?.(val);
  };

  const handleMpgChange = (val: number) => {
    setMpg(val);
    onMpgChange?.(val);
  };

  if (routeDistanceMi <= 0) return null;

  return (
    <div data-testid="fuel-cost-calculator" className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl overflow-hidden">
      <button
        data-testid="fuel-calc-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Fuel className="w-4 h-4 text-[#D4AF37]" />
          <span className="text-sm font-bold text-white uppercase tracking-wide">Fuel Cost</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#D4AF37] font-bold text-sm">
            ${calculations.totalCost.toFixed(2)}
          </span>
          <span className="text-zinc-500 text-xs">
            {calculations.gallonsNeeded.toFixed(1)} gal
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-zinc-700/40 pt-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-800/60 rounded-lg p-2.5 text-center">
              <DollarSign className="w-3.5 h-3.5 text-[#D4AF37] mx-auto mb-1" />
              <div className="text-white font-bold text-sm">${calculations.totalCost.toFixed(2)}</div>
              <div className="text-zinc-500 text-[10px] uppercase">Total Cost</div>
            </div>
            <div className="bg-zinc-800/60 rounded-lg p-2.5 text-center">
              <Fuel className="w-3.5 h-3.5 text-[#D4AF37] mx-auto mb-1" />
              <div className="text-white font-bold text-sm">{calculations.gallonsNeeded.toFixed(1)}</div>
              <div className="text-zinc-500 text-[10px] uppercase">Gallons</div>
            </div>
            <div className="bg-zinc-800/60 rounded-lg p-2.5 text-center">
              <TrendingDown className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
              <div className="text-white font-bold text-sm">${calculations.costPerMile.toFixed(2)}</div>
              <div className="text-zinc-500 text-[10px] uppercase">Per Mile</div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-zinc-400 text-xs">Diesel Price ($/gal)</label>
                <span className="text-zinc-300 text-xs font-mono">${fuelPrice.toFixed(2)}</span>
              </div>
              <input
                data-testid="fuel-price-slider"
                type="range"
                min="2.00"
                max="6.00"
                step="0.01"
                value={fuelPrice}
                onChange={(e) => handleFuelPriceChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
                <span>$2.00</span>
                <span className="text-zinc-500">Avg: ${NATIONAL_AVG_DIESEL.toFixed(2)}</span>
                <span>$6.00</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-zinc-400 text-xs">Truck MPG</label>
                <span className="text-zinc-300 text-xs font-mono">{mpg.toFixed(1)} mpg</span>
              </div>
              <input
                data-testid="mpg-slider"
                type="range"
                min="3.0"
                max="10.0"
                step="0.1"
                value={mpg}
                onChange={(e) => handleMpgChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
                <span>3.0</span>
                <span className="text-zinc-500">Avg: {DEFAULT_TRUCK_MPG}</span>
                <span>10.0</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-800/40 rounded-lg p-3 text-center">
            <div className="text-zinc-500 text-[10px] uppercase mb-1">Route: {routeDistanceMi.toFixed(0)} miles</div>
            <div className="flex items-center justify-center gap-1">
              <Calculator className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-zinc-400 text-xs">
                {calculations.gallonsNeeded.toFixed(1)} gal x ${fuelPrice.toFixed(2)} = 
              </span>
              <span className="text-[#D4AF37] font-bold text-sm ml-1">
                ${calculations.totalCost.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
