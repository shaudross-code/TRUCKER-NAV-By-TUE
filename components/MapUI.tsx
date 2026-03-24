import React from 'react';
import { Shield, Octagon } from 'lucide-react';

// Speed Limit Sign Component
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
  
  // Full size - realistic speed limit sign
  return (
    <svg viewBox="0 0 100 130" className={`w-12 h-16 md:w-16 md:h-20 drop-shadow-2xl ${isSpeeding ? 'animate-pulse' : ''}`}>
      {/* White background */}
      <rect x="2" y="2" width="96" height="126" fill="white" stroke="black" strokeWidth="3" rx="4"/>
      
      {/* SPEED LIMIT text */}
      <text x="50" y="25" textAnchor="middle" fontSize="10" fontWeight="900" fill="black" fontFamily="Arial, sans-serif" letterSpacing="1">
        SPEED
      </text>
      <text x="50" y="40" textAnchor="middle" fontSize="10" fontWeight="900" fill="black" fontFamily="Arial, sans-serif" letterSpacing="1">
        LIMIT
      </text>
      
      {/* Speed number */}
      <text x="50" y="95" textAnchor="middle" fontSize="50" fontWeight="900" fill={isSpeeding ? '#dc2626' : 'black'} fontFamily="Arial, sans-serif">
        {limit}
      </text>
    </svg>
  );
};

// Stop Sign Component
export const StopSign: React.FC<{ size?: number }> = ({ size = 48 }) => {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-2xl">
      {/* Red octagon */}
      <polygon 
        points="30,8 70,8 92,30 92,70 70,92 30,92 8,70 8,30" 
        fill="#D71920" 
        stroke="white" 
        strokeWidth="4"
      />
      {/* Inner border */}
      <polygon 
        points="30,12 70,12 88,30 88,70 70,88 30,88 12,70 12,30" 
        fill="none" 
        stroke="white" 
        strokeWidth="2"
      />
      {/* STOP text */}
      <text 
        x="50" 
        y="62" 
        textAnchor="middle" 
        fontSize="28" 
        fontWeight="900" 
        fill="white" 
        fontFamily="Arial, sans-serif"
        letterSpacing="2"
      >
        STOP
      </text>
    </svg>
  );
};

// Yield Sign Component
export const YieldSign: React.FC<{ size?: number }> = ({ size = 48 }) => {
  return (
    <svg viewBox="0 0 100 90" width={size} height={size * 0.9} className="drop-shadow-2xl">
      {/* Red triangle border */}
      <polygon 
        points="50,5 95,85 5,85" 
        fill="#D71920" 
        stroke="white" 
        strokeWidth="3"
      />
      {/* White inner triangle */}
      <polygon 
        points="50,15 85,75 15,75" 
        fill="white"
      />
      {/* YIELD text */}
      <text 
        x="50" 
        y="52" 
        textAnchor="middle" 
        fontSize="14" 
        fontWeight="900" 
        fill="#D71920" 
        fontFamily="Arial, sans-serif"
        letterSpacing="2"
      >
        YIELD
      </text>
    </svg>
  );
};

// Rest Area Sign Component  
export const RestAreaSign: React.FC<{ size?: number }> = ({ size = 64 }) => {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className="drop-shadow-2xl">
      {/* Blue background */}
      <rect x="10" y="10" width="180" height="180" fill="#004D8D" stroke="white" strokeWidth="6" rx="8"/>
      
      {/* REST AREA text */}
      <text x="100" y="70" textAnchor="middle" fontSize="32" fontWeight="900" fill="white" fontFamily="Arial, sans-serif">
        REST
      </text>
      <text x="100" y="105" textAnchor="middle" fontSize="32" fontWeight="900" fill="white" fontFamily="Arial, sans-serif">
        AREA
      </text>
      
      {/* Arrow */}
      <g transform="translate(120, 130)">
        <line x1="-20" y1="0" x2="20" y2="0" stroke="white" strokeWidth="8" strokeLinecap="round"/>
        <polyline points="10,-10 20,0 10,10" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
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
    const number = isInterstate[1];
    return (
      <svg viewBox="0 0 100 100" className="w-12 h-12 md:w-16 md:h-16 drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">
        {/* Interstate shield shape */}
        <path 
          d="M50 5 L90 20 L90 60 C90 80 50 95 50 95 C50 95 10 80 10 60 L10 20 Z" 
          fill="#003f87" 
          stroke="white" 
          strokeWidth="4"
        />
        {/* Red top banner */}
        <path 
          d="M10 20 L90 20 L50 5 Z" 
          fill="#cf142b"
        />
        {/* White border detail */}
        <path 
          d="M50 5 L90 20 L90 60 C90 80 50 95 50 95 C50 95 10 80 10 60 L10 20 Z" 
          fill="none" 
          stroke="white" 
          strokeWidth="2"
        />
        {/* Text */}
        <text x="50" y="35" textAnchor="middle" fontSize="9" fontWeight="900" fill="white" fontFamily="Arial, sans-serif" letterSpacing="1">
          INTERSTATE
        </text>
        <text x="50" y="68" textAnchor="middle" fontSize="32" fontWeight="900" fill="white" fontFamily="Arial, sans-serif">
          {number}
        </text>
      </svg>
    );
  }

  if (isUSHighway) {
    const number = isUSHighway[1];
    return (
      <svg viewBox="0 0 80 100" className="w-10 h-12 md:w-14 md:h-16 drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">
        {/* US Route shield shape */}
        <path 
          d="M10 10 L70 10 L70 50 C70 75 40 90 40 90 C40 90 10 75 10 50 Z" 
          fill="white" 
          stroke="black" 
          strokeWidth="4"
        />
        {/* Inner border */}
        <path 
          d="M15 15 L65 15 L65 50 C65 72 40 85 40 85 C40 85 15 72 15 50 Z" 
          fill="white" 
          stroke="black" 
          strokeWidth="2"
        />
        {/* Number */}
        <text x="40" y="60" textAnchor="middle" fontSize="36" fontWeight="900" fill="black" fontFamily="Arial, sans-serif">
          {number}
        </text>
      </svg>
    );
  }

  if (isStateHighway) {
    const number = isStateHighway[1];
    return (
      <svg viewBox="0 0 100 100" className="w-10 h-10 md:w-14 md:h-14 drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">
        {/* Circle background */}
        <circle cx="50" cy="50" r="45" fill="white" stroke="black" strokeWidth="4"/>
        {/* Inner circle */}
        <circle cx="50" cy="50" r="38" fill="white" stroke="black" strokeWidth="2"/>
        {/* Number */}
        <text x="50" y="65" textAnchor="middle" fontSize="38" fontWeight="900" fill="black" fontFamily="Arial, sans-serif">
          {number}
        </text>
      </svg>
    );
  }

  // Generic road name badge
  return (
    <div className="bg-black/90 backdrop-blur-3xl border border-[#D4AF37]/30 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-2xl">
      <Shield className="w-3 h-3 text-[#D4AF37]" />
      <span className="text-[10px] font-black text-white uppercase tracking-tight">{roadName}</span>
    </div>
  );
};
