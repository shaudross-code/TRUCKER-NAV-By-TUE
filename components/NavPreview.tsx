import React, { useState, useRef } from 'react';
import {
  Navigation, MapPin, Fuel, Clock, Layers, CloudSun,
  AlertTriangle, ArrowRightLeft, GitCompare,
  Monitor, Move, Lock, Unlock, Search, Mic, Plus,
  Menu, Filter, Compass, MapPinned, X, RotateCcw
} from 'lucide-react';
import type { HudLayoutConfig } from '../types';
import type { HudPositions } from '../utils/hudLayout';

/* ─── Draggable Preview Element ─── */
function DraggableItem({
  id, positions, setPositions, editMode, containerRef, children, className,
}: {
  id: string;
  positions: HudPositions;
  setPositions: React.Dispatch<React.SetStateAction<HudPositions>>;
  editMode: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  className?: string;
}) {
  const pos = positions[id] || { x: 50, y: 50 };
  const isDraggingRef = useRef(false);
  const startRef = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!editMode) return;
    e.preventDefault(); e.stopPropagation();
    isDraggingRef.current = true;
    startRef.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - startRef.current.mx) / rect.width) * 100;
    const dy = ((e.clientY - startRef.current.my) / rect.height) * 100;
    setPositions(prev => ({
      ...prev,
      [id]: { x: Math.max(0, Math.min(100, startRef.current.px + dx)), y: Math.max(0, Math.min(100, startRef.current.py + dy)) }
    }));
  };
  const handlePointerUp = () => { isDraggingRef.current = false; };

  return (
    <div
      data-testid={`preview-drag-${id}`}
      className={`absolute touch-none z-[10] ${editMode ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'} ${className || ''}`}
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
export default function NavPreview({
  config, positions, setPositions, editMode, setEditMode, onResetPositions,
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
  const [previewMode, setPreviewMode] = useState<'inRoute' | 'idle'>('inRoute');
  const inRoute = previewMode === 'inRoute';

  return (
    <div data-testid="hud-preview" className="mb-6">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Monitor className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span className="text-[#D4AF37] text-xs font-black uppercase tracking-[0.15em]">Live Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0 bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
            <button data-testid="preview-in-route-btn" onClick={() => setPreviewMode('inRoute')}
              className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-colors ${inRoute ? 'bg-[#D4AF37] text-black' : 'text-zinc-500 hover:text-white'}`}>
              In Route
            </button>
            <button data-testid="preview-out-route-btn" onClick={() => setPreviewMode('idle')}
              className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-colors ${!inRoute ? 'bg-[#D4AF37] text-black' : 'text-zinc-500 hover:text-white'}`}>
              Idle
            </button>
          </div>
          {editMode && (
            <button data-testid="preview-reset-positions-btn" onClick={onResetPositions}
              className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors">
              Reset Pos
            </button>
          )}
          <button data-testid="preview-edit-toggle-btn" onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-colors ${editMode ? 'text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/30' : 'text-zinc-500 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 border-zinc-800'}`}>
            {editMode ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {editMode ? 'Editing' : 'Edit Layout'}
          </button>
        </div>
      </div>

      {/* Preview Container */}
      <div ref={containerRef}
        className={`relative w-full aspect-[16/9] bg-[#0a0a0a] border rounded-2xl overflow-hidden select-none transition-colors ${editMode ? 'border-[#D4AF37]/40 shadow-[0_0_20px_rgba(212,175,55,0.1)]' : 'border-zinc-800'}`}>

        {/* Satellite-style map background */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 40% 60%, #1a1e14 0%, #111410 30%, #0a0c08 60%, #060806 100%)' }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="opacity-[0.06]">
            <defs><pattern id="roads" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="#888" strokeWidth="0.5"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#roads)" />
          </svg>
          <div className="absolute top-[20%] left-[10%] w-32 h-24 rounded-full bg-[#1a2a14]/40 blur-xl" />
          <div className="absolute top-[50%] right-[20%] w-40 h-20 rounded-full bg-[#14201a]/30 blur-2xl" />
          <div className="absolute bottom-[15%] left-[40%] w-28 h-16 rounded-full bg-[#182014]/35 blur-xl" />
        </div>

        {/* Route polyline (in-route) */}
        {inRoute && (
          <svg className="absolute inset-0 w-full h-full z-[2]" viewBox="0 0 480 270" preserveAspectRatio="none">
            <path d="M 40 230 C 80 180 140 160 200 155 S 320 100 420 50" fill="none" stroke="#D4AF37" strokeWidth="5" strokeLinecap="round" opacity="0.25"/>
            <path d="M 40 230 C 80 180 140 160 200 155 S 320 100 420 50" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
          </svg>
        )}

        {/* User location */}
        <div className={`absolute z-[8] ${inRoute ? 'top-[58%] left-[25%]' : 'top-[50%] left-[50%]'}`}>
          <div className="w-3.5 h-3.5 rounded-full bg-[#4285F4] border-[1.5px] border-white shadow-[0_0_12px_rgba(66,133,244,0.6)]" />
          <div className="absolute -inset-2 rounded-full bg-[#4285F4]/15 animate-ping" />
        </div>

        {editMode && (
          <div className="absolute inset-0 z-[1] pointer-events-none flex items-center justify-center">
            <span className="text-[#D4AF37]/15 text-[10px] font-black uppercase tracking-[0.3em]">Drag elements to reposition</span>
          </div>
        )}

        {/* ══════════ OUT OF ROUTE / IDLE UI ══════════ */}
        {!inRoute && (
          <>
            {/* Search Bar */}
            <div className="absolute top-[6%] left-1/2 -translate-x-1/2 z-[20] pointer-events-none" style={{ width: '55%' }}>
              <div className="bg-black/95 backdrop-blur-xl rounded-2xl border border-zinc-800 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                <div className="flex items-center px-2.5 py-1.5">
                  <Search className="w-3 h-3 text-zinc-600 mr-2 flex-shrink-0" />
                  <span className="text-[7px] text-zinc-600 font-medium flex-1">Search address, city, or POI...</span>
                  <Mic className="w-3 h-3 text-zinc-500 mx-1 flex-shrink-0" />
                  <div className="p-1 rounded-full bg-white/5 flex-shrink-0">
                    <Plus className="w-2.5 h-2.5 text-[#D4AF37]" />
                  </div>
                  <div className="flex items-center gap-1 ml-1.5 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 flex-shrink-0">
                    <Navigation className="w-2.5 h-2.5 text-zinc-700" />
                    <span className="text-[6px] font-black text-zinc-700 uppercase tracking-widest">Route</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Region Indicator */}
            <div className="absolute bottom-[14%] left-1/2 -translate-x-1/2 z-[20] pointer-events-none">
              <div className="flex items-center gap-1.5 bg-black/80 backdrop-blur-xl border border-zinc-800 rounded-full px-2.5 py-1 shadow-lg">
                <MapPinned className="w-2 h-2 text-[#D4AF37]" />
                <span className="text-[7px] font-black text-white/90 uppercase tracking-wider">Des Moines, Iowa</span>
                <div className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
              </div>
            </div>
            {/* Compass */}
            <div className="absolute bottom-[8%] left-[4%] z-[15] pointer-events-none">
              <div className="w-8 h-8 rounded-full bg-black/60 border border-zinc-700/50 flex items-center justify-center">
                <Compass className="w-5 h-5 text-zinc-500" />
              </div>
            </div>
          </>
        )}

        {/* ══════════ IN ROUTE UI ══════════ */}

        {/* Navigation HUD */}
        {c.showNavigationHUD && inRoute && (
          <DraggableItem id="navigationHUD" {...dp}>
            <div className="bg-zinc-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-zinc-700/40 overflow-hidden" style={{ width: '180px' }}>
              <div className="flex items-stretch">
                <div className="flex items-center justify-center px-2.5 py-2 bg-zinc-800/50">
                  <div className="flex flex-col items-center gap-0.5">
                    <ArrowRightLeft className="w-5 h-5 text-white drop-shadow-md" style={{ transform: 'rotate(-45deg)' }} />
                    <span className="text-[7px] font-black text-white">0.3 mi</span>
                  </div>
                </div>
                <div className="flex-1 py-2 px-2.5 min-w-0">
                  <div className="text-white font-bold text-[8px] leading-tight truncate">Turn Right on <span className="text-[#D4AF37]">I-95 N</span></div>
                  <div className="text-zinc-400 text-[6px] mt-0.5 truncate">toward Philadelphia</div>
                  <span className="text-[5px] text-zinc-500 font-mono">65 mph</span>
                </div>
              </div>
              {c.showLaneGuidance && (
                <div className="border-t border-zinc-700/30 px-2 py-1 bg-zinc-800/30">
                  <div className="flex justify-center gap-0">
                    {[false, false, true, true, false].map((active, i) => (
                      <div key={i} className={`flex items-center justify-center py-0.5 flex-1 max-w-[14px] ${active ? 'bg-[#4285F4]/20' : 'bg-white/[0.02]'} ${i === 0 ? 'rounded-l' : ''} ${i === 4 ? 'rounded-r' : ''}`}
                        style={{ borderLeft: i > 0 ? '1px dashed rgba(255,255,255,0.08)' : 'none' }}>
                        {active ? <div className="w-1.5 h-1.5 bg-[#4285F4] rounded-full shadow-[0_0_4px_rgba(66,133,244,0.5)]" /> : <div className="w-0.5 h-0.5 bg-white/10 rounded-full" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DraggableItem>
        )}

        {/* Speed Limit Sign */}
        {c.showSpeedOverlay && inRoute && (
          <DraggableItem id="speedOverlay" {...dp}>
            <div className="bg-white border-[2px] border-black rounded-sm p-0.5 w-10 flex flex-col items-center">
              <span className="text-[4px] font-black text-black leading-none tracking-tight">SPEED</span>
              <span className="text-[4px] font-black text-black leading-none tracking-tight">LIMIT</span>
              <span className="text-[12px] font-black text-black leading-none mt-0.5">65</span>
            </div>
          </DraggableItem>
        )}

        {/* Maneuver Preview */}
        {c.showManeuverPreview && inRoute && (
          <DraggableItem id="maneuverPreview" {...dp}>
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
          </DraggableItem>
        )}

        {/* Route Comparison */}
        {c.showRouteComparison && inRoute && (
          <DraggableItem id="routeComparison" {...dp}>
            <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/40 rounded-xl shadow-2xl overflow-hidden" style={{ width: '140px' }}>
              <div className="px-2 py-1.5 border-b border-zinc-800/50">
                <div className="flex items-center gap-1"><GitCompare className="w-2.5 h-2.5 text-[#D4AF37]" /><span className="text-[6px] font-black text-zinc-500 uppercase tracking-wider">Routes</span></div>
              </div>
              <div className="p-1.5 flex flex-col gap-1">
                <div className="flex items-center justify-between bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-lg px-2 py-1">
                  <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" /><span className="text-[6px] font-black text-white">I-95 N</span></div>
                  <span className="text-[7px] font-black text-[#D4AF37]">2h 15m</span>
                </div>
                <div className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-2 py-1">
                  <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-zinc-600" /><span className="text-[6px] font-black text-zinc-400">US-1 N</span></div>
                  <span className="text-[7px] font-black text-zinc-500">2h 40m</span>
                </div>
              </div>
            </div>
          </DraggableItem>
        )}

        {/* Weather + Restrictions (both modes) */}
        {(c.showWeatherOverlay || c.showTruckRestrictions) && (
          <DraggableItem id="weatherPanel" {...dp}>
            <div className="flex flex-col gap-1">
              {c.showTruckRestrictions && inRoute && (
                <div className="bg-black/90 backdrop-blur-2xl border border-orange-500/30 rounded-lg px-2 py-1">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5 text-orange-500" />
                    <div><div className="text-[5px] font-black text-orange-400 uppercase">Low Bridge</div><div className="text-[4px] text-orange-400/60">12'6" Clearance</div></div>
                  </div>
                </div>
              )}
              {c.showWeatherOverlay && (
                <div className="bg-black/90 backdrop-blur-2xl border border-[#D4AF37]/20 rounded-xl px-2 py-1.5" style={{ width: inRoute ? 'auto' : '75px' }}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <CloudSun className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <div><div className="text-[9px] font-black text-white leading-none">50°F</div><div className="text-[5px] text-zinc-500 font-bold uppercase">Cloudy</div></div>
                  </div>
                  {!inRoute && (
                    <div className="flex flex-col gap-0.5 mt-1 border-t border-zinc-800/50 pt-1">
                      <div className="flex items-center justify-between"><span className="text-[4px] text-zinc-600 font-bold uppercase">Wind</span><span className="text-[5px] text-white font-bold">9 mph E</span></div>
                      <div className="flex items-center justify-between"><span className="text-[4px] text-zinc-600 font-bold uppercase">Vis</span><span className="text-[5px] text-white font-bold">12.6 mi</span></div>
                      <div className="flex gap-0.5 mt-1">
                        {['Mon','Tue','Wed'].map(d => (
                          <div key={d} className="flex-1 bg-zinc-800/50 rounded px-0.5 py-0.5 text-center">
                            <div className="text-[3px] text-zinc-600 font-bold uppercase">{d}</div>
                            <CloudSun className="w-2 h-2 text-zinc-500 mx-auto" />
                            <div className="text-[4px] text-white font-bold">52°</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DraggableItem>
        )}

        {/* Fuel + HOS (in-route) */}
        {(c.showFuelCost || c.showHosStatus) && inRoute && (
          <DraggableItem id="tripPanel" {...dp}>
            <div className="flex flex-col gap-1" style={{ width: '90px' }}>
              {c.showFuelCost && (
                <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-2 py-1.5"><div className="flex items-center gap-1"><Fuel className="w-3 h-3 text-[#D4AF37]" /><span className="text-[6px] font-black text-white uppercase">Fuel Est</span></div></div>
                  <div className="px-2 pb-1.5 flex gap-1">
                    <div className="bg-zinc-800/60 rounded px-1 py-0.5 text-center flex-1"><div className="text-[4px] text-zinc-500 font-bold">GAL</div><div className="text-[7px] font-black text-white">24.3</div></div>
                    <div className="bg-zinc-800/60 rounded px-1 py-0.5 text-center flex-1"><div className="text-[4px] text-zinc-500 font-bold">COST</div><div className="text-[7px] font-black text-[#D4AF37]">$89</div></div>
                  </div>
                </div>
              )}
              {c.showHosStatus && (
                <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-2 py-1.5"><div className="flex items-center gap-1"><Clock className="w-3 h-3 text-emerald-400" /><span className="text-[6px] font-black text-white uppercase">HOS</span></div><span className="text-[5px] px-1 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">OK</span></div>
                  <div className="px-2 pb-1.5">
                    <div className="flex items-center justify-between mb-0.5"><span className="text-[5px] text-zinc-500 font-bold">Drive Time</span><span className="text-[6px] font-black text-emerald-400">6h 22m</span></div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: '58%' }} /></div>
                  </div>
                </div>
              )}
            </div>
          </DraggableItem>
        )}

        {/* Map Controls (both modes) */}
        {c.showMapControls && (
          <DraggableItem id="mapControls" {...dp}>
            <div className="bg-black border border-[#D4AF37]/30 rounded-2xl p-1 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col gap-0.5">
              <div className="p-1 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center"><Menu className="w-2.5 h-2.5" strokeWidth={3} /></div>
              <div className="p-1 rounded-lg bg-white/5 text-[#D4AF37] flex items-center justify-center"><Filter className="w-2.5 h-2.5" strokeWidth={3} /></div>
              <div className="p-1 rounded-lg bg-white/5 text-zinc-500 flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/></svg></div>
              <div className="p-1 rounded-lg bg-white/5 text-zinc-500 flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
              <div className="h-px bg-zinc-800 mx-0.5" />
              <div className="p-1 rounded-lg bg-white/5 text-zinc-500 flex items-center justify-center"><Layers className="w-2.5 h-2.5" /></div>
              <div className="p-1 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center"><span className="text-[6px] font-black text-[#D4AF37]">2D</span></div>
              <div className="h-px bg-zinc-800 mx-0.5" />
              <div className="p-1 rounded-lg bg-white/5 text-zinc-500 flex items-center justify-center"><Navigation className="w-2.5 h-2.5" /></div>
              <div className="p-1 rounded-lg bg-white/5 text-zinc-500 flex items-center justify-center"><Compass className="w-2.5 h-2.5" /></div>
            </div>
          </DraggableItem>
        )}

        {/* Arrival HUD (in-route) */}
        {c.showArrivalHUD && inRoute && (
          <DraggableItem id="arrivalHUD" {...dp}>
            <div className="bg-black/95 backdrop-blur-xl border border-[#D4AF37]/20 rounded-xl shadow-[0_-8px_40px_rgba(0,0,0,0.9),0_0_20px_rgba(212,175,55,0.08)]" style={{ width: '280px' }}>
              <div className="flex items-center justify-between px-2.5 py-0.5 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-2 h-2 text-[#D4AF37]" />
                  <span className="text-[6px] font-black text-white uppercase tracking-wider">I-95 N</span>
                  <svg width="16" height="12" viewBox="0 0 44 36"><path d="M22 0 L44 12 L38 36 L6 36 L0 12 Z" fill="#003F87" stroke="white" strokeWidth="1.5"/><text x="22" y="28" textAnchor="middle" fill="white" fontSize="14" fontWeight="900">95</text></svg>
                </div>
                <div className="flex items-center gap-1"><span className="text-[5px] font-black text-[#D4AF37]/80 uppercase tracking-wider">PA</span><div className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]" /></div>
              </div>
              <div className="flex items-center px-2 py-1.5 gap-1.5">
                <div className="flex items-center gap-0.5 shrink-0">
                  <div className="p-1 rounded-lg bg-zinc-900/80 border border-zinc-800"><X className="w-[7px] h-[7px] text-zinc-500" /></div>
                  <div className="p-1 rounded-lg bg-zinc-900/80 border border-zinc-800"><RotateCcw className="w-[7px] h-[7px] text-zinc-500" /></div>
                </div>
                <div className="h-5 w-px bg-zinc-800 shrink-0" />
                <div className="flex flex-col items-center shrink-0 min-w-[26px]"><span className="text-[4px] font-bold text-zinc-600 uppercase">Speed</span><span className="text-[11px] font-[900] text-white leading-none tabular-nums">67</span><span className="text-[4px] text-zinc-600 font-bold">mph</span></div>
                <div className="h-4 w-px bg-zinc-800/60 shrink-0" />
                <div className="flex flex-col items-center shrink-0 min-w-[26px]"><span className="text-[4px] font-bold text-zinc-600 uppercase">Dist</span><span className="text-[11px] font-[900] text-[#D4AF37] leading-none tabular-nums">142</span><span className="text-[4px] text-zinc-600 font-bold">mi</span></div>
                <div className="h-4 w-px bg-zinc-800/60 shrink-0" />
                <div className="flex flex-col items-center shrink-0"><span className="text-[4px] font-bold text-zinc-600 uppercase">Time</span><span className="text-[10px] font-[900] text-[#D4AF37] leading-none tabular-nums">2:15</span><span className="text-[4px] text-zinc-600 font-bold">hr</span></div>
                <div className="h-4 w-px bg-zinc-800/60 shrink-0" />
                <div className="flex flex-col items-center shrink-0"><span className="text-[4px] font-bold text-zinc-600 uppercase">ETA</span><div className="flex items-center gap-0.5"><div className="w-1 h-1 rounded-full bg-[#D4AF37] animate-pulse shadow-[0_0_4px_#D4AF37]" /><span className="text-[11px] font-[900] text-white leading-none tabular-nums">3:45</span></div><span className="text-[4px] font-bold text-emerald-500/70 uppercase">LIVE</span></div>
              </div>
            </div>
          </DraggableItem>
        )}

        {/* Map Signs (in-route, static) */}
        {inRoute && (
          <div className="absolute inset-0 z-[5] pointer-events-none">
            {c.showHighwayShields && (<div className="absolute top-[22%] left-[52%]"><svg width="22" height="18" viewBox="0 0 44 36"><path d="M22 0 L44 12 L38 36 L6 36 L0 12 Z" fill="#003F87" stroke="white" strokeWidth="2"/><text x="22" y="28" textAnchor="middle" fill="white" fontSize="14" fontWeight="900">95</text></svg></div>)}
            {c.showSpeedLimitSigns && (<div className="absolute top-[42%] left-[40%]"><div className="bg-white border-2 border-black rounded-[1px] px-0.5 py-0.5 flex flex-col items-center w-[14px]"><span className="text-[3px] font-black text-black leading-none">SPEED</span><span className="text-[3px] font-black text-black leading-none">LIMIT</span><span className="text-[8px] font-black text-black leading-none mt-0.5">65</span></div></div>)}
            {c.showExitSigns && (<div className="absolute top-[18%] right-[22%]"><div className="bg-[#006B3F] border border-white/60 rounded-[1px] px-1 py-0.5 flex items-center gap-1"><div className="bg-[#006B3F] border border-white/80 rounded-[1px] px-0.5"><span className="text-[4px] font-black text-white">EXIT</span></div><span className="text-[5px] font-black text-white">42</span></div></div>)}
            {c.showCurveWarnings && (<div className="absolute top-[53%] left-[58%]"><div className="w-[14px] h-[14px] bg-[#FFCC00] rotate-45 flex items-center justify-center border border-black/40"><svg className="-rotate-45" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><path d="M12 4c-4 0-7 3-7 7s7 9 7 9"/></svg></div></div>)}
            {c.showCmvWarnings && (<div className="absolute top-[65%] left-[33%]"><div className="w-[14px] h-[14px] bg-[#FFCC00] rotate-45 flex items-center justify-center border-2 border-red-600/70"><span className="text-[5px] font-black text-black -rotate-45">6%</span></div></div>)}
            {c.showTrafficIncidents && (<div className="absolute top-[33%] right-[38%]"><div className="bg-red-600 rounded-full w-[14px] h-[14px] flex items-center justify-center border border-white/60 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"><AlertTriangle className="w-2 h-2 text-white" /></div></div>)}
            {c.showWaypointMarkers && (<><div className="absolute top-[72%] left-[13%] bg-[#D4AF37] rounded-full w-[16px] h-[16px] flex items-center justify-center border-2 border-black shadow-lg"><span className="text-[7px] font-black text-black">1</span></div><div className="absolute top-[12%] right-[10%] bg-[#D4AF37] rounded-full w-[16px] h-[16px] flex items-center justify-center border-2 border-black shadow-lg"><span className="text-[7px] font-black text-black">2</span></div></>)}
          </div>
        )}
      </div>
    </div>
  );
}
