import React, { useState, useEffect } from 'react';
import {
  Eye, EyeOff, RotateCcw, Navigation, Gauge, MapPin,
  Fuel, Clock, Layers, CloudSun, AlertTriangle, Shield,
  ArrowRightLeft, Milestone, Construction, Route, GitCompare,
  Map as MapIcon, ArrowLeftRight
} from 'lucide-react';
import type { HudLayoutConfig } from '../types';
import { DEFAULT_HUD_LAYOUT, loadHudLayout, saveHudLayout } from '../utils/hudLayout';

interface HudElement {
  key: keyof HudLayoutConfig;
  label: string;
  description: string;
  icon: React.ElementType;
  category: string;
}

const HUD_ELEMENTS: HudElement[] = [
  // Navigation Core
  { key: 'showNavigationHUD', label: 'Turn Instructions', description: 'Top header showing next turn direction and distance', icon: Navigation, category: 'Navigation' },
  { key: 'showLaneGuidance', label: 'Lane Guidance', description: 'Lane arrows in the turn instruction header', icon: ArrowRightLeft, category: 'Navigation' },
  { key: 'showSpeedOverlay', label: 'Speed Display', description: 'Current speed indicator on the map', icon: Gauge, category: 'Navigation' },
  { key: 'showArrivalHUD', label: 'Arrival Bar', description: 'Bottom bar with distance, time remaining, and ETA', icon: MapPin, category: 'Navigation' },
  { key: 'showManeuverPreview', label: 'Maneuver Preview', description: 'Mini-map preview of upcoming interchanges', icon: Route, category: 'Navigation' },
  
  // Panels
  { key: 'showFuelCost', label: 'Fuel Cost', description: 'Estimated fuel cost panel during navigation', icon: Fuel, category: 'Panels' },
  { key: 'showHosStatus', label: 'HOS Status', description: 'Hours of Service driving time panel', icon: Clock, category: 'Panels' },
  { key: 'showMapControls', label: 'Map Controls', description: 'Zoom, 2D/3D, follow, and compass buttons', icon: Layers, category: 'Panels' },
  { key: 'showRouteComparison', label: 'Route Comparison', description: 'Alternative routes comparison panel', icon: GitCompare, category: 'Panels' },
  { key: 'showWeatherOverlay', label: 'Weather Overlay', description: 'Current weather conditions on the map', icon: CloudSun, category: 'Panels' },
  
  // Signs & Markers
  { key: 'showHighwayShields', label: 'Highway Shields', description: 'Interstate, US Route, and State highway emblems', icon: Shield, category: 'Signs' },
  { key: 'showSpeedLimitSigns', label: 'Speed Limit Signs', description: 'MUTCD speed limit signs along the route', icon: Milestone, category: 'Signs' },
  { key: 'showExitSigns', label: 'Exit Signs', description: 'Green highway exit guide signs', icon: MapIcon, category: 'Signs' },
  { key: 'showCurveWarnings', label: 'Curve Warnings', description: 'Yellow diamond curve warning signs', icon: AlertTriangle, category: 'Signs' },
  { key: 'showCmvWarnings', label: 'CMV Warnings', description: 'Steep grade, rollover risk, winding road signs', icon: Construction, category: 'Signs' },
  { key: 'showTruckRestrictions', label: 'Truck Restrictions', description: 'Low clearance, weight limit, no-truck alerts', icon: AlertTriangle, category: 'Signs' },
  { key: 'showTrafficIncidents', label: 'Traffic Incidents', description: 'Real-time accident, closure, construction markers', icon: AlertTriangle, category: 'Signs' },
  { key: 'showWaypointMarkers', label: 'Waypoint Numbers', description: 'Numbered markers (1, 2, 3) at each stop', icon: MapPin, category: 'Signs' },
];

const CATEGORIES = ['Navigation', 'Panels', 'Signs'];

export default function HudLayoutView() {
  const [config, setConfig] = useState<HudLayoutConfig>(loadHudLayout);

  useEffect(() => {
    saveHudLayout(config);
    window.dispatchEvent(new CustomEvent('hud-layout-changed', { detail: config }));
  }, [config]);

  const toggle = (key: keyof HudLayoutConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const resetAll = () => {
    setConfig({ ...DEFAULT_HUD_LAYOUT });
  };

  const hideAll = () => {
    const newConfig = { ...config };
    HUD_ELEMENTS.forEach(el => { (newConfig as any)[el.key] = false; });
    setConfig(newConfig);
  };

  const showAll = () => {
    const newConfig = { ...config };
    HUD_ELEMENTS.forEach(el => { (newConfig as any)[el.key] = true; });
    setConfig(newConfig);
  };

  const visibleCount = HUD_ELEMENTS.filter(el => (config as any)[el.key]).length;
  const totalCount = HUD_ELEMENTS.length;

  return (
    <div data-testid="hud-layout-view" className="max-w-2xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Display Layout</h1>
        <p className="text-zinc-500 text-sm mt-1">Customize which elements appear on your navigation view</p>
      </div>

      {/* Stats + Actions Row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl px-3 py-1.5">
            <span className="text-[#D4AF37] font-bold text-sm">{visibleCount}/{totalCount}</span>
            <span className="text-zinc-500 text-xs ml-1">visible</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="hud-show-all-btn"
            onClick={showAll}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#D4AF37] hover:text-white bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-lg transition-colors"
          >
            Show All
          </button>
          <button
            data-testid="hud-hide-all-btn"
            onClick={hideAll}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors"
          >
            Hide All
          </button>
          <button
            data-testid="hud-reset-btn"
            onClick={resetAll}
            className="p-1.5 text-zinc-500 hover:text-[#D4AF37] bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors"
            title="Reset to defaults"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Trip Panel Position Toggle */}
      <div className="mb-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#D4AF37]/10">
              <ArrowLeftRight className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <div className="text-white font-bold text-sm">Trip Panel Position</div>
              <div className="text-zinc-500 text-xs">Place Fuel Cost &amp; HOS panels on left or right</div>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
            <button
              data-testid="trip-panel-left-btn"
              onClick={() => setConfig(prev => ({ ...prev, tripPanelPosition: 'left' }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${
                config.tripPanelPosition === 'left'
                  ? 'bg-[#D4AF37] text-black'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              Left
            </button>
            <button
              data-testid="trip-panel-right-btn"
              onClick={() => setConfig(prev => ({ ...prev, tripPanelPosition: 'right' }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${
                config.tripPanelPosition === 'right'
                  ? 'bg-[#D4AF37] text-black'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              Right
            </button>
          </div>
        </div>
      </div>

      {/* Element Categories */}
      {CATEGORIES.map(category => {
        const items = HUD_ELEMENTS.filter(el => el.category === category);
        return (
          <div key={category} className="mb-6">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37] mb-3 px-1">{category}</h2>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800/50">
              {items.map(element => {
                const isVisible = (config as any)[element.key] as boolean;
                const Icon = element.icon;
                return (
                  <button
                    key={element.key}
                    data-testid={`hud-toggle-${element.key}`}
                    onClick={() => toggle(element.key)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors group"
                  >
                    <div className={`p-2 rounded-xl transition-colors ${isVisible ? 'bg-[#D4AF37]/10' : 'bg-zinc-800/50'}`}>
                      <Icon className={`w-4 h-4 transition-colors ${isVisible ? 'text-[#D4AF37]' : 'text-zinc-600'}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className={`font-bold text-sm transition-colors ${isVisible ? 'text-white' : 'text-zinc-500'}`}>
                        {element.label}
                      </div>
                      <div className="text-zinc-600 text-xs">{element.description}</div>
                    </div>
                    <div className={`p-1.5 rounded-lg transition-all ${isVisible ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-zinc-800/50 text-zinc-600'}`}>
                      {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Footer note */}
      <div className="text-center text-zinc-600 text-xs mt-8 pb-8">
        Changes apply instantly to the navigation view
      </div>
    </div>
  );
}
