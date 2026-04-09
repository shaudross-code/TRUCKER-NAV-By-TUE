// Shared ELD log recording — used by HOSProvider (global) and ELDLogView (display)

export type DutyStatus = 'OFF' | 'SB' | 'ON' | 'DRIVE';

export interface LogEntry {
  status: DutyStatus;
  startTime: string;
  endTime?: string;
  location?: string;
  notes?: string;
}

export interface DailyLog {
  date: string;
  entries: LogEntry[];
  totalDrive: number;
  totalOnDuty: number;
  totalSleeper: number;
  totalOff: number;
  violations: string[];
}

export const ELD_STORAGE_KEY = 'eld_daily_logs';

// A simple counter so in-app listeners can detect changes without relying on the storage event
// (storage event only fires across tabs, not within the same tab)
let _revision = 0;
const _listeners = new Set<() => void>();

export function getEldRevision() { return _revision; }

export function subscribeEldChanges(cb: () => void) {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

function notifyEldListeners() {
  _revision++;
  _listeners.forEach(cb => cb());
}

export function loadLogs(): DailyLog[] {
  try {
    const stored = localStorage.getItem(ELD_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

export function saveLogs(logs: DailyLog[]) {
  localStorage.setItem(ELD_STORAGE_KEY, JSON.stringify(logs));
  notifyEldListeners();
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function calcTotals(entries: LogEntry[]) {
  let totalDrive = 0, totalOnDuty = 0, totalSleeper = 0, totalOff = 0;
  entries.forEach(e => {
    if (!e.endTime || !e.startTime) return;
    const start = new Date(e.startTime).getTime();
    const end = new Date(e.endTime).getTime();
    if (isNaN(start) || isNaN(end)) return;
    
    const dur = (end - start) / 3600000;
    if (e.status === 'DRIVE') totalDrive += dur;
    else if (e.status === 'ON') totalOnDuty += dur;
    else if (e.status === 'SB') totalSleeper += dur;
    else totalOff += dur;
  });
  return { totalDrive, totalOnDuty, totalSleeper, totalOff };
}

export function detectViolations(entries: LogEntry[]): string[] {
  const violations: string[] = [];
  let totalDrive = 0;
  let totalOnDuty = 0;
  let driveSinceBreak = 0;

  entries.forEach(e => {
    if (!e.endTime || !e.startTime) return;
    const start = new Date(e.startTime).getTime();
    const end = new Date(e.endTime).getTime();
    if (isNaN(start) || isNaN(end)) return;

    const dur = (end - start) / 3600000;
    if (e.status === 'DRIVE') {
      totalDrive += dur;
      driveSinceBreak += dur;
    }
    if (e.status === 'DRIVE' || e.status === 'ON') totalOnDuty += dur;
    if ((e.status === 'OFF' || e.status === 'SB') && dur >= 0.5) {
      driveSinceBreak = 0;
    }
  });

  if (totalDrive > 11) violations.push('Exceeded 11-hour driving limit');
  if (totalOnDuty > 14) violations.push('Exceeded 14-hour on-duty window');
  if (driveSinceBreak > 8) violations.push('Drove 8+ hours without 30-min break');
  return violations;
}

/**
 * Records a status change into the ELD daily logs.
 * Called globally from HOSProvider so logs are always captured.
 */
export function recordStatusChange(newStatus: DutyStatus) {
  const today = formatDate(new Date());
  const logs = loadLogs();

  let todayLog = logs.find(l => l.date === today);
  if (!todayLog) {
    todayLog = { date: today, entries: [], totalDrive: 0, totalOnDuty: 0, totalSleeper: 0, totalOff: 0, violations: [] };
    logs.push(todayLog);
  }

  const lastEntry = todayLog.entries[todayLog.entries.length - 1];
  const now = new Date().toISOString();

  // Close the previous entry if it's a different status
  if (lastEntry && !lastEntry.endTime && lastEntry.status !== newStatus) {
    lastEntry.endTime = now;
  }

  // Only add a new entry if it's actually different from the current open one
  if (!lastEntry || lastEntry.endTime || lastEntry.status !== newStatus) {
    todayLog.entries.push({ status: newStatus, startTime: now });
  }

  const totals = calcTotals(todayLog.entries);
  todayLog.totalDrive = totals.totalDrive;
  todayLog.totalOnDuty = totals.totalOnDuty;
  todayLog.totalSleeper = totals.totalSleeper;
  todayLog.totalOff = totals.totalOff;
  todayLog.violations = detectViolations(todayLog.entries);

  saveLogs(logs);
}
