import React, { useState } from 'react';
import { Filter, Plus, Minus, Map as MapIcon, Target, Compass, Check, Navigation as NavIcon, Building2, Menu, Star } from 'lucide-react';
import { getPoiFilterIcon } from './PoiIcon';

export const MapControls: React.FC<any> = React.memo(({ 
  mapInstanceRef, 
  mapboxMapRef,
  isFilterMenuOpen, 
  setIsFilterMenuOpen, 
  poiFilters, 
  setPoiFilters, 
  minRatingFilter,
  setMinRatingFilter,
  isOverviewMode, 
  setIsOverviewMode, 
  setIsFollowMode, 
  isValidLatLng, 
  userLocation, 
  isFollowMode, 
  isNorthUp, 
  setIsNorthUp,
  showTrafficSigns,
  setShowTrafficSigns,
  is3DMode,
  setIs3DMode,
  isCompassMode,
  setIsCompassMode,
  showFacilities,
  setShowFacilities,
  onAddFacility,
  currentZoom,
  isDrivingMode,
  className = ""
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-collapse when entering driving mode
  React.useEffect(() => {
    if (isDrivingMode) setIsCollapsed(true);
  }, [isDrivingMode]);

  return (
    <div id="nav-map-controls" className={`absolute right-2 md:right-4 z-[2010] flex flex-col items-end gap-1 md:gap-2 transition-all duration-700 scale-90 md:scale-100 origin-right ${className}`}>
        
        <div className="bg-black border border-[#D4AF37]/30 rounded-2xl md:rounded-[2.5rem] p-1.5 md:p-2 shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col gap-1.5 md:gap-2 transition-all hover:scale-[1.005]">

          {/* Hamburger toggle — always at top */}
          <button
            data-testid="map-controls-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${isCollapsed ? 'bg-white/5 text-zinc-500' : 'bg-[#D4AF37]/10 text-[#D4AF37]'} hover:bg-white/10`}
            title={isCollapsed ? 'Expand Controls' : 'Collapse Controls'}
          >
            <Menu strokeWidth={3} className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
          </button>

          {/* Filter — collapsible */}
          {!isCollapsed && (
            <div className="relative">
              <button 
                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${isFilterMenuOpen ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-[#D4AF37]'}`}
                title="Filter POIs"
              >
                <Filter strokeWidth={3} className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
              </button>
              
              {isFilterMenuOpen && (
                <div className="absolute right-full mr-2 md:mr-4 top-0 bg-black border border-[#D4AF37]/30 rounded-2xl md:rounded-[2.5rem] p-2 md:p-3 shadow-[0_40px_100px_rgba(0,0,0,0.8)] w-48 md:w-64 flex flex-col gap-1.5 md:gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-[#D4AF37] font-black text-[8px] md:text-[10px] uppercase tracking-widest border-b border-[#D4AF37]/20 pb-1 mb-0.5">Filters</h3>
                  
                  {/* Traffic Signs Toggle */}
                  <button
                    onClick={() => {
                      setShowTrafficSigns(!showTrafficSigns);
                      localStorage.setItem('nav_show_traffic_signs', String(!showTrafficSigns));
                    }}
                    className="flex items-center justify-between p-1.5 md:p-2 rounded-lg bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 transition-all mb-1"
                  >
                    <span className="text-white font-bold text-[9px] md:text-[11px] flex items-center gap-1.5">
                      <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0"><rect x="6.5" y="0" width="3" height="2.5" rx=".5" fill="#fff" opacity=".5"/><rect x="5" y="2" width="6" height="10" rx="1.5" fill="#333"/><rect x="6" y="3" width="4" height="2.5" rx="1" fill="#ef4444"/><rect x="6" y="6" width="4" height="2.5" rx="1" fill="#facc15"/><rect x="6" y="9" width="4" height="2.5" rx="1" fill="#22c55e"/><rect x="6.5" y="12" width="3" height="3" rx=".5" fill="#555"/></svg>
                      Traffic Signs &amp; Lights
                    </span>
                    <div className={`w-3 h-3 md:w-4 md:h-4 rounded border-2 flex items-center justify-center transition-all ${showTrafficSigns ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-zinc-600'}`}>
                      {showTrafficSigns && <Check className="w-2 h-2 md:w-3 md:h-3 text-black" strokeWidth={4} />}
                    </div>
                  </button>

                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => {
                        const brandIds = ['loves', 'pilot', 'flying_j', 'petro', 'ta', 'road_ranger', 'bucees', 'sapp_bros', 'ambest', 'speedco', 'southern_tire', 'rush', 'ryder', 'penske', 'cummins', 'peterbilt', 'volvo', 'freightliner', 'truck_wash'];
                        const allIds = [
                          ...brandIds, 'parking', 'rest_area', 
                          'weigh_station', 'cat_scale', 'food', 'service', 'low_clearance', 'other'
                        ];
                        setPoiFilters(new Set(allIds));
                      }}
                      className="text-[8px] md:text-[10px] font-black uppercase text-[#D4AF37] hover:text-white"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setPoiFilters(new Set())}
                      className="text-[8px] md:text-[10px] font-black uppercase text-zinc-500 hover:text-white"
                    >
                      Deselect All
                    </button>
                  </div>
                  <div className="flex flex-col gap-0.5 md:gap-1 max-h-[40vh] md:max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                    {[
                      { id: 'loves',         label: "Love's" },
                      { id: 'pilot',         label: 'Pilot' },
                      { id: 'flying_j',      label: 'Flying J' },
                      { id: 'petro',         label: 'Petro' },
                      { id: 'ta',            label: 'TA' },
                      { id: 'road_ranger',   label: 'Road Ranger' },
                      { id: 'bucees',        label: "Buc-ee's" },
                      { id: 'sapp_bros',     label: 'Sapp Bros' },
                      { id: 'ambest',        label: 'Ambest' },
                      { id: 'speedco',       label: 'Speedco',       divider: true },
                      { id: 'southern_tire', label: 'Southern Tire' },
                      { id: 'rush',          label: 'Rush Truck Centers' },
                      { id: 'ryder',         label: 'Ryder' },
                      { id: 'penske',        label: 'Penske' },
                      { id: 'peterbilt',     label: 'Peterbilt' },
                      { id: 'volvo',         label: 'Volvo Trucks' },
                      { id: 'freightliner',  label: 'Freightliner' },
                      { id: 'cummins',       label: 'Cummins' },
                      { id: 'truck_wash',    label: 'Truck Wash' },
                      { id: 'parking',       label: 'Parking',       divider: true },
                      { id: 'rest_area',     label: 'Rest Areas' },
                      { id: 'weigh_station', label: 'DOT Weigh Stations' },
                      { id: 'cat_scale',    label: 'Certified Scales' },
                      { id: 'low_clearance', label: 'Low Clearance' },
                      { id: 'food',          label: 'Food' },
                      { id: 'service',       label: 'Service (Other)' },
                      { id: 'other',         label: 'Other' }
                    ].map(filter => (
                      <React.Fragment key={filter.id}>
                        {filter.divider && <div className="h-px bg-[#D4AF37]/10 my-1" />}
                        <button
                          onClick={() => {
                            setPoiFilters(prev => {
                              const next = new Set(prev);
                              if (next.has(filter.id)) next.delete(filter.id);
                              else next.add(filter.id);
                              return next;
                            });
                          }}
                          className="flex items-center justify-between text-left group py-0.5 gap-1"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className={`transition-all duration-200 ${poiFilters.has(filter.id) ? 'opacity-100 scale-100' : 'opacity-60 scale-95 group-hover:opacity-80 group-hover:scale-100'}`}>
                              {getPoiFilterIcon(filter.id)}
                            </div>
                            <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-tight transition-colors truncate ${poiFilters.has(filter.id) ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>{filter.label}</span>
                          </div>
                          <div className={`shrink-0 w-2.5 h-2.5 md:w-4 md:h-4 rounded border flex items-center justify-center transition-all ${poiFilters.has(filter.id) ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-zinc-700 group-hover:border-zinc-500'}`}>
                            {poiFilters.has(filter.id) && <Check className="w-2 h-2 md:w-3 md:h-3 text-black" strokeWidth={5} />}
                          </div>
                        </button>
                      </React.Fragment>
                    ))}
                  </div>

                  {/* ── Facilities Section ── */}
                  <div className="border-t border-[#D4AF37]/10 pt-3 mt-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-[#D4AF37]" />
                        <span className="text-[9px] md:text-[11px] font-black uppercase text-white tracking-widest">Facilities</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onAddFacility?.()}
                          data-testid="add-facility-btn"
                          className="text-[8px] font-black uppercase text-[#D4AF37] hover:text-white flex items-center gap-1 border border-[#D4AF37]/30 rounded-lg px-1.5 py-0.5 hover:border-[#D4AF37]/60 transition-all"
                          title="Add a new facility"
                        >
                          <Plus className="w-2.5 h-2.5" strokeWidth={3} /> Add
                        </button>
                        <button
                          data-testid="facilities-toggle"
                          onClick={() => {
                            setShowFacilities?.(!showFacilities);
                            localStorage.setItem('nav_show_facilities', String(!showFacilities));
                          }}
                          className={`w-3 h-3 md:w-4 md:h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${showFacilities ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-zinc-600'}`}
                        >
                          {showFacilities && <Check className="w-2 h-2 md:w-3 md:h-3 text-black" strokeWidth={4} />}
                        </button>
                      </div>
                    </div>
                    {showFacilities && (
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { type: 'shipper',  color: '#3b82f6', label: 'Shippers' },
                          { type: 'receiver', color: '#22c55e', label: 'Receivers' },
                          { type: 'both',     color: '#a855f7', label: 'Both' },
                        ].map(t => (
                          <div key={t.type} className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: t.color }} />
                            <span className="text-[8px] text-zinc-400 font-semibold">{t.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Min Rating Filter ── */}
                  {setMinRatingFilter && (
                    <div className="border-t border-[#D4AF37]/10 pt-3 mt-1">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Star className="w-3 h-3 text-[#D4AF37]" fill="currentColor" />
                        <span className="text-[9px] md:text-[11px] font-black uppercase text-white tracking-widest">Min Rating</span>
                      </div>
                      <div className="flex items-center gap-1" data-testid="min-rating-filter">
                        {[0, 1, 2, 3, 4].map(val => (
                          <button
                            key={val}
                            data-testid={`min-rating-${val}`}
                            onClick={() => setMinRatingFilter(val)}
                            className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-[8px] font-black transition-all ${
                              minRatingFilter === val
                                ? 'bg-[#D4AF37] text-black'
                                : 'bg-white/5 text-zinc-500 hover:text-white'
                            }`}
                          >
                            {val === 0 ? 'ALL' : (
                              <>{val}+ <Star className="w-2 h-2" fill="currentColor" /></>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="h-px bg-[#D4AF37]/10 mx-1" />

          {/* Zoom In — always visible */}
          <button onClick={() => {
            if (is3DMode && mapboxMapRef?.current) {
              mapboxMapRef.current.zoomIn();
            } else {
              mapInstanceRef.current?.zoomIn();
            }
          }} className="p-1.5 md:p-3 rounded-lg md:rounded-xl bg-white/5 text-[#D4AF37] hover:bg-white/10" data-testid="zoom-in-btn">
            <Plus className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" strokeWidth={4} />
          </button>

          {/* Zoom Level Indicator — always visible */}
          <div data-testid="zoom-level-indicator" className="flex items-center justify-center w-full" title={`Zoom: ${currentZoom ?? '—'}`}>
            <span className="text-[9px] md:text-[11px] font-black text-zinc-400 tabular-nums tracking-tight select-none">{currentZoom != null ? Math.round(currentZoom) : '—'}</span>
          </div>

          {/* Zoom Out — always visible */}
          <button onClick={() => {
            if (is3DMode && mapboxMapRef?.current) {
              mapboxMapRef.current.zoomOut();
            } else {
              mapInstanceRef.current?.zoomOut();
            }
          }} className="p-1.5 md:p-3 rounded-lg md:rounded-xl bg-white/5 text-[#D4AF37] hover:bg-white/10" data-testid="zoom-out-btn">
            <Minus className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" strokeWidth={4} />
          </button>

          {/* Overview — collapsible */}
          {!isCollapsed && (
            <button 
              onClick={() => { 
                const newOverviewMode = !isOverviewMode;
                setIsOverviewMode(newOverviewMode);
                if (newOverviewMode) {
                  setIsFollowMode(false);
                  if (is3DMode && mapboxMapRef?.current) {
                    mapboxMapRef.current.easeTo({ pitch: 0, zoom: 12, duration: 800 });
                  }
                } else {
                  if (is3DMode && mapboxMapRef?.current && isValidLatLng(userLocation)) {
                    mapboxMapRef.current.flyTo({ center: [userLocation[1], userLocation[0]], zoom: 17.5, pitch: 70, duration: 800 });
                  }
                }
              }} 
              className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${isOverviewMode ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-[#D4AF37]'} hover:bg-white/10`}
              title="Toggle Route Overview"
              data-testid="overview-btn"
            >
              <MapIcon className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" strokeWidth={4} />
            </button>
          )}
          
          {/* 2D/3D toggle — collapsible */}
          {!isCollapsed && (
            <button 
              onClick={() => { 
                const newMode = !is3DMode;
                setIs3DMode(newMode);
                localStorage.setItem('nav_3d_mode', String(newMode));
              }} 
              className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${is3DMode ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-[#D4AF37]'} hover:bg-white/10`}
              title={is3DMode ? '3D View Active' : 'Switch to 3D'}
            >
              <span className="font-black text-[10px] md:text-xs">{is3DMode ? '3D' : '2D'}</span>
            </button>
          )}

          {/* Follow User — collapsible */}
          {!isCollapsed && (
            <button 
              onClick={() => { 
                if (isValidLatLng(userLocation)) {
                  if (is3DMode && mapboxMapRef?.current) {
                    mapboxMapRef.current.flyTo({ 
                      center: [userLocation[1], userLocation[0]], 
                      zoom: 17.5, 
                      pitch: 70,
                      duration: 1000 
                    });
                  } else if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo([userLocation[0], userLocation[1]], 17); 
                  }
                  setIsFollowMode(true); 
                  setIsOverviewMode(false);
                }
              }} 
              className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${!isFollowMode || isOverviewMode ? 'bg-red-600/20 text-red-500 border border-red-500/50 animate-pulse' : 'bg-white/5 text-[#D4AF37] hover:bg-white/10'}`}
              title="Follow User"
              data-testid="follow-user-btn"
            >
              <Target className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" strokeWidth={4} />
            </button>
          )}

          {/* Heading Up / North Up — always visible */}
          <button 
            onClick={() => setIsNorthUp()} 
            className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all relative ${!isNorthUp ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-white/5 text-[#D4AF37] hover:bg-white/10'}`}
            title={isNorthUp ? "Switch to Heading Up" : "Switch to North Up"}
            data-testid="orientation-btn"
          >
            <div style={{ transform: !isNorthUp ? `rotate(var(--map-rotation, 0deg))` : 'none', transition: 'transform 0.5s ease-out' }}>
              <NavIcon className={`w-3.5 h-3.5 md:w-4.5 md:h-4.5 ${!isNorthUp ? 'animate-pulse' : ''}`} strokeWidth={4} />
            </div>
          </button>

          {/* Device Compass toggle — collapsible */}
          {!isCollapsed && (
            <button
              onClick={() => setIsCompassMode?.(!isCompassMode)}
              data-testid="compass-mode-btn"
              className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all relative ${
                isCompassMode
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-[#D4AF37]'
              }`}
              title={isCompassMode ? 'Compass Mode Active — tap to disable' : 'Enable Device Compass Mode'}
            >
              <Compass className={`w-3.5 h-3.5 md:w-4.5 md:h-4.5 ${isCompassMode ? 'animate-pulse' : ''}`} strokeWidth={2.5} />
              {isCompassMode && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-ping" />
              )}
            </button>
          )}
        </div>
    </div>
  );
});
