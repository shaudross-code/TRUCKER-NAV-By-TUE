import React from 'react';
import { RotateCcw, Filter, Plus, Minus, Map as MapIcon, AlertTriangle, Target, Compass, Check, Navigation as NavIcon, List } from 'lucide-react';

export const MapControls: React.FC<any> = React.memo(({ 
  mapInstanceRef, 
  isFetchingPoisRef, 
  fetchTruckPOIs, 
  setPois, 
  isFilterMenuOpen, 
  setIsFilterMenuOpen, 
  poiFilters, 
  setPoiFilters, 
  isOverviewMode, 
  setIsOverviewMode, 
  setIsFollowMode, 
  showTruckRestrictions, 
  setShowTruckRestrictions, 
  HERE_API_KEY, 
  setError, 
  isValidLatLng, 
  userLocation, 
  isFollowMode, 
  isNorthUp, 
  setIsNorthUp, 
  setShowSteps, 
  showSteps,
  className = ""
}) => {
  return (
    <div id="nav-map-controls" className={`absolute right-2 md:right-4 z-[2010] flex flex-col items-end gap-1 md:gap-2 transition-all duration-700 top-1/2 scale-90 md:scale-100 origin-right ${className}`}>
        {!isNorthUp && (
          <button 
            onClick={() => setIsNorthUp(true)}
            className="bg-black/90 backdrop-blur-3xl border border-[#D4AF37]/30 rounded-full p-2 md:p-3 shadow-2xl transition-all animate-in fade-in zoom-in mb-1 hover:bg-white/10 group"
            title="Reset to North Up"
          >
            <div 
              className="transition-transform duration-500 ease-out"
              style={{ transform: `rotate(var(--map-rotation, 0deg))` }}
            >
              <Compass className="w-5 h-5 md:w-7 md:h-7 text-[#D4AF37] group-hover:scale-110 transition-transform" />
            </div>
          </button>
        )}
        
        <div className="bg-black/90 backdrop-blur-3xl border border-[#D4AF37]/30 rounded-2xl md:rounded-3xl p-1.5 md:p-2 shadow-2xl flex flex-col gap-1.5 md:gap-2">
          <button
            onClick={() => {
              if (mapInstanceRef.current && !isFetchingPoisRef.current) {
                const center = mapInstanceRef.current.getCenter();
                isFetchingPoisRef.current = true;
                fetchTruckPOIs(center.lat, center.lng)
                  .then((poiData) => {
                    const combinedRaw = [...poiData];
                    const seenInBatch = new Set();
                    const combined = combinedRaw.filter(p => {
                      const id = `${p.lat}-${p.lon}-${p.name}`;
                      if (seenInBatch.has(id)) return false;
                      seenInBatch.add(id);
                      return true;
                    });

                    setPois(prev => {
                      const existingIds = new Set();
                      prev.forEach(p => existingIds.add(`${p.lat}-${p.lon}-${p.name}`));
                      const newPois = combined.filter(p => !existingIds.has(`${p.lat}-${p.lon}-${p.name}`));
                      if (newPois.length === 0) return prev;
                      const updated = [...prev, ...newPois];
                      if (updated.length > 1000) return updated.slice(updated.length - 1000);
                      return updated;
                    });
                  })
                  .catch(err => {
                    console.error("Failed to fetch POIs:", err instanceof Error ? err.message : String(err));
                  })
                  .finally(() => {
                    isFetchingPoisRef.current = false;
                  });
              }
            }}
            className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all bg-white/5 text-[#D4AF37] hover:bg-white/10`}
            title="Refresh POIs"
          >
            <RotateCcw className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${isFilterMenuOpen ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-[#D4AF37]'}`}
              title="Filter POIs"
            >
              <Filter strokeWidth={3} className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
            </button>
            
            {isFilterMenuOpen && (
              <div className="absolute right-full mr-2 md:mr-4 top-0 bg-black/95 backdrop-blur-3xl border border-[#D4AF37]/30 rounded-xl md:rounded-2xl p-2 md:p-3 shadow-2xl w-40 md:w-56 flex flex-col gap-1.5 md:gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-[#D4AF37] font-black text-[8px] md:text-[10px] uppercase tracking-widest border-b border-[#D4AF37]/20 pb-1 mb-0.5">Filters</h3>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => {
                      const brandIds = ['loves', 'pilot', 'flying_j', 'petro', 'ta', 'road_ranger', 'kwik_trip', 'bucees', 'speedway', 'caseys', 'wawa', 'sheetz', 'quiktrip', 'racetrac', 'conoco'];
                      const allIds = [
                        ...brandIds, 'fuel', 'parking', 'rest_area', 
                        'weigh_station', 'food', 'service', 'distribution', 'other'
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
                    { id: 'loves', label: "Love's" },
                    { id: 'pilot', label: 'Pilot' },
                    { id: 'flying_j', label: 'Flying J' },
                    { id: 'petro', label: 'Petro' },
                    { id: 'ta', label: 'TA' },
                    { id: 'road_ranger', label: 'Road Ranger' },
                    { id: 'kwik_trip', label: 'Kwik Trip' },
                    { id: 'bucees', label: "Buc-ee's" },
                    { id: 'speedway', label: 'Speedway' },
                    { id: 'caseys', label: "Casey's" },
                    { id: 'wawa', label: 'Wawa' },
                    { id: 'sheetz', label: 'Sheetz' },
                    { id: 'quiktrip', label: 'QuikTrip' },
                    { id: 'racetrac', label: 'RaceTrac' },
                    { id: 'conoco', label: 'Conoco' },
                    { id: 'fuel', label: 'Fuel (Other)' },
                    { id: 'parking', label: 'Parking' },
                    { id: 'rest_area', label: 'Rest Areas' },
                    { id: 'weigh_station', label: 'Scales' },
                    { id: 'food', label: 'Food' },
                    { id: 'service', label: 'Service' },
                    { id: 'distribution', label: 'Distribution' },
                    { id: 'other', label: 'Other' }
                  ].map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => {
                        setPoiFilters(prev => {
                          const next = new Set(prev);
                          if (next.has(filter.id)) next.delete(filter.id);
                          else next.add(filter.id);
                          return next;
                        });
                      }}
                      className="flex items-center justify-between text-left group py-0.5"
                    >
                      <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-tight transition-colors ${poiFilters.has(filter.id) ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>{filter.label}</span>
                      <div className={`w-2.5 h-2.5 md:w-4 md:h-4 rounded border flex items-center justify-center transition-all ${poiFilters.has(filter.id) ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-zinc-700 group-hover:border-zinc-500'}`}>
                        {poiFilters.has(filter.id) && <Check className="w-2 h-2 md:w-3 md:h-3 text-black" strokeWidth={5} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="h-px bg-[#D4AF37]/10 mx-1" />
          
          <button onClick={() => mapInstanceRef.current?.zoomIn()} className="p-1.5 md:p-3 rounded-lg md:rounded-xl bg-white/5 text-[#D4AF37] hover:bg-white/10">
            <Plus className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" strokeWidth={4} />
          </button>
          <button onClick={() => mapInstanceRef.current?.zoomOut()} className="p-1.5 md:p-3 rounded-lg md:rounded-xl bg-white/5 text-[#D4AF37] hover:bg-white/10">
            <Minus className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" strokeWidth={4} />
          </button>
          
          <button 
            onClick={() => { 
              setIsOverviewMode(!isOverviewMode);
              if (!isOverviewMode) {
                setIsFollowMode(false);
              }
            }} 
            className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${isOverviewMode ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-[#D4AF37]'} hover:bg-white/10`}
            title="Toggle Route Overview"
          >
            <MapIcon className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" strokeWidth={4} />
          </button>

          <button 
            onClick={() => {
              if (!HERE_API_KEY) {
                setError("HERE API Key required for truck restrictions. Please add HERE_API_KEY to your secrets.");
                return;
              }
              setShowTruckRestrictions(!showTruckRestrictions);
            }} 
            className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${showTruckRestrictions ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-white/5 text-[#D4AF37] hover:bg-white/10'}`}
            title="Toggle Truck Restrictions (HERE Maps)"
          >
            <AlertTriangle className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" strokeWidth={3} />
          </button>

          <button 
            onClick={() => { 
              if (isValidLatLng(userLocation) && mapInstanceRef.current) { 
                mapInstanceRef.current.flyTo([userLocation[0], userLocation[1]], 17); 
                setIsFollowMode(true); 
                setIsOverviewMode(false);
              } 
            }} 
            className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${!isFollowMode || isOverviewMode ? 'bg-red-600/20 text-red-500 border border-red-500/50 animate-pulse' : 'bg-white/5 text-[#D4AF37] hover:bg-white/10'}`}
            title="Follow User"
          >
            <Target className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" strokeWidth={4} />
          </button>

          <button 
            onClick={() => setIsNorthUp(!isNorthUp)} 
            className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${!isNorthUp ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-white/5 text-[#D4AF37] hover:bg-white/10'}`}
            title={isNorthUp ? "Switch to Heading Up" : "Switch to North Up"}
          >
            <NavIcon className={`w-3.5 h-3.5 md:w-4.5 md:h-4.5 ${!isNorthUp ? 'animate-pulse' : ''}`} strokeWidth={4} />
          </button>

          <button 
            onClick={() => setShowSteps(true)} 
            className={`p-1.5 md:p-3 rounded-lg md:rounded-xl transition-all ${showSteps ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-white/5 text-[#D4AF37] hover:bg-white/10'}`}
            title="View Turn-by-Turn Steps"
          >
            <List className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" strokeWidth={4} />
          </button>
        </div>
    </div>
  );
});
