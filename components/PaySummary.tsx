import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DollarSign, TrendingUp, FileText, MapPin, Minus, Truck, Wrench, PiggyBank, Briefcase, Info, HandCoins, Shield, Receipt, AlertOctagon, Container, Droplets } from 'lucide-react';
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

/** Generic flat-fee card used for Admin, Cash Advance, Insurance, IFTA, Physical Damage, Trailer. */
const FlatFeeCard: React.FC<{
  testId: string;
  icon: React.ComponentType<any>;
  label: string;
  subtitle: string;
  value: number;
  defaultValue: number;
  accent: 'rose' | 'zinc' | 'sky' | 'amber' | 'violet' | 'orange';
  onChange: (v: number) => void;
}> = ({ testId, icon: Icon, label, subtitle, value, defaultValue, accent, onChange }) => {
  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const palette: Record<string, { border: string; iconBg: string; iconText: string; focus: string }> = {
    rose:   { border: 'border-rose-400/20',   iconBg: 'bg-rose-400/10',   iconText: 'text-rose-400',   focus: 'focus:border-rose-400'   },
    zinc:   { border: 'border-zinc-700/40',   iconBg: 'bg-zinc-400/10',   iconText: 'text-zinc-300',   focus: 'focus:border-zinc-400'   },
    sky:    { border: 'border-sky-400/20',    iconBg: 'bg-sky-400/10',    iconText: 'text-sky-400',    focus: 'focus:border-sky-400'    },
    amber:  { border: 'border-amber-400/20',  iconBg: 'bg-amber-400/10',  iconText: 'text-amber-400',  focus: 'focus:border-amber-400'  },
    violet: { border: 'border-violet-400/20', iconBg: 'bg-violet-400/10', iconText: 'text-violet-400', focus: 'focus:border-violet-400' },
    orange: { border: 'border-orange-400/20', iconBg: 'bg-orange-400/10', iconText: 'text-orange-400', focus: 'focus:border-orange-400' },
  };
  const p = palette[accent] || palette.zinc;
  return (
    <div data-testid={`${testId}-card`} className={`bg-black/80 backdrop-blur-3xl border ${p.border} p-8 rounded-[2.5rem] shadow-2xl`}>
      <div className="flex items-center gap-4 mb-4">
        <div className={`${p.iconBg} p-3 rounded-2xl ${p.iconText}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs">{label}</h3>
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">{subtitle}</p>
        </div>
      </div>
      <div data-testid={`${testId}-value`} className="text-3xl font-bold text-white tracking-tight">{formatCurrency(value)}</div>
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">$</span>
        <input
          data-testid={`${testId}-input`}
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v) && v >= 0) onChange(v);
          }}
          className={`w-28 bg-[#050505] border border-zinc-800 rounded-xl py-1 px-2 text-white text-sm font-bold ${p.focus} focus:outline-none transition-colors`}
        />
        <button
          data-testid={`${testId}-reset`}
          onClick={() => onChange(defaultValue)}
          className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
        >
          Reset to ${defaultValue}
        </button>
      </div>
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
  cashAdvance: number;
  insuranceFee: number;
  iftaFee: number;
  physicalDamageFee: number;
  trailerCharge: number;
  defCost: number;
  escrowThisWeek: number;
  netPay: number;
}> = (p) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // Position the floating panel anchored to the trigger button, in viewport coords.
  // Using fixed/portal so the panel escapes the parent card's stacking context
  // (sibling cards use `backdrop-blur-3xl` which creates a new stacking context
  // that would otherwise render on top of an absolutely-positioned popover).
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const btn = wrapRef.current?.querySelector('button');
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const panelW = 320;
      const left = Math.min(window.innerWidth - panelW - 12, Math.max(12, r.right - panelW));
      const top = r.bottom + 8;
      setCoords({ top, left });
    };
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
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
    <div ref={wrapRef} className="relative">
      <button
        data-testid="pay-net-breakdown-toggle"
        type="button"
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-300 hover:bg-emerald-400/10 transition-colors"
        aria-label="Show net pay breakdown"
      >
        <Info className="w-4 h-4" />
      </button>
      {open && coords && createPortal(
        <div
          ref={panelRef}
          data-testid="pay-net-breakdown-panel"
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: 320, zIndex: 10001 }}
          className="bg-[#0a0a0a] border border-emerald-400/30 rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.9)] animate-in slide-in-from-top-2 duration-200"
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
            {row('Cash Advance',      fmt(p.cashAdvance),        '−', p.cashAdvance > 0 ? 'text-rose-300' : 'text-zinc-500')}
            {row('Insurance / Liab.', fmt(p.insuranceFee),       '−', p.insuranceFee > 0 ? 'text-rose-300' : 'text-zinc-500')}
            {row('IFTA Fee',          fmt(p.iftaFee),            '−', p.iftaFee > 0 ? 'text-rose-300' : 'text-zinc-500')}
            {row('Physical Damage',   fmt(p.physicalDamageFee),  '−', p.physicalDamageFee > 0 ? 'text-rose-300' : 'text-zinc-500')}
            {row('Trailer Charge',    fmt(p.trailerCharge),      '−', p.trailerCharge > 0 ? 'text-rose-300' : 'text-zinc-500')}
            {row('DEF',               fmt(p.defCost),            '−', p.defCost > 0 ? 'text-rose-300' : 'text-zinc-500')}
            {row('Escrow (this wk)',  fmt(p.escrowThisWeek),     '−', p.escrowThisWeek > 0 ? 'text-rose-300' : 'text-zinc-500')}
          </div>
          <div className="border-t border-white/10 mt-3 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Net Pay</span>
              <span className={`text-lg font-black tracking-tight ${p.netPay < 0 ? 'text-rose-400' : 'text-emerald-300'}`}>{fmt(p.netPay)}</span>
            </div>
          </div>
        </div>,
        document.body
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

  const cashAdvance = context?.cashAdvance ?? 0;
  const setCashAdvance = context?.setCashAdvance || (() => {});
  const insuranceFee = context?.insuranceFee ?? 350;
  const setInsuranceFee = context?.setInsuranceFee || (() => {});
  const iftaFee = context?.iftaFee ?? 35;
  const setIftaFee = context?.setIftaFee || (() => {});
  const physicalDamageFee = context?.physicalDamageFee ?? 150;
  const setPhysicalDamageFee = context?.setPhysicalDamageFee || (() => {});
  const trailerCharge = context?.trailerCharge ?? 200;
  const setTrailerCharge = context?.setTrailerCharge || (() => {});
  const defCost = context?.defCost ?? 0;
  const setDefCost = context?.setDefCost || (() => {});

  const escrowRate = context?.escrowRate ?? 0;
  const setEscrowRate = context?.setEscrowRate || (() => {});
  const escrowMax = context?.escrowMax ?? 2500;
  const setEscrowMax = context?.setEscrowMax || (() => {});
  const escrowBalance = context?.escrowBalance || 0;
  const escrowThisWeek = context?.escrowThisWeek || 0;

  // Escrow Auto-Fill cap-warning toast
  const [escrowCapToast, setEscrowCapToast] = useState<null | { calculated: number; actual: number; cap: number }>(null);
  // Persist cap state across mounts so the toast fires when cap is first hit
  // even if the user was on a different page (e.g., Dashboard) at the moment.
  const wasCappedRef = useRef<boolean | null>(null);
  useEffect(() => {
    const target = (weeklyEarnings * escrowRate) / 100;
    if (target <= 0) {
      wasCappedRef.current = false;
      try { localStorage.setItem('escrow_was_capped', 'false'); } catch {}
      return;
    }
    const priorWeeks = escrowBalance - escrowThisWeek;
    const isCapped = (priorWeeks + target) > escrowMax + 0.005;

    // Read last persisted state on first effect run so transitions survive remounts
    if (wasCappedRef.current === null) {
      try {
        wasCappedRef.current = localStorage.getItem('escrow_was_capped') === 'true';
      } catch {
        wasCappedRef.current = false;
      }
    }

    if (isCapped && wasCappedRef.current === false) {
      const actual = Math.max(0, escrowMax - priorWeeks);
      setEscrowCapToast({ calculated: target, actual, cap: escrowMax });
    }
    wasCappedRef.current = isCapped;
    try { localStorage.setItem('escrow_was_capped', String(isCapped)); } catch {}
  }, [weeklyEarnings, escrowRate, escrowMax, escrowThisWeek, escrowBalance]);

  useEffect(() => {
    if (!escrowCapToast) return;
    const t = window.setTimeout(() => setEscrowCapToast(null), 7000);
    return () => window.clearTimeout(t);
  }, [escrowCapToast]);

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
  const totalFlatFees = adminFee + cashAdvance + insuranceFee + iftaFee + physicalDamageFee + trailerCharge + defCost;
  const netPay = grossAfterPct - fuelCost - truckCost - weekDeductions - maintenanceWeekFee - totalFlatFees - escrowThisWeek;
  
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
    <div data-testid="pay-summary-page" className="p-4 md:p-10 max-w-[1400px] mx-auto bg-[#050505] min-h-screen overflow-x-hidden">
      {/* Escrow cap-warning toast */}
      {escrowCapToast && (
        <div
          data-testid="pay-escrow-cap-toast"
          className="fixed bottom-6 right-6 z-[200] max-w-sm bg-[#0a0a0a] border border-amber-400/40 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom-2 duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="bg-amber-400/15 p-2 rounded-xl text-amber-400 shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black text-amber-300 uppercase tracking-[0.2em] mb-1">Escrow Cap Reached</div>
              <div className="text-zinc-300 text-xs leading-relaxed">
                This week's escrow capped at <span className="font-bold text-emerald-300">{formatCurrency(escrowCapToast.actual)}</span> of <span className="font-bold text-zinc-400">{formatCurrency(escrowCapToast.calculated)}</span> calculated — escrow account is now full at <span className="font-bold text-emerald-300">{formatCurrency(escrowCapToast.cap)}</span>.
              </div>
              <div className="text-[9px] text-zinc-600 uppercase tracking-widest mt-2 font-bold">Your net pay will increase next week — escrow stops contributing.</div>
            </div>
            <button
              data-testid="pay-escrow-cap-toast-close"
              onClick={() => setEscrowCapToast(null)}
              className="text-zinc-500 hover:text-white shrink-0"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <h1 className="text-4xl font-black tracking-tight text-white mb-8 uppercase italic tracking-tighter">Pay Summary</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-7 gap-4 md:gap-6 mb-10">
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
        <div data-testid="pay-def-card-top" className="bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-cyan-400/10 p-3 rounded-2xl text-cyan-400">
              <Droplets className="w-6 h-6" />
            </div>
            <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs">DEF</h3>
          </div>
          <div data-testid="pay-def-cost-top" className="text-3xl font-bold text-white tracking-tight">{formatCurrency(defCost)}</div>
          <EditableNumberInput
            value={defCost}
            onChange={setDefCost}
            testId="pay-def-cost-input"
          />
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
              cashAdvance={cashAdvance}
              insuranceFee={insuranceFee}
              iftaFee={iftaFee}
              physicalDamageFee={physicalDamageFee}
              trailerCharge={trailerCharge}
              defCost={defCost}
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
                {escrowRate}% of gross → escrow until ${formatNumber(escrowMax)} cap
              </p>
            </div>
          </div>

          {/* This Week's auto-calculated contribution — featured prominently */}
          <div className="mb-4 rounded-2xl bg-emerald-400/5 border border-emerald-400/20 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">This Week</div>
                <div className="text-[9px] text-zinc-600 font-mono mt-0.5">{formatCurrency(weeklyEarnings)} × {escrowRate}%</div>
              </div>
              <div data-testid="pay-escrow-this-week" className="text-2xl font-black tracking-tight text-emerald-300">{formatCurrency(escrowThisWeek)}</div>
            </div>
          </div>

          <div className="flex items-end gap-3 mb-3">
            <div>
              <div className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-1">Total Balance</div>
              <div data-testid="pay-escrow-balance" className={`text-3xl font-bold tracking-tight ${escrowBalance < 0 ? 'text-red-400' : 'text-emerald-300'}`}>{formatCurrency(escrowBalance)}</div>
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

      {/* Weekly fees grid — flat charges deducted from gross */}
      <div data-testid="pay-weekly-fees-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <FlatFeeCard
          testId="pay-cash-advance"
          icon={HandCoins}
          label="Cash Advance"
          subtitle="Driver pre-pay — deducted from this week's gross"
          value={cashAdvance}
          defaultValue={0}
          accent="rose"
          onChange={setCashAdvance}
        />
        <FlatFeeCard
          testId="pay-insurance"
          icon={Shield}
          label="Insurance / Cargo & Liability"
          subtitle="Weekly insurance & liability charge"
          value={insuranceFee}
          defaultValue={350}
          accent="sky"
          onChange={setInsuranceFee}
        />
        <FlatFeeCard
          testId="pay-ifta"
          icon={Receipt}
          label="IFTA Fee"
          subtitle="Interstate fuel tax filing"
          value={iftaFee}
          defaultValue={35}
          accent="amber"
          onChange={setIftaFee}
        />
        <FlatFeeCard
          testId="pay-physical-damage"
          icon={AlertOctagon}
          label="Physical Damage"
          subtitle="Equipment damage coverage"
          value={physicalDamageFee}
          defaultValue={150}
          accent="violet"
          onChange={setPhysicalDamageFee}
        />
        <FlatFeeCard
          testId="pay-trailer-charge"
          icon={Container}
          label="Trailer Charge"
          subtitle="Trailer rental / lease fee"
          value={trailerCharge}
          defaultValue={200}
          accent="orange"
          onChange={setTrailerCharge}
        />
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
