import { useEffect, useRef } from 'react';

/**
 * Keeps the device screen awake while the app/page is open and visible.
 *
 * Uses the standard Screen Wake Lock API (works in modern browsers and the
 * Capacitor WebView on iOS 16.4+ / Android Chrome). The lock is re-acquired
 * automatically every time the page becomes visible again (browsers
 * auto-release wake locks when tabs are hidden).
 *
 * The lock is released on unmount, page unload, or when the user closes
 * the tab/swipes the app away — matching the requested behaviour:
 *   "stay awake until swiped away, power-button press, or app/site closed".
 */
export function useScreenWakeLock(enabled: boolean = true): void {
  const sentinelRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;

    // Feature-detect: Wake Lock API is on `navigator.wakeLock`
    const nav: any = typeof navigator !== 'undefined' ? navigator : null;
    if (!nav || !nav.wakeLock || typeof nav.wakeLock.request !== 'function') {
      return;
    }

    let cancelled = false;

    const request = async () => {
      try {
        if (document.visibilityState !== 'visible') return;
        if (sentinelRef.current) return;
        const sentinel = await nav.wakeLock.request('screen');
        if (cancelled) {
          try { await sentinel.release(); } catch {}
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.addEventListener?.('release', () => {
          // Browser released it (tab hidden, low battery, etc.); clear ref so we can re-acquire on visibility.
          if (sentinelRef.current === sentinel) sentinelRef.current = null;
        });
      } catch (err: any) {
        // NotAllowedError happens when the page is hidden or user-gesture is required.
        // We silently ignore — the visibilitychange handler will retry.
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[wakeLock] request failed:', err?.name || err);
        }
      }
    };

    const release = async () => {
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel) {
        try { await sentinel.release(); } catch {}
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        request();
      }
    };

    request();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    window.addEventListener('pageshow', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
      window.removeEventListener('pageshow', onVisibility);
      release();
    };
  }, [enabled]);
}

export default useScreenWakeLock;
