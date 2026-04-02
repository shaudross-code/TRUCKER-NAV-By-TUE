import React, { useEffect, useMemo, useReducer, useCallback, useRef, useContext } from 'react';
import { HOSContext, TelemetryContext } from '../types';
import { safeStringify } from '../utils';
import { useFirebase } from './FirebaseProvider';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { recordStatusChange } from '../utils/eldLogger';

type HOSState = {
  idleSeconds: number;
  breakSuggestion: boolean;
  eldStatus: {
    status: 'OFF' | 'SB' | 'ON' | 'DRIVE';
    timers: { label: string; seconds: number; total: number; color: string }[];
    resetSeconds: number;
  };
};

type HOSAction = 
  | { type: 'TICK', speed: number }
  | { type: 'SET_ELD_STATUS', status: 'OFF' | 'SB' | 'ON' | 'DRIVE' }
  | { type: 'SET_BREAK_SUGGESTION', value: boolean }
  | { type: 'SET_STATE', state: Partial<HOSState> };

function hosReducer(state: HOSState, action: HOSAction): HOSState {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, ...action.state };
    case 'TICK': {
      const { idleSeconds, breakSuggestion, eldStatus } = state;
      const speed = action.speed;
      
      // Idle logic
      const nextIdleSeconds = speed <= 5 ? idleSeconds + 1 : 0;
      let nextBreakSuggestion = breakSuggestion;
      if (speed > 5) nextBreakSuggestion = false;
      else if (nextIdleSeconds === 300 && eldStatus.status !== 'OFF' && eldStatus.status !== 'SB') {
        nextBreakSuggestion = true;
      }

      // ELD Logic
      let nextStatus = eldStatus.status;
      let nextTimers = eldStatus.timers;
      let nextReset = eldStatus.resetSeconds;

      if (speed > 5 && eldStatus.status !== 'DRIVE') {
        nextStatus = 'DRIVE';
      }

      if (speed <= 5 && nextIdleSeconds === 1800) {
        nextTimers = nextTimers.map(t => 
          t.label === 'Until Break' ? { ...t, seconds: t.total } : t
        );
      }

      if (nextStatus === 'OFF' || nextStatus === 'SB') {
        nextReset = Math.max(0, nextReset - 1);
        if (nextReset === 0 && eldStatus.resetSeconds > 0) {
          nextTimers = nextTimers.map(t => ({ ...t, seconds: t.total }));
        }
      } else {
        nextTimers = nextTimers.map(t => {
          let shouldDecrement = false;
          if (t.label === '70h Cycle') shouldDecrement = true;
          if (t.label === 'On-Duty Shift') shouldDecrement = true;
          if (t.label === 'Drive Time' && nextStatus === 'DRIVE') shouldDecrement = true;
          if (t.label === 'Until Break' && nextStatus === 'DRIVE') shouldDecrement = true;
          return { ...t, seconds: shouldDecrement ? Math.max(0, t.seconds - 1) : t.seconds };
        });
        nextReset = 36000;
      }

      return {
        ...state,
        idleSeconds: nextIdleSeconds,
        breakSuggestion: nextBreakSuggestion,
        eldStatus: { ...eldStatus, status: nextStatus, timers: nextTimers, resetSeconds: nextReset }
      };
    }
    case 'SET_ELD_STATUS': {
      const newStatus = action.status;
      if (state.eldStatus.status === newStatus) return state;
      return { ...state, eldStatus: { ...state.eldStatus, status: newStatus } };
    }
    case 'SET_BREAK_SUGGESTION':
      if (state.breakSuggestion === action.value) return state;
      return { ...state, breakSuggestion: action.value };
    default:
      return state;
  }
}

export const HOSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useFirebase();
  const telemetryContext = useContext(TelemetryContext);

  const [state, dispatch] = useReducer(hosReducer, {
    idleSeconds: 0,
    breakSuggestion: false,
    eldStatus: {
      status: 'OFF',
      resetSeconds: 36000,
      timers: [
        { label: 'Until Break', seconds: 28800, total: 28800, color: 'bg-rose-500' }, 
        { label: 'Drive Time', seconds: 39600, total: 39600, color: 'bg-[#D4AF37]' }, 
        { label: 'On-Duty Shift', seconds: 50400, total: 50400, color: 'bg-zinc-700' }, 
        { label: '70h Cycle', seconds: 252000, total: 252000, color: 'bg-[#B8860B]' }, 
      ]
    }
  });

  // Record initial status on mount so the ELD log always has at least one entry for today
  useEffect(() => {
    recordStatusChange(state.eldStatus.status);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load from Firestore (skip for anonymous users - no Firestore access)
  useEffect(() => {
    if (!user || user.uid.startsWith('dev-') || user.isAnonymous) return;
    const loadHOS = async () => {
      const hosDocRef = doc(db, 'users', user.uid, 'hos', 'current');
      try {
        const hosDoc = await getDoc(hosDocRef);
        if (hosDoc.exists()) {
          const data = hosDoc.data();
          dispatch({ 
            type: 'SET_STATE', 
            state: { 
              eldStatus: {
                status: data.status,
                resetSeconds: data.resetSeconds || 36000,
                timers: data.timers || state.eldStatus.timers
              }
            } 
          });
        }
      } catch (error: any) {
        if (!error?.message?.includes('permission')) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}/hos/current`);
        }
      }
    };
    loadHOS();
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'TICK', speed: telemetryContext?.speedRef.current || 0 });
    }, 1000);
    return () => clearInterval(interval);
  }, [telemetryContext]);

  // Persistence Effect (Firestore - skip for anonymous users)
  const lastSavedRef = useRef<string>('');
  useEffect(() => {
    if (!user || user.uid.startsWith('dev-') || user.isAnonymous) return;
    const statusStr = safeStringify(state.eldStatus);
    if (statusStr && statusStr !== lastSavedRef.current) {
      lastSavedRef.current = statusStr;
      const saveHOS = async () => {
        const hosDocRef = doc(db, 'users', user.uid, 'hos', 'current');
        try {
          await setDoc(hosDocRef, {
            ...state.eldStatus,
            lastUpdate: new Date().toISOString()
          }, { merge: true });
        } catch (error: any) {
          // Silently ignore permission errors
          if (!error?.message?.includes('permission')) {
            handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/hos/current`);
          }
        }
      };
      saveHOS();
    }
  }, [state.eldStatus, user]);

  const hasViolation = state.eldStatus.timers.some(t => t.seconds <= 0) && (state.eldStatus.status === 'DRIVE' || state.eldStatus.status === 'ON');

  // Global ELD logging: record every status change into localStorage logs
  // This ensures logs are captured whether the user changes status from Dashboard, ELD Logs, or auto-drive
  const prevStatusRef = useRef<string>(state.eldStatus.status);
  useEffect(() => {
    const currentStatus = state.eldStatus.status;
    if (currentStatus !== prevStatusRef.current) {
      prevStatusRef.current = currentStatus;
      recordStatusChange(currentStatus);
    }
  }, [state.eldStatus.status]);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const setEldStatus = useCallback((action: any) => {
      const next = typeof action === 'function' ? action(stateRef.current.eldStatus) : action;
      dispatch({ type: 'SET_ELD_STATUS', status: next.status });
  }, [dispatch]);

  const setBreakSuggestion = useCallback((val: boolean) => dispatch({ type: 'SET_BREAK_SUGGESTION', value: val }), [dispatch]);
  const setIdleSeconds = useCallback(() => {}, []);

  const contextValue = useMemo(() => ({
    idleSeconds: state.idleSeconds,
    setIdleSeconds,
    breakSuggestion: state.breakSuggestion,
    setBreakSuggestion,
    hasViolation,
    eldStatus: state.eldStatus,
    setEldStatus,
  }), [state.idleSeconds, state.breakSuggestion, state.eldStatus, hasViolation, setEldStatus, setBreakSuggestion, setIdleSeconds]);

  return (
    <HOSContext.Provider value={contextValue}>{children}</HOSContext.Provider>
  );
};
