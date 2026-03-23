import React, { useState, useEffect } from 'react';
import { X, Truck, Scale, ArrowUpCircle, RotateCcw, Shield } from 'lucide-react';

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
}

interface TruckProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: TruckProfile;
  onSave: (profile: TruckProfile) => void;
}

const TruckProfileModal: React.FC<TruckProfileModalProps> = ({ isOpen, onClose, profile, onSave }) => {
  const [formData, setFormData] = useState<TruckProfile>(profile);

  useEffect(() => {
    setFormData(profile);
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="bg-[#D4AF37]/20 p-2 rounded-lg text-[#D4AF37]">
              <Truck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white uppercase tracking-widest italic">Modify Profile</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                <Truck className="w-3 h-3" />
                Truck Make
              </label>
              <input 
                type="text" 
                value={formData.make || ''}
                onChange={(e) => setFormData({...formData, make: e.target.value})}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                <Truck className="w-3 h-3" />
                Truck Model
              </label>
              <input 
                type="text" 
                value={formData.model || ''}
                onChange={(e) => setFormData({...formData, model: e.target.value})}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                <Truck className="w-3 h-3" />
                Truck Year
              </label>
              <input 
                type="number" 
                value={formData.year || ''}
                onChange={(e) => setFormData({...formData, year: parseInt(e.target.value) || 0})}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                <ArrowUpCircle className="w-3 h-3" />
                Max Height (ft)
              </label>
              <input 
                type="number" 
                step="0.1"
                value={formData.height}
                onChange={(e) => setFormData({...formData, height: parseFloat(e.target.value) || 0})}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                required
              />
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                <Scale className="w-3 h-3" />
                Gross Weight (lbs)
              </label>
              <input 
                type="number" 
                value={formData.weight}
                onChange={(e) => setFormData({...formData, weight: parseInt(e.target.value) || 0})}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                required
              />
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                <RotateCcw className="w-3 h-3" />
                Total Length (ft)
              </label>
              <input 
                type="number" 
                step="0.1"
                value={formData.length}
                onChange={(e) => setFormData({...formData, length: parseFloat(e.target.value) || 0})}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                required
              />
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                <ArrowUpCircle className="w-3 h-3" />
                Width (ft)
              </label>
              <input 
                type="number" 
                step="0.1"
                value={formData.width}
                onChange={(e) => setFormData({...formData, width: parseFloat(e.target.value) || 0})}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                required
              />
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                <Scale className="w-3 h-3" />
                Axle Count
              </label>
              <input 
                type="number" 
                value={formData.axleCount}
                onChange={(e) => setFormData({...formData, axleCount: parseInt(e.target.value) || 0})}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                <Scale className="w-3 h-3" />
                Axle Weight (lbs)
              </label>
              <input 
                type="number" 
                value={formData.axleWeight}
                onChange={(e) => setFormData({...formData, axleWeight: parseInt(e.target.value) || 0})}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                <Truck className="w-3 h-3" />
                Trailer Count
              </label>
              <input 
                type="number" 
                value={formData.trailerCount}
                onChange={(e) => setFormData({...formData, trailerCount: parseInt(e.target.value) || 0})}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                <Shield className="w-3 h-3" />
                Tunnel Category
              </label>
              <select
                value={formData.tunnelCategory}
                onChange={(e) => setFormData({...formData, tunnelCategory: e.target.value})}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <Shield className={`w-5 h-5 ${formData.hazmat ? 'text-rose-500' : 'text-zinc-500'}`} />
                <div>
                  <p className="text-sm font-bold text-white">Hazmat Load</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Restricts routing options</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setFormData({...formData, hazmat: !formData.hazmat})}
                className={`w-12 h-6 rounded-full transition-colors relative ${formData.hazmat ? 'bg-rose-500' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.hazmat ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
          
          <div className="pt-4 border-t border-white/5 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-white uppercase tracking-widest text-xs bg-white/5 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
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
