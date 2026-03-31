import React, { useState, useEffect } from 'react';
import { Fuel, Check, X, Star, MapPin } from 'lucide-react';

const MAX_SELECTIONS = 5;

interface FuelNetworkItem {
  id: string;
  label: string;
  group: 'chains' | 'services' | 'amenities';
}

const FUEL_NETWORK_OPTIONS: FuelNetworkItem[] = [
  // Truck Stop Plazas
  { id: 'loves', label: "Love's Travel Stops", group: 'chains' },
  { id: 'pilot', label: 'Pilot Travel Centers', group: 'chains' },
  { id: 'flying_j', label: 'Flying J', group: 'chains' },
  { id: 'petro', label: 'Petro Stopping Centers', group: 'chains' },
  { id: 'ta', label: 'TravelCenters of America', group: 'chains' },
  { id: 'road_ranger', label: 'Road Ranger', group: 'chains' },
  { id: 'bucees', label: "Buc-ee's", group: 'chains' },
  { id: 'sapp_bros', label: 'Sapp Bros', group: 'chains' },
  { id: 'ambest', label: 'Ambest', group: 'chains' },
  // Services
  { id: 'cat_scale', label: 'Certified Scales', group: 'services' },
  { id: 'weigh_station', label: 'DOT Weigh Stations', group: 'services' },
  { id: 'truck_wash', label: 'Truck Wash', group: 'services' },
  { id: 'rest_area', label: 'Rest Areas', group: 'services' },
  // Amenities
  { id: 'parking', label: 'Truck Parking', group: 'amenities' },
  { id: 'food', label: 'Food / Restaurants', group: 'amenities' },
];

const STORAGE_KEY = 'fuel_network_selections';

const loadSelections = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const getFuelNetworkSelections = (): string[] => loadSelections();

const FuelNetwork: React.FC = () => {
  const [selections, setSelections] = useState<string[]>(loadSelections);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
  }, [selections]);

  const toggleSelection = (id: string) => {
    setSelections(prev => {
      if (prev.includes(id)) {
        return prev.filter(s => s !== id);
      }
      if (prev.length >= MAX_SELECTIONS) return prev;
      return [...prev, id];
    });
  };

  const clearAll = () => setSelections([]);

  const groups = [
    { key: 'chains' as const, label: 'TRUCK STOP CHAINS' },
    { key: 'services' as const, label: 'SERVICES' },
    { key: 'amenities' as const, label: 'AMENITIES' },
  ];

  return (
    <div data-testid="fuel-network-page" className="min-h-full bg-[#050505] text-white p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
            <Fuel className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">FUEL NETWORK</h1>
            <p className="text-xs text-zinc-500 font-medium">Select up to {MAX_SELECTIONS} POI types for voice distance alerts</p>
          </div>
        </div>
      </div>

      {/* Selected Network Summary */}
      <div className="mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400">
              Your Network ({selections.length}/{MAX_SELECTIONS})
            </span>
          </div>
          {selections.length > 0 && (
            <button
              data-testid="fuel-network-clear-all"
              onClick={clearAll}
              className="text-[10px] font-bold text-zinc-500 hover:text-red-400 uppercase tracking-wider transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
        {selections.length === 0 ? (
          <p className="text-xs text-zinc-600 italic">No POI types selected. Pick up to 5 below to get voice alerts during navigation.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selections.map(id => {
              const item = FUEL_NETWORK_OPTIONS.find(o => o.id === id);
              return item ? (
                <button
                  key={id}
                  data-testid={`fuel-network-selected-${id}`}
                  onClick={() => toggleSelection(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider hover:bg-[#D4AF37]/20 transition-all group"
                >
                  <MapPin className="w-3 h-3" />
                  {item.label}
                  <X className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                </button>
              ) : null;
            })}
          </div>
        )}
        {selections.length > 0 && (
          <p className="text-[10px] text-zinc-600 mt-3">
            During navigation, you will hear voice alerts for distance to the next available stop from your selected network.
          </p>
        )}
      </div>

      {/* POI Selection Groups */}
      {groups.map(group => (
        <div key={group.key} className="mb-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 pl-1">{group.label}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {FUEL_NETWORK_OPTIONS.filter(o => o.group === group.key).map(option => {
              const isSelected = selections.includes(option.id);
              const isDisabled = !isSelected && selections.length >= MAX_SELECTIONS;
              return (
                <button
                  key={option.id}
                  data-testid={`fuel-network-option-${option.id}`}
                  onClick={() => !isDisabled && toggleSelection(option.id)}
                  disabled={isDisabled}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    isSelected
                      ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]'
                      : isDisabled
                        ? 'bg-white/[0.01] border-white/5 text-zinc-700 cursor-not-allowed opacity-40'
                        : 'bg-white/[0.02] border-white/5 text-zinc-300 hover:border-white/15 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-[#D4AF37]/20' : 'bg-white/5'
                  }`}>
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-[#D4AF37]" />
                    ) : (
                      <Fuel className="w-3 h-3 text-zinc-600" />
                    )}
                  </div>
                  <span className="text-xs font-bold truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FuelNetwork;
