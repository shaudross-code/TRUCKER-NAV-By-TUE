import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Eye, EyeOff, RotateCcw, Navigation, Gauge, MapPin,
  Fuel, Clock, Layers, CloudSun, AlertTriangle, Shield,
  ArrowRightLeft, Milestone, Construction, Route, GitCompare,
  Map as MapIcon, ArrowLeftRight, GripVertical, Monitor, Move, Lock, Unlock
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { HudLayoutConfig } from '../types';
import {
  DEFAULT_HUD_LAYOUT,
  DEFAULT_ORDER,
  DEFAULT_POSITIONS,
  loadHudLayout,
  saveHudLayout,
  loadHudOrder,
  saveHudOrder,
  loadHudPositions,
  saveHudPositions,
  type HudElementOrder,
  type HudPositions,
} from '../utils/hudLayout';

interface HudElement {
  key: keyof HudLayoutConfig;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
  category: string;
}

const HUD_ELEMENTS_MAP: Record<string, HudElement> = {
  showNavigationHUD: { key: 'showNavigationHUD', label: 'Turn Instructions', shortLabel: 'Turn', description: 'Top header showing next turn direction and distance', icon: Navigation, category: 'Navigation' },
  showLaneGuidance: { key: 'showLaneGuidance', label: 'Lane Guidance', shortLabel: 'Lanes', description: 'Lane arrows in the turn instruction header', icon: ArrowRightLeft, category: 'Navigation' },
  showSpeedOverlay: { key: 'showSpeedOverlay', label: 'Speed Display', shortLabel: 'Speed', description: 'Current speed indicator on the map', icon: Gauge, category: 'Navigation' },
  showArrivalHUD: { key: 'showArrivalHUD', label: 'Arrival Bar', shortLabel: 'ETA', description: 'Bottom bar with distance, time remaining, and ETA', icon: MapPin, category: 'Navigation' },
  showManeuverPreview: { key: 'showManeuverPreview', label: 'Maneuver Preview', shortLabel: 'Preview', description: 'Mini-map preview of upcoming interchanges', icon: Route, category: 'Navigation' },
  showFuelCost: { key: 'showFuelCost', label: 'Fuel Cost', shortLabel: 'Fuel', description: 'Estimated fuel cost panel during navigation', icon: Fuel, category: 'Panels' },
  showHosStatus: { key: 'showHosStatus', label: 'HOS Status', shortLabel: 'HOS', description: 'Hours of Service driving time panel', icon: Clock, category: 'Panels' },
  showMapControls: { key: 'showMapControls', label: 'Map Controls', shortLabel: 'Controls', description: 'Zoom, 2D/3D, follow, and compass buttons', icon: Layers, category: 'Panels' },
  showRouteComparison: { key: 'showRouteComparison', label: 'Route Comparison', shortLabel: 'Routes', description: 'Alternative routes comparison panel', icon: GitCompare, category: 'Panels' },
  showWeatherOverlay: { key: 'showWeatherOverlay', label: 'Weather Overlay', shortLabel: 'Weather', description: 'Current weather conditions on the map', icon: CloudSun, category: 'Panels' },
  showHighwayShields: { key: 'showHighwayShields', label: 'Highway Shields', shortLabel: 'Shields', description: 'Interstate, US Route, and State highway emblems', icon: Shield, category: 'Signs' },
  showSpeedLimitSigns: { key: 'showSpeedLimitSigns', label: 'Speed Limit Signs', shortLabel: 'Limits', description: 'MUTCD speed limit signs along the route', icon: Milestone, category: 'Signs' },
  showExitSigns: { key: 'showExitSigns', label: 'Exit Signs', shortLabel: 'Exits', description: 'Green highway exit guide signs', icon: MapIcon, category: 'Signs' },
  showCurveWarnings: { key: 'showCurveWarnings', label: 'Curve Warnings', shortLabel: 'Curves', description: 'Yellow diamond curve warning signs', icon: AlertTriangle, category: 'Signs' },
  showCmvWarnings: { key: 'showCmvWarnings', label: 'CMV Warnings', shortLabel: 'CMV', description: 'Steep grade, rollover risk, winding road signs', icon: Construction, category: 'Signs' },
  showTruckRestrictions: { key: 'showTruckRestrictions', label: 'Truck Restrictions', shortLabel: 'Restrict', description: 'Low clearance, weight limit, no-truck alerts', icon: AlertTriangle, category: 'Signs' },
  showTrafficIncidents: { key: 'showTrafficIncidents', label: 'Traffic Incidents', shortLabel: 'Traffic', description: 'Real-time accident, closure, construction markers', icon: AlertTriangle, category: 'Signs' },
  showWaypointMarkers: { key: 'showWaypointMarkers', label: 'Waypoint Numbers', shortLabel: 'Waypts', description: 'Numbered markers (1, 2, 3) at each stop', icon: MapPin, category: 'Signs' },
};

const CATEGORIES = ['Navigation', 'Panels', 'Signs'];

/* ─── Draggable Preview Element ─── */
function DraggablePreviewItem({
  id,
  positions,
  setPositions,
  editMode,
  children,
  containerRef,
  className,
}: {
  id: string;
  positions: HudPositions;
  setPositions: React.Dispatch<React.SetStateAction<HudPositions>>;
  editMode: boolean;
  children: React.ReactNode;
  containerRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  const pos = positions[id] || { x: 50, y: 50 };
  const isDraggingRef = useRef(false);
  const startRef = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    startRef.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [editMode, pos.x, pos.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - startRef.current.mx) / rect.width) * 100;
    const dy = ((e.clientY - startRef.current.my) / rect.height) * 100;
    const nx = Math.max(0, Math.min(100, startRef.current.px + dx));
    const ny = Math.max(0, Math.min(100, startRef.current.py + dy));
    setPositions(prev => ({ ...prev, [id]: { x: nx, y: ny } }));
  }, [id, containerRef, setPositions]);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  return (
    <div
      data-testid={`preview-drag-${id}`}
      className={`absolute touch-none ${editMode ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'} ${className || ''}`}
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {editMode && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#D4AF37] rounded-full z-20 flex items-center justify-center">
          <Move className="w-1.5 h-1.5 text-black" />
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Live Preview ─── */
function NavPreview({
  config,
  positions,
  setPositions,
  editMode,
  setEditMode,
  onResetPositions,
}: {
  config: HudLayoutConfig;
  positions: HudPositions;
  setPositions: React.Dispatch<React.SetStateAction<HudPositions>>;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  onResetPositions: () => void;
}) {
  const c = config;
  const containerRef = useRef<HTMLDivElement>(null);
  const dp = { positions, setPositions, editMode, containerRef };

  return (
    <div data-testid="hud-preview" className="mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Monitor className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span className="text-[#D4AF37] text-xs font-black uppercase tracking-[0.15em]">Live Preview</span>
        </div>
        <div className="flex items-center gap-2">
          {editMode && (
            <button
              data-testid="preview-reset-positions-btn"
              onClick={onResetPositions}
              className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors"
            >
              Reset Pos
            </button>
          )}
          <button
            data-testid="preview-edit-toggle-btn"
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-colors ${
              editMode
                ? 'text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/30'
                : 'text-zinc-500 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 border-zinc-800'
            }`}
          >
            {editMode ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {editMode ? 'Editing' : 'Edit Layout'}
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className={`relative w-full aspect-[16/9] bg-[#0a0a0a] border rounded-2xl overflow-hidden select-none transition-colors ${
          editMode ? 'border-[#D4AF37]/40 shadow-[0_0_20px_rgba(212,175,55,0.1)]' : 'border-zinc-800'
        }`}
      >
        {/* Map tile background */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 40% 50%, #111 0%, #0a0a0a 60%, #050505 100%)' }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="opacity-[0.08]">
            <defs>
              <pattern id="mapgrid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#D4AF37" strokeWidth="0.3"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#mapgrid)" />
          </svg>
        </div>
        {/* Route polyline */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 480 270" preserveAspectRatio="none">
          <path d="M 40 230 C 80 180 140 160 200 155 S 320 100 420 50" fill="none" stroke="#D4AF37" strokeWidth="4" strokeLinecap="round" opacity="0.35"/>
          <path d="M 40 230 C 80 180 140 160 200 155 S 320 100 420 50" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" opacity="0.7" strokeDasharray="6 4"/>
        </svg>
        {/* User location dot */}
        <div className="absolute top-[58%] left-[25%] z-[8]">
          <div className="w-3 h-3 rounded-full bg-[#4285F4] border-[1.5px] border-white shadow-[0_0_12px_rgba(66,133,244,0.6)]" />
          <div className="absolute -inset-2 rounded-full bg-[#4285F4]/15 animate-ping" />
        </div>

        {editMode && (
          <div className="absolute inset-0 z-[1] pointer-events-none flex items-center justify-center">
            <span className="text-[#D4AF37]/15 text-[10px] font-black uppercase tracking-[0.3em]">Drag elements to reposition</span>
          </div>
        )}

        {/* ══════ Navigation HUD (matches NavigationHUD.tsx) ══════ */}
        {c.showNavigationHUD && (
          <DraggablePreviewItem id="navigationHUD" {...dp}>
            <div className="bg-zinc-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-zinc-700/40 overflow-hidden" style={{ width: '180px' }}>
              <div className="flex items-stretch">
                {/* Direction icon column */}
                <div className="flex items-center justify-center px-2.5 py-2 bg-zinc-800/50">
                  <div className="flex flex-col items-center gap-0.5">
                    <ArrowRightLeft className="w-5 h-5 text-white drop-shadow-md" style={{ transform: 'rotate(-45deg)' }} />
                    <span className="text-[7px] font-black text-white">0.3 mi</span>
                  </div>
                </div>
                {/* Instruction content */}
                <div className="flex-1 py-2 px-2.5 min-w-0">
                  <div className="text-white font-bold text-[8px] leading-tight truncate">
                    Turn Right on <span className="text-[#D4AF37]">I-95 N</span>
                  </div>
                  <div className="text-zinc-400 text-[6px] mt-0.5 truncate">toward Philadelphia</div>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <span className="text-[5px] text-zinc-500 font-mono">65 mph</span>
                  </div>
                </div>
              </div>
              {/* Lane guidance ribbon */}
              {c.showLaneGuidance && (
                <div className="border-t border-zinc-700/30 px-2 py-1 bg-zinc-800/30">
                  <div className="flex justify-center gap-0">
                    {[false, false, true, true, false].map((active, i) => (
                      <div key={i} className={`flex items-center justify-center py-0.5 flex-1 max-w-[14px] ${active ? 'bg-[#4285F4]/20' : 'bg-white/[0.02]'} ${i === 0 ? 'rounded-l' : ''} ${i === 4 ? 'rounded-r' : ''}`}
                        style={{ borderLeft: i > 0 ? '1px dashed rgba(255,255,255,0.08)' : 'none' }}>
                        {active ? (
                          <div className="w-1.5 h-1.5 bg-[#4285F4] rounded-full shadow-[0_0_4px_rgba(66,133,244,0.5)]" />
                        ) : (
                          <div className="w-0.5 h-0.5 bg-white/10 rounded-full" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DraggablePreviewItem>
        )}

        {/* ══════ Speed Limit Sign (matches SpeedLimitMarker) ══════ */}
        {c.showSpeedOverlay && (
          <DraggablePreviewItem id="speedOverlay" {...dp}>
            <div className="flex flex-col items-center">
              {/* MUTCD Speed Limit Sign */}
              <div className="bg-white border-[2px] border-black rounded-sm p-0.5 w-10 flex flex-col items-center">
                <span className="text-[4px] font-black text-black leading-none tracking-tight">SPEED</span>
                <span className="text-[4px] font-black text-black leading-none tracking-tight">LIMIT</span>
                <span className="text-[12px] font-black text-black leading-none mt-0.5">65</span>
              </div>
            </div>
          </DraggablePreviewItem>
        )}

        {/* ══════ Maneuver Preview (matches ManeuverPreview) ══════ */}
        {c.showManeuverPreview && (
          <DraggablePreviewItem id="maneuverPreview" {...dp}>
            <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/40 rounded-xl shadow-2xl overflow-hidden" style={{ width: '60px', height: '60px' }}>
              <div className="w-full h-full bg-zinc-950 relative">
                <svg viewBox="0 0 60 60" className="w-full h-full">
                  <path d="M 30 52 L 30 22 Q 30 12 42 12 L 55 12" fill="none" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round"/>
                  <path d="M 10 52 L 10 22 Q 10 12 20 12" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2"/>
                  <circle cx="30" cy="35" r="3" fill="#4285F4" stroke="white" strokeWidth="1"/>
                  <polygon points="42,8 48,12 42,16" fill="#D4AF37"/>
                </svg>
                <div className="absolute top-1 left-1 text-[5px] font-black text-zinc-500 uppercase">Preview</div>
              </div>
            </div>
          </DraggablePreviewItem>
        )}

        {/* ══════ Weather + Restrictions (matches NavigationView overlay) ══════ */}
        {(c.showWeatherOverlay || c.showTruckRestrictions) && (
          <DraggablePreviewItem id="weatherPanel" {...dp}>
            <div className="flex flex-col gap-1">
              {c.showTruckRestrictions && (
                <div className="bg-black/90 backdrop-blur-2xl border border-orange-500/30 rounded-lg px-2 py-1">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5 text-orange-500" />
                    <div>
                      <div className="text-[5px] font-black text-orange-400 uppercase">Low Bridge</div>
                      <div className="text-[4px] text-orange-400/60">12'6" Clearance</div>
                    </div>
                  </div>
                </div>
              )}
              {c.showWeatherOverlay && (
                <div className="bg-black/90 backdrop-blur-2xl border border-[#D4AF37]/20 rounded-lg px-2 py-1">
                  <div className="flex items-center gap-1.5">
                    <CloudSun className="w-3 h-3 text-[#D4AF37]" />
                    <div>
                      <div className="text-[8px] font-black text-white">72°F</div>
                      <div className="text-[5px] text-zinc-500 font-bold">Clear</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DraggablePreviewItem>
        )}

        {/* ══════ Route Comparison (matches route comparison panel) ══════ */}
        {c.showRouteComparison && (
          <DraggablePreviewItem id="routeComparison" {...dp}>
            <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/40 rounded-xl shadow-2xl overflow-hidden" style={{ width: '140px' }}>
              <div className="px-2 py-1.5 border-b border-zinc-800/50">
                <div className="flex items-center gap-1">
                  <GitCompare className="w-2.5 h-2.5 text-[#D4AF37]" />
                  <span className="text-[6px] font-black text-zinc-500 uppercase tracking-wider">Routes</span>
                </div>
              </div>
              <div className="p-1.5 flex flex-col gap-1">
                <div className="flex items-center justify-between bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-lg px-2 py-1">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                    <span className="text-[6px] font-black text-white">I-95 N</span>
                  </div>
                  <span className="text-[7px] font-black text-[#D4AF37]">2h 15m</span>
                </div>
                <div className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-2 py-1">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                    <span className="text-[6px] font-black text-zinc-400">US-1 N</span>
                  </div>
                  <span className="text-[7px] font-black text-zinc-500">2h 40m</span>
                </div>
              </div>
            </div>
          </DraggablePreviewItem>
        )}

        {/* ══════ Trip Panel: Fuel + HOS (matches FuelCostCalculator + DriverFatigueAlert) ══════ */}
        {(c.showFuelCost || c.showHosStatus) && (
          <DraggablePreviewItem id="tripPanel" {...dp}>
            <div className="flex flex-col gap-1" style={{ width: '90px' }}>
              {c.showFuelCost && (
                <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <Fuel className="w-3 h-3 text-[#D4AF37]" />
                      <span className="text-[6px] font-black text-white uppercase">Fuel Est</span>
                    </div>
                  </div>
                  <div className="px-2 pb-1.5 flex gap-1">
                    <div className="bg-zinc-800/60 rounded px-1 py-0.5 text-center flex-1">
                      <div className="text-[4px] text-zinc-500 font-bold">GAL</div>
                      <div className="text-[7px] font-black text-white">24.3</div>
                    </div>
                    <div className="bg-zinc-800/60 rounded px-1 py-0.5 text-center flex-1">
                      <div className="text-[4px] text-zinc-500 font-bold">COST</div>
                      <div className="text-[7px] font-black text-[#D4AF37]">$89</div>
                    </div>
                  </div>
                </div>
              )}
              {c.showHosStatus && (
                <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span className="text-[6px] font-black text-white uppercase">HOS</span>
                    </div>
                    <span className="text-[5px] px-1 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">OK</span>
                  </div>
                  <div className="px-2 pb-1.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[5px] text-zinc-500 font-bold">Drive Time</span>
                      <span className="text-[6px] font-black text-emerald-400">6h 22m</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '58%' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DraggablePreviewItem>
        )}

        {/* ══════ Map Controls (matches MapControls.tsx capsule) ══════ */}
        {c.showMapControls && (
          <DraggablePreviewItem id="mapControls" {...dp}>
            <div className="bg-black border border-[#D4AF37]/30 rounded-2xl p-1 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col gap-1">
              <div className="p-1 rounded-lg bg-white/5 text-zinc-500 flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
              </div>
              <div className="p-1 rounded-lg bg-white/5 text-zinc-500 flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <div className="h-px bg-zinc-800 mx-0.5" />
              <div className="p-1 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center">
                <Layers className="w-2.5 h-2.5" />
              </div>
              <div className="p-1 rounded-lg bg-white/5 text-zinc-500 flex items-center justify-center">
                <Navigation className="w-2.5 h-2.5" />
              </div>
            </div>
          </DraggablePreviewItem>
        )}

        {/* ══════ Arrival HUD (matches NavigationView bottom bar) ══════ */}
        {c.showArrivalHUD && (
          <DraggablePreviewItem id="arrivalHUD" {...dp}>
            <div className="bg-black/95 backdrop-blur-xl border border-[#D4AF37]/20 rounded-xl shadow-[0_-8px_40px_rgba(0,0,0,0.9),0_0_20px_rgba(212,175,55,0.08)]" style={{ width: '260px' }}>
              {/* Region bar */}
              <div className="flex items-center justify-between px-2 py-0.5 border-b border-white/5">
                <div className="flex items-center gap-1">
                  <MapPin className="w-2 h-2 text-[#D4AF37]" />
                  <span className="text-[6px] font-black text-white uppercase tracking-wider">I-95 N</span>
                  <div className="bg-blue-700 border border-white rounded-[1px] px-0.5">
                    <span className="text-[4px] font-black text-white">I-95</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[5px] font-black text-[#D4AF37]/80 uppercase tracking-wider">PA</span>
                  <div className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]" />
                </div>
              </div>
              {/* Stats row */}
              <div className="flex items-center p-1.5 gap-1">
                {/* Exit + Reroute buttons */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <div className="p-1 rounded-lg bg-zinc-900/80 border border-zinc-800">
                    <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </div>
                  <div className="p-1 rounded-lg bg-zinc-900/80 border border-zinc-800">
                    <RotateCcw className="w-[7px] h-[7px] text-zinc-500" />
                  </div>
                </div>
                <div className="h-5 w-px bg-zinc-800 shrink-0" />
                {/* Speed */}
                <div className="flex flex-col items-center shrink-0 min-w-[28px]">
                  <span className="text-[4px] font-bold text-zinc-600 uppercase tracking-wider">Speed</span>
                  <span className="text-[10px] font-[900] text-white leading-none tabular-nums">67</span>
                  <span className="text-[4px] text-zinc-600 font-bold">mph</span>
                </div>
                <div className="h-4 w-px bg-zinc-800/60 shrink-0" />
                {/* Distance */}
                <div className="flex flex-col items-center shrink-0 min-w-[28px]">
                  <span className="text-[4px] font-bold text-zinc-600 uppercase tracking-wider">Dist</span>
                  <span className="text-[10px] font-[900] text-[#D4AF37] leading-none tabular-nums">142</span>
                  <span className="text-[4px] text-zinc-600 font-bold">mi</span>
                </div>
                <div className="h-4 w-px bg-zinc-800/60 shrink-0" />
                {/* Time */}
                <div className="flex flex-col items-center shrink-0 min-w-[28px]">
                  <span className="text-[4px] font-bold text-zinc-600 uppercase tracking-wider">Time</span>
                  <span className="text-[10px] font-[900] text-[#D4AF37] leading-none tabular-nums">2h 15m</span>
                </div>
                <div className="h-4 w-px bg-zinc-800/60 shrink-0" />
                {/* ETA */}
                <div className="flex flex-col items-center shrink-0 min-w-[30px]">
                  <span className="text-[4px] font-bold text-zinc-600 uppercase tracking-wider">ETA</span>
                  <div className="flex items-center gap-0.5">
                    <div className="w-1 h-1 rounded-full bg-[#D4AF37] animate-pulse shadow-[0_0_4px_#D4AF37]" />
                    <span className="text-[10px] font-[900] text-white leading-none">3:45</span>
                  </div>
                  <span className="text-[4px] font-bold text-emerald-500/70 uppercase tracking-wider">LIVE</span>
                </div>
              </div>
            </div>
          </DraggablePreviewItem>
        )}

        {/* ══════ Map Signs (static, on route — not draggable) ══════ */}
        <div className="absolute inset-0 z-[5] pointer-events-none">
          {c.showHighwayShields && (
            <div className="absolute top-[22%] left-[52%]">
              <div className="relative">
                <svg width="22" height="18" viewBox="0 0 44 36">
                  <path d="M22 0 L44 12 L38 36 L6 36 L0 12 Z" fill="#003F87" stroke="white" strokeWidth="2"/>
                  <text x="22" y="16" textAnchor="middle" fill="white" fontSize="7" fontWeight="900">INTERSTATE</text>
                  <text x="22" y="30" textAnchor="middle" fill="white" fontSize="14" fontWeight="900">95</text>
                </svg>
              </div>
            </div>
          )}
          {c.showSpeedLimitSigns && (
            <div className="absolute top-[42%] left-[40%]">
              <div className="bg-white border-2 border-black rounded-[1px] px-0.5 py-0.5 flex flex-col items-center w-[14px]">
                <span className="text-[3px] font-black text-black leading-none">SPEED</span>
                <span className="text-[3px] font-black text-black leading-none">LIMIT</span>
                <span className="text-[8px] font-black text-black leading-none mt-0.5">65</span>
              </div>
            </div>
          )}
          {c.showExitSigns && (
            <div className="absolute top-[18%] right-[22%]">
              <div className="bg-[#006B3F] border border-white/60 rounded-[1px] px-1 py-0.5 flex items-center gap-1">
                <div className="bg-[#006B3F] border border-white/80 rounded-[1px] px-0.5">
                  <span className="text-[4px] font-black text-white">EXIT</span>
                </div>
                <span className="text-[5px] font-black text-white">42 - Market St</span>
              </div>
            </div>
          )}
          {c.showCurveWarnings && (
            <div className="absolute top-[53%] left-[58%]">
              <div className="w-[14px] h-[14px] bg-[#FFCC00] rotate-45 flex items-center justify-center border border-black/40">
                <svg className="-rotate-45" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><path d="M12 4c-4 0-7 3-7 7s7 9 7 9"/></svg>
              </div>
            </div>
          )}
          {c.showCmvWarnings && (
            <div className="absolute top-[65%] left-[33%]">
              <div className="w-[14px] h-[14px] bg-[#FFCC00] rotate-45 flex items-center justify-center border-2 border-red-600/70">
                <span className="text-[5px] font-black text-black -rotate-45">6%</span>
              </div>
            </div>
          )}
          {c.showTrafficIncidents && (
            <div className="absolute top-[33%] right-[38%]">
              <div className="bg-red-600 rounded-full w-[14px] h-[14px] flex items-center justify-center border border-white/60 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                <AlertTriangle className="w-2 h-2 text-white" />
              </div>
            </div>
          )}
          {c.showWaypointMarkers && (
            <>
              <div className="absolute top-[72%] left-[13%] bg-[#D4AF37] rounded-full w-[16px] h-[16px] flex items-center justify-center border-2 border-black shadow-lg">
                <span className="text-[7px] font-black text-black">1</span>
              </div>
              <div className="absolute top-[12%] right-[10%] bg-[#D4AF37] rounded-full w-[16px] h-[16px] flex items-center justify-center border-2 border-black shadow-lg">
                <span className="text-[7px] font-black text-black">2</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Sortable Row ─── */
function SortableRow({
  id,
  element,
  isVisible,
  onToggle,
}: {
  id: string;
  element: HudElement;
  isVisible: boolean;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative',
  };

  const Icon = element.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`hud-toggle-${element.key}`}
      className={`flex items-center gap-2 px-4 py-3 transition-colors group border-b border-zinc-800/50 last:border-b-0 ${
        isDragging ? 'bg-zinc-800 shadow-lg shadow-black/40 rounded-xl' : 'hover:bg-zinc-800/40'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        data-testid={`hud-drag-${element.key}`}
        className="p-1 rounded-lg text-zinc-600 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 cursor-grab active:cursor-grabbing touch-none transition-colors"
        aria-label={`Reorder ${element.label}`}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <button onClick={onToggle} className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`p-2 rounded-xl transition-colors flex-shrink-0 ${isVisible ? 'bg-[#D4AF37]/10' : 'bg-zinc-800/50'}`}>
          <Icon className={`w-4 h-4 transition-colors ${isVisible ? 'text-[#D4AF37]' : 'text-zinc-600'}`} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className={`font-bold text-sm transition-colors ${isVisible ? 'text-white' : 'text-zinc-500'}`}>
            {element.label}
          </div>
          <div className="text-zinc-600 text-xs truncate">{element.description}</div>
        </div>
      </button>
      <button
        onClick={onToggle}
        className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${isVisible ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-zinc-800/50 text-zinc-600'}`}
      >
        {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
    </div>
  );
}

/* ─── Category Section ─── */
function SortableCategory({
  category,
  keys,
  config,
  onToggle,
  onReorder,
}: {
  category: string;
  keys: string[];
  config: HudLayoutConfig;
  onToggle: (key: keyof HudLayoutConfig) => void;
  onReorder: (category: string, oldIndex: number, newIndex: number) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = keys.indexOf(active.id as string);
        const newIndex = keys.indexOf(over.id as string);
        if (oldIndex !== -1 && newIndex !== -1) {
          onReorder(category, oldIndex, newIndex);
        }
      }
    },
    [keys, category, onReorder]
  );

  return (
    <div className="mb-6" data-testid={`hud-category-${category.toLowerCase()}`}>
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37] mb-3 px-1">{category}</h2>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={keys} strategy={verticalListSortingStrategy}>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
            {keys.map((key) => {
              const element = HUD_ELEMENTS_MAP[key];
              if (!element) return null;
              const isVisible = (config as any)[key] as boolean;
              return (
                <SortableRow
                  key={key}
                  id={key}
                  element={element}
                  isVisible={isVisible}
                  onToggle={() => onToggle(key as keyof HudLayoutConfig)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

/* ─── Main View ─── */
export default function HudLayoutView() {
  const [config, setConfig] = useState<HudLayoutConfig>(loadHudLayout);
  const [order, setOrder] = useState<HudElementOrder>(loadHudOrder);
  const [positions, setPositions] = useState<HudPositions>(loadHudPositions);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    saveHudLayout(config);
    window.dispatchEvent(new CustomEvent('hud-layout-changed', { detail: config }));
  }, [config]);

  useEffect(() => { saveHudOrder(order); }, [order]);

  useEffect(() => {
    saveHudPositions(positions);
    window.dispatchEvent(new CustomEvent('hud-positions-changed', { detail: positions }));
  }, [positions]);

  const toggle = (key: keyof HudLayoutConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const resetAll = () => {
    setConfig({ ...DEFAULT_HUD_LAYOUT });
    setOrder({ ...DEFAULT_ORDER });
    setPositions({ ...DEFAULT_POSITIONS });
  };

  const resetPositions = () => {
    setPositions({ ...DEFAULT_POSITIONS });
  };

  const hideAll = () => {
    const newConfig = { ...config };
    Object.keys(HUD_ELEMENTS_MAP).forEach(k => { (newConfig as any)[k] = false; });
    setConfig(newConfig);
  };

  const showAll = () => {
    const newConfig = { ...config };
    Object.keys(HUD_ELEMENTS_MAP).forEach(k => { (newConfig as any)[k] = true; });
    setConfig(newConfig);
  };

  const handleReorder = useCallback((category: string, oldIndex: number, newIndex: number) => {
    setOrder(prev => ({
      ...prev,
      [category]: arrayMove(prev[category], oldIndex, newIndex),
    }));
  }, []);

  const visibleCount = Object.keys(HUD_ELEMENTS_MAP).filter(k => (config as any)[k]).length;
  const totalCount = Object.keys(HUD_ELEMENTS_MAP).length;

  return (
    <div data-testid="hud-layout-view" className="max-w-2xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Display Layout</h1>
        <p className="text-zinc-500 text-sm mt-1">Toggle visibility, drag to reorder, or reposition on the preview</p>
      </div>

      {/* Live Preview with Drag */}
      <NavPreview
        config={config}
        positions={positions}
        setPositions={setPositions}
        editMode={editMode}
        setEditMode={setEditMode}
        onResetPositions={resetPositions}
      />

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

      {/* Drag hint */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <GripVertical className="w-3.5 h-3.5 text-zinc-600" />
        <span className="text-zinc-600 text-xs">Drag the grip handle to reorder elements within each section</span>
      </div>

      {/* Sortable Categories */}
      {CATEGORIES.map(category => (
        <SortableCategory
          key={category}
          category={category}
          keys={order[category] || DEFAULT_ORDER[category]}
          config={config}
          onToggle={toggle}
          onReorder={handleReorder}
        />
      ))}

      <div className="text-center text-zinc-600 text-xs mt-8 pb-8">
        Changes apply instantly to the navigation view
      </div>
    </div>
  );
}
