import React, { useState } from 'react';
import { 
  Truck, 
  ArrowUpCircle, 
  Scale, 
  RotateCcw, 
  ShieldAlert, 
  ChevronRight, 
  Settings2, 
  Container,
  Zap,
  CheckCircle2,
  Info
} from 'lucide-react';

const ProfileStat: React.FC<{ label: string, value: string, icon: any }> = ({ label, value, icon: Icon }) => (
  <div className="bg-[#0a0a0a] border border-zinc-900 p-6 rounded-[2rem] flex flex-col justify-between group transition-all hover:border-[#D4AF37]/30">
    <div className="flex justify-between items-start mb-6">
      <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800/50 group-hover:bg-[#D4AF37]/10 transition-all">
        <Icon className="w-6 h-6 text-[#D4AF37]" />
      </div>
      <button className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest hover:underline italic">Edit</button>
    </div>
    <div>
      <h4 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">{label}</h4>
      <p className="text-2xl font-black text-white italic tracking-tighter">{value}</p>
    </div>
  </div>
);

const TruckProfile: React.FC = () => {
  const [activePreset, setActivePreset] = useState('53ft High Cube');

  const presets = [
    { name: '53ft High Cube', dims: '13\' 6" Height • 53\' Length', type: 'Dry Van' },
    { name: 'Standard Reefer', dims: '13\' 4" Height • 53\' Length', type: 'Refrigerated' },
    { name: 'Flatbed Overweight', dims: 'Height Var • 48\' Length', type: 'Specialized' },
  ];

  return (
    <div className="p-10 max-w-[1400px] mx-auto bg-[#050505] min-h-screen pb-32">
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-[42px] font-black tracking-tighter text-white mb-2 uppercase italic leading-none">
            Rig Profile<span className="text-[#D4AF37]">.</span>
          </h1>
          <p className="text-zinc-500 font-medium text-lg uppercase tracking-widest italic opacity-50">Active truck and trailer configuration for routing.</p>
        </div>
        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-6 py-4 rounded-3xl flex items-center gap-4 shadow-[0_0_30px_rgba(212,175,55,0.1)]">
           <div className="bg-[#D4AF37] p-2 rounded-xl">
             <CheckCircle2 className="w-5 h-5 text-black" strokeWidth={3} />
           </div>
           <div>
             <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest italic">Sync Status</p>
             <p className="text-xl font-black text-white">Route Optimized</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Visual Truck Representation */}
        <div className="lg:col-span-7 bg-[#0a0a0a] border border-zinc-900 rounded-[3rem] p-10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">2025 Peterbilt 589</h2>
                <div className="flex gap-3">
                  <span className="px-3 py-1 bg-zinc-900 text-zinc-500 text-[10px] font-black rounded-full uppercase tracking-widest border border-zinc-800">Unit: TUE-8842-X</span>
                  <span className="px-3 py-1 bg-zinc-900 text-[#D4AF37] text-[10px] font-black rounded-full uppercase tracking-widest border border-[#D4AF37]/20">Class 8 Elite</span>
                </div>
              </div>
              <div className="p-4 bg-zinc-900 rounded-[2rem] border border-zinc-800 group-hover:border-[#D4AF37]/40 transition-all">
                <Truck className="w-12 h-12 text-[#D4AF37]" strokeWidth={1.5} />
              </div>
            </div>

            <div className="py-20 flex justify-center items-center">
              <div className="relative w-full max-w-lg aspect-[3/1] bg-zinc-900/50 rounded-[2rem] border border-dashed border-zinc-800 flex items-center justify-center group-hover:border-[#D4AF37]/20 transition-all">
                <div className="flex flex-col items-center gap-4">
                  <Container className="w-16 h-16 text-zinc-800 group-hover:text-[#D4AF37]/20 transition-all" />
                  <p className="text-[11px] font-bold text-zinc-700 uppercase tracking-[0.3em]">Rig Telemetry Visualization</p>
                </div>
                <div className="absolute -top-6 left-0 right-0 border-t border-zinc-800 flex justify-center">
                   <span className="bg-[#0a0a0a] px-3 text-[10px] font-black text-zinc-500 uppercase -translate-y-1/2">Length: 72' Total</span>
                </div>
                <div className="absolute top-0 bottom-0 -left-6 border-l border-zinc-800 flex items-center">
                   <span className="bg-[#0a0a0a] py-3 text-[10px] font-black text-zinc-500 uppercase -translate-x-1/2 -rotate-90 origin-center whitespace-nowrap">Height: 13' 6"</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900/40 p-5 rounded-3xl border border-zinc-800/50 flex items-center gap-4">
                <Zap className="w-5 h-5 text-[#D4AF37]" />
                <div>
                  <p className="text-[10px] font-black text-zinc-600 uppercase">Engine Status</p>
                  <p className="text-sm font-black text-white">X15 Performance • 605 HP</p>
                </div>
              </div>
              <div className="bg-zinc-900/40 p-5 rounded-3xl border border-zinc-800/50 flex items-center gap-4">
                <Settings2 className="w-5 h-5 text-[#D4AF37]" />
                <div>
                  <p className="text-[10px] font-black text-zinc-600 uppercase">Transmission</p>
                  <p className="text-sm font-black text-white">Endurant XD Pro 18-Spd</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ProfileStat label="Rig Height" value="13' 6\"" icon={ArrowUpCircle} />
          <ProfileStat label="Gross Weight" value="78,500 LBS" icon={Scale} />
          <ProfileStat label="Rig Length" value="72' TOTAL" icon={RotateCcw} />
          <ProfileStat label="Rig Width" value="102\"" icon={Container} />
          
          <div className="sm:col-span-2 bg-rose-500/5 border border-rose-500/20 p-6 rounded-[2rem] flex items-center gap-5">
            <div className="p-3 bg-rose-500 rounded-2xl">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Warning: Load Profile</p>
              <p className="text-xs font-bold text-zinc-400 leading-relaxed italic">Active hazmat protocol detected. Routing restricted to designated corridors only.</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.4em] italic">Trailer Configuration Presets</h3>
          <button className="flex items-center gap-2 text-[11px] font-black text-zinc-500 hover:text-white transition-all uppercase tracking-widest">
            Manage Presets <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => setActivePreset(preset.name)}
              className={`text-left p-8 rounded-[2.5rem] border transition-all duration-300 relative group overflow-hidden ${
                activePreset === preset.name 
                  ? 'bg-[#D4AF37]/10 border-[#D4AF37] shadow-[0_20px_60px_rgba(212,175,55,0.1)]' 
                  : 'bg-[#0a0a0a] border-zinc-900 hover:border-zinc-800'
              }`}
            >
              {activePreset === preset.name && (
                <div className="absolute top-6 right-8">
                   <div className="w-8 h-8 bg-[#D4AF37] rounded-full flex items-center justify-center text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                     <CheckCircle2 className="w-4 h-4" strokeWidth={3} />
                   </div>
                </div>
              )}
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2 italic">{preset.type}</p>
              <h4 className="text-xl font-black text-white mb-4 italic tracking-tighter group-hover:text-[#D4AF37] transition-colors">{preset.name}</h4>
              <p className="text-xs font-bold text-zinc-500 leading-loose">{preset.dims}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TruckProfile;