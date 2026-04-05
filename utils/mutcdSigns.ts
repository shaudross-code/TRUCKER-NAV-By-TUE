/**
 * MUTCD (Manual on Uniform Traffic Control Devices) Compliant Road Sign SVGs
 * Based on FHWA Standard Highway Signs (SHS) 2024 Edition specifications
 * Uses official FHWA colors, proportions, and Highway Gothic typography
 * Signs rendered with realistic 3D depth, proper retroreflective appearance
 */

// FHWA Standard Colors (Federal Standard 595)
const MUTCD = {
  RED: '#C1272D',
  BLUE: '#003F87',
  GREEN: '#006B3C',
  YELLOW: '#FFD100',
  ORANGE: '#FF6D2E',
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  BROWN: '#693F23',
  INTERSTATE_BLUE: '#003F87',
  INTERSTATE_RED: '#BF2033',
  FONT: "'Highway Gothic', 'Overpass', 'Arial Narrow', sans-serif",
};

// Shared sign post effect for ground-mounted signs
function signPost(width: number): string {
  const postW = Math.max(3, width * 0.08);
  return `<div style="width:${postW}px;height:${Math.round(width * 0.35)}px;background:linear-gradient(90deg,#8a8a8a,#b0b0b0 40%,#8a8a8a);margin:0 auto;border-radius:0 0 1px 1px"></div>`;
}

/**
 * Interstate Highway Shield (M1-1) — FHWA SHS
 * Cutout shield shape, blue field, red crown, white legend
 */
export function interstateShield(routeNum: string, size = 48): string {
  const h = Math.round(size * 1.1);
  const fs = routeNum.length > 2 ? Math.round(size * 0.32) : Math.round(size * 0.42);
  return `<div style="width:${size}px;height:${h}px;position:relative;display:flex;align-items:center;justify-content:center;filter:drop-shadow(1px 2px 4px rgba(0,0,0,0.7))">
    <svg viewBox="0 0 100 110" style="position:absolute;inset:0;width:100%;height:100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="is${routeNum}"><path d="M50 2 L93 16 L93 62 C93 88 50 106 50 106 C50 106 7 88 7 62 L7 16 Z"/></clipPath>
        <linearGradient id="isg${routeNum}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#004a9e"/><stop offset="100%" stop-color="#002d66"/>
        </linearGradient>
        <linearGradient id="irg${routeNum}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#d42640"/><stop offset="100%" stop-color="#9e1a2f"/>
        </linearGradient>
      </defs>
      <path d="M50 0 L96 15 L96 63 C96 91 50 110 50 110 C50 110 4 91 4 63 L4 15 Z" fill="${MUTCD.WHITE}"/>
      <path d="M50 3 L93 17 L93 62 C93 88 50 106 50 106 C50 106 7 88 7 62 L7 17 Z" fill="url(#isg${routeNum})"/>
      <rect x="7" y="13" width="86" height="24" fill="url(#irg${routeNum})" clip-path="url(#is${routeNum})"/>
      <text x="50" y="32" text-anchor="middle" fill="${MUTCD.WHITE}" font-size="11" font-weight="700" font-family="${MUTCD.FONT}" letter-spacing="2">INTERSTATE</text>
      <path d="M50 6 L90 19 L90 62 C90 85 50 103 50 103 C50 103 10 85 10 62 L10 19 Z" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.2"/>
      <text x="50" y="${routeNum.length > 2 ? 72 : 76}" text-anchor="middle" fill="${MUTCD.WHITE}" font-size="${fs}" font-weight="800" font-family="${MUTCD.FONT}" letter-spacing="1">${routeNum}</text>
    </svg>
  </div>`;
}

/**
 * US Route Shield (M1-4) — FHWA SHS
 * Black shield, white interior, black numerals
 */
export function usRouteShield(routeNum: string, size = 44): string {
  const h = Math.round(size * 1.08);
  const fs = routeNum.length > 2 ? Math.round(size * 0.3) : Math.round(size * 0.38);
  return `<div style="width:${size}px;height:${h}px;position:relative;display:flex;align-items:center;justify-content:center;filter:drop-shadow(1px 2px 4px rgba(0,0,0,0.6))">
    <svg viewBox="0 0 100 108" style="position:absolute;inset:0;width:100%;height:100%" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 4 L92 4 L92 60 C92 86 50 102 50 102 C50 102 8 86 8 60 Z" fill="${MUTCD.BLACK}"/>
      <path d="M14 10 L86 10 L86 58 C86 80 50 95 50 95 C50 95 14 80 14 58 Z" fill="${MUTCD.WHITE}"/>
      <path d="M18 14 L82 14 L82 56 C82 76 50 90 50 90 C50 90 18 76 18 56 Z" fill="none" stroke="${MUTCD.BLACK}" stroke-width="1.5"/>
      <text x="50" y="${routeNum.length > 2 ? 52 : 56}" text-anchor="middle" fill="${MUTCD.BLACK}" font-size="${fs}" font-weight="800" font-family="${MUTCD.FONT}">${routeNum}</text>
    </svg>
  </div>`;
}

/**
 * State Route Shield — Circular (generic)
 */
export function stateRouteShield(routeNum: string, size = 38): string {
  const fs = routeNum.length > 2 ? Math.round(size * 0.3) : Math.round(size * 0.38);
  return `<div style="width:${size}px;height:${size}px;position:relative;filter:drop-shadow(1px 2px 3px rgba(0,0,0,0.5))">
    <svg viewBox="0 0 40 40" style="position:absolute;inset:0;width:100%;height:100%" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="19" fill="${MUTCD.WHITE}" stroke="${MUTCD.BLACK}" stroke-width="2.5"/>
      <circle cx="20" cy="20" r="15.5" fill="none" stroke="${MUTCD.BLACK}" stroke-width="1.2"/>
      <text x="20" y="${routeNum.length > 2 ? 24 : 25}" text-anchor="middle" fill="${MUTCD.BLACK}" font-size="${fs}" font-weight="800" font-family="${MUTCD.FONT}">${routeNum}</text>
    </svg>
  </div>`;
}

/**
 * Speed Limit Sign (R2-1) — FHWA Regulatory
 * White background, black border, regulation legend
 * Realistic proportions: 24"×30" → 4:5 aspect ratio
 */
export function speedLimitSign(speed: number, size = 42): string {
  const h = Math.round(size * 1.25);
  const numFS = speed >= 100 ? Math.round(size * 0.38) : Math.round(size * 0.48);
  return `<div style="width:${size}px;height:${h}px;position:relative;filter:drop-shadow(1px 3px 6px rgba(0,0,0,0.65))">
    <svg viewBox="0 0 96 120" style="position:absolute;inset:0;width:100%;height:100%" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="94" height="118" rx="3" fill="${MUTCD.WHITE}" stroke="${MUTCD.BLACK}" stroke-width="3"/>
      <rect x="6" y="6" width="84" height="108" rx="1" fill="none" stroke="${MUTCD.BLACK}" stroke-width="1.5"/>
      <text x="48" y="30" text-anchor="middle" fill="${MUTCD.BLACK}" font-size="15" font-weight="800" font-family="${MUTCD.FONT}" letter-spacing="1.5">SPEED</text>
      <text x="48" y="48" text-anchor="middle" fill="${MUTCD.BLACK}" font-size="15" font-weight="800" font-family="${MUTCD.FONT}" letter-spacing="1.5">LIMIT</text>
      <text x="48" y="95" text-anchor="middle" fill="${MUTCD.BLACK}" font-size="${numFS}" font-weight="900" font-family="${MUTCD.FONT}">${speed}</text>
    </svg>
  </div>${signPost(size)}`;
}

/**
 * Warning Sign Diamond (W-series) — FHWA Warning
 * Yellow diamond, black border, double inset border per MUTCD
 */
export function warningDiamond(innerSvg: string, size = 40, bgColor = MUTCD.YELLOW, borderColor = MUTCD.BLACK): string {
  return `<div style="width:${size}px;height:${size}px;position:relative;filter:drop-shadow(1px 3px 6px rgba(0,0,0,0.6))">
    <svg viewBox="0 0 100 100" style="position:absolute;inset:0;width:100%;height:100%;transform:rotate(45deg)" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="96" height="96" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="4"/>
      <rect x="9" y="9" width="82" height="82" rx="2" fill="none" stroke="${borderColor}" stroke-width="2"/>
    </svg>
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${innerSvg}</div>
  </div>`;
}

/**
 * Curve Warning (W1-1/W1-2) — FHWA
 */
export function curveWarning(direction: 'left' | 'right', size = 40): string {
  const arrowPath = direction === 'left'
    ? 'M20 18C20 18 16 18 13 15C10 12 10 7 10 7L10 3M10 3L6 7M10 3L14 7'
    : 'M4 18C4 18 8 18 11 15C14 12 14 7 14 7L14 3M14 3L10 7M14 3L18 7';
  const svg = `<svg width="${Math.round(size*0.55)}" height="${Math.round(size*0.55)}" viewBox="0 0 24 24" fill="none">
    <path d="${arrowPath}" stroke="${MUTCD.BLACK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  return warningDiamond(svg, size);
}

/**
 * Steep Grade Warning (W7-1) — FHWA truck on slope
 */
export function steepGradeWarning(direction: 'down' | 'up', grade?: number, size = 44): string {
  const svg = direction === 'down'
    ? `<svg width="${Math.round(size*0.55)}" height="${Math.round(size*0.55)}" viewBox="0 0 28 28" fill="none">
        <line x1="3" y1="22" x2="25" y2="7" stroke="${MUTCD.BLACK}" stroke-width="3" stroke-linecap="round"/>
        <rect x="13" y="5" width="10" height="7" rx="2" fill="${MUTCD.BLACK}"/>
        <rect x="9" y="8" width="5" height="5" rx="1" fill="${MUTCD.BLACK}"/>
        <circle cx="12" cy="15" r="2.2" fill="${MUTCD.BLACK}"/><circle cx="21" cy="15" r="2.2" fill="${MUTCD.BLACK}"/>
        ${grade ? `<text x="14" y="25" text-anchor="middle" fill="${MUTCD.BLACK}" font-size="7" font-weight="900" font-family="${MUTCD.FONT}">${grade}%</text>` : ''}
      </svg>`
    : `<svg width="${Math.round(size*0.55)}" height="${Math.round(size*0.55)}" viewBox="0 0 28 28" fill="none">
        <line x1="3" y1="7" x2="25" y2="22" stroke="${MUTCD.BLACK}" stroke-width="3" stroke-linecap="round"/>
        <rect x="4" y="5" width="10" height="7" rx="2" fill="${MUTCD.BLACK}"/>
        <rect x="13" y="8" width="5" height="5" rx="1" fill="${MUTCD.BLACK}"/>
        <circle cx="7" cy="15" r="2.2" fill="${MUTCD.BLACK}"/><circle cx="16" cy="15" r="2.2" fill="${MUTCD.BLACK}"/>
        ${grade ? `<text x="14" y="25" text-anchor="middle" fill="${MUTCD.BLACK}" font-size="7" font-weight="900" font-family="${MUTCD.FONT}">${grade}%</text>` : ''}
      </svg>`;
  return warningDiamond(svg, size);
}

/**
 * Winding Road Warning (W1-5) — FHWA
 */
export function windingRoadWarning(size = 40): string {
  const svg = `<svg width="${Math.round(size*0.55)}" height="${Math.round(size*0.55)}" viewBox="0 0 24 24" fill="none">
    <path d="M12 3C6 3 6 10 12 12C18 14 18 21 12 21" stroke="${MUTCD.BLACK}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    <path d="M12 3L9 6M12 3L15 6" stroke="${MUTCD.BLACK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  return warningDiamond(svg, size);
}

/**
 * Rollover Risk Warning (W1-8) — FHWA tipping truck
 */
export function rolloverWarning(size = 42): string {
  const svg = `<svg width="${Math.round(size*0.55)}" height="${Math.round(size*0.55)}" viewBox="0 0 24 24" fill="none">
    <g transform="rotate(-25 12 14)">
      <rect x="3" y="7" width="12" height="8" rx="2" fill="${MUTCD.BLACK}"/>
      <rect x="14" y="9.5" width="7" height="5.5" rx="1" fill="${MUTCD.BLACK}"/>
      <circle cx="7" cy="17.5" r="2.2" fill="${MUTCD.BLACK}"/><circle cx="18" cy="17.5" r="2.2" fill="${MUTCD.BLACK}"/>
    </g>
  </svg>`;
  return warningDiamond(svg, size, MUTCD.YELLOW, MUTCD.BLACK);
}

/**
 * Low Clearance Warning (W12-2) — FHWA
 */
export function lowClearanceWarning(clearance?: string, size = 40): string {
  const svg = `<svg width="${Math.round(size*0.55)}" height="${Math.round(size*0.55)}" viewBox="0 0 24 24" fill="none">
    <path d="M3 19H21M3 19V11A9 9 0 0121 11V19" stroke="${MUTCD.BLACK}" stroke-width="3" stroke-linecap="round"/>
    <path d="M7 19V16M12 19V14M17 19V16" stroke="${MUTCD.BLACK}" stroke-width="2.5" stroke-linecap="round"/>
    ${clearance ? `<text x="12" y="10" text-anchor="middle" fill="${MUTCD.BLACK}" font-size="5.5" font-weight="900" font-family="${MUTCD.FONT}">${clearance}</text>` : ''}
  </svg>`;
  return warningDiamond(svg, size);
}

/**
 * No Trucks Regulatory (R5-2) — FHWA 
 * White circle, red border, red diagonal slash over truck
 */
export function noTrucksSign(size = 40): string {
  return `<div style="width:${size}px;height:${size}px;position:relative;filter:drop-shadow(1px 3px 5px rgba(0,0,0,0.6))">
    <svg viewBox="0 0 40 40" style="position:absolute;inset:0;width:100%;height:100%" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18.5" fill="${MUTCD.WHITE}" stroke="${MUTCD.RED}" stroke-width="3.5"/>
      <rect x="8" y="12" width="14" height="8" rx="2" fill="${MUTCD.BLACK}" opacity="0.65"/>
      <rect x="21" y="14" width="8" height="6" rx="1" fill="${MUTCD.BLACK}" opacity="0.65"/>
      <circle cx="12" cy="22" r="2" fill="${MUTCD.BLACK}" opacity="0.65"/>
      <circle cx="26" cy="22" r="2" fill="${MUTCD.BLACK}" opacity="0.65"/>
      <line x1="6" y1="34" x2="34" y2="6" stroke="${MUTCD.RED}" stroke-width="3.5" stroke-linecap="round"/>
    </svg>
  </div>`;
}

/**
 * Weight Limit Regulatory (R12-1) — FHWA
 * White rectangular sign, black border, "WEIGHT LIMIT"
 */
export function weightLimitSign(message: string, size = 40): string {
  const w = Math.round(size * 1.5);
  const h = Math.round(size * 1.1);
  return `<div style="width:${w}px;height:${h}px;position:relative;filter:drop-shadow(1px 3px 5px rgba(0,0,0,0.6))">
    <svg viewBox="0 0 120 88" style="position:absolute;inset:0;width:100%;height:100%" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="118" height="86" rx="3" fill="${MUTCD.WHITE}" stroke="${MUTCD.BLACK}" stroke-width="3"/>
      <rect x="6" y="6" width="108" height="76" rx="1" fill="none" stroke="${MUTCD.BLACK}" stroke-width="1.5"/>
      <text x="60" y="30" text-anchor="middle" fill="${MUTCD.BLACK}" font-size="14" font-weight="800" font-family="${MUTCD.FONT}" letter-spacing="1">WEIGHT</text>
      <text x="60" y="48" text-anchor="middle" fill="${MUTCD.BLACK}" font-size="14" font-weight="800" font-family="${MUTCD.FONT}" letter-spacing="1">LIMIT</text>
      <text x="60" y="72" text-anchor="middle" fill="${MUTCD.BLACK}" font-size="16" font-weight="900" font-family="${MUTCD.FONT}">${message}</text>
    </svg>
  </div>${signPost(w)}`;
}

/**
 * No Hazmat Regulatory — FHWA-style prohibition
 */
export function noHazmatSign(size = 40): string {
  return `<div style="width:${size}px;height:${size}px;position:relative;filter:drop-shadow(1px 3px 5px rgba(0,0,0,0.6))">
    <svg viewBox="0 0 40 40" style="position:absolute;inset:0;width:100%;height:100%" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18.5" fill="${MUTCD.WHITE}" stroke="${MUTCD.RED}" stroke-width="3.5"/>
      <path d="M20 9L12 25H28L20 9Z" fill="${MUTCD.ORANGE}" stroke="${MUTCD.BLACK}" stroke-width="1.5"/>
      <text x="20" y="23" text-anchor="middle" fill="${MUTCD.BLACK}" font-size="9" font-weight="900">!</text>
      <line x1="6" y1="34" x2="34" y2="6" stroke="${MUTCD.RED}" stroke-width="3.5" stroke-linecap="round"/>
    </svg>
  </div>`;
}

/**
 * Tunnel Warning — FHWA-style (W12-1 variant)
 */
export function tunnelWarning(size = 40): string {
  const svg = `<svg width="${Math.round(size*0.55)}" height="${Math.round(size*0.55)}" viewBox="0 0 24 24" fill="none">
    <path d="M2 20V10A10 10 0 0122 10V20" stroke="${MUTCD.BLACK}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="12" cy="20" rx="5" ry="4" fill="${MUTCD.BLACK}" opacity="0.35"/>
    <rect x="10" y="14" width="4" height="6" rx="2" fill="${MUTCD.BLACK}" opacity="0.25"/>
  </svg>`;
  return warningDiamond(svg, size);
}

/**
 * Exit Guide Sign (E1-5) — FHWA Guide
 * Green background, white retroreflective legend, proper MUTCD proportions
 */
export function exitGuideSign(roadName: string, exitNumber?: string): string {
  const hasExit = !!exitNumber;
  const truncName = roadName.length > 26 ? roadName.substring(0, 24) + '...' : roadName;
  return `<div style="position:relative;filter:drop-shadow(1px 3px 8px rgba(0,0,0,0.7))">
    <div style="background:linear-gradient(180deg,#007a42,#005c30);border:2.5px solid ${MUTCD.WHITE};border-radius:3px;padding:4px 10px;min-width:80px;text-align:center;position:relative">
      ${hasExit ? `<div style="position:absolute;top:-2px;right:-2px;background:${MUTCD.GREEN};border:1.5px solid ${MUTCD.WHITE};border-radius:2px;padding:0 3px;display:flex;align-items:center;gap:2px">
        <span style="font-size:6px;font-weight:800;color:${MUTCD.WHITE};letter-spacing:0.5px;font-family:${MUTCD.FONT}">EXIT</span>
        <span style="font-size:9px;font-weight:900;color:${MUTCD.WHITE};font-family:${MUTCD.FONT}">${exitNumber}</span>
      </div>` : ''}
      <div style="font-size:10px;font-weight:800;color:${MUTCD.WHITE};letter-spacing:0.3px;white-space:nowrap;max-width:130px;overflow:hidden;text-overflow:ellipsis;font-family:${MUTCD.FONT};${hasExit ? 'padding-right:30px' : ''}">${truncName}</div>
      <div style="height:1px;background:rgba(255,255,255,0.15);margin:3px -6px 2px"></div>
      <div style="display:flex;align-items:center;justify-content:center;gap:3px">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M7 7l5-5 5 5M12 2v14M5 18h14" stroke="${MUTCD.WHITE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.75"/></svg>
        <span style="font-size:6px;font-weight:700;color:rgba(255,255,255,0.75);letter-spacing:1px;font-family:${MUTCD.FONT}">EXIT</span>
      </div>
    </div>
    <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:7px solid ${MUTCD.WHITE};margin:0 auto"></div>
  </div>`;
}

/**
 * Notice/Information Warning — FHWA-style
 */
export function noticeWarning(size = 38): string {
  const svg = `<svg width="${Math.round(size*0.5)}" height="${Math.round(size*0.5)}" viewBox="0 0 24 24" fill="none">
    <path d="M12 8v5m0 4h.01" stroke="${MUTCD.BLACK}" stroke-width="3" stroke-linecap="round"/>
    <path d="M4.93 19h14.14c1.34 0 2.17-1.46 1.49-2.63L13.49 4.63a1.7 1.7 0 00-2.98 0L3.44 16.37C2.76 17.54 3.59 19 4.93 19z" stroke="${MUTCD.BLACK}" stroke-width="2.5" fill="none"/>
  </svg>`;
  return warningDiamond(svg, size);
}

/**
 * Construction Zone Warning (W20-1) — FHWA Orange Diamond
 */
export function constructionWarning(size = 40): string {
  const svg = `<svg width="${Math.round(size*0.5)}" height="${Math.round(size*0.5)}" viewBox="0 0 24 24" fill="none">
    <path d="M4 20h16M8 20v-6M16 20v-6M6 14h12M10 14v-4l2-4 2 4v4" stroke="${MUTCD.BLACK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  return warningDiamond(svg, size, MUTCD.ORANGE);
}

/**
 * Direction badge (N/S/E/W) for highway shields — styled as FHWA auxiliary plate
 */
export function directionBadge(direction: string): string {
  const dirArrows: Record<string, string> = {
    north: 'M6 10L10 4L14 10', south: 'M6 6L10 12L14 6',
    east: 'M6 6L12 10L6 14', west: 'M14 6L8 10L14 14'
  };
  const dirKey = (direction || '').toLowerCase();
  if (!dirArrows[dirKey]) return '';
  return `<div style="position:absolute;top:-9px;right:-11px;width:22px;height:22px;border-radius:50%;background:#1a1a2e;border:1.5px solid #D4AF37;display:flex;align-items:center;justify-content:center;z-index:2;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))">
    <svg width="14" height="14" viewBox="0 0 20 16" fill="none"><path d="${dirArrows[dirKey]}" stroke="#D4AF37" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </div>`;
}

export function directionLabel(direction: string): string {
  const labels: Record<string, string> = { north: 'N', south: 'S', east: 'E', west: 'W' };
  const key = (direction || '').toLowerCase();
  if (!labels[key]) return '';
  return `<div style="text-align:center;margin-top:-2px"><span style="font-size:9px;font-weight:900;color:#D4AF37;text-shadow:0 1px 2px rgba(0,0,0,0.9);letter-spacing:1px;font-family:${MUTCD.FONT}">${labels[key]}</span></div>`;
}
