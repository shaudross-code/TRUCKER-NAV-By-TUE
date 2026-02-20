import React from 'react';
import { 
  LayoutGrid, 
  Navigation, 
  Package, 
  MapPin, 
  Wrench, 
  Settings,
  Mic,
  Truck,
  UserCircle
} from 'lucide-react';
import { ViewType } from '../types.ts';

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  onVoiceToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, onVoiceToggle }) => {
  const menuItems = [
    { id: ViewType.DASHBOARD, icon: LayoutGrid, label: 'Dashboard' },
    { id: ViewType.TRUCK_PROFILE, icon: UserCircle, label: 'Truck Profile' },
    { id: ViewType.NAVIGATION, icon: Navigation, label: 'Navigation' },
    { id: ViewType.LOAD_BOARD, icon: Package, label: 'Load Board' },
    { id: ViewType.TRUCK_STOPS, icon: MapPin, label: 'Truck Stops' },
    { id: ViewType.MAINTENANCE, icon: Wrench, label: 'Maintenance' },
    { id: ViewType.SETTINGS, icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="w-64 bg-black border-r border-zinc-900 flex flex-col h-full z-50 relative">
      {/* Brand Header: Gold Semi-Truck Emblem */}
      <div className="px-6 py-10 flex items-center gap-4">
        <div className="bg-gradient-to-br from-[#D4AF37] via-[#FFD700] to-[#B8860B] p-2.5 rounded-[1.2rem] shadow-[0_0_20px_rgba(212,175,55,0.4)] flex items-center justify-center border border-white/20">
          <Truck className="w-8 h-8 text-black fill-current" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col">
          <h1 className="text-[18px] font-[900] tracking-[-0.02em] leading-none text-white font-sans uppercase">Truckers Nav</h1>
          <p className="text-[10px] text-[#D4AF37] font-[800] tracking-[0.3em] uppercase mt-2">By Tue</p>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 mt-2 px-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-200 group relative ${
                isActive 
                  ? 'bg-[#D4AF37]/10 text-white border border-[#D4AF37]/20' 
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/40'
              }`}
            >
              {/* Active Indicator Bar - Now Gold */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#D4AF37] rounded-r-full shadow-[2px_0_15px_rgba(212,175,55,0.6)]" />
              )}
              
              <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-[#D4AF37]' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
              <span className={`text-[14px] font-semibold tracking-tight ${isActive ? 'text-zinc-100' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Voice Command Button */}
      <div className="p-6">
        <button 
          onClick={onVoiceToggle}
          className="w-full bg-black border border-zinc-900 hover:border-[#D4AF37]/30 p-4 rounded-2xl flex items-center gap-3 transition-all group"
        >
          <div className="bg-zinc-900 p-1.5 rounded-lg group-hover:bg-[#D4AF37]/10">
            <Mic className="w-4 h-4 text-zinc-400 group-hover:text-[#D4AF37]" />
          </div>
          <span className="text-[13px] font-semibold text-zinc-500 group-hover:text-zinc-200">Voice Command</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;