import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  Clock, Activity, AlertTriangle, Download, ChevronLeft, ChevronRight,
  Truck, Coffee, Moon, Briefcase, FileText, BarChart3
} from 'lucide-react';
import { HOSContext } from '../types';

// FMCSA Status types
type DutyStatus = 'OFF' | 'SB' | 'ON' | 'DRIVE';

interface LogEntry {
  status: DutyStatus;
  startTime: string;
  endTime?: string;
  location?: string;
  notes?: string;
}

interface DailyLog {
  date: string;
  entries: LogEntry[];
  totalDrive: number;
  totalOnDuty: number;
  totalSleeper: number;
  totalOff: number;
  violations: string[];
}

const STATUS_CONFIG: Record<DutyStatus, { label: string; color: string; bg: string; icon: any }> = {
  OFF: { label: 'Off Duty', color: 'text-zinc-400', bg: 'bg-zinc-600', icon: Moon },
  SB: { label: 'Sleeper Berth', color: 'text-blue-400', bg: 'bg-blue-500', icon: Moon },
  ON: { label: 'On Duty', color: 'text-amber-400', bg: 'bg-amber-500', icon: Briefcase },
  DRIVE: { label: 'Driving', color: 'text-emerald-400', bg: 'bg-emerald-500', icon: Truck },
};

const STORAGE_KEY = 'eld_daily_logs';

function loadLogs(): DailyLog[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveLogs(logs: DailyLog[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatHM(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

function getTimelinePercent(isoStr: string): number {
  const d = new Date(isoStr);
  return ((d.getHours() * 60 + d.getMinutes()) / 1440) * 100;
}

function detectViolations(entries: LogEntry[]): string[] {
  const violations: string[] = [];
  let totalDrive = 0;
  let totalOnDuty = 0;
  let driveSinceBreak = 0;
  let lastBreak = 0;

  entries.forEach(e => {
    if (!e.endTime) return;
    const dur = (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 3600000;
    if (e.status === 'DRIVE') {
      totalDrive += dur;
      driveSinceBreak += dur;
    }
    if (e.status === 'DRIVE' || e.status === 'ON') totalOnDuty += dur;
    if ((e.status === 'OFF' || e.status === 'SB') && dur >= 0.5) {
      driveSinceBreak = 0;
      lastBreak = dur;
    }
  });

  if (totalDrive > 11) violations.push('Exceeded 11-hour driving limit');
  if (totalOnDuty > 14) violations.push('Exceeded 14-hour on-duty window');
  if (driveSinceBreak > 8) violations.push('Drove 8+ hours without 30-min break');
  return violations;
}

function calcTotals(entries: LogEntry[]): { totalDrive: number; totalOnDuty: number; totalSleeper: number; totalOff: number } {
  let totalDrive = 0, totalOnDuty = 0, totalSleeper = 0, totalOff = 0;
  entries.forEach(e => {
    if (!e.endTime) return;
    const dur = (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 3600000;
    if (e.status === 'DRIVE') totalDrive += dur;
    else if (e.status === 'ON') totalOnDuty += dur;
    else if (e.status === 'SB') totalSleeper += dur;
    else totalOff += dur;
  });
  return { totalDrive, totalOnDuty, totalSleeper, totalOff };
}

export default function ELDLogView() {
  const hosContext = useContext(HOSContext);
  const [logs, setLogs] = useState<DailyLog[]>(loadLogs);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [manualStatus, setManualStatus] = useState<DutyStatus | null>(null);
  const [statusNote, setStatusNote] = useState('');

  // Auto-log current driving status
  useEffect(() => {
    if (!hosContext) return;
    const today = formatDate(new Date());
    const currentStatus = hosContext.eldStatus.status;
    
    setLogs(prev => {
      const updated = [...prev];
      let todayLog = updated.find(l => l.date === today);
      if (!todayLog) {
        todayLog = { date: today, entries: [], totalDrive: 0, totalOnDuty: 0, totalSleeper: 0, totalOff: 0, violations: [] };
        updated.push(todayLog);
      }

      const lastEntry = todayLog.entries[todayLog.entries.length - 1];
      const now = new Date().toISOString();

      if (lastEntry && !lastEntry.endTime && lastEntry.status !== currentStatus) {
        lastEntry.endTime = now;
      }

      if (!lastEntry || lastEntry.endTime) {
        todayLog.entries.push({ status: currentStatus, startTime: now });
      }

      const totals = calcTotals(todayLog.entries);
      todayLog.totalDrive = totals.totalDrive;
      todayLog.totalOnDuty = totals.totalOnDuty;
      todayLog.totalSleeper = totals.totalSleeper;
      todayLog.totalOff = totals.totalOff;
      todayLog.violations = detectViolations(todayLog.entries);

      saveLogs(updated);
      return updated;
    });
  }, [hosContext?.eldStatus.status]);

  const todayLog = logs.find(l => l.date === selectedDate) || {
    date: selectedDate, entries: [], totalDrive: 0, totalOnDuty: 0, totalSleeper: 0, totalOff: 0, violations: []
  };

  const changeStatus = useCallback((status: DutyStatus) => {
    if (!hosContext) return;
    hosContext.setEldStatus({ status });
    setManualStatus(null);
    setStatusNote('');
  }, [hosContext]);

  const navigateDate = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(formatDate(d));
  };

  const exportCSV = () => {
    const headers = 'Date,Status,Start Time,End Time,Duration (hrs),Notes\n';
    const rows = todayLog.entries.map(e => {
      const dur = e.endTime ? ((new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 3600000).toFixed(2) : 'ongoing';
      return `${selectedDate},${STATUS_CONFIG[e.status].label},${formatTime(e.startTime)},${e.endTime ? formatTime(e.endTime) : 'ongoing'},${dur},${e.notes || ''}`;
    }).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eld_log_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isToday = selectedDate === formatDate(new Date());

  return (
    <div data-testid="eld-log-view" className="h-full overflow-y-auto bg-[#050505] p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <FileText className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white uppercase tracking-wider">ELD Logs</h1>
            <p className="text-xs text-zinc-500">Electronic Logging Device — FMCSA Compliant</p>
          </div>
        </div>
        <button data-testid="eld-export-csv" onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Date Nav */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => navigateDate(-1)} className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <span className="text-white font-black text-sm">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
          {isToday && <span className="ml-2 text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-black uppercase">Today</span>}
        </div>
        <button onClick={() => navigateDate(1)} disabled={isToday} className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition-colors disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Current Status + Manual Controls */}
      {isToday && hosContext && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className={`w-4 h-4 ${STATUS_CONFIG[hosContext.eldStatus.status].color}`} />
              <span className="text-sm font-bold text-white">Current: {STATUS_CONFIG[hosContext.eldStatus.status].label}</span>
            </div>
            {hosContext.hasViolation && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-red-500/20 text-red-400 font-black animate-pulse">
                <AlertTriangle className="w-3 h-3" /> VIOLATION
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {(['OFF', 'SB', 'ON', 'DRIVE'] as DutyStatus[]).map(s => {
              const cfg = STATUS_CONFIG[s];
              const Icon = cfg.icon;
              const isActive = hosContext.eldStatus.status === s;
              return (
                <button
                  key={s}
                  data-testid={`eld-status-${s.toLowerCase()}`}
                  onClick={() => changeStatus(s)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    isActive
                      ? `${cfg.bg}/20 border-current ${cfg.color} ring-1 ring-current`
                      : 'bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Drive', hours: todayLog.totalDrive, max: 11, color: 'emerald', icon: Truck },
          { label: 'On-Duty', hours: todayLog.totalOnDuty, max: 14, color: 'amber', icon: Briefcase },
          { label: 'Sleeper', hours: todayLog.totalSleeper, max: 10, color: 'blue', icon: Moon },
          { label: 'Off-Duty', hours: todayLog.totalOff, max: 10, color: 'zinc', icon: Coffee },
        ].map(item => {
          const Icon = item.icon;
          const pct = Math.min(100, (item.hours / item.max) * 100);
          return (
            <div key={item.label} data-testid={`eld-summary-${item.label.toLowerCase()}`} className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1 text-${item.color}-400`} />
              <div className="text-white font-black text-sm">{formatHM(item.hours)}</div>
              <div className="text-zinc-500 text-[9px] font-bold uppercase">{item.label}</div>
              <div className="h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                <div className={`h-full rounded-full bg-${item.color}-500 transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Violations */}
      {todayLog.violations.length > 0 && (
        <div data-testid="eld-violations" className="bg-red-500/10 border border-red-500/25 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center gap-2 text-red-400 font-black text-xs uppercase">
            <AlertTriangle className="w-4 h-4" /> Violations Detected
          </div>
          {todayLog.violations.map((v, i) => (
            <div key={i} className="text-red-300 text-xs pl-6">- {v}</div>
          ))}
        </div>
      )}

      {/* Visual Timeline (ELD Graph) */}
      <div data-testid="eld-timeline" className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-[#D4AF37]" />
          <span className="text-xs font-black text-[#D4AF37] uppercase tracking-widest">Daily Log Graph</span>
        </div>

        {/* Hour Labels */}
        <div className="flex justify-between text-[8px] text-zinc-600 font-mono mb-1 px-0.5">
          {Array.from({ length: 13 }, (_, i) => i * 2).map(h => (
            <span key={h}>{h.toString().padStart(2, '0')}</span>
          ))}
        </div>

        {/* Status Rows */}
        {(['OFF', 'SB', 'ON', 'DRIVE'] as DutyStatus[]).map(status => {
          const cfg = STATUS_CONFIG[status];
          return (
            <div key={status} className="flex items-center h-7 border-b border-zinc-800/50">
              <div className="w-16 shrink-0 text-[9px] font-bold text-zinc-500 pr-2 text-right">{cfg.label}</div>
              <div className="flex-1 relative h-full bg-zinc-950/50">
                {todayLog.entries.filter(e => e.status === status).map((entry, idx) => {
                  const startPct = getTimelinePercent(entry.startTime);
                  const endPct = entry.endTime ? getTimelinePercent(entry.endTime) : (isToday ? getTimelinePercent(new Date().toISOString()) : 100);
                  const width = Math.max(0.5, endPct - startPct);
                  return (
                    <div
                      key={idx}
                      className={`absolute top-1 bottom-1 ${cfg.bg} rounded-sm opacity-80`}
                      style={{ left: `${startPct}%`, width: `${width}%` }}
                      title={`${formatTime(entry.startTime)} - ${entry.endTime ? formatTime(entry.endTime) : 'now'}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 justify-center">
          {(['OFF', 'SB', 'ON', 'DRIVE'] as DutyStatus[]).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-sm ${STATUS_CONFIG[s].bg}`} />
              <span className="text-[9px] text-zinc-500 font-bold">{STATUS_CONFIG[s].label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Entry Log Table */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-500" />
          <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Status Changes</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 font-bold">{todayLog.entries.length}</span>
        </div>
        <div className="max-h-48 overflow-y-auto">
          {todayLog.entries.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 text-xs">No entries for this date</div>
          ) : (
            todayLog.entries.map((entry, idx) => {
              const cfg = STATUS_CONFIG[entry.status];
              const dur = entry.endTime
                ? ((new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / 3600000)
                : ((Date.now() - new Date(entry.startTime).getTime()) / 3600000);
              return (
                <div key={idx} className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                  <div className={`w-2 h-2 rounded-full ${cfg.bg}`} />
                  <span className={`text-xs font-bold w-20 ${cfg.color}`}>{cfg.label}</span>
                  <span className="text-xs text-zinc-400 font-mono w-32">{formatTime(entry.startTime)} - {entry.endTime ? formatTime(entry.endTime) : 'now'}</span>
                  <span className="text-xs text-zinc-500 font-bold">{formatHM(dur)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
