import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, AlertTriangle, UserPlus, LogIn } from 'lucide-react';

const GUEST_SESSION_DURATION = 2 * 60 * 60; // 2 hours in seconds
const WARNING_THRESHOLDS = [5 * 60, 60, 30]; // 5min, 1min, 30sec

interface GuestSessionTimerProps {
  onExpired: () => void;
  onCreateAccount: () => void;
  onGoogleSignIn: () => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const GuestSessionTimer: React.FC<GuestSessionTimerProps> = ({ onExpired, onCreateAccount, onGoogleSignIn }) => {
  const [remaining, setRemaining] = useState(GUEST_SESSION_DURATION);
  const [showWarning, setShowWarning] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    // Check for existing session start
    const saved = sessionStorage.getItem('guest_session_start');
    if (saved) {
      startTimeRef.current = parseInt(saved, 10);
    } else {
      sessionStorage.setItem('guest_session_start', String(startTimeRef.current));
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const left = Math.max(0, GUEST_SESSION_DURATION - elapsed);
      setRemaining(left);

      if (left <= 0) {
        clearInterval(interval);
        onExpired();
        return;
      }

      // Show warning overlay at thresholds
      if (left <= WARNING_THRESHOLDS[0] && !dismissed) {
        setShowWarning(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [onExpired, dismissed]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setShowWarning(false);
    // Re-show at next threshold
    const nextThreshold = WARNING_THRESHOLDS.find(t => t < remaining);
    if (nextThreshold) {
      setTimeout(() => {
        setDismissed(false);
      }, (remaining - nextThreshold) * 1000);
    }
  }, [remaining]);

  const isUrgent = remaining <= 60;
  const isCritical = remaining <= 30;

  // Compact timer badge (always visible for guests in last 30 min)
  const showBadge = remaining <= 30 * 60;

  return (
    <>
      {/* Compact countdown badge — top-right corner */}
      {showBadge && !showWarning && (
        <div
          data-testid="guest-timer-badge"
          className={`fixed top-4 right-4 z-[9998] flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl border shadow-lg transition-all ${
            isCritical ? 'bg-red-900/90 border-red-500/50 animate-pulse' :
            isUrgent ? 'bg-red-900/80 border-red-500/40' :
            remaining <= 5 * 60 ? 'bg-red-900/70 border-red-500/30' :
            'bg-zinc-900/80 border-zinc-700/50'
          }`}
        >
          <Clock className={`w-3.5 h-3.5 ${isCritical ? 'text-red-400' : isUrgent ? 'text-red-400' : remaining <= 5 * 60 ? 'text-red-400' : 'text-zinc-400'}`} />
          <span className={`text-xs font-black tabular-nums ${
            isCritical ? 'text-red-300' : isUrgent ? 'text-red-400' : remaining <= 5 * 60 ? 'text-red-400' : 'text-zinc-300'
          }`}>
            {formatTime(remaining)}
          </span>
        </div>
      )}

      {/* Warning overlay */}
      {showWarning && (
        <div
          data-testid="guest-session-warning"
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        >
          <div className="w-full max-w-md mx-4 bg-zinc-900/95 border border-red-500/30 rounded-3xl p-7 shadow-2xl">
            {/* Countdown */}
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                isCritical ? 'bg-red-500/20 border-2 border-red-500 animate-pulse' :
                isUrgent ? 'bg-red-500/15 border-2 border-red-500/60' :
                'bg-red-500/10 border-2 border-red-500/40'
              }`}>
                <span className={`text-2xl font-black tabular-nums ${isCritical ? 'text-red-400' : 'text-red-500'}`}>
                  {formatTime(remaining)}
                </span>
              </div>

              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Guest Session Expiring</h3>
                </div>
                <p className="text-sm text-zinc-400 max-w-xs mx-auto">
                  {isCritical
                    ? 'Your session ends in seconds. Create an account now to save your data!'
                    : isUrgent
                    ? 'Less than a minute left. Sign up to keep your routes and settings.'
                    : 'Your guest session is ending soon. Create an account or sign in with Google to keep your data.'}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                data-testid="guest-warning-create-account"
                onClick={onCreateAccount}
                className="w-full py-3.5 bg-[#D4AF37] text-black font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 hover:bg-[#c9a432] transition-colors shadow-[0_0_20px_rgba(212,175,55,0.3)]"
              >
                <UserPlus className="w-4 h-4" /> Create Account
              </button>
              <button
                data-testid="guest-warning-google-signin"
                onClick={onGoogleSignIn}
                className="w-full py-3.5 bg-white text-black font-bold text-sm rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-100 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign In with Google
              </button>
              <button
                data-testid="guest-warning-dismiss"
                onClick={handleDismiss}
                className="w-full py-2.5 text-zinc-500 text-xs font-bold uppercase tracking-wider hover:text-zinc-300 transition-colors"
              >
                Continue as Guest ({formatTime(remaining)} left)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GuestSessionTimer;
