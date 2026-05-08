import React, { useState, useEffect, useRef } from 'react';
import { X, User, Phone, Mail, CreditCard, Calendar, Hash } from 'lucide-react';

interface DriverProfileData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: string;
  licensePlate?: string;
}

interface DriverProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: DriverProfileData;
  onSave: (profile: DriverProfileData) => void;
}

const DriverProfileModal: React.FC<DriverProfileModalProps> = ({ isOpen, onClose, profile, onSave }) => {
  const [formData, setFormData] = useState<DriverProfileData>(profile);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (isOpen && !hasInitialized.current) {
      hasInitialized.current = true;
      setFormData(profile);
    }
    if (!isOpen) {
      hasInitialized.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const inputClass = "w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#D4AF37]/50 transition-colors placeholder:text-zinc-600";
  const labelClass = "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div data-testid="driver-profile-modal" className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#D4AF37]/20 p-2 rounded-lg text-[#D4AF37]">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white uppercase tracking-widest italic">Driver Profile</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                <User className="w-3 h-3" />
                First Name
              </label>
              <input 
                data-testid="driver-first-name"
                type="text" 
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className={inputClass}
                placeholder="John"
                required
              />
            </div>
            <div>
              <label className={labelClass}>
                <User className="w-3 h-3" />
                Last Name
              </label>
              <input 
                data-testid="driver-last-name"
                type="text" 
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className={inputClass}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              <Phone className="w-3 h-3" />
              Phone Number
            </label>
            <input 
              data-testid="driver-phone"
              type="tel" 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className={inputClass}
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label className={labelClass}>
              <Mail className="w-3 h-3" />
              Email
            </label>
            <input 
              data-testid="driver-email"
              type="email" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className={inputClass}
              placeholder="driver@example.com"
            />
          </div>

          <div>
            <label className={labelClass}>
              <CreditCard className="w-3 h-3" />
              Driver's License Number
            </label>
            <input 
              data-testid="driver-license-number"
              type="text" 
              value={formData.licenseNumber}
              onChange={(e) => setFormData({...formData, licenseNumber: e.target.value.toUpperCase()})}
              className={inputClass}
              placeholder="CDL-A 123456789"
              required
            />
          </div>

          <div>
            <label className={labelClass}>
              <Calendar className="w-3 h-3" />
              License Expiration Date
            </label>
            <input 
              data-testid="driver-license-expiry"
              type="date" 
              value={formData.licenseExpiry}
              onChange={(e) => setFormData({...formData, licenseExpiry: e.target.value})}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>
              <Hash className="w-3 h-3" />
              Driver License Plate
            </label>
            <input 
              data-testid="driver-license-plate"
              type="text" 
              value={formData.licensePlate || ''}
              onChange={(e) => setFormData({...formData, licensePlate: e.target.value.toUpperCase()})}
              className={inputClass}
              placeholder="ABC 1234"
            />
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
              data-testid="driver-profile-save"
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

export default DriverProfileModal;
