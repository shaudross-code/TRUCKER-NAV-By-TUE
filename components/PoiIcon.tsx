import React from 'react';
import { Fuel, ParkingSquare, UtensilsCrossed, Wrench } from 'lucide-react';

export const getPoiCategory = (type: string, name: string = ''): string => {
  const lowerName = name.toLowerCase();
  const normalizedType = type.toLowerCase().replace(/_/g, ' ');

  if (lowerName.includes("love") || lowerName.includes("pilot") || lowerName.includes("flying j") || lowerName.includes("petro") || lowerName.includes("travelcenters") || lowerName.includes(" ta ") || lowerName.startsWith("ta ") || lowerName === "ta" || lowerName.includes("road ranger") || lowerName.includes("kwiktrip") || lowerName.includes("kwikstar")) {
    return 'major_chains';
  }

  if (normalizedType.includes('weigh station') || normalizedType.includes('scale')) {
    return 'weigh_station';
  }

  if (normalizedType.includes('rest area') || normalizedType.includes('parking')) {
    return 'parking';
  }

  if (normalizedType.includes('restaurant') || normalizedType.includes('food')) {
    return 'food';
  }

  if (normalizedType.includes('service') || normalizedType.includes('repair') || normalizedType.includes('wrench')) {
    return 'service';
  }

  if (normalizedType.includes('truck stop') || normalizedType.includes('fuel') || normalizedType.includes('gas station')) {
    return 'fuel';
  }

  return 'other';
};

export const getPoiIcon = (type: string, name: string = '') => {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes("love") || lowerName.includes("loves") || lowerName.includes("travel stop") || lowerName.includes("travelstop")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="#e31837" stroke="#FFFFFF" strokeWidth="2"/>
        <path d="M20 28.5c-4.5-4.5-8-7.5-8-11 0-2.5 2-4.5 4.5-4.5 1.5 0 3 1 3.5 2.5.5-1.5 2-2.5 3.5-2.5 2.5 0 4.5 2 4.5 4.5 0 3.5-3.5 6.5-8 11z" fill="#ffcd00"/>
        <text x="20" y="34" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontSize="5" fontWeight="bold">LOVE'S</text>
      </svg>
    );
  }
  
  if (lowerName.includes("pilot")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="36" height="36" rx="4" fill="#ed1c24" stroke="#FFFFFF" strokeWidth="2"/>
        <text x="20" y="22" textAnchor="middle" fill="#ffcd00" fontFamily="Impact, sans-serif" fontSize="14" fontWeight="bold">PILOT</text>
        <rect x="5" y="26" width="30" height="4" fill="#ffcd00"/>
      </svg>
    );
  }
  
  if (lowerName.includes("flying j") || lowerName.includes("flyingj")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="36" height="36" rx="18" fill="#ed1c24" stroke="#FFFFFF" strokeWidth="2"/>
        <text x="20" y="22" textAnchor="middle" fill="#ffcd00" fontFamily="Impact, sans-serif" fontSize="18" fontWeight="bold">J</text>
        <path d="M10 25 L30 25 L20 35 Z" fill="#ffcd00"/>
      </svg>
    );
  }
  
  if (lowerName.includes("petro")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="10" width="36" height="20" rx="2" fill="#008a4e" stroke="#FFFFFF" strokeWidth="2"/>
        <text x="20" y="25" textAnchor="middle" fill="white" fontFamily="Arial Black, sans-serif" fontSize="10" fontWeight="bold">PETRO</text>
      </svg>
    );
  }
  
  if (lowerName.includes("travelcenters") || lowerName.includes("travel centers") || lowerName.includes(" ta ") || lowerName.startsWith("ta ") || lowerName === "ta" || lowerName.includes("ta express")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="36" height="36" rx="4" fill="#002d72" stroke="#FFFFFF" strokeWidth="2"/>
        <rect x="2" y="2" width="36" height="12" rx="2" fill="#e31837"/>
        <text x="20" y="28" textAnchor="middle" fill="white" fontFamily="Arial Black, sans-serif" fontSize="16" fontWeight="bold">TA</text>
      </svg>
    );
  }
  
  if (lowerName.includes("road ranger") || lowerName.includes("roadranger")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="36" height="36" rx="4" fill="#00529b" stroke="#FFFFFF" strokeWidth="2"/>
        <path d="M5 20 L35 20" stroke="#ffcd00" strokeWidth="4"/>
        <text x="20" y="16" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontSize="6" fontWeight="bold">ROAD</text>
        <text x="20" y="32" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontSize="6" fontWeight="bold">RANGER</text>
      </svg>
    );
  }
  
  if (lowerName.includes("kwiktrip") || lowerName.includes("kwik trip") || lowerName.includes("kwikstar") || lowerName.includes("kwik star") || lowerName.includes("kwik ")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="#ed1c24" stroke="#FFFFFF" strokeWidth="2"/>
        <text x="20" y="24" textAnchor="middle" fill="white" fontFamily="Georgia, serif" fontSize="10" fontWeight="bold" italic="true">Kwik Trip</text>
      </svg>
    );
  }

  const normalizedType = type.toLowerCase().replace(/_/g, ' ');

  if (normalizedType.includes('weigh station') || normalizedType.includes('scale')) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-600 border-2 border-white shadow-lg">
        <div className="text-[10px] font-black text-white">WT</div>
      </div>
    );
  }

  if (normalizedType.includes('rest area')) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-lg">
        <ParkingSquare className="w-5 h-5 text-white" />
      </div>
    );
  }

  switch (type.toLowerCase()) {
    case 'truck_stop':
    case 'fuel':
    case 'gas_station':
      return <Fuel className="w-7 h-7 text-yellow-400 drop-shadow-lg" />;
    case 'parking':
    case 'rest_area':
      return <ParkingSquare className="w-7 h-7 text-blue-400 drop-shadow-lg" />;
    case 'restaurant':
    case 'food':
      return <UtensilsCrossed className="w-7 h-7 text-green-400 drop-shadow-lg" />;
    case 'service':
    case 'repair':
    case 'wrench':
      return <Wrench className="w-7 h-7 text-red-400 drop-shadow-lg" />;
    default:
      // Fallback for any other truck-related POI
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 border-2 border-[#D4AF37] shadow-lg">
          <Fuel className="w-4 h-4 text-[#D4AF37]" />
        </div>
      );
  }
};
