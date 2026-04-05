import React from 'react';
import { Octagon, Triangle, AlertTriangle, Circle } from 'lucide-react';

export interface TrafficIconProps {
  type: 'traffic_light' | 'traffic_sign' | 'road_signage';
  signType?: string;
  value?: string;
  size?: number;
}

export const TrafficIcon: React.FC<TrafficIconProps> = ({ type, signType, value, size = 32 }) => {
  // Traffic Light Icon
  if (type === 'traffic_light') {
    return (
      <div className="flex flex-col items-center justify-center bg-black border-2 border-zinc-700 rounded-lg p-1 shadow-lg" style={{ width: size, height: size * 1.5 }}>
        <Circle className="w-3 h-3 fill-red-500 text-red-500 mb-0.5" />
        <Circle className="w-3 h-3 fill-yellow-500 text-yellow-500 mb-0.5" />
        <Circle className="w-3 h-3 fill-[#D4AF37] text-[#D4AF37]" />
      </div>
    );
  }

  // Traffic Sign Icons
  if (type === 'traffic_sign') {
    switch (signType) {
      case 'stop':
        return (
          <svg width={size} height={size} viewBox="0 0 20 20" className="shrink-0">
            <polygon points="6,1 14,1 19,6 19,14 14,19 6,19 1,14 1,6" fill="#CC0000" stroke="#fff" strokeWidth="1.5"/>
            <text x="10" y="12.5" textAnchor="middle" fill="#fff" fontFamily="Arial,Helvetica,sans-serif" fontSize={size >= 24 ? '7' : '5.5'} fontWeight="900">STOP</text>
          </svg>
        );
      
      case 'yield':
        return (
          <svg width={size} height={size} viewBox="0 0 20 20" className="shrink-0">
            <polygon points="10,1 19,18 1,18" fill="#fff" stroke="#CC0000" strokeWidth="2"/>
            <text x="10" y="15" textAnchor="middle" fill="#CC0000" fontFamily="Arial,Helvetica,sans-serif" fontSize="4.5" fontWeight="900">YIELD</text>
          </svg>
        );
      
      case 'speed_limit':
        return (
          <div className="relative flex items-center justify-center bg-white border-4 border-black rounded-lg shadow-lg" style={{ width: size, height: size }}>
            <div className="flex flex-col items-center">
              <span className="text-black font-black text-[8px] leading-none">SPEED</span>
              <span className="text-black font-black text-[8px] leading-none">LIMIT</span>
              <span className="text-black font-black text-[14px] leading-none mt-0.5">{value || '55'}</span>
            </div>
          </div>
        );
      
      case 'warning':
        return (
          <div className="relative flex items-center justify-center bg-yellow-400 border-4 border-black shadow-lg" style={{ width: size, height: size, clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}>
            <AlertTriangle className="w-4 h-4 text-black" strokeWidth={3} />
          </div>
        );
      
      default:
        return (
          <div className="flex items-center justify-center bg-white border-2 border-black rounded shadow-lg" style={{ width: size, height: size }}>
            <span className="text-black font-bold text-xs">!</span>
          </div>
        );
    }
  }

  // Road Signage (Highway/Exit signs)
  if (type === 'road_signage') {
    return (
      <div className="flex items-center justify-center bg-green-700 border-2 border-white rounded shadow-lg px-2 py-1" style={{ minWidth: size, height: size * 0.6 }}>
        <span className="text-white font-bold text-[10px] leading-none">{value || 'EXIT'}</span>
      </div>
    );
  }

  return null;
};

/**
 * Get icon for traffic infrastructure based on type
 */
export const getTrafficIcon = (type: string, signType?: string, value?: string) => {
  return <TrafficIcon type={type as any} signType={signType} value={value} size={32} />;
};
