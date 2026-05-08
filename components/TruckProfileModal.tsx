import React, { useState, useEffect, useRef } from 'react';
import { X, Truck, Scale, ArrowUpCircle, RotateCcw, Shield, Hash } from 'lucide-react';

interface TruckProfile {
  height: number;
  weight: number;
  length: number;
  width: number;
  hazmat: boolean;
  hazmatClasses: string[];
  tunnelCategory: string;
  axleCount: number;
  axleWeight: number;
  trailerCount: number;
  model: string;
  year: number;
  make: string;
  truckNumber?: string;
  trailerNumber?: string;
  truckPlate?: string;
  trailerPlate?: string;
}

interface TruckProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: TruckProfile;
  onSave: (profile: TruckProfile) => void;
}

// FHWA recommended defaults for Class 8 CMV
const RECOMMENDED: Record<string, number> = {
  height: 13.5,
  weight: 78500,
  length: 53,
  width: 8.5,
  axleCount: 5,
  axleWeight: 12000,
  trailerCount: 1,
  year: 2024,
};

const TruckProfileModal: React.FC<TruckProfileModalProps> = ({ isOpen, onClose, profile, onSave }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (isOpen && !hasInitialized.current) {
      hasInitialized.current = true;
      setFormData({
        make: profile.make || '',
        model: profile.model || '',
        year: profile.year ? String(profile.year) : '',
        height: profile.height != null && profile.height !== 0 ? String(profile.height) : '',
        weight: profile.weight != null && profile.weight !== 0 ? String(profile.weight) : '',
        length: profile.length != null && profile.length !== 0 ? String(profile.length) : '',
        width: profile.width != null && profile.width !== 0 ? String(profile.width) : '',
        axleCount: profile.axleCount != null && profile.axleCount !== 0 ? String(profile.axleCount) : '',
        axleWeight: profile.axleWeight != null && profile.axleWeight !== 0 ? String(profile.axleWeight) : '',
        trailerCount: profile.trailerCount != null ? String(profile.trailerCount) : '',
        hazmat: profile.hazmat || false,
        hazmatClasses: profile.hazmatClasses || [],
        tunnelCategory: profile.tunnelCategory || 'NONE',
        truckNumber: profile.truckNumber || '',
        trailerNumber: profile.trailerNumber || '',
        truckPlate: profile.truckPlate || '',
        trailerPlate: profile.trailerPlate || '',
      });
    }
    if (!isOpen) {
      hasInitialized.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const parseNum = (val: string, fallback: number): number => {
    if (val === '' || val == null) return fallback;
    const n = parseFloat(val);
    return isNaN(n) ? fallback : n;
  };
  const parseInt2 = (val: string, fallback: number): number => {
    if (val === '' || val == null) return fallback;
    const n = parseInt(val, 10);
    return isNaN(n) ? fallback : n;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      make: formData.make || '',
      model: formData.model || '',
      year: parseInt2(formData.year, RECOMMENDED.year),
      height: parseNum(formData.height, RECOMMENDED.height),
      weight: parseInt2(formData.weight, RECOMMENDED.weight),
      length: parseNum(formData.length, RECOMMENDED.length),
      width: parseNum(formData.width, RECOMMENDED.width),
      axleCount: parseInt2(formData.axleCount, RECOMMENDED.axleCount),
      axleWeight: parseInt2(formData.axleWeight, RECOMMENDED.axleWeight),
      trailerCount: parseInt2(formData.trailerCount, RECOMMENDED.trailerCount),
      hazmat: formData.hazmat,
      hazmatClasses: formData.hazmatClasses,
      tunnelCategory: formData.tunnelCategory,
      truckNumber: formData.truckNumber || '',
      trailerNumber: formData.trailerNumber || '',
      truckPlate: formData.truckPlate || '',
      trailerPlate: formData.trailerPlate || '',
    });
    onClose();
  };

  const resetDefaults = () => {
    setFormData({
      ...formData,
      height: String(RECOMMENDED.height),
      weight: String(RECOMMENDED.weight),
      length: String(RECOMMENDED.length),
      width: String(RECOMMENDED.width),
      axleCount: String(RECOMMENDED.axleCount),
      axleWeight: String(RECOMMENDED.axleWeight),
      trailerCount: String(RECOMMENDED.trailerCount),
    });
  };

  const setField = (key: string, val: string) => setFormData({ ...formData, [key]: val });

  const inputClass = "w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#D4AF37]/50 transition-colors placeholder:text-zinc-600";
  const labelClass = "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div data-testid="truck-profile-edit-modal" className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#D4AF37]/20 p-2 rounded-lg text-[#D4AF37]">
              <Truck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white uppercase tracking-widest italic">Truck Profile</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Vehicle Info */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}><Truck className="w-3 h-3" />Make</label>
              <input data-testid="truck-make" type="text" value={formData.make || ''} onChange={(e) => setField('make', e.target.value)} className={inputClass} placeholder="Kenworth" />
            </div>
            <div>
              <label className={labelClass}><Truck className="w-3 h-3" />Model</label>
              <input data-testid="truck-model" type="text" value={formData.model || ''} onChange={(e) => setField('model', e.target.value)} className={inputClass} placeholder="W900" />
            </div>
            <div>
              <label className={labelClass}><Truck className="w-3 h-3" />Year</label>
              <input data-testid="truck-year" type="text" inputMode="numeric" value={formData.year || ''} onChange={(e) => setField('year', e.target.value.replace(/\D/g, ''))} className={inputClass} placeholder={String(RECOMMENDED.year)} />
            </div>
          </div>

          {/* Truck & Trailer Numbers + License Plates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}><Hash className="w-3 h-3" />Truck #</label>
              <input data-testid="truck-number" type="text" value={formData.truckNumber || ''} onChange={(e) => setField('truckNumber', e.target.value.toUpperCase())} className={inputClass} placeholder="T-1042" />
            </div>
            <div>
              <label className={labelClass}><Hash className="w-3 h-3" />Trailer #</label>
              <input data-testid="trailer-number" type="text" value={formData.trailerNumber || ''} onChange={(e) => setField('trailerNumber', e.target.value.toUpperCase())} className={inputClass} placeholder="TR-5501" />
            </div>
            <div>
              <label className={labelClass}><Hash className="w-3 h-3" />Truck Plate</label>
              <input data-testid="truck-plate" type="text" value={formData.truckPlate || ''} onChange={(e) => setField('truckPlate', e.target.value.toUpperCase())} className={inputClass} placeholder="ABC 1234" />
            </div>
            <div>
              <label className={labelClass}><Hash className="w-3 h-3" />Trailer Plate</label>
              <input data-testid="trailer-plate" type="text" value={formData.trailerPlate || ''} onChange={(e) => setField('trailerPlate', e.target.value.toUpperCase())} className={inputClass} placeholder="XYZ 5678" />
            </div>
          </div>
          
          {/* Dimensions with recommended defaults as placeholders */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}><ArrowUpCircle className="w-3 h-3" />Height (ft)</label>
              <input data-testid="truck-height" type="text" inputMode="decimal" value={formData.height || ''} onChange={(e) => setField('height', e.target.value.replace(/[^0-9.]/g, ''))} className={inputClass} placeholder={String(RECOMMENDED.height)} />
            </div>
            <div>
              <label className={labelClass}><Scale className="w-3 h-3" />Weight (lbs)</label>
              <input data-testid="truck-weight" type="text" inputMode="numeric" value={formData.weight || ''} onChange={(e) => setField('weight', e.target.value.replace(/\D/g, ''))} className={inputClass} placeholder={String(RECOMMENDED.weight)} />
            </div>
            <div>
              <label className={labelClass}><RotateCcw className="w-3 h-3" />Length (ft)</label>
              <input data-testid="truck-length" type="text" inputMode="decimal" value={formData.length || ''} onChange={(e) => setField('length', e.target.value.replace(/[^0-9.]/g, ''))} className={inputClass} placeholder={String(RECOMMENDED.length)} />
            </div>
            <div>
              <label className={labelClass}><ArrowUpCircle className="w-3 h-3" />Width (ft)</label>
              <input data-testid="truck-width" type="text" inputMode="decimal" value={formData.width || ''} onChange={(e) => setField('width', e.target.value.replace(/[^0-9.]/g, ''))} className={inputClass} placeholder={String(RECOMMENDED.width)} />
            </div>
          </div>
          
          {/* Axle & Trailer */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}><RotateCcw className="w-3 h-3" />Axles</label>
              <input data-testid="truck-axles" type="text" inputMode="numeric" value={formData.axleCount || ''} onChange={(e) => setField('axleCount', e.target.value.replace(/\D/g, ''))} className={inputClass} placeholder={String(RECOMMENDED.axleCount)} />
            </div>
            <div>
              <label className={labelClass}><Scale className="w-3 h-3" />Axle Wt</label>
              <input data-testid="truck-axle-weight" type="text" inputMode="numeric" value={formData.axleWeight || ''} onChange={(e) => setField('axleWeight', e.target.value.replace(/\D/g, ''))} className={inputClass} placeholder={String(RECOMMENDED.axleWeight)} />
            </div>
            <div>
              <label className={labelClass}><Truck className="w-3 h-3" />Trailers</label>
              <input data-testid="truck-trailers" type="text" inputMode="numeric" value={formData.trailerCount ?? ''} onChange={(e) => setField('trailerCount', e.target.value.replace(/\D/g, ''))} className={inputClass} placeholder={String(RECOMMENDED.trailerCount)} />
            </div>
          </div>
          
          {/* Hazmat & Tunnel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <Shield className="w-3 h-3" />
                Hazmat Cargo
              </label>
              <button type="button" onClick={() => setField('hazmat', (!formData.hazmat) as any)}
                className={`w-12 h-6 rounded-full transition-colors ${formData.hazmat ? 'bg-red-600' : 'bg-zinc-700'}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${formData.hazmat ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {formData.hazmat && (
              <div>
                <label className={labelClass}>Hazmat Classes</label>
                <div className="flex flex-wrap gap-2">
                  {['1','2','3','4','5','6','7','8','9'].map((cls) => {
                    const active = (formData.hazmatClasses || []).includes(cls);
                    return (
                      <button key={cls} type="button"
                        onClick={() => {
                          const classes = formData.hazmatClasses || [];
                          setFormData({
                            ...formData,
                            hazmatClasses: active ? classes.filter((c: string) => c !== cls) : [...classes, cls]
                          });
                        }}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${active ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>
                        {cls}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className={labelClass}>Tunnel Category</label>
              <select 
                data-testid="truck-tunnel"
                value={formData.tunnelCategory || 'NONE'}
                onChange={(e) => setField('tunnelCategory', e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-colors">
                <option value="NONE">None</option>
                <option value="B">B — Minimum Restriction</option>
                <option value="C">C — Medium Restriction</option>
                <option value="D">D — High Restriction</option>
                <option value="E">E — Maximum Restriction</option>
              </select>
            </div>
          </div>
          
          <div className="pt-4 border-t border-white/5 flex gap-3">
            <button 
              type="button" 
              data-testid="truck-reset-defaults"
              onClick={resetDefaults}
              className="py-3 px-4 rounded-xl font-bold text-zinc-400 uppercase tracking-widest text-[10px] bg-white/5 hover:bg-white/10 transition-colors"
            >
              Reset Defaults
            </button>
            <button 
              type="submit"
              data-testid="truck-profile-save"
              className="flex-1 py-3 rounded-xl font-bold text-black uppercase tracking-widest text-xs bg-[#D4AF37] hover:bg-[#b5952f] transition-colors shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TruckProfileModal;
