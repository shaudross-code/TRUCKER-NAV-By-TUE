import React, { useState } from 'react';
import { Truck } from 'lucide-react';
import TruckProfileModal from './TruckProfileModal';

export const TruckProfileCard = React.memo(({ truckProfile, setTruckProfile }: { truckProfile: any, setTruckProfile: any }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!truckProfile || !setTruckProfile) return null;

  return (
    <>
      <div className="bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] md:rounded-[3rem] p-6 md:p-10 flex flex-col shadow-2xl group hover:border-[#D4AF37]/30 transition-all duration-700">
        <div className="flex justify-between items-center mb-8 md:mb-12">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="bg-[#D4AF37] p-3 md:p-4 rounded-xl md:rounded-2xl text-black shadow-[0_0_20px_rgba(212,175,55,0.3)]">
              <Truck className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight">Truck Profile</h2>
              <p className="text-[8px] md:text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest">ACTIVE UNIT {truckProfile.make} {truckProfile.model} {truckProfile.year}</p>
            </div>
          </div>
        </div>
          <div className="space-y-6 md:space-y-8 flex-1">
          <div className="flex justify-between items-end border-b border-white/5 pb-3 md:pb-4">
            <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-zinc-600">Truck Make</span>
            <span className="text-2xl md:text-3xl font-bold text-white tracking-tight">{truckProfile.make}</span>
          </div>
          <div className="flex justify-between items-end border-b border-white/5 pb-3 md:pb-4">
            <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-zinc-600">Truck Model</span>
            <span className="text-2xl md:text-3xl font-bold text-white tracking-tight">{truckProfile.model}</span>
          </div>
          <div className="flex justify-between items-end border-b border-white/5 pb-3 md:pb-4">
            <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-zinc-600">Truck Year</span>
            <span className="text-2xl md:text-3xl font-bold text-white tracking-tight">{truckProfile.year}</span>
          </div>
          <div className="flex justify-between items-end border-b border-white/5 pb-3 md:pb-4">
            <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-zinc-600">Max Height</span>
            <span className="text-2xl md:text-3xl font-bold text-white tracking-tight">{truckProfile.height}<span className="text-xs text-zinc-700 ml-1">FT</span></span>
          </div>
          <div className="flex justify-between items-end border-b border-white/5 pb-3 md:pb-4">
            <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-zinc-600">Width</span>
            <span className="text-2xl md:text-3xl font-bold text-white tracking-tight">{truckProfile.width}<span className="text-xs text-zinc-700 ml-1">FT</span></span>
          </div>
          <div className="flex justify-between items-end border-b border-white/5 pb-3 md:pb-4">
            <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-zinc-600">Gross Weight</span>
            <span className="text-2xl md:text-3xl font-bold text-white tracking-tight">{truckProfile.weight.toLocaleString()}<span className="text-xs text-zinc-700 ml-1">LBS</span></span>
          </div>
          <div className="flex justify-between items-end border-b border-white/5 pb-3 md:pb-4">
            <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-zinc-600">Total Length</span>
            <span className="text-2xl md:text-3xl font-bold text-white tracking-tight">{truckProfile.length}<span className="text-xs text-zinc-700 ml-1">FT</span></span>
          </div>
          <div className="flex justify-between items-end border-b border-white/5 pb-3 md:pb-4">
            <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-zinc-600">Axle Count</span>
            <span className="text-2xl md:text-3xl font-bold text-white tracking-tight">{truckProfile.axleCount}</span>
          </div>
          <div className="flex justify-between items-end border-b border-white/5 pb-3 md:pb-4">
            <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-zinc-600">Axle Weight</span>
            <span className="text-2xl md:text-3xl font-bold text-white tracking-tight">{truckProfile.axleWeight.toLocaleString()}<span className="text-xs text-zinc-700 ml-1">LBS</span></span>
          </div>
          <div className="flex justify-between items-end border-b border-white/5 pb-3 md:pb-4">
            <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-zinc-600">Trailer Count</span>
            <span className="text-2xl md:text-3xl font-bold text-white tracking-tight">{truckProfile.trailerCount}</span>
          </div>
          <div className="flex justify-between items-end border-b border-white/5 pb-3 md:pb-4">
            <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-zinc-600">Tunnel Category</span>
            <span className="text-2xl md:text-3xl font-bold text-white tracking-tight">{truckProfile.tunnelCategory}</span>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-zinc-600">Hazmat Status</span>
            <span className={`text-lg md:text-xl font-bold uppercase tracking-widest ${truckProfile.hazmat ? 'text-rose-500' : 'text-emerald-500'}`}>
              {truckProfile.hazmat ? 'Restricted' : 'Cleared'}
            </span>
          </div>
        </div>
        <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">System Verified</span>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 md:px-6 py-1.5 md:py-2 bg-white/5 hover:bg-[#D4AF37] hover:text-black rounded-full text-[8px] md:text-[10px] font-bold text-white uppercase tracking-widest transition-all"
          >
            Modify
          </button>
        </div>
      </div>
      <TruckProfileModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        profile={truckProfile} 
        onSave={setTruckProfile} 
      />
    </>
  );
});
