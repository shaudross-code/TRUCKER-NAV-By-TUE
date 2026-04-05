import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Clock, Coffee, Moon, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { speak } from '../services/speechService';

// FMCSA Hours of Service Rules
const HOS_RULES = {
  MAX_DRIVING_HOURS: 11,         // Max 11 hours driving after 10 consecutive hours off
  MAX_ON_DUTY_HOURS: 14,         // Max 14 hours on-duty window after 10 off
  REQUIRED_BREAK_AFTER: 8,       // 30-min break required after 8 hours driving
  BREAK_DURATION_MIN: 30,        // Minimum break duration (minutes)
  MAX_CYCLE_HOURS: 70,           // Max 70 hours in 8-day cycle
  CYCLE_DAYS: 8,                 // 8-day rolling cycle
  MIN_OFF_DUTY_HOURS: 10,        // Minimum consecutive off-duty hours
};

interface HOSState {
  drivingHours: number;        // hours driven in current shift
  onDutyHours: number;         // hours on-duty in current window
  timeSinceBreak: number;      // hours since last 30-min break
  cycleHours: number;          // total hours in 8-day cycle
  shiftStartTime: number | null; // timestamp when shift started
  lastBreakTime: number | null;  // timestamp of last qualifying break
  isOnBreak: boolean;
  breakStartTime: number | null;
}

interface DriverFatigueAlertProps {
  isDriving: boolean;
  isVisible?: boolean;
}

const formatHours = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

const formatRemaining = (remaining: number) => {
  if (remaining <= 0) return '0h 0m';
  return formatHours(remaining);
};

export const DriverFatigueAlert: React.FC<DriverFatigueAlertProps> = ({ isDriving, isVisible = true }) => {
  const [hosState, setHosState] = useState<HOSState>(() => {
    const saved = localStorage.getItem('hos_state');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return {
      drivingHours: 0,
      onDutyHours: 0,
      timeSinceBreak: 0,
      cycleHours: 0,
      shiftStartTime: null,
      lastBreakTime: null,
      isOnBreak: false,
      breakStartTime: null,
    };
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [alerts, setAlerts] = useState<{ type: string; message: string; severity: 'warning' | 'critical' }[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const spokenAlertsRef = useRef<Set<string>>(new Set());

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('hos_state', JSON.stringify(hosState));
  }, [hosState]);

  // Timer: update HOS counters every minute
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setHosState(prev => {
        if (!isDriving && !prev.isOnBreak) return prev;

        const incrementHours = 1 / 60; // 1 minute in hours
        const now = Date.now();

        if (prev.isOnBreak) {
          if (prev.breakStartTime) {
            const breakDuration = (now - prev.breakStartTime) / (1000 * 60); // in minutes
            if (breakDuration >= HOS_RULES.BREAK_DURATION_MIN) {
              // Qualifying break completed
              return {
                ...prev,
                isOnBreak: false,
                breakStartTime: null,
                lastBreakTime: now,
                timeSinceBreak: 0,
              };
            }
          }
          return prev;
        }

        return {
          ...prev,
          drivingHours: prev.drivingHours + incrementHours,
          onDutyHours: prev.onDutyHours + incrementHours,
          timeSinceBreak: prev.timeSinceBreak + incrementHours,
          cycleHours: prev.cycleHours + incrementHours,
          shiftStartTime: prev.shiftStartTime || now,
        };
      });
    }, 60_000); // Every minute

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isDriving]);

  // Generate alerts based on HOS state
  useEffect(() => {
    const newAlerts: typeof alerts = [];

    const drivingRemaining = HOS_RULES.MAX_DRIVING_HOURS - hosState.drivingHours;
    const onDutyRemaining = HOS_RULES.MAX_ON_DUTY_HOURS - hosState.onDutyHours;
    const breakRemaining = HOS_RULES.REQUIRED_BREAK_AFTER - hosState.timeSinceBreak;
    const cycleRemaining = HOS_RULES.MAX_CYCLE_HOURS - hosState.cycleHours;

    if (drivingRemaining <= 0) {
      newAlerts.push({ type: 'driving', message: '11-hour driving limit reached. Must stop driving.', severity: 'critical' });
    } else if (drivingRemaining <= 1) {
      newAlerts.push({ type: 'driving_warn', message: `${formatRemaining(drivingRemaining)} driving time remaining.`, severity: 'warning' });
    }

    if (onDutyRemaining <= 0) {
      newAlerts.push({ type: 'onduty', message: '14-hour on-duty window expired. Must go off-duty.', severity: 'critical' });
    } else if (onDutyRemaining <= 1) {
      newAlerts.push({ type: 'onduty_warn', message: `${formatRemaining(onDutyRemaining)} left in 14-hour window.`, severity: 'warning' });
    }

    if (breakRemaining <= 0) {
      newAlerts.push({ type: 'break', message: '30-minute break required. 8 hours driving without break.', severity: 'critical' });
    } else if (breakRemaining <= 0.5) {
      newAlerts.push({ type: 'break_warn', message: `Break needed in ${formatRemaining(breakRemaining)}.`, severity: 'warning' });
    }

    if (cycleRemaining <= 0) {
      newAlerts.push({ type: 'cycle', message: '70-hour/8-day cycle limit reached.', severity: 'critical' });
    } else if (cycleRemaining <= 4) {
      newAlerts.push({ type: 'cycle_warn', message: `${formatRemaining(cycleRemaining)} left in 70-hour cycle.`, severity: 'warning' });
    }

    setAlerts(newAlerts);

    // Voice alerts for critical items
    newAlerts.forEach(alert => {
      if (alert.severity === 'critical' && !spokenAlertsRef.current.has(alert.type)) {
        speak(`Warning. ${alert.message}`);
        spokenAlertsRef.current.add(alert.type);
      }
    });
  }, [hosState]);

  const startBreak = useCallback(() => {
    setHosState(prev => ({
      ...prev,
      isOnBreak: true,
      breakStartTime: Date.now(),
    }));
    speak('Break started. Timer will reset after 30 minutes.');
  }, []);

  const resetShift = useCallback(() => {
    setHosState({
      drivingHours: 0,
      onDutyHours: 0,
      timeSinceBreak: 0,
      cycleHours: hosState.cycleHours, // Preserve cycle hours
      shiftStartTime: null,
      lastBreakTime: null,
      isOnBreak: false,
      breakStartTime: null,
    });
    spokenAlertsRef.current.clear();
    speak('Shift reset. 10 hours off duty completed.');
  }, [hosState.cycleHours]);

  const resetCycle = useCallback(() => {
    setHosState({
      drivingHours: 0,
      onDutyHours: 0,
      timeSinceBreak: 0,
      cycleHours: 0,
      shiftStartTime: null,
      lastBreakTime: null,
      isOnBreak: false,
      breakStartTime: null,
    });
    spokenAlertsRef.current.clear();
  }, []);

  if (!isVisible) return null;

  const hasCritical = alerts.some(a => a.severity === 'critical');
  const hasWarning = alerts.some(a => a.severity === 'warning');
  const drivingRemaining = Math.max(0, HOS_RULES.MAX_DRIVING_HOURS - hosState.drivingHours);
  const onDutyRemaining = Math.max(0, HOS_RULES.MAX_ON_DUTY_HOURS - hosState.onDutyHours);
  const breakRemaining = Math.max(0, HOS_RULES.REQUIRED_BREAK_AFTER - hosState.timeSinceBreak);
  const drivingPct = Math.min(100, (hosState.drivingHours / HOS_RULES.MAX_DRIVING_HOURS) * 100);
  const onDutyPct = Math.min(100, (hosState.onDutyHours / HOS_RULES.MAX_ON_DUTY_HOURS) * 100);
  const breakPct = Math.min(100, (hosState.timeSinceBreak / HOS_RULES.REQUIRED_BREAK_AFTER) * 100);

  return (
    <div data-testid="driver-fatigue-alert" className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl overflow-hidden">
      <button
        data-testid="hos-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${hasCritical ? 'text-red-500 animate-pulse' : hasWarning ? 'text-amber-400' : 'text-[#D4AF37]'}`} />
          <span className="text-sm font-bold text-white uppercase tracking-wide">HOS Status</span>
        </div>
        <div className="flex items-center gap-2">
          {hosState.isOnBreak ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-medium">On Break</span>
          ) : hasCritical ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium animate-pulse">Violation</span>
          ) : (
            <span className="text-[#D4AF37] text-xs font-medium">{formatRemaining(drivingRemaining)} drive left</span>
          )}
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-700/40 pt-3">
          {/* Alerts Banner */}
          {alerts.length > 0 && (
            <div className="space-y-1.5">
              {alerts.map((alert, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                  alert.severity === 'critical' 
                    ? 'bg-red-500/15 border border-red-500/30 text-red-400' 
                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                }`}>
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Progress Bars */}
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                <span>Driving ({formatHours(hosState.drivingHours)})</span>
                <span>{formatRemaining(drivingRemaining)} left</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    drivingPct >= 90 ? 'bg-red-500' : drivingPct >= 75 ? 'bg-amber-500' : 'bg-[#D4AF37]'
                  }`}
                  style={{ width: `${drivingPct}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                <span>On-Duty ({formatHours(hosState.onDutyHours)})</span>
                <span>{formatRemaining(onDutyRemaining)} left</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    onDutyPct >= 90 ? 'bg-red-500' : onDutyPct >= 75 ? 'bg-amber-500' : 'bg-[#D4AF37]'
                  }`}
                  style={{ width: `${onDutyPct}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                <span>Since Break ({formatHours(hosState.timeSinceBreak)})</span>
                <span>{formatRemaining(breakRemaining)} left</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    breakPct >= 90 ? 'bg-red-500' : breakPct >= 75 ? 'bg-amber-500' : 'bg-[#D4AF37]'
                  }`}
                  style={{ width: `${breakPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* 70hr Cycle */}
          <div className="bg-zinc-800/50 rounded-lg p-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-zinc-500" />
                <span className="text-[10px] text-zinc-400 uppercase">70-Hour / 8-Day Cycle</span>
              </div>
              <span className="text-xs text-zinc-300 font-mono">
                {formatHours(hosState.cycleHours)} / {HOS_RULES.MAX_CYCLE_HOURS}h
              </span>
            </div>
            <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden mt-1.5">
              <div 
                className="h-full rounded-full bg-[#D4AF37] transition-all"
                style={{ width: `${Math.min(100, (hosState.cycleHours / HOS_RULES.MAX_CYCLE_HOURS) * 100)}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              data-testid="hos-start-break"
              onClick={startBreak}
              disabled={hosState.isOnBreak}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                hosState.isOnBreak 
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/30 border border-[#D4AF37]/30'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              {hosState.isOnBreak ? 'On Break...' : 'Start Break'}
            </button>
            <button
              data-testid="hos-reset-shift"
              onClick={resetShift}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-[#D4AF37]/15 text-[#D4AF37] hover:bg-[#D4AF37]/25 border border-[#D4AF37]/30 transition-colors"
            >
              <Moon className="w-3.5 h-3.5" />
              10hr Off-Duty
            </button>
            <button
              data-testid="hos-reset-cycle"
              onClick={resetCycle}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 border border-zinc-600/30 transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              Reset Cycle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
