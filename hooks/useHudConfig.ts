import { useState, useEffect } from 'react';
import { loadHudLayout, loadHudPositions, loadHudScales } from '../utils/hudLayout';
import type { HudLayoutConfig, HudPositions, HudScales } from '../utils/hudLayout';

export function useHudConfig() {
  const [hudLayout, setHudLayout] = useState<HudLayoutConfig>(loadHudLayout);
  const [hudPositions, setHudPositions] = useState<HudPositions>(loadHudPositions);
  const [hudScales, setHudScales] = useState<HudScales>(loadHudScales);

  useEffect(() => {
    const handler = () => setHudLayout(loadHudLayout());
    window.addEventListener('hud-layout-changed', handler);
    return () => window.removeEventListener('hud-layout-changed', handler);
  }, []);

  useEffect(() => {
    const handler = () => setHudPositions(loadHudPositions());
    window.addEventListener('hud-positions-changed', handler);
    return () => window.removeEventListener('hud-positions-changed', handler);
  }, []);

  useEffect(() => {
    const handler = () => setHudScales(loadHudScales());
    window.addEventListener('hud-scales-changed', handler);
    return () => window.removeEventListener('hud-scales-changed', handler);
  }, []);

  return { hudLayout, setHudLayout, hudPositions, setHudPositions, hudScales, setHudScales };
}
