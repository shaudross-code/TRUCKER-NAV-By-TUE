import React from 'react';
import { Shield } from 'lucide-react';

export const SpeedLimitSign: React.FC<{ limit: number | null; currentSpeed?: number; compact?: boolean }> = ({ limit, currentSpeed, compact }) => {
  if (!limit) return null;
  const isSpeeding = currentSpeed !== undefined && currentSpeed > limit;
  
  if (compact) {
    return (
      <div className={`bg-black/90 backdrop-blur-3xl border ${isSpeeding ? 'border-red-600 ring-1 ring-red-600/50' : 'border-[#D4AF37]/30'} rounded-lg w-7 h-9 flex flex-col items-center justify-center shadow-2xl ml-2 overflow-hidden transition-colors duration-300`}>
        <div className="w-full bg-black/50 flex flex-col items-center pt-0.5">
          <span className={`text-[#D4AF37] text-[4px] font-bold uppercase tracking-tighter leading-none ${isSpeeding ? 'text-red-500' : ''}`}>Speed</span>
          <span className={`text-[#D4AF37] text-[4px] font-bold uppercase tracking-tighter leading-none ${isSpeeding ? 'text-red-500' : ''}`}>Limit</span>
        </div>
        <span className={`text-white text-[10px] font-black leading-none py-0.5 ${isSpeeding ? 'text-red-500 scale-110' : ''} transition-transform`}>{limit}</span>
      </div>
    );
  }
  return (
    <div className={`bg-black/90 backdrop-blur-3xl border-[2px] md:border-[3px] ${isSpeeding ? 'border-red-600 ring-2 ring-red-600/30 animate-pulse' : 'border-[#D4AF37]/30'} rounded-lg md:rounded-xl w-12 h-16 md:w-16 md:h-20 flex flex-col items-center justify-center shadow-2xl transition-all duration-300`}>
      <div className="w-full flex flex-col items-center pt-1 md:pt-2">
        <span className={`text-[#D4AF37] text-[7px] md:text-[9px] font-black uppercase tracking-tighter leading-none ${isSpeeding ? 'text-red-500' : ''}`}>Speed</span>
        <span className={`text-[#D4AF37] text-[7px] md:text-[9px] font-black uppercase tracking-tighter leading-none mb-0.5 ${isSpeeding ? 'text-red-500' : ''}`}>Limit</span>
      </div>
      <span className={`text-white text-xl md:text-3xl font-black leading-none pb-1 md:pb-2 tracking-tighter ${isSpeeding ? 'text-red-500 scale-110' : ''} transition-transform`}>{limit}</span>
    </div>
  );
};

export const HighwayShield: React.FC<{ roadName: string | null }> = ({ roadName }) => {
  if (!roadName) return null;
  
  // Normalize road name for better matching
  const normalized = roadName
    .replace(/Interstate\s+/i, 'I-')
    .replace(/U\.?S\.?\s*(?:Highway|Hwy|Route)?\s*/i, 'US-')
    .replace(/(?:State\s+Route|State\s+Highway|SR|Hwy|Route)\s+/i, 'SR-')
    .replace(/County\s+(?:Road|Hwy|Route)\s+/i, 'CR-');

  const isInterstate = normalized.match(/I\s*[- ]?\s*(\d+[A-Z]?)/i);
  const isUSHighway = normalized.match(/US\s*[- ]?\s*(\d+[A-Z]?)/i);
  const isStateHighway = normalized.match(/(?:SR|CR|CA|TX|FL|NY|IL|PA|OH|MI|GA|NC|NJ|VA|WA|AZ|MA|TN|IN|MO|MD|WI|CO|MN|SC|AL|LA|KY|OR|OK|CT|UT|IA|NV|AR|MS|KS|NM|NE|ID|WV|HI|NH|ME|MT|RI|DE|SD|ND|AK|VT|WY)\s*[- ]?\s*(\d+[A-Z]?)/i);

  if (isInterstate) {
    return (
      <div className="relative w-12 h-12 md:w-16 md:h-16 flex items-center justify-center drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <path d="M50 5 L90 20 L90 60 C90 80 50 95 50 95 C50 95 10 80 10 60 L10 20 Z" fill="#003f87" stroke="white" strokeWidth="4" />
          <path d="M10 20 L90 20 L50 5 Z" fill="#cf142b" />
          <path d="M50 5 L90 20 L90 60 C90 80 50 95 50 95 C50 95 10 80 10 60 L10 20 Z" fill="none" stroke="white" strokeWidth="2" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center mt-1">
          <span className="text-white text-[6px] md:text-[9px] font-black uppercase tracking-tighter leading-none mb-0.5">Interstate</span>
          <span className="text-white text-lg md:text-2xl font-[1000] leading-none">{isInterstate[1]}</span>
        </div>
      </div>
    );
  }

  if (isUSHighway) {
    return (
      <div className="relative w-10 h-12 md:w-14 md:h-16 flex items-center justify-center drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <rect x="5" y="5" width="90" height="90" fill="white" stroke="black" strokeWidth="2" />
          <path d="M10 10 L90 10 L90 60 C90 85 50 95 50 95 C50 95 10 85 10 60 Z" fill="white" stroke="black" strokeWidth="4" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-black text-lg md:text-2xl font-[1000] mt-1 md:mt-2">{isUSHighway[1]}</span>
      </div>
    );
  }

  if (isStateHighway) {
    return (
      <div className="relative w-10 h-10 md:w-14 md:h-14 flex items-center justify-center drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">
        <div className="absolute inset-0 bg-white border-2 border-black rounded-full" />
        <span className="absolute inset-0 flex items-center justify-center text-black text-base md:text-xl font-[1000]">{isStateHighway[1]}</span>
      </div>
    );
  }

  return (
    <div className="bg-black/90 backdrop-blur-3xl border border-[#D4AF37]/30 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-2xl">
      <Shield className="w-3 h-3 text-[#D4AF37]" />
      <span className="text-[10px] font-black text-white uppercase tracking-tight">{roadName}</span>
    </div>
  );
};
