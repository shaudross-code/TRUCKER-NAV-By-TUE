import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutGrid, 
  Navigation, 
  Package, 
  MapPin, 
  Wrench, 
  Settings,
  Mic,
  Truck,
  Volume2,
  ChevronLeft,
  ChevronRight,
  History,
  DollarSign,
  LogOut,
  Github
} from 'lucide-react';
import { ViewType } from '../types';
import { speak } from '../services/speechService';

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  onVoiceToggle: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSignOut?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeView, 
  onViewChange, 
  onVoiceToggle,
  isCollapsed = false,
  onToggleCollapse,
  onSignOut
}) => {
  const menuItems = [
    { id: ViewType.DASHBOARD, icon: LayoutGrid, label: 'Dashboard' },
    { id: ViewType.NAVIGATION, icon: Navigation, label: 'Navigation' },
    { id: ViewType.LOAD_BOARD, icon: Package, label: 'Load Board' },
    { id: ViewType.TRUCK_STOPS, icon: MapPin, label: 'Truck Stops' },
    { id: ViewType.PAY_SUMMARY, icon: DollarSign, label: 'Pay Summary' },
    { id: ViewType.MAINTENANCE, icon: Wrench, label: 'Maintenance' },
    { id: ViewType.ROUTE_HISTORY, icon: History, label: 'History' },
    { id: ViewType.GITHUB_UPDATES, icon: Github, label: 'Updates' },
    { id: ViewType.SETTINGS, icon: Settings, label: 'Settings' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="relative h-full z-50">
        <motion.div 
          drag="x"
          dragConstraints={{ left: -100, right: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -50 && !isCollapsed && onToggleCollapse) {
              onToggleCollapse();
            }
          }}
          className={`hidden md:flex ${isCollapsed ? 'w-20' : 'w-64'} bg-black border-r border-zinc-900 flex-col h-full transition-all duration-300 ease-in-out`}
        >
          {/* Brand Header: Gold Semi-Truck Emblem */}
          <div className={`px-6 py-10 flex items-center gap-4 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="bg-gradient-to-br from-[#D4AF37] via-[#FFD700] to-[#B8860B] p-2.5 rounded-[1.2rem] shadow-[0_0_20px_rgba(212,175,55,0.4)] flex items-center justify-center border border-white/20 shrink-0">
              <Truck className="w-8 h-8 text-black fill-current" strokeWidth={2.5} />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col animate-in fade-in duration-300">
                <h1 className="text-[18px] font-[900] tracking-[-0.02em] leading-none text-white font-sans uppercase">TRUCKERS NAV</h1>
                <p className="text-[10px] text-[#D4AF37] font-[800] tracking-[0.3em] uppercase mt-2">By TUE</p>
              </div>
            )}
          </div>

          {/* Nav Items */}
          <nav className="flex-1 mt-2 px-3 space-y-1 overflow-hidden">
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
                  } ${isCollapsed ? 'justify-center' : ''}`}
                >
                  {/* Active Indicator Bar - Now Gold */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#D4AF37] rounded-r-full shadow-[2px_0_15px_rgba(212,175,55,0.6)]" />
                  )}
                  
                  <item.icon className={`w-5 h-5 transition-colors shrink-0 ${isActive ? 'text-[#D4AF37]' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                  {!isCollapsed && (
                    <span className={`text-[14px] font-semibold tracking-tight animate-in fade-in duration-300 ${isActive ? 'text-zinc-100' : ''}`}>
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Voice Command Button */}
          <div className={`p-6 space-y-3 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
            <button 
              onClick={() => speak("Voice guidance is active.")}
              className={`w-full bg-black border border-zinc-900 hover:border-[#D4AF37]/30 p-4 rounded-2xl flex items-center gap-3 transition-all group ${isCollapsed ? 'justify-center' : ''}`}
            >
              <div className="bg-zinc-900 p-1.5 rounded-lg group-hover:bg-[#D4AF37]/10 shrink-0">
                <Volume2 className="w-4 h-4 text-zinc-400 group-hover:text-[#D4AF37]" />
              </div>
              {!isCollapsed && <span className="text-[13px] font-semibold text-zinc-500 group-hover:text-zinc-200 animate-in fade-in duration-300">Test Voice</span>}
            </button>

            <button 
              onClick={onVoiceToggle}
              className={`w-full bg-black border border-zinc-900 hover:border-[#D4AF37]/30 p-4 rounded-2xl flex items-center gap-3 transition-all group ${isCollapsed ? 'justify-center' : ''}`}
            >
              <div className="bg-zinc-900 p-1.5 rounded-lg group-hover:bg-[#D4AF37]/10 shrink-0">
                <Mic className="w-4 h-4 text-zinc-400 group-hover:text-[#D4AF37]" />
              </div>
              {!isCollapsed && <span className="text-[13px] font-semibold text-zinc-500 group-hover:text-zinc-200 animate-in fade-in duration-300">Voice Command</span>}
            </button>

            {onSignOut && (
              <button 
                onClick={onSignOut}
                className={`w-full bg-black border border-zinc-900 hover:border-rose-500/30 p-4 rounded-2xl flex items-center gap-3 transition-all group ${isCollapsed ? 'justify-center' : ''}`}
              >
                <div className="bg-zinc-900 p-1.5 rounded-lg group-hover:bg-rose-500/10 shrink-0">
                  <LogOut className="w-4 h-4 text-zinc-400 group-hover:text-rose-500" />
                </div>
                {!isCollapsed && <span className="text-[13px] font-semibold text-zinc-500 group-hover:text-zinc-200 animate-in fade-in duration-300">Sign Out</span>}
              </button>
            )}
          </div>

          {/* Swipe Away Toggle Button - Only in Navigation View or always? User said "In navigation view" */}
          {(activeView === ViewType.NAVIGATION || activeView === ViewType.DASHBOARD) && onToggleCollapse && (
            <button 
              onClick={onToggleCollapse}
              className={`absolute -right-4 top-1/2 -translate-y-1/2 z-[60] bg-[#D4AF37] text-black p-1.5 rounded-full shadow-xl hover:scale-110 transition-transform border-2 border-black`}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </motion.div>

      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-zinc-900 px-2 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar z-[100] pb-safe">
        {menuItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all shrink-0 min-w-[64px] ${
                isActive ? 'text-[#D4AF37]' : 'text-zinc-500'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
        <button 
          onClick={onVoiceToggle}
          className="flex flex-col items-center justify-center gap-1 p-2 text-zinc-500 shrink-0 min-w-[64px]"
        >
          <div className="bg-[#D4AF37] p-1.5 rounded-full shadow-[0_0_10px_rgba(212,175,55,0.4)]">
            <Mic className="w-4 h-4 text-black" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Voice</span>
        </button>
      </div>
    </>
  );
};

export default React.memo(Sidebar);
