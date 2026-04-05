import React, { useState, useEffect, useCallback } from 'react';
import {
  Eye, EyeOff, RotateCcw, Navigation, Gauge, MapPin,
  Fuel, Clock, Layers, CloudSun, AlertTriangle, Shield,
  ArrowRightLeft, Milestone, Construction, Route, GitCompare,
  Map as MapIcon, ArrowLeftRight, GripVertical, Compass,
  CircleDot, Maximize2, Minimize2, Siren
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
import NavPreview from './NavPreview';
import type { HudLayoutConfig } from '../types';
import {
  DEFAULT_HUD_LAYOUT,
  DEFAULT_ORDER,
  DEFAULT_POSITIONS,
  DEFAULT_SCALES,
  SCALE_OPTIONS,
  loadHudLayout,
  saveHudLayout,
  loadHudOrder,
  saveHudOrder,
  loadHudPositions,
  saveHudPositions,
  loadHudScales,
  saveHudScales,
  type HudElementOrder,
  type HudPositions,
  type HudScales,
} from '../utils/hudLayout';

interface HudElement {
  key: keyof HudLayoutConfig;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
  category: string;
  scaleKey?: string; // maps to HudScales key (for resizable elements)
}

const HUD_ELEMENTS_MAP: Record<string, HudElement> = {
  showNavigationHUD: { key: 'showNavigationHUD', label: 'Turn Instructions', shortLabel: 'Turn', description: 'Top header showing next turn direction and distance', icon: Navigation, category: 'Navigation', scaleKey: 'navigationHUD' },
  showLaneGuidance: { key: 'showLaneGuidance', label: 'Lane Guidance', shortLabel: 'Lanes', description: 'Lane arrows in the turn instruction header', icon: ArrowRightLeft, category: 'Navigation' },
  showSpeedOverlay: { key: 'showSpeedOverlay', label: 'Speed Display', shortLabel: 'Speed', description: 'Current speed indicator on the map', icon: Gauge, category: 'Navigation', scaleKey: 'speedOverlay' },
  showArrivalHUD: { key: 'showArrivalHUD', label: 'Arrival Bar', shortLabel: 'ETA', description: 'Bottom bar with distance, time remaining, and ETA', icon: MapPin, category: 'Navigation', scaleKey: 'arrivalHUD' },
  showManeuverPreview: { key: 'showManeuverPreview', label: 'Maneuver Preview', shortLabel: 'Preview', description: 'Mini-map preview of upcoming interchanges', icon: Route, category: 'Navigation', scaleKey: 'maneuverPreview' },
  showCompassRose: { key: 'showCompassRose', label: 'Compass Rose', shortLabel: 'Compass', description: 'Compass indicator on the map', icon: Compass, category: 'Navigation', scaleKey: 'compassRose' },
  showNextStop: { key: 'showNextStop', label: 'Next Stop', shortLabel: 'Stop', description: 'Next waypoint/fuel stop above the arrival bar', icon: CircleDot, category: 'Navigation', scaleKey: 'nextStop' },
  showFuelCost: { key: 'showFuelCost', label: 'Fuel Cost', shortLabel: 'Fuel', description: 'Estimated fuel cost panel during navigation', icon: Fuel, category: 'Panels', scaleKey: 'fuelCost' },
  showHosStatus: { key: 'showHosStatus', label: 'HOS Status', shortLabel: 'HOS', description: 'Hours of Service driving time panel', icon: Clock, category: 'Panels', scaleKey: 'hosStatus' },
  showMapControls: { key: 'showMapControls', label: 'Map Controls', shortLabel: 'Controls', description: 'Zoom, 2D/3D, follow, and compass buttons', icon: Layers, category: 'Panels', scaleKey: 'mapControls' },
  showRouteComparison: { key: 'showRouteComparison', label: 'Route Comparison', shortLabel: 'Routes', description: 'Alternative routes comparison panel', icon: GitCompare, category: 'Panels', scaleKey: 'routeComparison' },
  showWeatherOverlay: { key: 'showWeatherOverlay', label: 'Weather Overlay', shortLabel: 'Weather', description: 'Current weather conditions on the map', icon: CloudSun, category: 'Panels', scaleKey: 'weatherPanel' },
  showAlongRoute: { key: 'showAlongRoute', label: 'POI', shortLabel: 'POI', description: 'Nearby points of interest along your route (fuel, parking, food)', icon: MapPin, category: 'Panels' },
  showHighwayShields: { key: 'showHighwayShields', label: 'Highway Shields', shortLabel: 'Shields', description: 'Interstate, US Route, and State highway emblems', icon: Shield, category: 'Signs' },
  showSpeedLimitSigns: { key: 'showSpeedLimitSigns', label: 'Speed Limit Signs', shortLabel: 'Limits', description: 'MUTCD speed limit signs along the route', icon: Milestone, category: 'Signs' },
  showExitSigns: { key: 'showExitSigns', label: 'Exit Signs', shortLabel: 'Exits', description: 'Green highway exit guide signs', icon: MapIcon, category: 'Signs' },
  showCurveWarnings: { key: 'showCurveWarnings', label: 'Curve Warnings', shortLabel: 'Curves', description: 'Yellow diamond curve warning signs', icon: AlertTriangle, category: 'Signs' },
  showCmvWarnings: { key: 'showCmvWarnings', label: 'CMV Warnings', shortLabel: 'CMV', description: 'Steep grade, rollover risk, winding road signs', icon: Construction, category: 'Signs' },
  showTruckRestrictions: { key: 'showTruckRestrictions', label: 'Truck Restrictions', shortLabel: 'Restrict', description: 'Low clearance, weight limit, no-truck alerts', icon: AlertTriangle, category: 'Signs' },
  showTrafficIncidents: { key: 'showTrafficIncidents', label: 'Traffic Incidents', shortLabel: 'Traffic', description: 'Real-time accident, closure, construction markers', icon: AlertTriangle, category: 'Signs' },
  showWaypointMarkers: { key: 'showWaypointMarkers', label: 'Waypoint Numbers', shortLabel: 'Waypts', description: 'Numbered markers (1, 2, 3) at each stop', icon: MapPin, category: 'Signs' },
  showSpeedWarning: { key: 'showSpeedWarning', label: 'Speed Warning', shortLabel: 'Warn', description: 'Flash red + audio alert when exceeding speed limit', icon: Siren, category: 'Navigation' },
};

const CATEGORIES = ['Navigation', 'Panels', 'Signs'];


/* ─── Scale Picker ─── */
function ScalePicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5 bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
      {SCALE_OPTIONS.map(opt => (
        <button
          key={opt.value}
          data-testid={`scale-${opt.label}`}
          onClick={(e) => { e.stopPropagation(); onChange(opt.value); }}
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
            Math.abs(value - opt.value) < 0.01
              ? 'bg-[#D4AF37] text-black'
              : 'text-zinc-600 hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}


/* ─── Sortable Row ─── */
function SortableRow({
  id,
  element,
  isVisible,
  onToggle,
  scale,
  onScaleChange,
}: {
  id: string;
  element: HudElement;
  isVisible: boolean;
  onToggle: () => void;
  scale?: number;
  onScaleChange?: (v: number) => void;
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
      className={`flex items-center gap-2 px-3 py-2.5 transition-colors group border-b border-zinc-800/50 last:border-b-0 ${
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
      <button onClick={onToggle} className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className={`p-1.5 rounded-xl transition-colors flex-shrink-0 ${isVisible ? 'bg-[#D4AF37]/10' : 'bg-zinc-800/50'}`}>
          <Icon className={`w-3.5 h-3.5 transition-colors ${isVisible ? 'text-[#D4AF37]' : 'text-zinc-600'}`} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className={`font-bold text-xs transition-colors ${isVisible ? 'text-white' : 'text-zinc-500'}`}>
            {element.label}
          </div>
          <div className="text-zinc-600 text-[10px] truncate">{element.description}</div>
        </div>
      </button>
      {/* Scale controls — only for resizable elements */}
      {element.scaleKey && isVisible && onScaleChange && (
        <ScalePicker value={scale || 1} onChange={onScaleChange} />
      )}
      <button
        onClick={onToggle}
        className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${isVisible ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-zinc-800/50 text-zinc-600'}`}
      >
        {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

/* ─── Category Section ─── */
function SortableCategory({
  category,
  keys,
  config,
  scales,
  onToggle,
  onReorder,
  onScaleChange,
}: {
  category: string;
  keys: string[];
  config: HudLayoutConfig;
  scales: HudScales;
  onToggle: (key: keyof HudLayoutConfig) => void;
  onReorder: (category: string, oldIndex: number, newIndex: number) => void;
  onScaleChange: (scaleKey: string, value: number) => void;
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
    <div className="mb-5" data-testid={`hud-category-${category.toLowerCase()}`}>
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37] mb-2.5 px-1">{category}</h2>
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
                  scale={element.scaleKey ? (scales[element.scaleKey] || 1) : undefined}
                  onScaleChange={element.scaleKey ? (v: number) => onScaleChange(element.scaleKey!, v) : undefined}
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
  const [scales, setScales] = useState<HudScales>(loadHudScales);
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

  useEffect(() => {
    saveHudScales(scales);
    window.dispatchEvent(new CustomEvent('hud-scales-changed', { detail: scales }));
  }, [scales]);

  const toggle = (key: keyof HudLayoutConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleScaleChange = useCallback((scaleKey: string, value: number) => {
    setScales(prev => ({ ...prev, [scaleKey]: value }));
  }, []);

  const resetAll = () => {
    setConfig({ ...DEFAULT_HUD_LAYOUT });
    setOrder({ ...DEFAULT_ORDER });
    setPositions({ ...DEFAULT_POSITIONS });
    setScales({ ...DEFAULT_SCALES });
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
  const customScaleCount = Object.entries(scales).filter(([, v]) => Math.abs(v - 1) > 0.01).length;

  return (
    <div data-testid="hud-layout-view" className="max-w-2xl mx-auto p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Display Layout</h1>
        <p className="text-zinc-500 text-sm mt-1">Toggle, reorder, reposition, and resize navigation UI elements</p>
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl px-3 py-1.5">
            <span className="text-[#D4AF37] font-bold text-sm">{visibleCount}/{totalCount}</span>
            <span className="text-zinc-500 text-xs ml-1">visible</span>
          </div>
          {customScaleCount > 0 && (
            <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl px-3 py-1.5">
              <Maximize2 className="w-3 h-3 text-zinc-400 inline mr-1" />
              <span className="text-zinc-400 font-bold text-sm">{customScaleCount}</span>
              <span className="text-zinc-600 text-xs ml-1">resized</span>
            </div>
          )}
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

      {/* Size legend */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <div className="flex items-center gap-1.5">
          <Maximize2 className="w-3 h-3 text-zinc-600" />
          <span className="text-zinc-600 text-[10px] uppercase tracking-wider font-bold">Size:</span>
          {SCALE_OPTIONS.map(opt => (
            <span key={opt.value} className="text-zinc-700 text-[10px]">{opt.label}={Math.round(opt.value*100)}%</span>
          ))}
        </div>
      </div>

      {/* Trip Panel Position Toggle */}
      <div className="mb-5 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
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

      {/* Speed Warning Tolerance */}
      {config.showSpeedWarning && (
        <div data-testid="speed-warning-tolerance" className="mb-5 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/10">
                <Siren className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Speed Warning Tolerance</div>
                <div className="text-zinc-500 text-xs">Alert when exceeding limit by this many mph</div>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
              {[0, 3, 5, 8, 10].map(val => (
                <button
                  key={val}
                  data-testid={`speed-tolerance-${val}`}
                  onClick={() => setConfig(prev => ({ ...prev, speedWarningTolerance: val }))}
                  className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    config.speedWarningTolerance === val
                      ? 'bg-red-500 text-white'
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Drag hint */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <GripVertical className="w-3.5 h-3.5 text-zinc-600" />
        <span className="text-zinc-600 text-xs">Drag to reorder. Use size buttons (XS-XL) to resize elements.</span>
      </div>

      {/* Sortable Categories */}
      {CATEGORIES.map(category => (
        <SortableCategory
          key={category}
          category={category}
          keys={order[category] || DEFAULT_ORDER[category]}
          config={config}
          scales={scales}
          onToggle={toggle}
          onReorder={handleReorder}
          onScaleChange={handleScaleChange}
        />
      ))}

      <div className="text-center text-zinc-600 text-xs mt-6 pb-8">
        Changes apply instantly to the navigation view
      </div>
    </div>
  );
}
