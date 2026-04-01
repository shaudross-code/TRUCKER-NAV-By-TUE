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
        className={`relative w-full aspect-[16/9] bg-zinc-950 border rounded-2xl overflow-hidden select-none transition-colors ${
          editMode ? 'border-[#D4AF37]/40 shadow-[0_0_20px_rgba(212,175,55,0.1)]' : 'border-zinc-800'
        }`}
      >
        {/* Grid background */}
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#333" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        {/* Fake route line */}
        <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 400 225" preserveAspectRatio="none">
          <path d="M 50 200 Q 120 120 200 130 T 350 40" fill="none" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" strokeDasharray="8 4"/>
        </svg>
        {/* User location */}
        <div className="absolute top-[60%] left-[28%] z-[8]">
          <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-lg shadow-blue-500/50" />
        </div>

        {/* Edit mode overlay hint */}
        {editMode && (
          <div className="absolute inset-0 z-[1] pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#D4AF37]/20 text-[10px] font-black uppercase tracking-[0.3em]">
              Drag elements to reposition
            </div>
          </div>
        )}

        {/* ── Navigation HUD ── */}
        {c.showNavigationHUD && (
          <DraggablePreviewItem id="navigationHUD" {...dp}>
            <div className="bg-black/80 border border-zinc-700 rounded-lg px-3 py-1.5 flex items-center gap-2 whitespace-nowrap">
              <Navigation className="w-3 h-3 text-[#D4AF37] flex-shrink-0" />
              <div>
                <div className="text-[7px] font-black text-white uppercase">Turn Right on I-95 N</div>
                {c.showLaneGuidance && (
                  <div className="flex gap-0.5 mt-0.5">
                    <div className="w-2 h-3 bg-zinc-700 rounded-[1px]" />
                    <div className="w-2 h-3 bg-zinc-700 rounded-[1px]" />
                    <div className="w-2 h-3 bg-[#D4AF37] rounded-[1px]" />
                  </div>
                )}
              </div>
              <span className="text-[8px] font-black text-[#D4AF37] ml-1">0.3 mi</span>
            </div>
          </DraggablePreviewItem>
        )}

        {/* ── Speed Overlay ── */}
        {c.showSpeedOverlay && (
          <DraggablePreviewItem id="speedOverlay" {...dp}>
            <div className="bg-black/80 border border-zinc-700 rounded-lg w-10 h-10 flex flex-col items-center justify-center">
              <span className="text-[10px] font-black text-white leading-none">67</span>
              <span className="text-[5px] font-bold text-zinc-500 uppercase">mph</span>
            </div>
          </DraggablePreviewItem>
        )}

        {/* ── Maneuver Preview ── */}
        {c.showManeuverPreview && (
          <DraggablePreviewItem id="maneuverPreview" {...dp}>
            <div className="bg-black/80 border border-zinc-700 rounded-lg w-14 h-14 flex items-center justify-center">
              <svg viewBox="0 0 40 40" className="w-10 h-10">
                <path d="M 20 35 L 20 15 Q 20 8 27 8 L 35 8" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="20" cy="20" r="2" fill="#4AF" />
              </svg>
            </div>
          </DraggablePreviewItem>
        )}

        {/* ── Weather + Restrictions Panel ── */}
        {(c.showWeatherOverlay || c.showTruckRestrictions) && (
          <DraggablePreviewItem id="weatherPanel" {...dp}>
            <div className="flex flex-col gap-1">
              {c.showTruckRestrictions && (
                <div className="bg-black/80 border border-orange-500/40 rounded-lg px-1.5 py-1 flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5 text-orange-500" />
                  <span className="text-[5px] font-black text-orange-400 uppercase">Low Bridge</span>
                </div>
              )}
              {c.showWeatherOverlay && (
                <div className="bg-black/80 border border-[#D4AF37]/30 rounded-lg px-1.5 py-1 flex items-center gap-1.5">
                  <CloudSun className="w-2.5 h-2.5 text-[#D4AF37]" />
                  <span className="text-[7px] font-bold text-white">72°</span>
                </div>
              )}
            </div>
          </DraggablePreviewItem>
        )}

        {/* ── Route Comparison ── */}
        {c.showRouteComparison && (
          <DraggablePreviewItem id="routeComparison" {...dp}>
            <div className="bg-black/80 border border-zinc-700 rounded-lg px-2 py-1 flex items-center gap-2 whitespace-nowrap">
              <GitCompare className="w-2.5 h-2.5 text-[#D4AF37]" />
              <div className="flex gap-1.5">
                <span className="text-[5px] font-black text-[#D4AF37] bg-[#D4AF37]/10 px-1 rounded">2h 15m</span>
                <span className="text-[5px] font-black text-zinc-500 bg-zinc-800 px-1 rounded">2h 40m</span>
              </div>
            </div>
          </DraggablePreviewItem>
        )}

        {/* ── Trip Panel (Fuel + HOS) ── */}
        {(c.showFuelCost || c.showHosStatus) && (
          <DraggablePreviewItem id="tripPanel" {...dp}>
            <div className="flex flex-col gap-1">
              {c.showFuelCost && (
                <div className="bg-black/80 border border-zinc-700 rounded-lg px-2 py-1">
                  <div className="flex items-center gap-1">
                    <Fuel className="w-2.5 h-2.5 text-[#D4AF37]" />
                    <span className="text-[6px] font-black text-zinc-500 uppercase">Fuel</span>
                  </div>
                  <span className="text-[8px] font-black text-white">$124.50</span>
                </div>
              )}
              {c.showHosStatus && (
                <div className="bg-black/80 border border-zinc-700 rounded-lg px-2 py-1">
                  <div className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-emerald-400" />
                    <span className="text-[6px] font-black text-zinc-500 uppercase">HOS</span>
                  </div>
                  <span className="text-[8px] font-black text-emerald-400">6h 22m</span>
                </div>
              )}
            </div>
          </DraggablePreviewItem>
        )}

        {/* ── Map Controls ── */}
        {c.showMapControls && (
          <DraggablePreviewItem id="mapControls" {...dp}>
            <div className="flex flex-col gap-0.5">
              <div className="bg-black/80 border border-zinc-700 rounded w-5 h-5 flex items-center justify-center text-[8px] font-black text-white">+</div>
              <div className="bg-black/80 border border-zinc-700 rounded w-5 h-5 flex items-center justify-center text-[8px] font-black text-white">-</div>
              <div className="bg-black/80 border border-zinc-700 rounded w-5 h-5 flex items-center justify-center">
                <Layers className="w-2.5 h-2.5 text-zinc-400" />
              </div>
            </div>
          </DraggablePreviewItem>
        )}

        {/* ── Arrival HUD ── */}
        {c.showArrivalHUD && (
          <DraggablePreviewItem id="arrivalHUD" {...dp}>
            <div className="bg-black/90 border border-zinc-700 rounded-lg px-3 py-1.5 flex items-center gap-3 whitespace-nowrap">
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-black text-[#D4AF37] uppercase">142 mi</span>
                <span className="text-[5px] text-zinc-600">|</span>
                <span className="text-[7px] font-black text-white">2h 15m</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[6px] font-bold text-zinc-500 uppercase">ETA</span>
                <span className="text-[7px] font-black text-[#D4AF37]">3:45 PM</span>
              </div>
            </div>
          </DraggablePreviewItem>
        )}

        {/* ── Map Signs (static, not draggable) ── */}
        <div className="absolute inset-0 z-[5] pointer-events-none">
          {c.showHighwayShields && (
            <div className="absolute top-[25%] left-[55%] bg-blue-700 border border-white rounded-sm px-1 py-0.5">
              <span className="text-[5px] font-black text-white">I-95</span>
            </div>
          )}
          {c.showSpeedLimitSigns && (
            <div className="absolute top-[40%] left-[42%] bg-white border border-black rounded-sm px-0.5 py-0.5 flex flex-col items-center">
              <span className="text-[3px] font-black text-black leading-none">SPEED</span>
              <span className="text-[3px] font-black text-black leading-none">LIMIT</span>
              <span className="text-[7px] font-black text-black leading-tight">65</span>
            </div>
          )}
          {c.showExitSigns && (
            <div className="absolute top-[20%] right-[25%] bg-emerald-700 border border-white/50 rounded-sm px-1 py-0.5">
              <span className="text-[5px] font-black text-white">EXIT 42</span>
            </div>
          )}
          {c.showCurveWarnings && (
            <div className="absolute top-[55%] left-[60%]">
              <div className="w-4 h-4 bg-yellow-400 rotate-45 flex items-center justify-center border border-black/30">
                <span className="text-[5px] font-black text-black -rotate-45">!</span>
              </div>
            </div>
          )}
          {c.showCmvWarnings && (
            <div className="absolute top-[65%] left-[35%]">
              <div className="w-4 h-4 bg-yellow-400 rotate-45 flex items-center justify-center border-2 border-red-600/60">
                <span className="text-[4px] font-black text-black -rotate-45">6%</span>
              </div>
            </div>
          )}
          {c.showTrafficIncidents && (
            <div className="absolute top-[35%] right-[40%] bg-red-600 rounded-full w-3.5 h-3.5 flex items-center justify-center border border-white/50 animate-pulse">
              <AlertTriangle className="w-2 h-2 text-white" />
            </div>
          )}
          {c.showWaypointMarkers && (
            <>
              <div className="absolute top-[75%] left-[15%] bg-[#D4AF37] rounded-full w-4 h-4 flex items-center justify-center border border-black">
                <span className="text-[6px] font-black text-black">1</span>
              </div>
              <div className="absolute top-[15%] right-[12%] bg-[#D4AF37] rounded-full w-4 h-4 flex items-center justify-center border border-black">
                <span className="text-[6px] font-black text-black">2</span>
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
