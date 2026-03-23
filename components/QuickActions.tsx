import React from 'react';
import { Fuel, Coffee, TrendingUp, Wrench } from 'lucide-react';
import { ViewType } from '../types';

export const QuickActions = React.memo(({ setActiveView, setNavTarget, setEldStatus }: { setActiveView: any, setNavTarget: any, setEldStatus: any }) => {
  const actions = [
    { 
      label: 'Find Fuel', 
      icon: Fuel, 
      color: 'text-yellow-400', 
      bg: 'bg-yellow-400/10',
      onClick: () => {
        setNavTarget?.('truck stops');
        setActiveView?.(ViewType.NAVIGATION);
      }
    },
    { 
      label: 'Start Break', 
      icon: Coffee, 
      color: 'text-blue-400', 
      bg: 'bg-blue-400/10',
      onClick: () => {
        setEldStatus?.(prev => ({ ...prev, status: 'OFF' }));
      }
    },
    { 
      label: 'Load Board', 
      icon: TrendingUp, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-400/10',
      onClick: () => setActiveView?.(ViewType.LOAD_BOARD)
    },
    { 
      label: 'Maintenance', 
      icon: Wrench, 
      color: 'text-rose-400', 
      bg: 'bg-rose-400/10',
      onClick: () => setActiveView?.(ViewType.MAINTENANCE)
    },
  ];

  return (
    <div className="bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl group hover:border-[#D4AF37]/30 transition-all duration-700">
      <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight mb-8">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-[#D4AF37]/30 hover:bg-white/10 transition-all group/btn"
          >
            <div className={`${action.bg} ${action.color} p-4 rounded-2xl mb-3 group-hover/btn:scale-110 transition-transform`}>
              <action.icon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest group-hover/btn:text-white transition-colors">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});
