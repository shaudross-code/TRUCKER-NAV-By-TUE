import React, { useState } from 'react';
import { 
  Map, 
  Shield, 
  Volume2, 
  Database, 
  User, 
  Smartphone,
  Check,
  Truck,
  ArrowUpCircle,
  RotateCcw,
  Scale
} from 'lucide-react';

interface ToggleProps {
  label: string;
  description: string;
  initialValue?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({ label, description, initialValue = false }) => {
  const [enabled, setEnabled] = useState(initialValue);
  
  return (
    <div className="bg-[#0a0a0a] border border-zinc-900 p-5 rounded-2xl flex items-center justify-between group transition-all hover:border-[#D4AF37]/30">
      <div className="flex-1">
        <h4 className="text-[15px] font-bold text-white mb-0.5 group-hover:text-[#D4AF37] transition-colors">{label}</h4>
        <p className="text-[12px] text-zinc-500 font-medium">{description}</p>
      </div>
      <button 
        onClick={() => setEnabled(!enabled)}
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

const SettingsView: React.FC = () => {
  return (
    <div className="p-10 max-w-[1400px] mx-auto bg-[#050505] min-h-screen pb-24">
      <div className="mb-12">
        <h1 className="text-[32px] font-bold tracking-tight text-white mb-2 uppercase italic tracking-tighter">System Configuration</h1>
        <p className="text-zinc-500 font-medium text-lg uppercase tracking-widest italic opacity-50">Manage application preferences and professional trucking parameters.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-12">
        {/* Professional Trucking Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Truck className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em] italic">Professional Routing</h2>
          </div>
          <div className="space-y-3">
            <Toggle label="Avoid Low Bridges" description="Exclude all structures below current rig height" initialValue={true} />
            <Toggle label="Avoid U-Turns" description="Suggest alternative routes to avoid complex turns" initialValue={true} />
            <Toggle label="Weight Limit Compliance" description="Route away from bridges with strict weight caps" initialValue={true} />
            <Toggle label="STAA Route Adherence" description="Prefer designated National Network truck routes" initialValue={true} />
            <Toggle label="Avoid Tolls" description="Prefer free commercial routes when available" />
            <Toggle label="Avoid Ferries" description="Exclude water crossings from navigation" initialValue={true} />
          </div>
        </section>

        {/* Safety Protocols */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em] italic">Safety Protocols</h2>
          </div>
          <div className="space-y-3">
            <Toggle label="Hazmat Routing" description="Enforce hazardous material restricted corridors" initialValue={true} />
            <Toggle label="Traffic Alerts" description="Real-time congestion and lane closure notifications" initialValue={true} />
            <Toggle label="Weather Warnings" description="Severe weather and high-wind advisory alerts" initialValue={true} />
            <Toggle label="Speed Limit Monitor" description="Audible alert when exceeding professional limits" initialValue={true} />
          </div>
        </section>

        {/* Interface & Audio */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Volume2 className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em] italic">Interface & Audio</h2>
          </div>
          <div className="space-y-3">
            <Toggle label="Voice Guidance" description="Turn-by-turn spoken instructions via TUE System" initialValue={true} />
            <Toggle label="Auto Night Mode" description="Adjust display based on local sunset times" initialValue={true} />
          </div>
        </section>

        {/* System & Data */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em] italic">System & Data</h2>
          </div>
          <div className="space-y-3">
            <Toggle label="Data Saver Mode" description="Reduce map detail to save cellular bandwidth" />
            <div className="bg-[#0a0a0a] border border-zinc-900 p-5 rounded-2xl flex items-center justify-between group transition-all hover:border-[#D4AF37]/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800/50 group-hover:bg-[#D4AF37]/10 group-hover:border-[#D4AF37]/30 transition-all">
                  <User className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-white mb-0.5 group-hover:text-[#D4AF37] transition-colors">Driver Account</h4>
                  <p className="text-[12px] text-zinc-500 font-medium italic">ID: TUE-8842-X • Elite Pro</p>
                </div>
              </div>
              <button className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest hover:underline px-3 py-1 italic">Manage</button>
            </div>
            <div className="bg-[#0a0a0a] border border-zinc-900 p-5 rounded-2xl flex items-center justify-between group transition-all hover:border-[#D4AF37]/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800/50 group-hover:bg-[#D4AF37]/10 group-hover:border-[#D4AF37]/30 transition-all">
                  <Smartphone className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-white mb-0.5 group-hover:text-[#D4AF37] transition-colors">App Version</h4>
                  <p className="text-[12px] text-zinc-500 font-medium italic">v2.5.0-GOLD (Build 1002)</p>
                </div>
              </div>
              <button className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest hover:underline px-3 py-1 italic">Check Update</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsView;