import React, { useContext, useState, useEffect, useCallback } from 'react';
import { DollarSign, TrendingUp, FileText, MapPin, Minus, Truck } from 'lucide-react';
import { AppContext } from '../types';

/** A number input that uses local string state while editing, and syncs on blur/enter */
const EditableNumberInput: React.FC<{
  value: number;
  onChange: (val: number) => void;
  prefix?: string;
  testId?: string;
  className?: string;
}> = ({ value, onChange, prefix = '$', testId, className }) => {
  const [localValue, setLocalValue] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);

  // Sync from external value when not editing
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(String(value));
    }
  }, [value, isFocused]);

  const commit = useCallback(() => {
    const num = parseFloat(localValue);
    if (!isNaN(num) && num >= 0) {
      onChange(num);
    } else {
      setLocalValue(String(value)); // revert
    }
    setIsFocused(false);
  }, [localValue, onChange, value]);

  return (
    <div className="mt-4 flex items-center gap-2">
      <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">{prefix}</span>
      <input
        data-testid={testId}
        type="number"
        min="0"
        step="0.01"
        value={localValue}
        onFocus={() => {
          setIsFocused(true);
          setLocalValue(value === 0 ? '' : String(value));
        }}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
        className={className || "w-24 bg-[#050505] border border-zinc-800 rounded-xl py-1 px-2 text-white text-sm font-bold focus:border-[#D4AF37] focus:outline-none transition-colors"}
      />
      <button
        data-testid={testId ? `${testId}-reset` : undefined}
        onClick={() => { onChange(0); setLocalValue('0'); }}
        className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-[#D4AF37] transition-colors"
      >
        Reset
      </button>
    </div>
  );
};

const PaySummary: React.FC = () => {
  const context = useContext(AppContext);
  const weeklyEarnings = context?.weeklyEarnings || 0;
  const fuelCost = context?.fuelCost || 0;
  const truckCost = context?.truckCost || 0;
  const setTruckCost = context?.setTruckCost || (() => {});
  const weekDeductions = context?.weekDeductions || 0;
  const setWeekDeductions = context?.setWeekDeductions || (() => {});
  const takeHomePercentage = context?.takeHomePercentage || 100;
  const setTakeHomePercentage = context?.setTakeHomePercentage || (() => {});
  const milesThisWeek = context?.milesThisWeek || 0;

  // Percentage input also uses local state
  const [localPct, setLocalPct] = useState(String(takeHomePercentage));
  const [pctFocused, setPctFocused] = useState(false);

  useEffect(() => {
    if (!pctFocused) setLocalPct(String(takeHomePercentage));
  }, [takeHomePercentage, pctFocused]);

  const commitPct = useCallback(() => {
    const num = parseFloat(localPct);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      setTakeHomePercentage(num);
    } else {
      setLocalPct(String(takeHomePercentage));
    }
    setPctFocused(false);
  }, [localPct, setTakeHomePercentage, takeHomePercentage]);

  const netPay = (weeklyEarnings * (takeHomePercentage / 100)) - fuelCost - truckCost - weekDeductions;
  
  const monthlyGross = weeklyEarnings * 4;
  const monthlyNet = netPay * 4;
  const yearlyGross = weeklyEarnings * 52;
  const yearlyNet = netPay * 52;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <div data-testid="pay-summary-page" className="p-4 md:p-10 max-w-[1400px] mx-auto bg-[#050505] min-h-screen">
      <h1 className="text-4xl font-black tracking-tight text-white mb-8 uppercase italic tracking-tighter">Pay Summary</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-10">
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-[#D4AF37]/10 p-3 rounded-2xl text-[#D4AF37]">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Weekly Gross</h3>
          </div>
          <div data-testid="pay-weekly-gross" className="text-3xl font-bold text-white tracking-tight">{formatCurrency(weeklyEarnings)}</div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">%</span>
            <input 
              data-testid="pay-take-home-pct"
              type="number" 
              min="0"
              max="100"
              value={localPct}
              onFocus={() => {
                setPctFocused(true);
                setLocalPct(takeHomePercentage === 100 ? '' : String(takeHomePercentage));
              }}
              onChange={(e) => setLocalPct(e.target.value)}
              onBlur={commitPct}
              onKeyDown={(e) => { if (e.key === 'Enter') commitPct(); }}
              className="w-16 bg-[#050505] border border-zinc-800 rounded-xl py-1 px-2 text-white text-sm font-bold focus:border-[#D4AF37] focus:outline-none transition-colors"
            />
          </div>
        </div>
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-emerald-400/10 p-3 rounded-2xl text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Weekly Net</h3>
          </div>
          <div data-testid="pay-weekly-net" className={`text-3xl font-bold tracking-tight ${netPay < 0 ? 'text-red-400' : 'text-white'}`}>{formatCurrency(netPay)}</div>
        </div>
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-[#D4AF37]/10 p-3 rounded-2xl text-[#D4AF37]">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Fuel Cost</h3>
          </div>
          <div data-testid="pay-fuel-cost" className="text-3xl font-bold text-white tracking-tight">{formatCurrency(fuelCost)}</div>
        </div>
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-400/10 p-3 rounded-2xl text-blue-400">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Truck Cost</h3>
          </div>
          <div data-testid="pay-truck-cost" className="text-3xl font-bold text-white tracking-tight">{formatCurrency(truckCost)}</div>
          <EditableNumberInput
            value={truckCost}
            onChange={setTruckCost}
            testId="pay-truck-cost-input"
          />
        </div>
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-rose-400/10 p-3 rounded-2xl text-rose-400">
              <Minus className="w-6 h-6" />
            </div>
            <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Deductions</h3>
          </div>
          <div data-testid="pay-deductions" className="text-3xl font-bold text-white tracking-tight">{formatCurrency(weekDeductions)}</div>
          <EditableNumberInput
            value={weekDeductions}
            onChange={setWeekDeductions}
            testId="pay-deductions-input"
          />
        </div>
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-emerald-400/10 p-3 rounded-2xl text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Net Pay</h3>
          </div>
          <div data-testid="pay-net-pay" className={`text-3xl font-bold tracking-tight ${netPay < 0 ? 'text-red-400' : 'text-white'}`}>{formatCurrency(netPay)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-4">Monthly Gross (MTG)</h3>
          <div data-testid="pay-monthly-gross" className="text-3xl font-bold text-white tracking-tight">{formatCurrency(monthlyGross)}</div>
        </div>
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-4">Monthly Net (MTN)</h3>
          <div data-testid="pay-monthly-net" className={`text-3xl font-bold tracking-tight ${monthlyNet < 0 ? 'text-red-400' : 'text-white'}`}>{formatCurrency(monthlyNet)}</div>
        </div>
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-4">Yearly Gross</h3>
          <div data-testid="pay-yearly-gross" className="text-3xl font-bold text-white tracking-tight">{formatCurrency(yearlyGross)}</div>
        </div>
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-4">Yearly Net</h3>
          <div data-testid="pay-yearly-net" className={`text-3xl font-bold tracking-tight ${yearlyNet < 0 ? 'text-red-400' : 'text-white'}`}>{formatCurrency(yearlyNet)}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-400/10 p-3 rounded-2xl text-blue-400">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Miles This Week</h3>
          </div>
          <div data-testid="pay-miles" className="text-4xl font-bold text-white tracking-tight">{formatNumber(milesThisWeek)}</div>
        </div>
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-6 flex items-center gap-3">
            <FileText className="w-5 h-5 text-[#D4AF37]" />
            Recent Pay Statements
          </h2>
          <div className="space-y-4">
            {[
              { date: '2026-03-01', amount: '$4,850.00', status: 'PAID' },
              { date: '2026-02-22', amount: '$4,920.00', status: 'PAID' },
              { date: '2026-02-15', amount: '$4,780.00', status: 'PAID' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="text-zinc-500 font-bold text-xs uppercase tracking-widest">{item.date}</div>
                  <div className="text-white font-bold text-lg">{item.amount}</div>
                </div>
                <div className="px-4 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  {item.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaySummary;
