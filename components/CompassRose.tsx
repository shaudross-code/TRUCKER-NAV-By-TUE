import React, { useContext, useEffect, useState, useRef } from 'react';
import { TelemetryContext } from '../types';

interface CompassRoseProps {
  isCompassMode: boolean;
}

const CARDINALS = [
  { label: 'N',  angle: 0,   major: true,  north: true  },
  { label: 'NE', angle: 45,  major: false, north: false },
  { label: 'E',  angle: 90,  major: true,  north: false },
  { label: 'SE', angle: 135, major: false, north: false },
  { label: 'S',  angle: 180, major: true,  north: false },
  { label: 'SW', angle: 225, major: false, north: false },
  { label: 'W',  angle: 270, major: true,  north: false },
  { label: 'NW', angle: 315, major: false, north: false },
];

// All 36 tick marks (every 10°)
const TICKS = Array.from({ length: 36 }, (_, i) => i * 10);

function bearingToCardinal(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

export const CompassRose: React.FC<CompassRoseProps> = ({ isCompassMode }) => {
  const telemetry = useContext(TelemetryContext);
  const [bearing, setBearing] = useState(0);
  const prevBearingRef = useRef(0);
  const SIZE = 84;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const OUTER_R = 36;
  const INNER_R = 28;
  const LABEL_R = 22;

  // ── GPS heading subscription ──────────────────────────────────────────────
  useEffect(() => {
    if (isCompassMode || !telemetry) return;
    const unsub = telemetry.subscribe(() => {
      const h = telemetry.headingRef.current || 0;
      setBearing(h);
      prevBearingRef.current = h;
    });
    return unsub;
  }, [telemetry, isCompassMode]);

  // ── Device compass subscription ───────────────────────────────────────────
  useEffect(() => {
    if (!isCompassMode) return;
    const handler = (e: DeviceOrientationEvent) => {
      let h = 0;
      if ((e as any).webkitCompassHeading !== undefined) {
        h = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null) {
        h = (360 - (e.alpha || 0)) % 360;
      } else return;
      setBearing(h);
      prevBearingRef.current = h;
    };
    window.addEventListener('deviceorientationabsolute', handler as any, true);
    window.addEventListener('deviceorientation', handler as any);
    return () => {
      window.removeEventListener('deviceorientationabsolute', handler as any);
      window.removeEventListener('deviceorientation', handler as any);
    };
  }, [isCompassMode]);

  const accentColor = isCompassMode ? '#3B82F6' : '#D4AF37';
  const glowColor   = isCompassMode ? 'rgba(59,130,246,0.35)' : 'rgba(212,175,55,0.25)';

  // ── SVG helpers ───────────────────────────────────────────────────────────
  const polar = (angle: number, r: number) => ({
    x: CX + r * Math.sin((angle * Math.PI) / 180),
    y: CY - r * Math.cos((angle * Math.PI) / 180),
  });

  const tickLength = (deg: number) => {
    if (deg % 90 === 0) return 5.5;  // major (N/E/S/W)
    if (deg % 45 === 0) return 4;    // intercardinal (NE/SE…)
    return 2.5;                       // minor (every 10°)
  };

  return (
    <div
      data-testid="compass-rose"
      className="select-none pointer-events-none"
      style={{
        filter: `drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 2px 4px rgba(0,0,0,0.7))`,
      }}
    >
      <svg
        width={SIZE}
        height={SIZE + 20}
        viewBox={`0 0 ${SIZE} ${SIZE + 20}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="roseGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(20,20,20,0.92)" />
            <stop offset="100%" stopColor="rgba(8,8,8,0.97)" />
          </radialGradient>
          <filter id="needleGlow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Outer glow ring ── */}
        <circle
          cx={CX} cy={CY} r={OUTER_R + 2}
          fill="none"
          stroke={accentColor}
          strokeWidth="0.5"
          opacity="0.3"
        />

        {/* ── Glass background ── */}
        <circle
          cx={CX} cy={CY} r={OUTER_R}
          fill="url(#roseGradient)"
          stroke={accentColor}
          strokeWidth="1"
          opacity="0.85"
        />

        {/* ── Rotating group — ticks + cardinal labels ── */}
        <g
          transform={`rotate(${-bearing} ${CX} ${CY})`}
          style={{ transition: 'transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94)' }}
        >
          {/* Tick marks */}
          {TICKS.map(deg => {
            const len = tickLength(deg);
            const outer = polar(deg, OUTER_R - 1);
            const inner = polar(deg, OUTER_R - 1 - len);
            const isCardinal = deg % 90 === 0;
            return (
              <line
                key={deg}
                x1={outer.x} y1={outer.y}
                x2={inner.x} y2={inner.y}
                stroke={isCardinal ? accentColor : 'rgba(255,255,255,0.25)'}
                strokeWidth={isCardinal ? 1.5 : 0.8}
                strokeLinecap="round"
              />
            );
          })}

          {/* Cardinal direction labels */}
          {CARDINALS.map(({ label, angle, major, north }) => {
            const pos = polar(angle, LABEL_R);
            return (
              <text
                key={label}
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={north ? 9 : major ? 7 : 5.5}
                fontWeight={north || major ? 'bold' : '500'}
                fontFamily="'Inter', 'SF Pro Display', system-ui, sans-serif"
                letterSpacing="0.5"
                fill={north ? accentColor : major ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)'}
              >
                {label}
              </text>
            );
          })}
        </g>

        {/* ── Fixed needle (always points up = driver's forward direction) ── */}
        <g filter="url(#needleGlow)">
          {/* North tip — gold/blue */}
          <polygon
            points={`${CX},${CY - INNER_R + 2} ${CX - 4},${CY} ${CX},${CY - 5} ${CX + 4},${CY}`}
            fill={accentColor}
            opacity="0.95"
          />
          {/* South stub — muted */}
          <polygon
            points={`${CX},${CY + INNER_R - 4} ${CX - 3},${CY} ${CX},${CY + 3} ${CX + 3},${CY}`}
            fill="rgba(255,255,255,0.18)"
          />
          {/* Center pivot */}
          <circle
            cx={CX} cy={CY} r="3.5"
            fill={accentColor}
            stroke="rgba(0,0,0,0.6)"
            strokeWidth="1"
          />
        </g>

        {/* ── Inner crosshair ring ── */}
        <circle
          cx={CX} cy={CY} r={INNER_R - 1}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.8"
          strokeDasharray="2,4"
        />

        {/* ── Bearing label below circle ── */}
        <g>
          <rect
            x={CX - 22} y={SIZE + 2}
            width={44} height={16}
            rx={8}
            fill="rgba(0,0,0,0.75)"
            stroke={accentColor}
            strokeWidth="0.8"
            opacity="0.85"
          />
          <text
            x={CX - 9} y={SIZE + 12}
            textAnchor="end"
            dominantBaseline="central"
            fontSize="9"
            fontWeight="bold"
            fontFamily="'JetBrains Mono', 'SF Mono', monospace"
            fill="rgba(255,255,255,0.9)"
            letterSpacing="0.5"
          >
            {String(Math.round(((bearing % 360) + 360) % 360)).padStart(3, '0')}°
          </text>
          <text
            x={CX + 1} y={SIZE + 12}
            textAnchor="start"
            dominantBaseline="central"
            fontSize="7.5"
            fontWeight="600"
            fontFamily="'Inter', system-ui, sans-serif"
            fill={accentColor}
          >
            {bearingToCardinal(bearing)}
          </text>
        </g>

        {/* ── Compass mode indicator dot ── */}
        {isCompassMode && (
          <circle
            cx={CX + OUTER_R - 4} cy={CY - OUTER_R + 4}
            r="4"
            fill="#3B82F6"
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="1"
          />
        )}
      </svg>
    </div>
  );
};
