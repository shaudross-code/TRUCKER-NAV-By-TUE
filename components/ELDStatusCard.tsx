import React from 'react';
import { Clock } from 'lucide-react';

const TimerProgressBar = React.memo(({ seconds, total, color }: { seconds: number, total: number, color: string }) => {
  return (
    <div className="h-1.5 md:h-2 w-full bg-white/5 rounded-full overflow-hidden">
      <div className={`${color} h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(212,175,55,0.2)]`} style={{ width: `${(seconds / total) * 100}%` }} />
    </div>
  );
});

export const ELDStatusCard = React.memo(({ eldStatus, setEldStatus, formatTime, onViewLogs }: { eldStatus: any, setEldStatus: any, formatTime: (s: number) => string, onViewLogs?: () => void }) => {
  return (
    <div className="bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] md:rounded-[3rem] p-6 md:p-10 flex flex-col shadow-2xl mb-6 md:mb-8 group hover:border-[#D4AF37]/30 transition-all duration-700">
      <div className="flex justify-between items-center mb-8 md:mb-12">
        <div className="flex items-center gap-4 md:gap-5">
          <div className="bg-[#D4AF37] p-3 md:p-4 rounded-xl md:rounded-2xl text-black shadow-[0_0_20px_rgba(212,175,55,0.3)]">
            <Clock className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight">ELD Status</h2>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#D4AF37] animate-pulse shadow-[0_0_8px_#D4AF37]" />
              <p className="text-[8px] md:text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest">Active</p>
            </div>
          </div>
        </div>
        <span className={`px-4 md:px-6 py-1.5 md:py-2 ${eldStatus?.status === 'DRIVE' ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.3)]' : 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.3)]'} text-[8px] md:text-[10px] font-bold rounded-full uppercase tracking-widest`}>
          {eldStatus?.status === 'DRIVE' ? 'Driving' : eldStatus?.status === 'ON' ? 'On Duty' : eldStatus?.status === 'SB' ? 'Sleeper' : 'Off Duty'}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 md:gap-3 mb-8 md:mb-12">
        {(['OFF', 'SB', 'ON', 'DRIVE'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setEldStatus?.(prev => ({ ...prev, status: s }))}
            className={`py-2 md:py-3 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-bold uppercase tracking-widest transition-all border ${
              eldStatus?.status === s 
                ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20' 
                : 'bg-white/5 text-zinc-600 border-white/5 hover:border-white/10 hover:text-white'
            }`}
          >
            {s === 'SB' ? 'Sleeper' : s === 'DRIVE' ? 'Drive' : s === 'ON' ? 'On Duty' : 'Off'}
          </button>
        ))}
      </div>

      <div className="space-y-8 md:space-y-12 flex-1">
        {eldStatus?.timers?.map((timer: any) => (
          <div key={timer.label} className="relative">
            <div className="flex justify-between items-end mb-3 md:mb-4">
              <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-zinc-600">{timer.label}</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl md:text-4xl font-bold tracking-tight ${timer.label === 'Until Break' ? 'text-[#D4AF37]' : 'text-white'}`}>{formatTime(timer.seconds)}</span>
                <span className="text-[8px] md:text-[10px] font-bold text-zinc-700 uppercase tracking-widest">REM</span>
              </div>
            </div>
            <TimerProgressBar seconds={timer.seconds} total={timer.total} color={timer.color} />
          </div>
        ))}
      </div>
      <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#D4AF37] animate-pulse" />
          <span className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cycle resets in 34h</span>
        </div>
        <button onClick={onViewLogs} className="px-4 md:px-6 py-1.5 md:py-2 bg-white/5 hover:bg-[#D4AF37] hover:text-black rounded-full text-[8px] md:text-[10px] font-bold text-white uppercase tracking-widest transition-all">View Logs</button>
      </div>
    </div>
  );
});
