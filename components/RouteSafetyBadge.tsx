import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldCheck, ShieldAlert, ChevronDown, ChevronUp, AlertTriangle, RefreshCw } from 'lucide-react';

interface CrashPrediction {
  incidentCount: number;
  aiPrediction: {
    riskScore: number;
    warnings: string[];
    recommendation: string;
    estimatedDelay: number;
    summary: string;
  };
  analyzedAt: string;
}

const RISK_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  low:    { bg: 'bg-[#D4AF37]/10', border: 'border-[#D4AF37]/30', text: 'text-[#D4AF37]', glow: 'shadow-[0_0_12px_rgba(212,175,55,0.15)]' },
  medium: { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400',   glow: 'shadow-[0_0_12px_rgba(245,158,11,0.15)]' },
  high:   { bg: 'bg-red-500/10',     border: 'border-red-500/30',     text: 'text-red-400',     glow: 'shadow-[0_0_12px_rgba(239,68,68,0.2)]' },
};

function getRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score <= 3) return 'low';
  if (score <= 6) return 'medium';
  return 'high';
}

export function RouteSafetyBadge({
  routeCoords,
  isVisible,
}: {
  routeCoords: [number, number][];
  isVisible: boolean;
}) {
  const [prediction, setPrediction] = useState<CrashPrediction | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastFetchRef = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPrediction = useCallback(async () => {
    if (!routeCoords || routeCoords.length < 2) return;

    // Rate limit: min 2 min between fetches
    if (Date.now() - lastFetchRef.current < 120000 && prediction) return;

    // Compute bounding box from route coords
    const lats = routeCoords.map(c => c[0]);
    const lons = routeCoords.map(c => c[1]);
    const bbox = `${Math.min(...lons)},${Math.min(...lats)},${Math.max(...lons)},${Math.max(...lats)}`;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const resp = await fetch('/api/crash-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bbox }),
        signal: controller.signal,
      });
      if (resp.ok) {
        const data = await resp.json();
        setPrediction(data);
        lastFetchRef.current = Date.now();
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') console.error('Safety fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [routeCoords, prediction]);

  // Fetch on mount and every 5 minutes
  useEffect(() => {
    if (!isVisible || !routeCoords || routeCoords.length < 2) return;
    fetchPrediction();
    const interval = setInterval(fetchPrediction, 300000);
    return () => { clearInterval(interval); abortRef.current?.abort(); };
  }, [isVisible, fetchPrediction]);

  if (!isVisible || !prediction) return null;

  const score = prediction.aiPrediction.riskScore;
  const level = getRiskLevel(score);
  const colors = RISK_COLORS[level];
  const warnings = prediction.aiPrediction.warnings.filter(w => w && w.length > 0);

  return (
    <div
      data-testid="route-safety-badge"
      className={`${colors.bg} ${colors.border} ${colors.glow} border backdrop-blur-xl rounded-xl overflow-hidden transition-all duration-300`}
      style={{ width: expanded ? '240px' : 'auto' }}
    >
      {/* Collapsed badge */}
      <button
        data-testid="safety-badge-toggle"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-2.5 py-1.5 w-full text-left"
      >
        <div className="relative">
          {level === 'low' ? (
            <ShieldCheck className={`w-4 h-4 ${colors.text}`} />
          ) : (
            <ShieldAlert className={`w-4 h-4 ${colors.text} ${level === 'high' ? 'animate-pulse' : ''}`} />
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className={`text-[10px] font-black ${colors.text} uppercase tracking-wider`}>
            {score}/10
          </span>
          {!expanded && (
            <span className="text-[9px] font-bold text-zinc-500 truncate">
              {level === 'low' ? 'Clear' : level === 'medium' ? 'Caution' : 'Alert'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {loading && <RefreshCw className="w-2.5 h-2.5 text-zinc-600 animate-spin" />}
          {expanded ? <ChevronUp className="w-3 h-3 text-zinc-500" /> : <ChevronDown className="w-3 h-3 text-zinc-500" />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-2 border-t border-white/5 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Route Safety</span>
            <button
              data-testid="safety-refresh-btn"
              onClick={(e) => { e.stopPropagation(); lastFetchRef.current = 0; fetchPrediction(); }}
              className="p-1 rounded-md hover:bg-white/5 transition-colors"
            >
              <RefreshCw className={`w-2.5 h-2.5 text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Risk bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  level === 'low' ? 'bg-[#D4AF37]' : level === 'medium' ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${score * 10}%` }}
              />
            </div>
            <span className={`text-[10px] font-black ${colors.text}`}>{score}/10</span>
          </div>

          {/* Summary */}
          <p className="text-[10px] text-zinc-400 leading-relaxed">{prediction.aiPrediction.summary}</p>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-1">
              {warnings.slice(0, 3).map((w, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <AlertTriangle className={`w-2.5 h-2.5 ${colors.text} mt-0.5 shrink-0`} />
                  <span className="text-[9px] text-zinc-400 leading-tight">{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recommendation */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${colors.bg} ${colors.border} border`}>
            <ShieldCheck className={`w-3 h-3 ${colors.text} shrink-0`} />
            <span className={`text-[9px] font-bold ${colors.text}`}>
              {prediction.aiPrediction.recommendation}
            </span>
          </div>

          {/* Meta */}
          <div className="flex items-center justify-between text-[8px] text-zinc-600">
            <span>{prediction.incidentCount} incident{prediction.incidentCount !== 1 ? 's' : ''} detected</span>
            {prediction.aiPrediction.estimatedDelay > 0 && (
              <span>~{prediction.aiPrediction.estimatedDelay}min delay</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
