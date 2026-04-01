/**
 * MUTCD (Manual on Uniform Traffic Control Devices) Compliant Road Sign SVGs
 * Based on FHWA Standard Highway Signs specifications
 * All signs use official proportions, colors, and typography standards
 */

// FHWA Standard Colors
const MUTCD = {
  // Standard sign colors per FHWA
  RED: '#C1272D',
  BLUE: '#003F87',
  GREEN: '#006B3C',
  YELLOW: '#FFD100',
  ORANGE: '#FF6D2E',
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  BROWN: '#693F23',
  
  // Interstate specific
  INTERSTATE_BLUE: '#003F87',
  INTERSTATE_RED: '#BF2033',
  
  // Sign font: Highway Gothic (approximated with system fonts)
  FONT: "'Highway Gothic', 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif",
};

/**
 * Interstate Highway Shield (M1-1) — MUTCD standard
 * Blue shield with red top panel "INTERSTATE", white number
 */
export function interstateShield(routeNum: string, size = 44): string {
  const fontSize = routeNum.length > 2 ? 13 : 17;
  return `<div style="width:${size}px;height:${Math.round(size * 1.05)}px;position:relative;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.7))">
    <svg viewBox="0 0 120 126" style="position:absolute;inset:0;width:100%;height:100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="ishield"><path d="M60 2 L110 18 L110 72 C110 100 60 122 60 122 C60 122 10 100 10 72 L10 18 Z"/></clipPath>
      </defs>
      <!-- Shield body -->
      <path d="M60 2 L110 18 L110 72 C110 100 60 122 60 122 C60 122 10 100 10 72 L10 18 Z" fill="${MUTCD.INTERSTATE_BLUE}" stroke="${MUTCD.WHITE}" stroke-width="5"/>
      <!-- Red top band -->
      <rect x="10" y="14" width="100" height="22" fill="${MUTCD.INTERSTATE_RED}" clip-path="url(#ishield)"/>
      <!-- INTERSTATE text -->
      <text x="60" y="31" text-anchor="middle" fill="${MUTCD.WHITE}" font-size="11" font-weight="700" font-family="${MUTCD.FONT}" letter-spacing="1.5">INTERSTATE</text>
      <!-- White inner border line -->
      <path d="M60 8 L104 22 L104 72 C104 95 60 116 60 116 C60 116 16 95 16 72 L16 22 Z" fill="none" stroke="${MUTCD.WHITE}" stroke-width="1.5"/>
    </svg>
    <span style="position:relative;color:${MUTCD.WHITE};font-size:${fontSize}px;font-weight:900;margin-top:6px;text-shadow:0 1px 2px rgba(0,0,0,0.5);font-family:${MUTCD.FONT};letter-spacing:0.5px">${routeNum}</span>
  </div>`;
}

/**
 * US Route Shield (M1-4) — MUTCD standard  
 * Black background, white shield interior, black number
 */
export function usRouteShield(routeNum: string, size = 40): string {
  const fontSize = routeNum.length > 2 ? 12 : 15;
  return `<div style="width:${size}px;height:${Math.round(size * 1.05)}px;position:relative;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.6))">
    <svg viewBox="0 0 100 106" style="position:absolute;inset:0;width:100%;height:100%" xmlns="http://www.w3.org/2000/svg">
      <!-- Black outer shape -->
      <path d="M10 6 L90 6 L90 60 C90 88 50 100 50 100 C50 100 10 88 10 60 Z" fill="${MUTCD.BLACK}"/>
      <!-- White inner fill -->
      <path d="M16 12 L84 12 L84 58 C84 82 50 93 50 93 C50 93 16 82 16 58 Z" fill="${MUTCD.WHITE}"/>
      <!-- Black inner border -->
      <path d="M20 16 L80 16 L80 56 C80 78 50 88 50 88 C50 88 20 78 20 56 Z" fill="none" stroke="${MUTCD.BLACK}" stroke-width="1.5"/>
    </svg>
    <span style="position:relative;color:${MUTCD.BLACK};font-size:${fontSize}px;font-weight:900;margin-top:1px;font-family:${MUTCD.FONT}">${routeNum}</span>
  </div>`;
}

/**
 * State Route Shield — Circle style (default for most states)
 */
export function stateRouteShield(routeNum: string, size = 34): string {
  const fontSize = routeNum.length > 2 ? 10 : 13;
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${MUTCD.WHITE};border:3px solid ${MUTCD.BLACK};display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));box-shadow:inset 0 0 0 1.5px ${MUTCD.BLACK}">
    <span style="color:${MUTCD.BLACK};font-size:${fontSize}px;font-weight:900;font-family:${MUTCD.FONT}">${routeNum}</span>
  </div>`;
}

/**
 * Speed Limit Sign (R2-1) — MUTCD Regulatory
 * White rectangular sign, black border, "SPEED LIMIT" text, large number
 */
export function speedLimitSign(speed: number, size = 38): string {
  const h = Math.round(size * 1.25);
  return `<div style="width:${size}px;height:${h}px;background:${MUTCD.WHITE};border:3px solid ${MUTCD.BLACK};border-radius:3px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2px 1px;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.6));box-shadow:inset 0 0 0 1px ${MUTCD.BLACK}">
    <div style="font-size:6.5px;font-weight:800;color:${MUTCD.BLACK};letter-spacing:0.8px;line-height:1;font-family:${MUTCD.FONT}">SPEED</div>
    <div style="font-size:5.5px;font-weight:800;color:${MUTCD.BLACK};letter-spacing:0.8px;line-height:1;font-family:${MUTCD.FONT}">LIMIT</div>
    <div style="font-size:18px;font-weight:900;color:${MUTCD.BLACK};line-height:1;margin-top:1px;font-family:${MUTCD.FONT}">${speed}</div>
  </div>`;
}

/**
 * Warning Sign Diamond (W-series) — MUTCD Warning
 * Yellow diamond with black border, contains symbol SVG
 */
export function warningDiamond(innerSvg: string, size = 36, borderColor = MUTCD.BLACK): string {
  return `<div style="width:${size}px;height:${size}px;background:${MUTCD.YELLOW};border:3px solid ${borderColor};transform:rotate(45deg);display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.6));box-shadow:inset 0 0 0 2px ${MUTCD.BLACK},inset 0 0 0 4px ${MUTCD.YELLOW}">
    <div style="transform:rotate(-45deg);display:flex;align-items:center;justify-content:center">${innerSvg}</div>
  </div>`;
}

/**
 * Curve Warning (W1-1/W1-2) — MUTCD
 */
export function curveWarning(direction: 'left' | 'right', size = 36): string {
  const arrowPath = direction === 'left'
    ? 'M19 17C19 17 15 17 13 15C11 13 11 9 11 9L11 5M11 5L7 9M11 5L15 9'
    : 'M5 17C5 17 9 17 11 15C13 13 13 9 13 9L13 5M13 5L9 9M13 5L17 9';
  const svg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="${arrowPath}" stroke="${MUTCD.BLACK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  return warningDiamond(svg, size);
}

/**
 * Steep Grade Warning (W7-1) — MUTCD truck on slope
 */
export function steepGradeWarning(direction: 'down' | 'up', grade?: number, size = 40): string {
  const svg = direction === 'down'
    ? `<svg width="24" height="24" viewBox="0 0 28 28" fill="none">
        <line x1="4" y1="22" x2="24" y2="8" stroke="${MUTCD.BLACK}" stroke-width="2.5" stroke-linecap="round"/>
        <rect x="13" y="6" width="9" height="6" rx="1.5" fill="${MUTCD.BLACK}"/>
        <rect x="9" y="8.5" width="5" height="4" rx="1" fill="${MUTCD.BLACK}"/>
        <circle cx="12" cy="14.5" r="2" fill="${MUTCD.BLACK}"/><circle cx="20" cy="14.5" r="2" fill="${MUTCD.BLACK}"/>
        <text x="14" y="23" text-anchor="middle" fill="${MUTCD.BLACK}" font-size="6" font-weight="900">${grade ? grade + '%' : ''}</text>
      </svg>`
    : `<svg width="24" height="24" viewBox="0 0 28 28" fill="none">
        <line x1="4" y1="8" x2="24" y2="22" stroke="${MUTCD.BLACK}" stroke-width="2.5" stroke-linecap="round"/>
        <rect x="4" y="6" width="9" height="6" rx="1.5" fill="${MUTCD.BLACK}"/>
        <rect x="12" y="8.5" width="5" height="4" rx="1" fill="${MUTCD.BLACK}"/>
        <circle cx="7" cy="14.5" r="2" fill="${MUTCD.BLACK}"/><circle cx="15" cy="14.5" r="2" fill="${MUTCD.BLACK}"/>
        <text x="14" y="23" text-anchor="middle" fill="${MUTCD.BLACK}" font-size="6" font-weight="900">${grade ? grade + '%' : ''}</text>
      </svg>`;
  return warningDiamond(svg, size);
}

/**
 * Winding Road Warning (W1-5) — MUTCD
 */
export function windingRoadWarning(size = 36): string {
  const svg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 4C6 4 6 10 12 12C18 14 18 20 12 20" stroke="${MUTCD.BLACK}" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M12 4L9 7M12 4L15 7" stroke="${MUTCD.BLACK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  return warningDiamond(svg, size);
}

/**
 * Rollover Risk Warning (W1-8) — MUTCD tipping truck
 */
export function rolloverWarning(size = 38): string {
  const svg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <g transform="rotate(-25 12 14)">
      <rect x="4" y="8" width="11" height="7" rx="1.5" fill="${MUTCD.BLACK}"/>
      <rect x="14" y="10" width="6" height="5" rx="1" fill="${MUTCD.BLACK}"/>
      <circle cx="7" cy="17" r="2" fill="${MUTCD.BLACK}"/><circle cx="17" cy="17" r="2" fill="${MUTCD.BLACK}"/>
    </g>
  </svg>`;
  return warningDiamond(svg, size, MUTCD.RED);
}

/**
 * Low Clearance Warning (W12-2) — MUTCD
 */
export function lowClearanceWarning(clearance?: string, size = 36): string {
  const svg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M4 18H20M4 18V12A8 8 0 0120 12V18" stroke="${MUTCD.BLACK}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M8 18V15M12 18V13M16 18V15" stroke="${MUTCD.BLACK}" stroke-width="2" stroke-linecap="round"/>
    ${clearance ? `<text x="12" y="10" text-anchor="middle" fill="${MUTCD.BLACK}" font-size="5" font-weight="900">${clearance}</text>` : ''}
  </svg>`;
  return warningDiamond(svg, size);
}

/**
 * No Trucks Regulatory (R5-2) — MUTCD 
 * White circle with red border and diagonal slash over truck
 */
export function noTrucksSign(size = 36): string {
  return `<div style="width:${size}px;height:${size}px;background:${MUTCD.WHITE};border:4px solid ${MUTCD.RED};border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.6))">
    <svg width="${size * 0.6}" height="${size * 0.6}" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="9" width="12" height="7" rx="1.5" fill="${MUTCD.BLACK}" opacity="0.7"/>
      <rect x="14" y="11" width="7" height="5" rx="1" fill="${MUTCD.BLACK}" opacity="0.7"/>
      <circle cx="7" cy="18" r="2" fill="${MUTCD.BLACK}" opacity="0.7"/>
      <circle cx="18" cy="18" r="2" fill="${MUTCD.BLACK}" opacity="0.7"/>
    </svg>
    <div style="position:absolute;inset:0;border-radius:50%;overflow:hidden">
      <div style="position:absolute;top:50%;left:50%;width:${size * 0.8}px;height:4px;background:${MUTCD.RED};transform:translate(-50%,-50%) rotate(-45deg)"></div>
    </div>
  </div>`;
}

/**
 * Weight Limit Regulatory (R12-1) — MUTCD
 * White rectangular sign with "WEIGHT LIMIT" and tonnage
 */
export function weightLimitSign(message: string, size = 36): string {
  return `<div style="width:${size * 1.6}px;height:${size}px;background:${MUTCD.WHITE};border:3px solid ${MUTCD.BLACK};border-radius:3px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2px;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.6))">
    <div style="font-size:6px;font-weight:800;color:${MUTCD.BLACK};letter-spacing:0.5px;font-family:${MUTCD.FONT}">WEIGHT</div>
    <div style="font-size:6px;font-weight:800;color:${MUTCD.BLACK};letter-spacing:0.5px;font-family:${MUTCD.FONT}">LIMIT</div>
    <div style="font-size:8px;font-weight:900;color:${MUTCD.BLACK};font-family:${MUTCD.FONT};margin-top:1px;max-width:${size * 1.4}px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${message}</div>
  </div>`;
}

/**
 * No Hazmat Regulatory — MUTCD-style
 * Red circle/slash prohibition
 */
export function noHazmatSign(size = 36): string {
  return `<div style="width:${size}px;height:${size}px;background:${MUTCD.WHITE};border:4px solid ${MUTCD.RED};border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.6))">
    <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none">
      <path d="M12 4L4 20H20L12 4Z" fill="${MUTCD.ORANGE}" stroke="${MUTCD.BLACK}" stroke-width="1.5"/>
      <text x="12" y="17" text-anchor="middle" fill="${MUTCD.BLACK}" font-size="8" font-weight="900">!</text>
    </svg>
    <div style="position:absolute;inset:0;border-radius:50%;overflow:hidden">
      <div style="position:absolute;top:50%;left:50%;width:${size * 0.8}px;height:4px;background:${MUTCD.RED};transform:translate(-50%,-50%) rotate(-45deg)"></div>
    </div>
  </div>`;
}

/**
 * Tunnel Warning — MUTCD-style (W12-1 variant)
 */
export function tunnelWarning(size = 36): string {
  const svg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M3 20V10A9 9 0 0121 10V20" stroke="${MUTCD.BLACK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="12" cy="20" rx="5" ry="4" fill="${MUTCD.BLACK}" opacity="0.4"/>
    <rect x="10" y="14" width="4" height="6" rx="2" fill="${MUTCD.BLACK}" opacity="0.3"/>
  </svg>`;
  return warningDiamond(svg, size);
}

/**
 * Exit Guide Sign (E1-5/E2-1) — MUTCD Guide
 * Green rectangular sign with white text (Highway-style exit sign)
 */
export function exitGuideSign(roadName: string, exitNumber?: string): string {
  const hasExitNum = !!exitNumber;
  const truncatedName = roadName.length > 28 ? roadName.substring(0, 26) + '...' : roadName;
  return `<div style="position:relative;background:${MUTCD.GREEN};border:2.5px solid ${MUTCD.WHITE};border-radius:4px;padding:3px 8px;min-width:72px;text-align:center;box-shadow:inset 0 1px 0 rgba(255,255,255,0.1);filter:drop-shadow(0 4px 12px rgba(0,0,0,0.8))">
    ${hasExitNum ? `<div style="position:absolute;top:-1px;right:-1px;background:${MUTCD.GREEN};border:1.5px solid ${MUTCD.WHITE};border-radius:2px;padding:0px 3px">
      <span style="font-size:6px;font-weight:900;color:${MUTCD.WHITE};letter-spacing:0.5px;font-family:${MUTCD.FONT}">EXIT</span>
      <span style="font-size:8px;font-weight:900;color:${MUTCD.WHITE};margin-left:2px;font-family:${MUTCD.FONT}">${exitNumber}</span>
    </div>` : ''}
    <div style="font-size:9px;font-weight:900;color:${MUTCD.WHITE};letter-spacing:0.3px;text-shadow:0 1px 2px rgba(0,0,0,0.4);white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;font-family:${MUTCD.FONT};${hasExitNum ? 'padding-right:28px' : ''}">${truncatedName}</div>
    <div style="height:1px;background:rgba(255,255,255,0.2);margin:2px -4px 1px"></div>
    <div style="display:flex;align-items:center;justify-content:center;gap:3px">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M7 7l5-5 5 5M12 2v14M5 18h14" stroke="${MUTCD.WHITE}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/></svg>
      <span style="font-size:6px;font-weight:700;color:rgba(255,255,255,0.8);letter-spacing:1px;font-family:${MUTCD.FONT}">EXIT</span>
    </div>
  </div>
  <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid ${MUTCD.WHITE};margin:0 auto"></div>`;
}

/**
 * Notice/Information Sign — MUTCD-style
 */
export function noticeWarning(size = 34): string {
  const svg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M12 9v4m0 4h.01" stroke="${MUTCD.BLACK}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M4.93 19h14.14c1.34 0 2.17-1.46 1.49-2.63L13.49 4.63a1.7 1.7 0 00-2.98 0L3.44 16.37C2.76 17.54 3.59 19 4.93 19z" stroke="${MUTCD.BLACK}" stroke-width="2" fill="none"/>
  </svg>`;
  return warningDiamond(svg, size);
}

/**
 * Construction Zone Warning (W20-1) — MUTCD Orange Diamond
 */
export function constructionWarning(size = 36): string {
  const svg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M4 20h16M8 20v-6M16 20v-6M6 14h12M10 14v-4l2-4 2 4v4" stroke="${MUTCD.BLACK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  return `<div style="width:${size}px;height:${size}px;background:${MUTCD.ORANGE};border:3px solid ${MUTCD.BLACK};transform:rotate(45deg);display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.6));box-shadow:inset 0 0 0 2px ${MUTCD.BLACK},inset 0 0 0 4px ${MUTCD.ORANGE}">
    <div style="transform:rotate(-45deg);display:flex;align-items:center;justify-content:center">${svg}</div>
  </div>`;
}

/**
 * Direction badge (N/S/E/W) for highway shields
 */
export function directionBadge(direction: string): string {
  const dirArrows: Record<string, string> = {
    north: 'M6 10L10 4L14 10', south: 'M6 6L10 12L14 6',
    east: 'M6 6L12 10L6 14', west: 'M14 6L8 10L14 14'
  };
  const dirKey = (direction || '').toLowerCase();
  if (!dirArrows[dirKey]) return '';
  return `<div style="position:absolute;top:-8px;right:-10px;width:20px;height:20px;border-radius:50%;background:#1a1a2e;border:1.5px solid #D4AF37;display:flex;align-items:center;justify-content:center;z-index:2">
    <svg width="14" height="14" viewBox="0 0 20 16" fill="none"><path d="${dirArrows[dirKey]}" stroke="#D4AF37" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </div>`;
}

export function directionLabel(direction: string): string {
  const labels: Record<string, string> = { north: 'N', south: 'S', east: 'E', west: 'W' };
  const key = (direction || '').toLowerCase();
  if (!labels[key]) return '';
  return `<div style="text-align:center;margin-top:-2px"><span style="font-size:8px;font-weight:900;color:#D4AF37;text-shadow:0 1px 2px rgba(0,0,0,0.9);letter-spacing:1px;font-family:${MUTCD.FONT}">${labels[key]}</span></div>`;
}
