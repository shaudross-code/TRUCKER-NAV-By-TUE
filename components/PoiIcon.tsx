import { Fuel, ParkingSquare, UtensilsCrossed, Wrench, Box, Droplets, Truck, Scale, LogIn, LogOut } from 'lucide-react';

export const getPoiCategory = (type: any = '', name: any = ''): string => {
  const typeStr = typeof type === 'string' ? type : '';
  const nameStr = typeof name === 'string' ? name : '';
  const lowerName = nameStr.toLowerCase();
  const normalizedType = typeStr.toLowerCase().replace(/_/g, ' ');

  if (lowerName.includes("love")) return 'loves';
  if (lowerName.includes("pilot")) return 'pilot';
  if (lowerName.includes("flying j")) return 'flying_j';
  if (lowerName.includes("petro")) return 'petro';
  if (lowerName.includes("travelcenters") || lowerName.includes(" ta ") || lowerName.startsWith("ta ") || lowerName === "ta") return 'ta';
  if (lowerName.includes("road ranger")) return 'road_ranger';
  if (lowerName.includes("kwiktrip") || lowerName.includes("kwikstar")) return 'kwik_trip';
  if (lowerName.includes("buc-ee")) return 'bucees';
  if (lowerName.includes("speedway")) return 'speedway';
  if (lowerName.includes("casey")) return 'caseys';
  if (lowerName.includes("wawa")) return 'wawa';
  if (lowerName.includes("sheetz")) return 'sheetz';
  if (lowerName.includes("quiktrip") || lowerName.includes("qt")) return 'quiktrip';
  if (lowerName.includes("racetrac")) return 'racetrac';
  if (lowerName.includes("conoco")) return 'conoco';

  if (normalizedType.includes('weigh station') || normalizedType.includes('scale') || normalizedType.includes('weigh')) {
    return 'weigh_station';
  }

  if (normalizedType.includes('rest area') || normalizedType.includes('restarea')) {
    return 'rest_area';
  }

  if (normalizedType.includes('parking')) {
    return 'parking';
  }

  if (normalizedType.includes('restaurant') || normalizedType.includes('food') || normalizedType.includes('dining')) {
    return 'food';
  }

  if (normalizedType.includes('service') || normalizedType.includes('repair') || normalizedType.includes('wrench') || normalizedType.includes('maintenance')) {
    return 'service';
  }

  if (normalizedType.includes('wash') || lowerName.includes('wash') || lowerName.includes('beacon')) {
    return 'service';
  }

  if (normalizedType.includes('distribution') || normalizedType.includes('fulfillment') || lowerName.includes('amazon') || lowerName.includes('walmart') || lowerName.includes('fedex') || lowerName.includes('ups') || lowerName.includes('target') || lowerName.includes('depot') || lowerName.includes('sysco') || lowerName.includes('mclane') || normalizedType.includes('warehouse')) {
    return 'distribution';
  }

  if (normalizedType.includes('truck stop') || normalizedType.includes('fuel') || normalizedType.includes('gas station') || normalizedType.includes('diesel')) {
    return 'fuel';
  }

  return 'other';
};

export const getEntranceIcon = () => {
  return (
    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-lg">
      <LogIn className="w-3.5 h-3.5 text-white" />
    </div>
  );
};

export const getExitIcon = () => {
  return (
    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500 border-2 border-white shadow-lg">
      <LogOut className="w-3.5 h-3.5 text-white" />
    </div>
  );
};

export const getPoiIcon = (type: any = '', name: any = '') => {
  const typeStr = typeof type === 'string' ? type : '';
  const nameStr = typeof name === 'string' ? name : '';
  const lowerName = nameStr.toLowerCase();
  const normalizedType = typeStr.toLowerCase().replace(/_/g, ' ');
  
  if (lowerName.includes("love") || lowerName.includes("loves") || lowerName.includes("travel stop") || lowerName.includes("travelstop")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <circle cx="20" cy="20" r="18" fill="#E31837" stroke="#FFC220" strokeWidth="2.5"/>
        <path d="M20 28.5c-4.5-4.5-8-7.5-8-11 0-2.5 2-4.5 4.5-4.5 1.5 0 3 1 3.5 2.5.5-1.5 2-2.5 3.5-2.5 2.5 0 4.5 2 4.5 4.5 0 3.5-3.5 6.5-8 11z" fill="#FFC220"/>
        <text x="20" y="34" textAnchor="middle" fill="#FFC220" fontFamily="Inter, sans-serif" fontSize="6" fontWeight="900" letterSpacing="0.1em">LOVE'S</text>
      </svg>
    );
  }
  
  if (lowerName.includes("pilot") && !lowerName.includes("flying j")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <rect x="2" y="2" width="36" height="36" rx="6" fill="#E31837" stroke="#FFC220" strokeWidth="2.5"/>
        <text x="20" y="24" textAnchor="middle" fill="#FFC220" fontFamily="Impact, sans-serif" fontSize="14" fontWeight="bold">PILOT</text>
        <rect x="5" y="28" width="30" height="3" fill="#FFC220"/>
      </svg>
    );
  }
  
  if (lowerName.includes("flying j") || lowerName.includes("flyingj") || (lowerName.includes("pilot") && lowerName.includes("flying j"))) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <rect x="2" y="2" width="36" height="36" rx="18" fill="#E31837" stroke="#FFFFFF" strokeWidth="2.5"/>
        <path d="M12 15 L28 15 L28 18 L20 18 L20 30 L16 30 L16 15 Z" fill="#FFFFFF" transform="translate(2, 0)"/>
        <path d="M22 22 L32 22 L27 32 Z" fill="#0033A0"/>
      </svg>
    );
  }
  
  if (lowerName.includes("petro")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <rect x="2" y="10" width="36" height="20" rx="4" fill="#007A33" stroke="#FFFFFF" strokeWidth="2.5"/>
        <text x="20" y="24" textAnchor="middle" fill="#FFFFFF" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="900" letterSpacing="-0.5px">PETRO</text>
        <path d="M5 28 L35 28" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.5"/>
      </svg>
    );
  }
  
  if (lowerName.includes("travelcenters") || lowerName.includes("travel centers") || lowerName.includes(" ta ") || lowerName.startsWith("ta ") || lowerName === "ta" || lowerName.includes("ta express")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <rect x="2" y="2" width="36" height="36" rx="6" fill="#0033A0" stroke="#FFC220" strokeWidth="2.5"/>
        <rect x="2" y="2" width="36" height="12" rx="2" fill="#FFC220"/>
        <text x="20" y="30" textAnchor="middle" fill="#FFC220" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="900">TA</text>
      </svg>
    );
  }
  
  if (lowerName.includes("road ranger") || lowerName.includes("roadranger")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <rect x="2" y="2" width="36" height="36" rx="6" fill="#E31837" stroke="#FFC220" strokeWidth="2.5"/>
        <path d="M5 20 L35 20" stroke="#FFC220" strokeWidth="4"/>
        <text x="20" y="16" textAnchor="middle" fill="white" fontFamily="Inter, sans-serif" fontSize="6" fontWeight="900">ROAD</text>
        <text x="20" y="32" textAnchor="middle" fill="white" fontFamily="Inter, sans-serif" fontSize="6" fontWeight="900">RANGER</text>
      </svg>
    );
  }
  
  if (lowerName.includes("kwiktrip") || lowerName.includes("kwik trip") || lowerName.includes("kwiktrip") || lowerName.includes("kwikstar") || lowerName.includes("kwik star") || lowerName.includes("kwik ")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <circle cx="20" cy="20" r="18" fill="#E31837" stroke="#FFFFFF" strokeWidth="2.5"/>
        <text x="20" y="24" textAnchor="middle" fill="#FFFFFF" fontFamily="Georgia, serif" fontSize="10" fontWeight="bold" fontStyle="italic">Kwik Trip</text>
      </svg>
    );
  }

  if (lowerName.includes("buc-ee") || lowerName.includes("bucee")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <circle cx="20" cy="20" r="18" fill="#FFC220" stroke="#000000" strokeWidth="2"/>
        <circle cx="20" cy="18" r="8" fill="#8B4513"/>
        <circle cx="16" cy="16" r="2" fill="#FFFFFF"/>
        <circle cx="24" cy="16" r="2" fill="#FFFFFF"/>
        <path d="M16 22 Q20 26 24 22" stroke="#FFFFFF" strokeWidth="2" fill="none"/>
        <text x="20" y="34" textAnchor="middle" fill="#E31837" fontFamily="Inter, sans-serif" fontSize="6" fontWeight="900">BUC-EE'S</text>
      </svg>
    );
  }

  if (lowerName.includes("speedway")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <rect x="2" y="10" width="36" height="20" rx="10" fill="#E31837" stroke="#FFFFFF" strokeWidth="2"/>
        <text x="20" y="24" textAnchor="middle" fill="#FFFFFF" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="900" fontStyle="italic">Speedway</text>
      </svg>
    );
  }

  if (lowerName.includes("casey")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <rect x="2" y="2" width="36" height="36" rx="4" fill="#E31837" stroke="#FFFFFF" strokeWidth="2"/>
        <path d="M2 10 L38 10 L38 30 L2 30 Z" fill="#FFFFFF"/>
        <text x="20" y="24" textAnchor="middle" fill="#E31837" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="900">CASEY'S</text>
      </svg>
    );
  }

  if (lowerName.includes("wawa")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <rect x="2" y="10" width="36" height="20" rx="10" fill="#FFFFFF" stroke="#E31837" strokeWidth="2"/>
        <text x="20" y="24" textAnchor="middle" fill="#E31837" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="900" letterSpacing="1px">Wawa</text>
      </svg>
    );
  }

  if (lowerName.includes("sheetz")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <rect x="2" y="10" width="36" height="20" rx="4" fill="#E31837" stroke="#FFFFFF" strokeWidth="2"/>
        <text x="20" y="24" textAnchor="middle" fill="#FFFFFF" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="900" fontStyle="italic">SHEETZ</text>
      </svg>
    );
  }

  if (lowerName.includes("quiktrip") || lowerName.includes("qt")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <rect x="2" y="2" width="36" height="36" rx="4" fill="#E31837" stroke="#FFFFFF" strokeWidth="2"/>
        <text x="20" y="26" textAnchor="middle" fill="#FFFFFF" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="900">QT</text>
      </svg>
    );
  }

  if (lowerName.includes("racetrac")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <rect x="2" y="10" width="36" height="20" rx="4" fill="#0033A0" stroke="#FFFFFF" strokeWidth="2"/>
        <text x="20" y="24" textAnchor="middle" fill="#FFFFFF" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="900" fontStyle="italic">RaceTrac</text>
      </svg>
    );
  }

  if (lowerName.includes("conoco")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <circle cx="20" cy="20" r="18" fill="#E31837" stroke="#FFFFFF" strokeWidth="2"/>
        <text x="20" y="24" textAnchor="middle" fill="#FFFFFF" fontFamily="Inter, sans-serif" fontSize="7" fontWeight="900" letterSpacing="0.05em">CONOCO</text>
      </svg>
    );
  }

  if (normalizedType.includes('weigh station') || normalizedType.includes('scale')) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow-lg">
        <Scale className="w-5 h-5 text-white" />
      </div>
    );
  }

  if (normalizedType.includes('rest area') || typeStr.toLowerCase() === 'rest_area') {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-700 border-2 border-white shadow-lg">
        <span className="text-white font-black text-lg leading-none">R</span>
      </div>
    );
  }

  if (normalizedType.includes('parking')) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-lg">
        <ParkingSquare className="w-5 h-5 text-white" />
      </div>
    );
  }

  if (normalizedType.includes('wash') || lowerName.includes('wash') || lowerName.includes('beacon')) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-600 border-2 border-white shadow-lg">
        <Droplets className="w-5 h-5 text-white" />
      </div>
    );
  }

  if (normalizedType.includes('distribution') || normalizedType.includes('fulfillment') || lowerName.includes('amazon') || lowerName.includes('walmart') || lowerName.includes('fedex') || lowerName.includes('ups') || lowerName.includes('target') || lowerName.includes('depot') || lowerName.includes('sysco') || lowerName.includes('mclane')) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 border-2 border-white shadow-lg">
        <Box className="w-5 h-5 text-white" />
      </div>
    );
  }

  switch (typeStr.toLowerCase()) {
    case 'truck_stop':
    case 'fuel':
    case 'gas_station':
    case 'diesel':
      return <Fuel className="w-7 h-7 text-yellow-400 drop-shadow-lg" />;
    case 'parking':
      return <ParkingSquare className="w-7 h-7 text-blue-400 drop-shadow-lg" />;
    case 'rest_area':
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-700 border-2 border-white shadow-lg">
          <span className="text-white font-black text-lg leading-none">R</span>
        </div>
      );
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
          <Truck className="w-4 h-4 text-[#D4AF37]" />
        </div>
      );
  }
};
