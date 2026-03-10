import React, { useContext } from 'react';
import { DollarSign, TrendingUp, FileText, MapPin, Minus, Truck } from 'lucide-react';
import { AppContext } from '../types';

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
    <div className="p-4 md:p-10 max-w-[1400px] mx-auto bg-[#050505] min-h-screen">
      <h1 className="text-4xl font-black tracking-tight text-white mb-8 uppercase italic tracking-tighter">Pay Summary</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-10">
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-[#D4AF37]/10 p-3 rounded-2xl text-[#D4AF37]">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Weekly Gross</h3>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{formatCurrency(weeklyEarnings)}</div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">%</span>
            <input 
              type="number" 
              value={takeHomePercentage} 
              onChange={(e) => setTakeHomePercentage(Number(e.target.value))} 
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
          <div className="text-3xl font-bold text-white tracking-tight">{formatCurrency(netPay)}</div>
        </div>
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-[#D4AF37]/10 p-3 rounded-2xl text-[#D4AF37]">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Fuel Cost</h3>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{formatCurrency(fuelCost)}</div>
        </div>
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-400/10 p-3 rounded-2xl text-blue-400">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Truck Cost</h3>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{formatCurrency(truckCost)}</div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">$</span>
            <input 
              type="number" 
              value={truckCost} 
              onChange={(e) => setTruckCost(Number(e.target.value))} 
              className="w-24 bg-[#050505] border border-zinc-800 rounded-xl py-1 px-2 text-white text-sm font-bold focus:border-[#D4AF37] focus:outline-none transition-colors"
            />
            <button 
              onClick={() => setTruckCost(0)}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-[#D4AF37] transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-rose-400/10 p-3 rounded-2xl text-rose-400">
              <Minus className="w-6 h-6" />
            </div>
            <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Deductions</h3>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{formatCurrency(weekDeductions)}</div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">$</span>
            <input 
              type="number" 
              value={weekDeductions} 
              onChange={(e) => setWeekDeductions(Number(e.target.value))} 
              className="w-24 bg-[#050505] border border-zinc-800 rounded-xl py-1 px-2 text-white text-sm font-bold focus:border-[#D4AF37] focus:outline-none transition-colors"
            />
            <button 
              onClick={() => setWeekDeductions(0)}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-[#D4AF37] transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-emerald-400/10 p-3 rounded-2xl text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Net Pay</h3>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{formatCurrency(netPay)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-4">Monthly Gross (MTG)</h3>
          <div className="text-3xl font-bold text-white tracking-tight">{formatCurrency(monthlyGross)}</div>
        </div>
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-4">Monthly Net (MTN)</h3>
          <div className="text-3xl font-bold text-white tracking-tight">{formatCurrency(monthlyNet)}</div>
        </div>
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-4">Yearly Gross</h3>
          <div className="text-3xl font-bold text-white tracking-tight">{formatCurrency(yearlyGross)}</div>
        </div>
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-4">Yearly Net</h3>
          <div className="text-3xl font-bold text-white tracking-tight">{formatCurrency(yearlyNet)}</div>
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
          <div className="text-4xl font-bold text-white tracking-tight">{formatNumber(milesThisWeek)}</div>
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
