import React, { useState, useContext } from 'react';
import { 
  Map, 
  Shield, 
  Volume2, 
  Database, 
  User, 
  Smartphone,
  Truck,
  ArrowUpCircle,
  Scale,
  RotateCcw
} from 'lucide-react';
import { AppContext } from '../App';

interface ToggleProps {
  label: string;
  description: string;
  initialValue?: boolean;
  onChange?: (val: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ label, description, initialValue = false, onChange }) => {
  const [enabled, setEnabled] = useState(initialValue);
  
  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    if (onChange) onChange(next);
  };
  
  return (
    <div className="bg-[#0a0a0a] border border-zinc-900 p-5 rounded-2xl flex items-center justify-between group transition-all hover:border-[#D4AF37]/30">
      <div className="flex-1">
        <h4 className="text-[15px] font-bold text-white mb-0.5 group-hover:text-[#D4AF37] transition-colors">{label}</h4>
        <p className="text-[12px] text-zinc-500 font-medium">{description}</p>
      </div>
      <button 
        onClick={handleToggle}
        className={`w-11 h-6 rounded-full transition-all duration-300 relative ${
          enabled ? 'bg-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-zinc-800'
        }`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${
          enabled ? 'left-6' : 'left-1'
        }`} />
      </button>
    </div>
  );
};

const ProfileField: React.FC<{ label: string, value: string, icon: any, onEdit?: () => void }> = ({ label, value, icon: Icon, onEdit }) => (
  <div className="bg-[#0a0a0a] border border-zinc-900 p-5 rounded-2xl flex items-center justify-between group transition-all hover:border-[#D4AF37]/30">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800/50 group-hover:bg-[#D4AF37]/10 group-hover:border-[#D4AF37]/30 transition-all">
        <Icon className="w-5 h-5 text-[#D4AF37]" />
      </div>
      <div>
        <h4 className="text-[15px] font-bold text-white mb-0.5 group-hover:text-[#D4AF37] transition-colors">{label}</h4>
        <p className="text-[12px] text-zinc-500 font-medium italic">{value}</p>
      </div>
    </div>
    <button onClick={onEdit} className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest hover:underline px-3 py-1 italic">Edit</button>
  </div>
);

const SettingsView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;

  const { truckProfile, setTruckProfile } = context;

  const handleEdit = (field: keyof typeof truckProfile) => {
    const current = truckProfile[field];
    const newValue = prompt(`Enter new ${field}:`, current.toString());
    if (newValue !== null) {
      if (field === 'hazmat') {
        setTruckProfile(prev => ({ ...prev, [field]: newValue.toLowerCase() === 'true' }));
      } else {
        const num = parseFloat(newValue);
        if (!isNaN(num)) {
          setTruckProfile(prev => ({ ...prev, [field]: num }));
        }
      }
    }
  };

  return (
    <div className="p-10 max-w-[1400px] mx-auto bg-[#050505] min-h-screen pb-24">
      <div className="mb-12">
        <h1 className="text-[32px] font-bold tracking-tight text-white mb-2 uppercase italic tracking-tighter">System Configuration</h1>
        <p className="text-zinc-500 font-medium text-lg uppercase tracking-widest italic opacity-50">Manage application preferences and professional routing parameters.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-12">
        {/* Professional Routing Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Map className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em] italic">Professional Routing</h2>
          </div>
          <div className="space-y-3">
            <Toggle label="Avoid Low Bridges" description="Exclude bridges below your truck's current height profile" initialValue={true} />
            <Toggle label="Avoid U-Turns" description="Only suggest turns safe for semi-truck dimensions" initialValue={true} />
            <Toggle label="Weight Limit Compliance" description="Route away from roads with strict weight restrictions" initialValue={true} />
            <Toggle label="Strict Truck Routing" description="Enforce STAA and designated truck route adherence" initialValue={true} />
            <Toggle 
              label="Hazmat Routing" 
              description="Enforce hazardous material restrictions based on load" 
              initialValue={truckProfile.hazmat} 
              onChange={(val) => setTruckProfile(prev => ({ ...prev, hazmat: val }))}
            />
            <Toggle label="Avoid Tolls" description="Prefer free routes when available" />
            <Toggle label="Avoid Ferries" description="Exclude water crossings from route" initialValue={true} />
          </div>
        </section>

        {/* Truck Profile Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Truck className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em] italic">Truck Specifications</h2>
          </div>
          <div className="space-y-3">
            <ProfileField 
              label="Current Height" 
              value={`${truckProfile.height}' (Truck Height)`} 
              icon={ArrowUpCircle} 
              onEdit={() => handleEdit('height')}
            />
            <ProfileField 
              label="Gross Weight" 
              value={`${truckProfile.weight.toLocaleString()} lbs (GVW)`} 
              icon={Scale} 
              onEdit={() => handleEdit('weight')}
            />
            <ProfileField 
              label="Trailer Length" 
              value={`${truckProfile.length}' (Trailer Length)`} 
              icon={RotateCcw} 
              onEdit={() => handleEdit('length')}
            />
            <div className="mt-6 p-4 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-2xl">
              <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                <Shield className="w-3 h-3" />
                Safety Confirmation
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed italic">
                Routing algorithm is currently synchronized with the dimensions above. Ensure these match your actual load for legal compliance.
              </p>
            </div>
          </div>
        </section>

        {/* Safety Protocols */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em] italic">Safety Protocols</h2>
          </div>
          <div className="space-y-3">
            <Toggle label="Traffic Alerts" description="Real-time congestion and accident notifications" initialValue={true} />
            <Toggle label="Weather Warnings" description="Severe weather and high-wind alerts" initialValue={true} />
            <Toggle label="Speed Limit Monitor" description="Audible alert when exceeding limit" initialValue={true} />
          </div>
        </section>

        {/* Interface & Audio */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Volume2 className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em] italic">Interface & Audio</h2>
          </div>
          <div className="space-y-3">
            <Toggle label="Voice Guidance" description="Turn-by-turn spoken instructions" initialValue={true} />
            <Toggle label="Auto Night Mode" description="Adjust display brightness based on local sunset" initialValue={true} />
          </div>
        </section>

        {/* System & Data */}
        <section className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em] italic">System & Data</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Toggle label="Data Saver" description="Reduce map detail" />
            <div className="bg-[#0a0a0a] border border-zinc-900 p-5 rounded-2xl flex items-center justify-between group transition-all hover:border-[#D4AF37]/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800/50 group-hover:bg-[#D4AF37]/10 transition-all">
                  <User className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-white group-hover:text-[#D4AF37] transition-colors">Driver Account</h4>
                  <p className="text-[12px] text-zinc-500 font-medium italic">TUE-8842-X • Elite Pro</p>
                </div>
              </div>
            </div>
            <div className="bg-[#0a0a0a] border border-zinc-900 p-5 rounded-2xl flex items-center justify-between group transition-all hover:border-[#D4AF37]/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800/50 group-hover:bg-[#D4AF37]/10 transition-all">
                  <Smartphone className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-white group-hover:text-[#D4AF37] transition-colors">System v2.5</h4>
                  <p className="text-[12px] text-zinc-500 font-medium italic">GOLD Build 1002</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsView;