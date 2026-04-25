import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useSpeedWarning — Tracks current speed vs speed limit and triggers warnings.
 * Extracted from NavigationView.tsx speed warning system.
 */
interface SpeedWarningConfig {
  currentSpeed: number;
  currentSpeedLimit: number | null;
  isDriving: boolean;
  speak: (text: string) => void;
}

export function useSpeedWarning({ currentSpeed, currentSpeedLimit, isDriving, speak }: SpeedWarningConfig) {
  const [isSpeedWarning, setIsSpeedWarning] = useState(false);
  const speedWarningIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSpeedWarningRef = useRef(0);

  useEffect(() => {
    if (!isDriving || !currentSpeedLimit || currentSpeedLimit <= 0) {
      setIsSpeedWarning(false);
      if (speedWarningIntervalRef.current) {
        clearInterval(speedWarningIntervalRef.current);
        speedWarningIntervalRef.current = null;
      }
      return;
    }

    const threshold = currentSpeedLimit + 5; // 5 mph grace
    const isOver = currentSpeed > threshold;
    setIsSpeedWarning(isOver);

    if (isOver) {
      const now = Date.now();
      // Voice warn every 30 seconds
      if (now - lastSpeedWarningRef.current > 30000) {
        const over = Math.round(currentSpeed - currentSpeedLimit);
        speak(`Speed warning. You are ${over} miles per hour over the speed limit.`);
        lastSpeedWarningRef.current = now;
      }
    }
  }, [currentSpeed, currentSpeedLimit, isDriving, speak]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (speedWarningIntervalRef.current) {
        clearInterval(speedWarningIntervalRef.current);
      }
    };
  }, []);

  return { isSpeedWarning };
}

/**
 * useNightMode — Auto-dimming based on time of day.
 * Returns a CSS filter string and brightness level.
 */
interface NightModeConfig {
  enabled: boolean;
  latitude?: number;
}

export function useNightMode({ enabled, latitude }: NightModeConfig) {
  const [isNightMode, setIsNightMode] = useState(false);
  const [brightness, setBrightness] = useState(1.0);
  const [hudOpacity, setHudOpacity] = useState(1.0);

  useEffect(() => {
    if (!enabled) {
      setIsNightMode(false);
      setBrightness(1.0);
      setHudOpacity(1.0);
      return;
    }

    const updateMode = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const timeDecimal = hour + minute / 60;

      // Sunrise ~6:30, Sunset ~19:30 (adjusted by latitude if available)
      let sunriseHour = 6.5;
      let sunsetHour = 19.5;
      if (latitude) {
        // Rough approximation: higher latitudes = earlier/later sunrise/sunset
        const latFactor = Math.abs(latitude) / 90;
        const monthOffset = (now.getMonth() - 5.5) / 6; // -1 to 1, centered on June
        sunriseHour = 6.5 - monthOffset * latFactor * 2;
        sunsetHour = 19.5 + monthOffset * latFactor * 2;
      }

      const dawnStart = sunriseHour - 0.5;
      const dawnEnd = sunriseHour + 0.5;
      const duskStart = sunsetHour - 0.5;
      const duskEnd = sunsetHour + 0.5;

      let b = 1.0;
      let night = false;

      if (timeDecimal < dawnStart || timeDecimal > duskEnd) {
        // Full night
        b = 0.55;
        night = true;
      } else if (timeDecimal >= dawnStart && timeDecimal <= dawnEnd) {
        // Dawn transition
        const t = (timeDecimal - dawnStart) / (dawnEnd - dawnStart);
        b = 0.55 + t * 0.45;
        night = t < 0.5;
      } else if (timeDecimal >= duskStart && timeDecimal <= duskEnd) {
        // Dusk transition
        const t = (timeDecimal - duskStart) / (duskEnd - duskStart);
        b = 1.0 - t * 0.45;
        night = t > 0.5;
      }

      setBrightness(b);
      setIsNightMode(night);
      // HUD elements get slightly less dim than the map
      setHudOpacity(night ? 0.75 : 1.0);
    };

    updateMode();
    const interval = setInterval(updateMode, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [enabled, latitude]);

  const mapFilter = isNightMode
    ? `brightness(${brightness}) contrast(1.1) saturate(0.6)`
    : `brightness(${brightness})`;

  return { isNightMode, brightness, hudOpacity, mapFilter };
}

/**
 * useViewportCulling — Determines which map objects are within the visible viewport.
 * Returns a filter function that can be used to cull off-screen markers.
 */
interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function useViewportCulling(mapRef: React.RefObject<any>) {
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(null);

  const updateBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map?._mbMap) return;
    
    const mb = map._mbMap;
    const bounds = mb.getBounds();
    if (bounds) {
      setViewportBounds({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    }
  }, [mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Update on map move
    const handler = () => updateBounds();
    map.addEventListener('mapviewchangeend', handler);
    updateBounds(); // Initial

    return () => {
      map.removeEventListener('mapviewchangeend', handler);
    };
  }, [mapRef, updateBounds]);

  const isInViewport = useCallback((lat: number, lon: number, bufferDeg = 0.01): boolean => {
    if (!viewportBounds) return true; // Show everything if bounds unknown
    return (
      lat >= viewportBounds.south - bufferDeg &&
      lat <= viewportBounds.north + bufferDeg &&
      lon >= viewportBounds.west - bufferDeg &&
      lon <= viewportBounds.east + bufferDeg
    );
  }, [viewportBounds]);

  const filterVisible = useCallback(<T extends { lat?: number; lon?: number; position?: [number, number] }>(
    items: T[],
    bufferDeg = 0.02
  ): T[] => {
    if (!viewportBounds) return items;
    return items.filter(item => {
      const lat = item.lat ?? item.position?.[0] ?? 0;
      const lon = item.lon ?? item.position?.[1] ?? 0;
      return isInViewport(lat, lon, bufferDeg);
    });
  }, [viewportBounds, isInViewport]);

  return { viewportBounds, isInViewport, filterVisible, updateBounds };
}
