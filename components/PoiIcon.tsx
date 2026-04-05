import { Fuel, ParkingSquare, UtensilsCrossed, Wrench, Box, Droplets, Truck, Scale, LogIn, LogOut, AlertTriangle } from 'lucide-react';

// ─── Compact 20×20 filter panel icons ──────────────────────────────────────
export const getPoiFilterIcon = (id: string) => {
  const S = 20; // viewBox size
  switch (id) {
    // ── Major truck stop chains ──────────────────────────────────────────────
    case 'loves':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <circle cx="10" cy="10" r="9.5" fill="#E31837" stroke="#FFC220" strokeWidth="1.2"/>
          <path d="M10 13.5c-2-2-4-3.5-4-5.2 0-1.2 1-2.2 2.2-2.2.8 0 1.5.5 1.8 1.2.3-.7 1-.2 1.8-1.2 1.2 0 2.2 1 2.2 2.2 0 1.7-2 3.2-4 5.2z" fill="#FFC220"/>
        </svg>
      );
    case 'pilot':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y=".5" width="19" height="19" rx="3.5" fill="#E31837" stroke="#FFC220" strokeWidth="1"/>
          <text x="10" y="14" textAnchor="middle" fill="#FFC220" fontFamily="Impact,sans-serif" fontSize="9" fontWeight="900">P</text>
          <rect x="3" y="15" width="14" height="1.5" fill="#FFC220"/>
        </svg>
      );
    case 'flying_j':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <circle cx="10" cy="10" r="9.5" fill="#E31837" stroke="#fff" strokeWidth="1"/>
          <text x="10" y="14" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="10" fontWeight="900">FJ</text>
        </svg>
      );
    case 'petro':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y="4.5" width="19" height="11" rx="2.5" fill="#007A33" stroke="#fff" strokeWidth="1"/>
          <text x="10" y="13" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="7.5" fontWeight="900">PETRO</text>
        </svg>
      );
    case 'ta':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y=".5" width="19" height="19" rx="3.5" fill="#0033A0" stroke="#FFC220" strokeWidth="1"/>
          <rect x=".5" y=".5" width="19" height="6.5" rx="2" fill="#FFC220"/>
          <text x="10" y="16" textAnchor="middle" fill="#FFC220" fontFamily="Impact,sans-serif" fontSize="9" fontWeight="900">TA</text>
        </svg>
      );
    case 'road_ranger':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y=".5" width="19" height="19" rx="3.5" fill="#CC0000" stroke="#FFC220" strokeWidth="1"/>
          <text x="10" y="9.5" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="5.5" fontWeight="900">ROAD</text>
          <rect x="3" y="10" width="14" height="1.5" fill="#FFC220"/>
          <text x="10" y="17" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="5.5" fontWeight="900">RANGER</text>
        </svg>
      );
    case 'sapp_bros':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y=".5" width="19" height="19" rx="3.5" fill="#1B3A5C" stroke="#E8B84B" strokeWidth="1"/>
          <text x="10" y="9" textAnchor="middle" fill="#E8B84B" fontFamily="Impact,sans-serif" fontSize="5" fontWeight="900">SAPP</text>
          <text x="10" y="15" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="5" fontWeight="900">BROS</text>
        </svg>
      );
    case 'ambest':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y=".5" width="19" height="19" rx="3.5" fill="#003366" stroke="#FFD700" strokeWidth="1"/>
          <text x="10" y="9" textAnchor="middle" fill="#FFD700" fontFamily="Impact,sans-serif" fontSize="4.5" fontWeight="900">AM</text>
          <text x="10" y="15" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="5" fontWeight="900">BEST</text>
        </svg>
      );
    case 'kwik_trip':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <circle cx="10" cy="10" r="9.5" fill="#E31837" stroke="#fff" strokeWidth="1"/>
          <text x="10" y="12.5" textAnchor="middle" fill="#fff" fontFamily="Georgia,serif" fontSize="7" fontStyle="italic" fontWeight="bold">KwikTrip</text>
        </svg>
      );
    case 'bucees':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <circle cx="10" cy="10" r="9.5" fill="#FFC220" stroke="#000" strokeWidth="1"/>
          <circle cx="10" cy="9" r="4.5" fill="#8B4513"/>
          <circle cx="8" cy="8" r="1" fill="#fff"/>
          <circle cx="12" cy="8" r="1" fill="#fff"/>
          <path d="M8 11 Q10 13 12 11" stroke="#fff" strokeWidth="1" fill="none" strokeLinecap="round"/>
          <text x="10" y="18.5" textAnchor="middle" fill="#E31837" fontFamily="Impact,sans-serif" fontSize="4.5" fontWeight="900">BUC-EE'S</text>
        </svg>
      );
    case 'speedway':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y="5.5" width="19" height="10" rx="5" fill="#E31837" stroke="#fff" strokeWidth="1"/>
          <text x="10" y="12.5" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="6.5" fontStyle="italic" fontWeight="900">Speedway</text>
        </svg>
      );
    case 'caseys':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y=".5" width="19" height="19" rx="2.5" fill="#E31837" stroke="#fff" strokeWidth="1"/>
          <rect x="2" y="6" width="16" height="9" fill="#fff"/>
          <text x="10" y="13" textAnchor="middle" fill="#E31837" fontFamily="Impact,sans-serif" fontSize="6.5" fontWeight="900">CASEY'S</text>
        </svg>
      );
    case 'wawa':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y="5.5" width="19" height="10" rx="5" fill="#fff" stroke="#E31837" strokeWidth="1.2"/>
          <text x="10" y="13" textAnchor="middle" fill="#E31837" fontFamily="Impact,sans-serif" fontSize="7.5" fontWeight="900">Wawa</text>
        </svg>
      );
    case 'sheetz':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y="5.5" width="19" height="10" rx="2" fill="#E31837" stroke="#fff" strokeWidth="1"/>
          <text x="10" y="13" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="7" fontStyle="italic" fontWeight="900">SHEETZ</text>
        </svg>
      );
    case 'quiktrip':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y=".5" width="19" height="19" rx="2.5" fill="#E31837" stroke="#fff" strokeWidth="1"/>
          <text x="10" y="14" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="10" fontWeight="900">QT</text>
        </svg>
      );
    case 'racetrac':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y="5.5" width="19" height="10" rx="2" fill="#0033A0" stroke="#fff" strokeWidth="1"/>
          <text x="10" y="13" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="6" fontStyle="italic" fontWeight="900">RaceTrac</text>
        </svg>
      );
    case 'conoco':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <circle cx="10" cy="10" r="9.5" fill="#E31837" stroke="#fff" strokeWidth="1"/>
          <text x="10" y="13" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="5.5" fontWeight="900">CONOCO</text>
        </svg>
      );
    // ── New fuel brands ──────────────────────────────────────────────────────
    case 'exxon':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y=".5" width="19" height="19" rx="3.5" fill="#1A3A6E" stroke="#E31837" strokeWidth="1.2"/>
          <text x="10" y="10" textAnchor="middle" fill="#E31837" fontFamily="Impact,sans-serif" fontSize="6.5" fontWeight="900">EXXON</text>
          <rect x="3" y="11" width="14" height="1.5" fill="#E31837"/>
          <text x="10" y="17" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="4.5">MOBIL</text>
        </svg>
      );
    case 'shell':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <circle cx="10" cy="10" r="9.5" fill="#FFD500" stroke="#E31837" strokeWidth="1.5"/>
          <path d="M10 3.5 L11.4 7h3.6l-2.9 2.1 1.1 3.4L10 10.4l-3.2 2.1 1.1-3.4L5 7h3.6z" fill="#E31837"/>
        </svg>
      );
    case 'bp':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <circle cx="10" cy="10" r="9.5" fill="#009900" stroke="#FFD500" strokeWidth="1.2"/>
          <text x="10" y="14" textAnchor="middle" fill="#FFD500" fontFamily="Impact,sans-serif" fontSize="11" fontWeight="900">BP</text>
        </svg>
      );
    case 'marathon':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y=".5" width="19" height="19" rx="3.5" fill="#003087" stroke="#fff" strokeWidth="1"/>
          <text x="10" y="9.5" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="5" fontWeight="900">MARATHON</text>
          <rect x="3" y="10.5" width="14" height="1.2" fill="#E31837"/>
          <text x="10" y="16.5" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="5" fontWeight="900">TRUCK STOP</text>
        </svg>
      );
    case 'circle_k':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <circle cx="10" cy="10" r="9.5" fill="#E31837" stroke="#fff" strokeWidth="1"/>
          <circle cx="10" cy="10" r="5.5" fill="none" stroke="#fff" strokeWidth="1.5"/>
          <text x="10" y="13.5" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="7.5" fontWeight="900">K</text>
        </svg>
      );
    case 'seven_eleven':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y=".5" width="19" height="10" rx="2" fill="#FF7200"/>
          <rect x=".5" y="9.5" width="19" height="10" rx="2" fill="#006B3E"/>
          <text x="10" y="8.5" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="7" fontWeight="900">7-ELEVEn</text>
          <text x="10" y="17.5" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="5.5" fontWeight="900">TRUCK STOP</text>
        </svg>
      );
    // ── Truck service ─────────────────────────────────────────────────────────
    case 'speedco':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <circle cx="10" cy="10" r="9.5" fill="#FF6600" stroke="#fff" strokeWidth="1"/>
          <path d="M7 7.5 C7 6 9 5 10 7 11 5 13 6 13 7.5 13 9.5 10 12 10 12 10 12 7 9.5 7 7.5z" fill="#fff"/>
          <text x="10" y="17" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="4.5" fontWeight="900">SPEEDCO</text>
        </svg>
      );
    case 'southern_tire':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <circle cx="10" cy="10" r="9.5" fill="#1a1a1a" stroke="#D4AF37" strokeWidth="1.2"/>
          <circle cx="10" cy="10" r="6" fill="none" stroke="#D4AF37" strokeWidth="2.5"/>
          <circle cx="10" cy="10" r="2.5" fill="#D4AF37"/>
          <text x="10" y="18.5" textAnchor="middle" fill="#D4AF37" fontFamily="Impact,sans-serif" fontSize="3.5">SOUTHERN TIRE</text>
        </svg>
      );
    case 'rush':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y=".5" width="19" height="19" rx="3.5" fill="#CC0000" stroke="#fff" strokeWidth="1"/>
          <text x="10" y="10" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="8" fontWeight="900">RUSH</text>
          <text x="10" y="16.5" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="4.5" fontWeight="900">TRUCK CTR</text>
        </svg>
      );
    case 'ryder':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y=".5" width="19" height="19" rx="3.5" fill="#FFD400" stroke="#000" strokeWidth="1"/>
          <text x="10" y="14" textAnchor="middle" fill="#000" fontFamily="Impact,sans-serif" fontSize="9" fontWeight="900">R</text>
        </svg>
      );
    case 'penske':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y=".5" width="19" height="19" rx="3.5" fill="#004B93" stroke="#fff" strokeWidth="1"/>
          <text x="10" y="10" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="7" fontWeight="900">PENSKE</text>
          <rect x="3" y="11" width="14" height="1.5" fill="#FFC220"/>
        </svg>
      );
    case 'cummins':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <circle cx="10" cy="10" r="9.5" fill="#CC0000" stroke="#fff" strokeWidth="1"/>
          <text x="10" y="9" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="5" fontWeight="900">CUMMINS</text>
          <rect x="4" y="10" width="12" height="1.2" fill="#fff" opacity=".6"/>
          <text x="10" y="16.5" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="4.5" fontWeight="900">ENGINE</text>
        </svg>
      );
    case 'peterbilt':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y=".5" width="19" height="19" rx="3.5" fill="#1a1a1a" stroke="#D4AF37" strokeWidth="1.2"/>
          <text x="10" y="8.5" textAnchor="middle" fill="#D4AF37" fontFamily="Impact,sans-serif" fontSize="4.5" fontWeight="900">PETERBILT</text>
          <path d="M5 10 L8 10 L8 13 L7 13 L10 16 L13 13 L12 13 L12 10 L15 10 L10 6 Z" fill="#D4AF37"/>
        </svg>
      );
    case 'volvo':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y=".5" width="19" height="19" rx="3.5" fill="#003057" stroke="#fff" strokeWidth="1"/>
          <circle cx="10" cy="9.5" r="5" fill="none" stroke="#fff" strokeWidth="1.5"/>
          <line x1="10" y1="4.5" x2="14" y2="4.5" stroke="#fff" strokeWidth="1.5"/>
          <line x1="14" y1="4.5" x2="14" y2="8" stroke="#fff" strokeWidth="1.5"/>
          <text x="10" y="18.5" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="5" fontWeight="900">VOLVO</text>
        </svg>
      );
    case 'freightliner':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y=".5" width="19" height="19" rx="3.5" fill="#444" stroke="#ccc" strokeWidth="1"/>
          <path d="M5 8 L12 5 L15 8 L13 10 L15 14 L5 14 Z" fill="#ccc"/>
          <text x="10" y="18.5" textAnchor="middle" fill="#ccc" fontFamily="Impact,sans-serif" fontSize="4" fontWeight="900">FREIGHTLINER</text>
        </svg>
      );
    // ── Retail ────────────────────────────────────────────────────────────────
    case 'walmart':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y=".5" width="19" height="19" rx="3.5" fill="#0071CE" stroke="#FFC220" strokeWidth="1"/>
          <path d="M10 4 L10.9 7.3 L14 5.5 L12.2 8.6 L15.5 9.5 L12.2 10.4 L14 13.5 L10.9 11.7 L10 15 L9.1 11.7 L6 13.5 L7.8 10.4 L4.5 9.5 L7.8 8.6 L6 5.5 L9.1 7.3 Z" fill="#FFC220"/>
        </svg>
      );
    case 'lowes':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y=".5" width="19" height="19" rx="3.5" fill="#004990" stroke="#fff" strokeWidth="1"/>
          <text x="10" y="14" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="9" fontWeight="900">L</text>
          <text x="10" y="18.5" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="3.5" fontWeight="900">LOWE'S</text>
        </svg>
      );
    case 'home_depot':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y=".5" width="19" height="19" rx="3.5" fill="#F96302" stroke="#fff" strokeWidth="1"/>
          <text x="10" y="9.5" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="5" fontWeight="900">THE HOME</text>
          <text x="10" y="16" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="6.5" fontWeight="900">DEPOT</text>
        </svg>
      );
    // ── Truck wash ────────────────────────────────────────────────────────────
    case 'truck_wash':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <circle cx="10" cy="10" r="9.5" fill="#0891b2" stroke="#fff" strokeWidth="1"/>
          <path d="M7 6 Q7 9 6 10 Q5 11 6 13" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
          <path d="M10 5 Q10 8 9 9.5 Q8 11 9 13.5" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
          <path d="M13 6 Q13 9 12 10 Q11 11 12 13" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
          <text x="10" y="18.5" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="4" fontWeight="900">TRUCK WASH</text>
        </svg>
      );
    // ── Generic types ─────────────────────────────────────────────────────────
    case 'fuel':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <circle cx="10" cy="10" r="9.5" fill="#1a1a1a" stroke="#FACC15" strokeWidth="1.2"/>
          <rect x="6" y="5" width="6" height="8" rx="1" fill="#FACC15"/>
          <rect x="7" y="7" width="4" height="3" rx=".5" fill="#1a1a1a"/>
          <path d="M12 7 L14 6 L15 8 L14 10 L13 9" stroke="#FACC15" strokeWidth="1" fill="none" strokeLinecap="round"/>
          <rect x="5" y="13" width="8" height="2" rx=".5" fill="#FACC15"/>
        </svg>
      );
    case 'parking':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <circle cx="10" cy="10" r="9.5" fill="#1d4ed8" stroke="#fff" strokeWidth="1"/>
          <text x="10" y="14" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="12" fontWeight="900">P</text>
        </svg>
      );
    case 'rest_area':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <circle cx="10" cy="10" r="9.5" fill="#1d4ed8" stroke="#93c5fd" strokeWidth="1"/>
          <text x="10" y="14" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="12" fontWeight="900">R</text>
        </svg>
      );
    case 'weigh_station':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <circle cx="10" cy="10" r="9.5" fill="#059669" stroke="#fff" strokeWidth="1"/>
          <rect x="4" y="13" width="12" height="2" rx="1" fill="#fff"/>
          <line x1="10" y1="7" x2="10" y2="13" stroke="#fff" strokeWidth="1.5"/>
          <line x1="6" y1="10" x2="14" y2="10" stroke="#fff" strokeWidth="1"/>
          <circle cx="7" cy="10" r="1.5" fill="#fff"/>
          <circle cx="13" cy="10" r="1.5" fill="#fff"/>
        </svg>
      );
    case 'cat_scale':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <circle cx="10" cy="10" r="9.5" fill="#0891b2" stroke="#fff" strokeWidth="1"/>
          <rect x="4" y="13" width="12" height="2" rx="1" fill="#fff"/>
          <line x1="10" y1="6" x2="10" y2="13" stroke="#fff" strokeWidth="1.5"/>
          <line x1="5" y1="9" x2="15" y2="9" stroke="#fff" strokeWidth="1"/>
          <circle cx="6" cy="9" r="1.5" fill="#fff"/>
          <circle cx="14" cy="9" r="1.5" fill="#fff"/>
          <text x="10" y="8" textAnchor="middle" fill="#fff" fontFamily="Arial,sans-serif" fontSize="4" fontWeight="900">CAT</text>
        </svg>
      );
    case 'low_clearance':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <path d="M10 1.5 L19 18 L1 18 Z" fill="#dc2626" stroke="#fff" strokeWidth="1"/>
          <text x="10" y="16" textAnchor="middle" fill="#fff" fontFamily="Impact,sans-serif" fontSize="9" fontWeight="900">!</text>
        </svg>
      );
    case 'food':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <circle cx="10" cy="10" r="9.5" fill="#16a34a" stroke="#fff" strokeWidth="1"/>
          <line x1="7" y1="5" x2="7" y2="15" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M5.5 5 C5.5 5 5.5 9 7.5 9" stroke="#fff" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
          <path d="M9 5 C9 5 9 9 7.5 9" stroke="#fff" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
          <line x1="13" y1="5" x2="13" y2="15" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M11 5 L11 8.5 Q11 10 13 10 Q15 10 15 8.5 L15 5" stroke="#fff" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        </svg>
      );
    case 'service':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <circle cx="10" cy="10" r="9.5" fill="#71717a" stroke="#fff" strokeWidth="1"/>
          <path d="M13.5 5.5 C15.5 7.5 15.5 10.5 13.5 12.5 L12 14 L11 13 L8.5 15.5 L6.5 15.5 L4.5 13.5 L4.5 11.5 L7 9 L6 8 L7.5 6.5 C9.5 4.5 11.5 3.5 13.5 5.5Z" fill="#fff"/>
          <circle cx="11" cy="9" r="1.5" fill="#71717a"/>
        </svg>
      );
    case 'distribution':
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <circle cx="10" cy="10" r="9.5" fill="#4f46e5" stroke="#fff" strokeWidth="1"/>
          <rect x="5" y="8" width="10" height="7" rx="1" fill="#fff"/>
          <path d="M5 8 L10 5 L15 8" fill="#c7d2fe"/>
          <line x1="10" y1="8" x2="10" y2="15" stroke="#4f46e5" strokeWidth="1"/>
          <line x1="5" y1="11.5" x2="15" y2="11.5" stroke="#4f46e5" strokeWidth=".8"/>
        </svg>
      );
    case 'other':
    default:
      return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
          <rect x=".5" y=".5" width="19" height="19" rx="3.5" fill="#27272a" stroke="#D4AF37" strokeWidth="1"/>
          <rect x="3" y="9" width="10" height="5" rx="1" fill="#D4AF37"/>
          <rect x="11" y="7" width="7" height="3" rx="1" fill="#D4AF37"/>
          <circle cx="5.5" cy="14.5" r="2" fill="#27272a" stroke="#D4AF37" strokeWidth="1"/>
          <circle cx="13" cy="14.5" r="2" fill="#27272a" stroke="#D4AF37" strokeWidth="1"/>
        </svg>
      );
  }
};
// ────────────────────────────────────────────────────────────────────────────

export const getPoiCategory = (type: any = '', name: any = ''): string => {
  const typeStr = typeof type === 'string' ? type : '';
  const nameStr = typeof name === 'string' ? name : '';
  const lowerName = nameStr.toLowerCase();
  const normalizedType = typeStr.toLowerCase().replace(/_/g, ' ');

  // Major truck stop chains
  if (lowerName.includes("love")) return 'loves';
  if (lowerName.includes("pilot")) return 'pilot';
  if (lowerName.includes("flying j")) return 'flying_j';
  if (lowerName.includes("petro")) return 'petro';
  if (lowerName.includes("travelcenters") || lowerName.includes(" ta ") || lowerName.startsWith("ta ") || lowerName === "ta") return 'ta';
  if (lowerName.includes("road ranger")) return 'road_ranger';
  if (lowerName.includes("sapp bros")) return 'sapp_bros';
  if (lowerName.includes("ambest")) return 'ambest';
  if (lowerName.includes("buc-ee")) return 'bucees';
  if (lowerName.includes("speedway")) return 'speedway';
  if (lowerName.includes("casey")) return 'caseys';
  if (lowerName.includes("wawa")) return 'wawa';
  if (lowerName.includes("sheetz")) return 'sheetz';
  if (lowerName.includes("quiktrip") || lowerName.includes("qt")) return 'quiktrip';
  if (lowerName.includes("racetrac")) return 'racetrac';
  if (lowerName.includes("conoco")) return 'conoco';
  if (lowerName.includes("exxon") || lowerName.includes("esso")) return 'exxon';
  if (lowerName.includes("shell")) return 'shell';
  if (lowerName.includes(" bp ") || lowerName.startsWith("bp ") || lowerName === "bp" || lowerName.includes("bp truck") || lowerName.includes("bp gas") || lowerName.includes("british petroleum")) return 'bp';
  if (lowerName.includes("marathon")) return 'marathon';
  if (lowerName.includes("circle k")) return 'circle_k';
  if (lowerName.includes("7-eleven") || lowerName.includes("7 eleven") || lowerName.includes("seven-eleven") || lowerName.includes("seven eleven")) return 'seven_eleven';

  // EV charging — not trucking relevant, skip
  if (lowerName.includes("tesla") || lowerName.includes("supercharger") || 
      lowerName.includes("chargepoint") || lowerName.includes("ev charging") ||
      lowerName.includes("electrify america") || lowerName.includes("blink charging") ||
      lowerName.includes("electric vehicle")) {
    return 'ev_charging'; // Will be filtered out by POI display logic
  }

  // Retail with truck parking
  if (lowerName.includes("lowe's") || lowerName.includes("lowes")) return 'lowes';
  if (lowerName.includes("home depot")) return 'home_depot';

  // Truck service providers
  if (lowerName.includes("speedco")) return 'speedco';
  if (lowerName.includes("southern tire")) return 'southern_tire';
  if (lowerName.includes("rush truck")) return 'rush';
  if (lowerName.includes("ryder")) return 'ryder';
  if (lowerName.includes("penske")) return 'penske';
  if (lowerName.includes("cummins")) return 'cummins';
  
  // Truck dealerships/OEMs
  if (lowerName.includes("peterbilt")) return 'peterbilt';
  if (lowerName.includes("volvo") && (lowerName.includes("truck") || normalizedType.includes("service"))) return 'volvo';
  if (lowerName.includes("freightliner")) return 'freightliner';
  
  // Retail
  if (lowerName.includes("walmart") || lowerName.includes("wal-mart")) return 'walmart';
  
  // Infrastructure warnings
  if (lowerName.includes("low clearance") || lowerName.includes("low bridge") || normalizedType.includes("low clearance")) {
    return 'low_clearance';
  }
  
  // Truck wash
  if (lowerName.includes("truck wash") || lowerName.includes("blue beacon") || normalizedType.includes('truck wash')) {
    return 'truck_wash';
  }

  // CAT Scales (certified truck scales — distinct from DOT weigh stations)
  if (lowerName.includes("cat scale") || lowerName.includes("catscale") || normalizedType.includes('cat_scale')) {
    return 'cat_scale';
  }

  if (normalizedType.includes('weigh station') || normalizedType.includes('weigh')) {
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
    return 'truck_wash';
  }

  if (normalizedType.includes('distribution') || normalizedType.includes('fulfillment') || lowerName.includes('amazon') || lowerName.includes('fedex') || lowerName.includes('ups') || lowerName.includes('target') || lowerName.includes('depot') || lowerName.includes('sysco') || lowerName.includes('mclane') || normalizedType.includes('warehouse')) {
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

  if (lowerName.includes("sapp bros")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <rect x="2" y="2" width="36" height="36" rx="6" fill="#1B3A5C" stroke="#E8B84B" strokeWidth="2.5"/>
        <text x="20" y="17" textAnchor="middle" fill="#E8B84B" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="900">SAPP</text>
        <text x="20" y="30" textAnchor="middle" fill="white" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="900">BROS</text>
      </svg>
    );
  }

  if (lowerName.includes("ambest")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <rect x="2" y="2" width="36" height="36" rx="6" fill="#003366" stroke="#FFD700" strokeWidth="2.5"/>
        <text x="20" y="16" textAnchor="middle" fill="#FFD700" fontFamily="Inter, sans-serif" fontSize="7" fontWeight="900">AM</text>
        <text x="20" y="30" textAnchor="middle" fill="white" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="900">BEST</text>
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

  if (lowerName.includes("exxon") || lowerName.includes("esso")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <rect x="2" y="2" width="36" height="36" rx="6" fill="#1A3A6E" stroke="#E31837" strokeWidth="2.5"/>
        <text x="20" y="17" textAnchor="middle" fill="#E31837" fontFamily="Impact, sans-serif" fontSize="9" fontWeight="900" letterSpacing="1px">EXXON</text>
        <rect x="5" y="20" width="30" height="3" fill="#E31837"/>
        <text x="20" y="32" textAnchor="middle" fill="#FFFFFF" fontFamily="Impact, sans-serif" fontSize="7" fontWeight="700">TRUCK STOP</text>
      </svg>
    );
  }

  if (lowerName.includes("shell")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <circle cx="20" cy="20" r="18" fill="#FFD500" stroke="#E31837" strokeWidth="3"/>
        <path d="M20 8 L23 14 L30 13 L26 19 L30 25 L23 24 L20 30 L17 24 L10 25 L14 19 L10 13 L17 14 Z" fill="#E31837"/>
        <text x="20" y="37" textAnchor="middle" fill="#E31837" fontFamily="Impact, sans-serif" fontSize="6" fontWeight="900" letterSpacing="0.5px">SHELL</text>
      </svg>
    );
  }

  if (lowerName.includes(" bp ") || lowerName.startsWith("bp ") || lowerName === "bp" || lowerName.includes("bp truck") || lowerName.includes("bp gas") || lowerName.includes("british petroleum")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <circle cx="20" cy="20" r="18" fill="#009900" stroke="#FFD500" strokeWidth="2.5"/>
        <text x="20" y="26" textAnchor="middle" fill="#FFD500" fontFamily="Impact, sans-serif" fontSize="18" fontWeight="900" letterSpacing="1px">BP</text>
      </svg>
    );
  }

  if (lowerName.includes("marathon")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <rect x="2" y="2" width="36" height="36" rx="6" fill="#003087" stroke="#FFFFFF" strokeWidth="2.5"/>
        <text x="20" y="17" textAnchor="middle" fill="#FFFFFF" fontFamily="Impact, sans-serif" fontSize="7" fontWeight="900" letterSpacing="0.5px">MARATHON</text>
        <rect x="5" y="20" width="30" height="2" fill="#E31837"/>
        <text x="20" y="31" textAnchor="middle" fill="#FFFFFF" fontFamily="Impact, sans-serif" fontSize="7" fontWeight="700">TRUCK STOP</text>
      </svg>
    );
  }

  if (lowerName.includes("circle k")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <circle cx="20" cy="20" r="18" fill="#E31837" stroke="#FFFFFF" strokeWidth="2"/>
        <circle cx="20" cy="20" r="10" fill="none" stroke="#FFFFFF" strokeWidth="3"/>
        <text x="20" y="25" textAnchor="middle" fill="#FFFFFF" fontFamily="Impact, sans-serif" fontSize="12" fontWeight="900">K</text>
      </svg>
    );
  }

  if (lowerName.includes("7-eleven") || lowerName.includes("7 eleven") || lowerName.includes("seven-eleven") || lowerName.includes("seven eleven")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <rect x="2" y="2" width="36" height="20" rx="4" fill="#FF7200"/>
        <rect x="2" y="20" width="36" height="18" rx="4" fill="#006B3E"/>
        <text x="20" y="17" textAnchor="middle" fill="#FFFFFF" fontFamily="Impact, sans-serif" fontSize="11" fontWeight="900">7-ELEVEn</text>
        <text x="20" y="33" textAnchor="middle" fill="#FFFFFF" fontFamily="Impact, sans-serif" fontSize="7" fontWeight="700">TRUCK STOP</text>
      </svg>
    );
  }

  if (lowerName.includes("lowe's") || lowerName.includes("lowes")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <rect x="2" y="2" width="36" height="36" rx="6" fill="#004990" stroke="#FFFFFF" strokeWidth="2.5"/>
        <text x="20" y="25" textAnchor="middle" fill="#FFFFFF" fontFamily="Impact, sans-serif" fontSize="14" fontWeight="900" letterSpacing="-0.5px">LOWE'S</text>
      </svg>
    );
  }

  if (lowerName.includes("home depot")) {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
        <rect x="2" y="2" width="36" height="36" rx="6" fill="#F96302" stroke="#FFFFFF" strokeWidth="2.5"/>
        <text x="20" y="16" textAnchor="middle" fill="#FFFFFF" fontFamily="Impact, sans-serif" fontSize="7" fontWeight="900">THE HOME</text>
        <text x="20" y="28" textAnchor="middle" fill="#FFFFFF" fontFamily="Impact, sans-serif" fontSize="9" fontWeight="900">DEPOT</text>
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
    case 'low_clearance':
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow-lg animate-pulse">
          <AlertTriangle className="w-5 h-5 text-white" />
        </div>
      );
    default:
      // Fallback for any other truck-related POI
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 border-2 border-[#D4AF37] shadow-lg">
          <Truck className="w-4 h-4 text-[#D4AF37]" />
        </div>
      );
  }
};
