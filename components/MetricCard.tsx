import React from 'react';
import { TrendingUp } from 'lucide-react';

export const MetricCard = React.memo(({ icon: Icon, label, value, trend, target, iconBg, iconColor, progress, onClick, isInteractive }: { 
  icon: any, 
  label: string, 
  value: string, 
  trend?: string, 
  target?: string, 
  iconBg: string, 
  iconColor: string,
  progress?: number,
  onClick?: () => void,
  isInteractive?: boolean
}) => (
  <div 
    onClick={onClick}
    className={`bg-black/80 backdrop-blur-3xl border border-white/10 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] relative overflow-hidden group transition-all duration-500 ${isInteractive ? 'cursor-pointer hover:border-[#D4AF37]/50 hover:bg-zinc-900/50' : ''}`}
  >
    <div className="flex justify-between items-start mb-4 md:mb-6">
      <div>
        <div className="text-zinc-600 text-[8px] md:text-[10px] font-bold uppercase tracking-widest mb-1 md:mb-2">{label}</div>
        <div className="text-2xl md:text-4xl font-bold text-white tracking-tight leading-none">{value}</div>
      </div>
      <div className={`${iconBg} ${iconColor} p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/5 shadow-inner transition-transform group-hover:scale-110`}>
        <Icon className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
      </div>
    </div>
    
    {progress !== undefined && (
      <div className="mt-6">
        <div className="flex justify-between items-end mb-2">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{target || 'Target Progress'}</span>
          <span className="text-[11px] font-bold text-[#D4AF37]">{progress.toFixed(2)}%</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <div 
            className={`h-full ${iconBg} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(212,175,55,0.3)]`} 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>
    )}

    {trend && (
      <div className="mt-4 flex items-center gap-2">
        <TrendingUp className="w-3 h-3 text-emerald-500" />
        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{trend}</span>
      </div>
    )}

    {target && !progress && (
      <div className="text-[11px] text-zinc-600 font-bold uppercase tracking-widest mt-4">
        Target: <span className="text-white ml-1">{target}</span>
      </div>
    )}

    {isInteractive && (
      <div className="absolute bottom-3 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Update Entry</div>
      </div>
    )}
  </div>
));
