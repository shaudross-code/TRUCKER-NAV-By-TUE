import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { DollarSign, TrendingUp, FileText, MapPin, Minus, Truck, Wrench, PiggyBank, Briefcase, Info } from 'lucide-react';
import { AppContext, MaintenanceLedgerEntry } from '../types';

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

/** Maintenance account inline deposit / withdraw / reset controls. */
const MaintenanceAdjustControls: React.FC<{
  onDeposit: (val: number) => void;
  onWithdraw: (val: number) => void;
  onReset: () => void;
}> = ({ onDeposit, onWithdraw, onReset }) => {
  const [val, setVal] = useState('');
  const num = parseFloat(val);
  const valid = !isNaN(num) && num > 0;
  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">$</span>
        <input
          data-testid="pay-maintenance-account-input"
          type="number"
          min="0"
          step="0.01"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="0.00"
          className="w-28 bg-[#050505] border border-zinc-800 rounded-xl py-1 px-2 text-white text-sm font-bold focus:border-emerald-400 focus:outline-none transition-colors placeholder:text-zinc-700"
        />
        <button
          data-testid="pay-maintenance-account-deposit"
          disabled={!valid}
          onClick={() => { if (valid) { onDeposit(num); setVal(''); } }}
          className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-400/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Deposit
        </button>
        <button
          data-testid="pay-maintenance-account-withdraw"
          disabled={!valid}
          onClick={() => { if (valid) { onWithdraw(num); setVal(''); } }}
          className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-rose-400/15 text-rose-300 border border-rose-400/30 hover:bg-rose-400/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Withdraw
        </button>
      </div>
      <button
        data-testid="pay-maintenance-account-reset"
        onClick={onReset}
        className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-amber-400 transition-colors"
      >
        Reset Balance
      </button>
    </div>
  );
};

/** Compact transaction list under the Maintenance Account card. */
const MaintenanceLedgerCard: React.FC<{ ledger: MaintenanceLedgerEntry[] }> = ({ ledger }) => {
  const [expanded, setExpanded] = useState(false);
  const fmt$ = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };
  if (!ledger || ledger.length === 0) {
    return (
      <div data-testid="pay-maintenance-ledger-card" className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl mb-10">
        <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-3">Maintenance Ledger</h3>
        <p className="text-zinc-600 text-sm">No transactions yet — your account will fill as you drive.</p>
      </div>
    );
  }
  const shown = expanded ? ledger : ledger.slice(0, 8);
  const typeStyles: Record<string, { dot: string; label: string; sign: string }> = {
    accrual:  { dot: 'bg-amber-400',   label: 'Accrual',  sign: '+' },
    deposit:  { dot: 'bg-emerald-400', label: 'Deposit',  sign: '+' },
    withdraw: { dot: 'bg-rose-400',    label: 'Withdraw', sign: '−' },
    reset:    { dot: 'bg-zinc-500',    label: 'Reset',    sign: '−' },
  };
  return (
    <div data-testid="pay-maintenance-ledger-card" className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl mb-10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Maintenance Ledger</h3>
        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{ledger.length} entries</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest border-b border-white/5">
              <th className="text-left py-2 pr-3">When</th>
              <th className="text-left py-2 pr-3">Type</th>
              <th className="text-right py-2 pr-3">Amount</th>
              <th className="text-right py-2 pr-3">Miles</th>
              <th className="text-right py-2 pr-3">¢/mi</th>
              <th className="text-right py-2">Balance</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e) => {
              const s = typeStyles[e.type] || { dot: 'bg-zinc-500', label: e.type, sign: '' };
              return (
                <tr key={e.id} data-testid={`pay-ledger-row-${e.type}`} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 pr-3 text-zinc-400 font-mono text-xs">{fmtDate(e.date)}</td>
                  <td className="py-2 pr-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      <span className="text-zinc-300 text-xs uppercase tracking-widest font-bold">{s.label}</span>
                    </span>
                  </td>
                  <td className={`py-2 pr-3 text-right font-mono font-bold ${e.type === 'withdraw' || e.type === 'reset' ? 'text-rose-300' : 'text-emerald-300'}`}>
                    {s.sign}{fmt$(e.amount)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-zinc-400 text-xs">{e.miles != null ? e.miles.toLocaleString() : '—'}</td>
                  <td className="py-2 pr-3 text-right font-mono text-zinc-400 text-xs">{e.cpm != null ? `${e.cpm}¢` : '—'}</td>
                  <td className="py-2 text-right font-mono font-bold text-white text-xs">{fmt$(e.balanceAfter)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {ledger.length > 8 && (
        <button
          data-testid="pay-ledger-expand-btn"
          onClick={() => setExpanded(!expanded)}
          className="mt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-[#D4AF37] transition-colors"
        >
          {expanded ? 'Show recent only' : `Show all ${ledger.length} entries`}
        </button>
      )}
    </div>
  );
};

/** Click/hover popover showing line-by-line net-pay math. */
const NetPayBreakdownTooltip: React.FC<{
  gross: number;
  pct: number;
  grossAfterPct: number;
  fuelCost: number;
  truckCost: number;
  weekDeductions: number;
  maintenanceWeekFee: number;
  adminFee: number;
  escrowThisWeek: number;
  netPay: number;
}> = (p) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open]);
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const row = (label: string, value: string, op: string, cls?: string) => (
    <div className={`flex items-center justify-between gap-6 py-1 font-mono text-xs ${cls || 'text-zinc-300'}`}>
      <span className="flex items-center gap-2"><span className="w-3 text-zinc-600 text-center font-black">{op}</span>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
  return (
    <div ref={ref} className="relative">
      <button
        data-testid="pay-net-breakdown-toggle"
        type="button"
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-300 hover:bg-emerald-400/10 transition-colors"
        aria-label="Show net pay breakdown"
      >
        <Info className="w-4 h-4" />
      </button>
      {open && (
        <div
          data-testid="pay-net-breakdown-panel"
          className="absolute right-0 top-full mt-2 z-50 w-[320px] bg-[#0a0a0a] border border-emerald-400/30 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-emerald-300 uppercase tracking-[0.2em]">Net Pay Breakdown</span>
            <span className="text-[9px] text-zinc-600 uppercase tracking-widest">this week</span>
          </div>
          <div className="space-y-0.5">
            {row(`Gross × ${p.pct.toFixed(0)}%`, fmt(p.grossAfterPct), '', 'text-white')}
            <div className="text-[9px] text-zinc-700 pl-5 -mt-0.5 font-mono">{fmt(p.gross)} × {p.pct}%</div>
            {row('Fuel Cost',         fmt(p.fuelCost),           '−', p.fuelCost > 0 ? 'text-rose-300' : 'text-zinc-500')}
            {row('Truck Cost',        fmt(p.truckCost),          '−', p.truckCost > 0 ? 'text-rose-300' : 'text-zinc-500')}
            {row('Week Deductions',   fmt(p.weekDeductions),     '−', p.weekDeductions > 0 ? 'text-rose-300' : 'text-zinc-500')}
            {row('Maintenance Fee',   fmt(p.maintenanceWeekFee), '−', p.maintenanceWeekFee > 0 ? 'text-rose-300' : 'text-zinc-500')}
            {row('Admin Fee',         fmt(p.adminFee),           '−', p.adminFee > 0 ? 'text-rose-300' : 'text-zinc-500')}
            {row('Escrow (this wk)',  fmt(p.escrowThisWeek),     '−', p.escrowThisWeek > 0 ? 'text-rose-300' : 'text-zinc-500')}
          </div>
          <div className="border-t border-white/10 mt-3 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Net Pay</span>
              <span className={`text-lg font-black tracking-tight ${p.netPay < 0 ? 'text-rose-400' : 'text-emerald-300'}`}>{fmt(p.netPay)}</span>
            </div>
          </div>
        </div>
      )}
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
  const maintenanceCpm = context?.maintenanceCpm ?? 5;
  const setMaintenanceCpm = context?.setMaintenanceCpm || (() => {});
  const maintenanceAccount = context?.maintenanceAccount || 0;
  const setMaintenanceAccount = context?.setMaintenanceAccount || (() => {});
  const maintenanceLedger = context?.maintenanceLedger || [];
  const depositMaintenance = context?.depositMaintenance || ((_v: number) => {});
  const withdrawMaintenance = context?.withdrawMaintenance || ((_v: number) => {});
  const resetMaintenanceAccount = context?.resetMaintenanceAccount || (() => {});

  const adminFee = context?.adminFee ?? 135;
  const setAdminFee = context?.setAdminFee || (() => {});

  const escrowRate = context?.escrowRate ?? 0;
  const setEscrowRate = context?.setEscrowRate || (() => {});
  const escrowMax = context?.escrowMax ?? 2500;
  const setEscrowMax = context?.setEscrowMax || (() => {});
  const escrowBalance = context?.escrowBalance || 0;
  const escrowThisWeek = context?.escrowThisWeek || 0;

  const maintenanceWeekFee = (milesThisWeek * maintenanceCpm) / 100;
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

  const grossAfterPct = weeklyEarnings * (takeHomePercentage / 100);
  const netPay = grossAfterPct - fuelCost - truckCost - weekDeductions - maintenanceWeekFee - adminFee - escrowThisWeek;
  
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
        <div className="relative bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl group">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-emerald-400/10 p-3 rounded-2xl text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs flex-1">Net Pay</h3>
            <NetPayBreakdownTooltip
              gross={weeklyEarnings}
              pct={takeHomePercentage}
              grossAfterPct={grossAfterPct}
              fuelCost={fuelCost}
              truckCost={truckCost}
              weekDeductions={weekDeductions}
              maintenanceWeekFee={maintenanceWeekFee}
              adminFee={adminFee}
              escrowThisWeek={escrowThisWeek}
              netPay={netPay}
            />
          </div>
          <div data-testid="pay-net-pay" className={`text-3xl font-bold tracking-tight ${netPay < 0 ? 'text-red-400' : 'text-white'}`}>{formatCurrency(netPay)}</div>
        </div>
      </div>

      {/* Maintenance Fee + Maintenance Account row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div data-testid="pay-maintenance-fee-card" className="bg-black/80 backdrop-blur-3xl border border-amber-400/20 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-amber-400/10 p-3 rounded-2xl text-amber-400">
              <Wrench className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Maintenance Fee — This Week</h3>
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">
                {formatNumber(milesThisWeek)} mi × {maintenanceCpm}¢ → deducted from weekly gross & deposited to account
              </p>
            </div>
          </div>
          <div data-testid="pay-maintenance-fee-value" className="text-3xl font-bold text-white tracking-tight">{formatCurrency(maintenanceWeekFee)}</div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">¢/mi</span>
            <input
              data-testid="pay-maintenance-cpm-input"
              type="number"
              min="0"
              step="0.1"
              value={maintenanceCpm}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v >= 0) setMaintenanceCpm(v);
              }}
              className="w-24 bg-[#050505] border border-zinc-800 rounded-xl py-1 px-2 text-white text-sm font-bold focus:border-amber-400 focus:outline-none transition-colors"
            />
            <button
              data-testid="pay-maintenance-cpm-reset"
              onClick={() => setMaintenanceCpm(0)}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-amber-400 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        <div data-testid="pay-maintenance-account-card" className="bg-black/80 backdrop-blur-3xl border border-emerald-400/20 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-emerald-400/10 p-3 rounded-2xl text-emerald-400">
              <PiggyBank className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Maintenance Account</h3>
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Running balance — fed by miles driven</p>
            </div>
          </div>
          <div data-testid="pay-maintenance-account-balance" className={`text-3xl font-bold tracking-tight ${maintenanceAccount < 0 ? 'text-red-400' : 'text-emerald-300'}`}>
            {formatCurrency(maintenanceAccount)}
          </div>
          <MaintenanceAdjustControls
            onDeposit={(v) => depositMaintenance(v)}
            onWithdraw={(v) => withdrawMaintenance(v)}
            onReset={() => resetMaintenanceAccount()}
          />
        </div>
      </div>

      {/* Maintenance Ledger */}
      <MaintenanceLedgerCard ledger={maintenanceLedger} />

      {/* Admin Fee + Escrow row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div data-testid="pay-admin-fee-card" className="bg-black/80 backdrop-blur-3xl border border-zinc-700/40 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-zinc-400/10 p-3 rounded-2xl text-zinc-300">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Admin Fee</h3>
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Flat weekly carrier/admin charge — deducted from gross</p>
            </div>
          </div>
          <div data-testid="pay-admin-fee-value" className="text-3xl font-bold text-white tracking-tight">{formatCurrency(adminFee)}</div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">$</span>
            <input
              data-testid="pay-admin-fee-input"
              type="number"
              min="0"
              step="1"
              value={adminFee}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v >= 0) setAdminFee(v);
              }}
              className="w-28 bg-[#050505] border border-zinc-800 rounded-xl py-1 px-2 text-white text-sm font-bold focus:border-zinc-400 focus:outline-none transition-colors"
            />
            <button
              data-testid="pay-admin-fee-reset"
              onClick={() => setAdminFee(135)}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
            >
              Reset to $135
            </button>
          </div>
        </div>

        <div data-testid="pay-escrow-card" className="bg-black/80 backdrop-blur-3xl border border-emerald-400/20 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-emerald-400/10 p-3 rounded-2xl text-emerald-400">
              <PiggyBank className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Escrow</h3>
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">
                {escrowRate}% of gross → escrow until ${formatNumber(escrowMax)} cap · this week {formatCurrency(escrowThisWeek)}
              </p>
            </div>
          </div>
          <div className="flex items-end gap-3 mb-4">
            <div>
              <div data-testid="pay-escrow-balance" className="text-3xl font-bold text-emerald-300 tracking-tight">{formatCurrency(escrowBalance)}</div>
              <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">
                {((escrowBalance / Math.max(escrowMax, 1)) * 100).toFixed(0)}% of cap
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${Math.min(100, (escrowBalance / Math.max(escrowMax, 1)) * 100)}%` }} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Rate</span>
            <input
              data-testid="pay-escrow-rate-input"
              type="number" min="0" max="100" step="0.1"
              value={escrowRate}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v >= 0 && v <= 100) setEscrowRate(v);
              }}
              className="w-20 bg-[#050505] border border-zinc-800 rounded-xl py-1 px-2 text-white text-sm font-bold focus:border-emerald-400 focus:outline-none transition-colors"
            />
            <span className="text-zinc-500 text-xs">%</span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest ml-3">Cap</span>
            <span className="text-zinc-500 text-xs">$</span>
            <input
              data-testid="pay-escrow-max-input"
              type="number" min="0" step="50"
              value={escrowMax}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v >= 0) setEscrowMax(v);
              }}
              className="w-28 bg-[#050505] border border-zinc-800 rounded-xl py-1 px-2 text-white text-sm font-bold focus:border-emerald-400 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      <div data-testid="pay-summary-monthly-yearly" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
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
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-10 h-10 text-zinc-700 mb-4" />
            <p className="text-zinc-500 font-medium text-sm">No pay statements yet</p>
            <p className="text-zinc-600 text-xs mt-1">Your statements will appear here as you log earnings</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaySummary;
