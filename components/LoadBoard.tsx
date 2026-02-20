import React, { useContext } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { AppContext } from '../App.tsx';
import { ViewType } from '../types.ts';

const LoadCard: React.FC<{
  origin: string;
  originTime: string;
  destination: string;
  distance: string;
  commodity: string;
  rate: string;
  total: string;
  match: number;
  progress: number;
  onBook: () => void;
}> = ({ origin, originTime, destination, distance, commodity, rate, total, match, progress, onBook }) => (
  <div className="bg-[#0a0a0a] border border-zinc-900 rounded-[1.25rem] overflow-hidden mb-4 group hover:border-[#D4AF37]/40 transition-all">
    <div className="p-6 flex items-center justify-between gap-8">
      {/* Route Info */}
      <div className="flex gap-4 min-w-[300px]">
        <div className="flex flex-col items-center py-1">
          <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />
          <div className="w-[1.5px] h-10 bg-zinc-800 my-1" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
        </div>
        <div className="flex flex-col justify-between py-0.5">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-white uppercase italic tracking-tighter">{origin}</span>
            <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 text-[10px] font-bold rounded uppercase tracking-widest border border-zinc-800">{originTime}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-[#D4AF37] uppercase italic tracking-tighter">{destination}</span>
            <span className="text-zinc-600 text-sm font-medium">{distance}</span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-1 justify-around items-center px-8 border-x border-zinc-900/50">
        <div className="text-center">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">Cargo</p>
          <p className="text-sm font-bold text-zinc-300 italic uppercase">{commodity}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">Rate/Mi</p>
          <p className="text-sm font-black text-[#D4AF37] italic">{rate}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">Total</p>
          <p className="text-xl font-black text-white italic tracking-tighter">{total}</p>
        </div>
      </div>

      {/* Action */}
      <div className="flex flex-col items-end gap-3 min-w-[160px]">
        <div className="flex items-center gap-2 px-3 py-1 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 rounded-full text-[10px] font-black uppercase tracking-widest">
          <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-pulse shadow-[0_0_8px_#D4AF37]" />
          {match}% Match
        </div>
        <button 
          onClick={onBook}
          className="w-full bg-[#D4AF37] hover:bg-[#FFD700] text-black py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-[#D4AF37]/20"
        >
          Book Now
          <CheckCircle2 className="w-4 h-4" />
        </button>
      </div>
    </div>
    <div className="h-1 w-full bg-zinc-900/50">
      <div className="h-full bg-[#D4AF37]/40 rounded-r-full shadow-[0_0_10px_rgba(212,175,55,0.4)]" style={{ width: `${progress}%` }} />
    </div>
  </div>
);

const LoadBoard: React.FC = () => {
  const context = useContext(AppContext);
  const handleBook = (destination: string) => {
    if (context) {
      context.setNavTarget(destination);
      context.setActiveView(ViewType.NAVIGATION);
    }
  };

  return (
    <div className="p-10 max-w-[1400px] mx-auto bg-[#050505]">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2 uppercase italic tracking-tighter">
            Ghost Dispatcher<span className="text-lg align-top ml-0.5 text-[#D4AF37]">™</span>
          </h1>
          <p className="text-zinc-500 font-medium text-lg uppercase tracking-widest italic opacity-50">AI-negotiated loads matching TUE-8842-X criteria.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-3 px-5 py-2.5 bg-[#0a0a0a] border border-[#D4AF37]/20 rounded-xl">
             <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest italic">RPM Target:</span>
             <span className="text-[11px] font-black text-[#D4AF37] italic">$3.00+</span>
          </div>
          <div className="flex items-center gap-3 px-5 py-2.5 bg-[#0a0a0a] border border-[#D4AF37]/20 rounded-xl">
             <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest italic">Max Weight:</span>
             <span className="text-[11px] font-black text-[#D4AF37] italic">42k</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <LoadCard origin="Chicago, IL" originTime="READY" destination="Dallas, TX" distance="928 mi" commodity="ELECTRO" rate="$3.45" total="$3,200" match={98} progress={100} onBook={() => handleBook("Dallas, TX")} />
        <LoadCard origin="Joliet, IL" originTime="FRI 08:00" destination="Atlanta, GA" distance="724 mi" commodity="PAPER" rate="$2.90" total="$2,100" match={85} progress={65} onBook={() => handleBook("Atlanta, GA")} />
        <LoadCard origin="Gary, IN" originTime="READY" destination="Miami, FL" distance="1322 mi" commodity="REEFER" rate="$3.10" total="$4,100" match={92} progress={92} onBook={() => handleBook("Miami, FL")} />
        <LoadCard origin="Chicago, IL" originTime="ASAP" destination="Detroit, MI" distance="285 mi" commodity="AUTO" rate="$4.20" total="$1,200" match={74} progress={78} onBook={() => handleBook("Detroit, MI")} />
      </div>
    </div>
  );
};

export default LoadBoard;