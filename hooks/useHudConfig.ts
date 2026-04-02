import { useState, useEffect, useCallback } from 'react';
import { loadHudLayout, loadHudPositions, loadHudScales } from '../utils/hudLayout';
import type { HudPositions, HudScales } from '../utils/hudLayout';
import type { HudLayoutConfig } from '../types';

export function useHudConfig() {
  const [hudLayout, setHudLayout] = useState<HudLayoutConfig>(loadHudLayout);
  const [hudPositions, setHudPositions] = useState<HudPositions>(loadHudPositions);
  const [hudScales, setHudScales] = useState<HudScales>(loadHudScales);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      // Use event detail directly if available, fallback to localStorage
      setHudLayout(detail && typeof detail === 'object' ? { ...detail } : loadHudLayout());
    };
    window.addEventListener('hud-layout-changed', handler);
    return () => window.removeEventListener('hud-layout-changed', handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setHudPositions(detail && typeof detail === 'object' ? { ...detail } : loadHudPositions());
    };
    window.addEventListener('hud-positions-changed', handler);
    return () => window.removeEventListener('hud-positions-changed', handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setHudScales(detail && typeof detail === 'object' ? { ...detail } : loadHudScales());
    };
    window.addEventListener('hud-scales-changed', handler);
    return () => window.removeEventListener('hud-scales-changed', handler);
  }, []);

  return { hudLayout, setHudLayout, hudPositions, setHudPositions, hudScales, setHudScales };
}
