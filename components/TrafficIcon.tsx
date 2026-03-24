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
        <Circle className="w-3 h-3 fill-green-500 text-green-500" />
      </div>
    );
  }

  // Traffic Sign Icons
  if (type === 'traffic_sign') {
    switch (signType) {
      case 'stop':
        return (
          <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <Octagon className="w-full h-full fill-red-600 text-white stroke-white" strokeWidth={3} />
            <span className="absolute inset-0 flex items-center justify-center text-white font-black text-[10px] leading-none">
              STOP
            </span>
          </div>
        );
      
      case 'yield':
        return (
          <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <Triangle className="w-full h-full fill-white text-red-600 stroke-red-600 rotate-180" strokeWidth={4} />
            <span className="absolute inset-0 flex items-center justify-center text-red-600 font-black text-[9px] leading-none mt-1">
              YIELD
            </span>
          </div>
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
