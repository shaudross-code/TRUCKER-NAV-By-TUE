import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  Users, MapPin, Fuel, AlertTriangle, ShieldCheck, Send,
  ThumbsUp, Clock, Filter, ChevronDown, Truck, ParkingCircle, Scale
} from 'lucide-react';

type ReportCategory = 'parking' | 'fuel_price' | 'weigh_station' | 'hazard' | 'road_condition';

interface CommunityReport {
  id: string;
  category: ReportCategory;
  title: string;
  description: string;
  lat: number;
  lon: number;
  locationName: string;
  upvotes: number;
  createdAt: string;
  userName: string;
  expiresAt?: string;
  meta?: Record<string, any>;
}

const CATEGORY_CONFIG: Record<ReportCategory, { label: string; icon: any; color: string; bg: string }> = {
  parking: { label: 'Parking', icon: ParkingCircle, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/15 border-[#D4AF37]/25' },
  fuel_price: { label: 'Fuel Price', icon: Fuel, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/15 border-[#D4AF37]/25' },
  weigh_station: { label: 'Weigh Station', icon: Scale, color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/25' },
  hazard: { label: 'Road Hazard', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/25' },
  road_condition: { label: 'Road Condition', icon: ShieldCheck, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/15 border-[#D4AF37]/25' },
};

const PRESET_REPORTS: Record<ReportCategory, { title: string; desc: string }[]> = {
  parking: [
    { title: 'Spaces Available', desc: 'Truck parking spots open right now' },
    { title: 'Lot Full', desc: 'No spots available at this location' },
    { title: 'Overnight Parking OK', desc: 'Safe for overnight rest stops' },
  ],
  fuel_price: [
    { title: 'Good Diesel Price', desc: 'Below average diesel pricing' },
    { title: 'Price Spike', desc: 'Above average — avoid if possible' },
    { title: 'DEF Available', desc: 'Diesel exhaust fluid in stock' },
  ],
  weigh_station: [
    { title: 'Station Open', desc: 'Weigh station is currently operating' },
    { title: 'Station Closed', desc: 'Bypass — station not active' },
    { title: 'Long Wait', desc: 'Heavy queue — expect 15+ min delay' },
  ],
  hazard: [
    { title: 'Road Debris', desc: 'Debris on roadway — use caution' },
    { title: 'Construction Zone', desc: 'Active construction with lane closures' },
    { title: 'Low Bridge Ahead', desc: 'Bridge clearance may be insufficient for CMV' },
  ],
  road_condition: [
    { title: 'Smooth Road', desc: 'Good pavement condition' },
    { title: 'Rough Surface', desc: 'Potholed or uneven roadway' },
    { title: 'Ice/Snow', desc: 'Slippery conditions — chains may be needed' },
  ],
};

export default function CommunityView() {
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [filterCat, setFilterCat] = useState<ReportCategory | 'all'>('all');
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitCat, setSubmitCat] = useState<ReportCategory>('parking');
  const [submitTitle, setSubmitTitle] = useState('');
  const [submitDesc, setSubmitDesc] = useState('');
  const [submitLocation, setSubmitLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load reports from backend
  const loadReports = useCallback(async () => {
    try {
      const resp = await fetch('/api/community/reports');
      if (resp.ok) {
        const data = await resp.json();
        setReports(data.reports || []);
      }
    } catch (e) {
      console.error('Failed to load community reports:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const submitReport = async () => {
    if (!submitTitle.trim()) return;
    setSubmitting(true);
    try {
      const resp = await fetch('/api/community/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: submitCat,
          title: submitTitle.trim(),
          description: submitDesc.trim(),
          locationName: submitLocation.trim() || 'Unknown Location',
          lat: 39.8283 + (Math.random() - 0.5) * 10, // Placeholder coords
          lon: -98.5795 + (Math.random() - 0.5) * 20,
          userName: 'Anonymous Trucker',
        }),
      });
      if (resp.ok) {
        await loadReports();
        setShowSubmit(false);
        setSubmitTitle('');
        setSubmitDesc('');
        setSubmitLocation('');
      }
    } catch (e) {
      console.error('Failed to submit report:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const upvoteReport = async (reportId: string) => {
    try {
      await fetch(`/api/community/reports/${reportId}/upvote`, { method: 'POST' });
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, upvotes: r.upvotes + 1 } : r));
    } catch (e) {
      console.error('Failed to upvote:', e);
    }
  };

  const filteredReports = filterCat === 'all' ? reports : reports.filter(r => r.category === filterCat);
  const sortedReports = [...filteredReports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const timeAgo = (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  return (
    <div data-testid="community-view" className="h-full overflow-y-auto bg-[#050505] p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20">
            <Users className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white uppercase tracking-wider">Community</h1>
            <p className="text-xs text-zinc-500">Real-time trucker reports — parking, fuel, hazards, weigh stations</p>
          </div>
        </div>
        <button
          data-testid="community-submit-btn"
          onClick={() => setShowSubmit(!showSubmit)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#D4AF37] text-black rounded-xl text-xs font-bold hover:bg-[#C4A030] transition-colors"
        >
          <Send className="w-3.5 h-3.5" /> Report
        </button>
      </div>

      {/* Category Stats */}
      <div className="grid grid-cols-5 gap-2">
        {(Object.entries(CATEGORY_CONFIG) as [ReportCategory, typeof CATEGORY_CONFIG[ReportCategory]][]).map(([cat, cfg]) => {
          const count = reports.filter(r => r.category === cat).length;
          const Icon = cfg.icon;
          return (
            <button
              key={cat}
              data-testid={`community-filter-${cat}`}
              onClick={() => setFilterCat(filterCat === cat ? 'all' : cat)}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                filterCat === cat ? cfg.bg + ' border-opacity-50' : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <Icon className={`w-4 h-4 mx-auto mb-1 ${filterCat === cat ? cfg.color : 'text-zinc-500'}`} />
              <div className={`text-xs font-bold ${filterCat === cat ? cfg.color : 'text-zinc-400'}`}>{count}</div>
              <div className="text-[8px] text-zinc-600 uppercase font-bold">{cfg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Submit Form */}
      {showSubmit && (
        <div data-testid="community-submit-form" className="bg-zinc-900/90 border border-[#D4AF37]/20 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-black text-[#D4AF37] uppercase tracking-wider">Submit Report</h3>

          {/* Category Select */}
          <div className="flex gap-2 flex-wrap">
            {(Object.entries(CATEGORY_CONFIG) as [ReportCategory, typeof CATEGORY_CONFIG[ReportCategory]][]).map(([cat, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSubmitCat(cat);
                    setSubmitTitle('');
                    setSubmitDesc('');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                    submitCat === cat ? cfg.bg : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3 h-3" /> {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-zinc-500 font-bold uppercase">Quick Report</span>
            <div className="flex gap-2 flex-wrap">
              {PRESET_REPORTS[submitCat].map((preset, i) => (
                <button
                  key={i}
                  onClick={() => { setSubmitTitle(preset.title); setSubmitDesc(preset.desc); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                    submitTitle === preset.title
                      ? 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'
                  }`}
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Input */}
          <input
            data-testid="community-title-input"
            value={submitTitle}
            onChange={e => setSubmitTitle(e.target.value)}
            placeholder="Report title..."
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-600 focus:border-[#D4AF37]/50 focus:outline-none"
          />
          <input
            data-testid="community-location-input"
            value={submitLocation}
            onChange={e => setSubmitLocation(e.target.value)}
            placeholder="Location (e.g., I-80 Exit 124, Pilot #358)"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-600 focus:border-[#D4AF37]/50 focus:outline-none"
          />
          <textarea
            data-testid="community-desc-input"
            value={submitDesc}
            onChange={e => setSubmitDesc(e.target.value)}
            placeholder="Details (optional)"
            rows={2}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-600 focus:border-[#D4AF37]/50 focus:outline-none resize-none"
          />
          <button
            data-testid="community-submit-confirm"
            onClick={submitReport}
            disabled={!submitTitle.trim() || submitting}
            className="w-full py-2.5 bg-[#D4AF37] text-black rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#C4A030] transition-colors disabled:opacity-40"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      )}

      {/* Reports Feed */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black text-white uppercase tracking-wider">
            Live Feed <span className="text-zinc-600 text-[10px] font-normal ml-1">({sortedReports.length} reports)</span>
          </h2>
          {filterCat !== 'all' && (
            <button onClick={() => setFilterCat('all')} className="text-[10px] text-[#D4AF37] font-bold hover:underline">
              Show All
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-zinc-600 text-sm">Loading reports...</div>
        ) : sortedReports.length === 0 ? (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-8 text-center">
            <Users className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-zinc-500 text-sm font-bold">No reports yet</p>
            <p className="text-zinc-600 text-xs mt-1">Be the first to share what you see on the road</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedReports.map(report => {
              const cfg = CATEGORY_CONFIG[report.category];
              const Icon = cfg.icon;
              return (
                <div
                  key={report.id}
                  data-testid={`community-report-${report.id}`}
                  className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${cfg.bg} border shrink-0`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-white">{report.title}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${cfg.bg} border ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      {report.description && (
                        <p className="text-xs text-zinc-400 mb-1">{report.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-zinc-600">
                        <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> {report.locationName}</span>
                        <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {timeAgo(report.createdAt)}</span>
                        <span className="flex items-center gap-1"><Truck className="w-2.5 h-2.5" /> {report.userName}</span>
                      </div>
                    </div>
                    <button
                      data-testid={`upvote-${report.id}`}
                      onClick={() => upvoteReport(report.id)}
                      className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors shrink-0"
                    >
                      <ThumbsUp className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-[10px] font-bold text-zinc-400">{report.upvotes}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Community Tips */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">How Community Reports Work</h3>
        <ul className="space-y-1.5 text-[11px] text-zinc-500">
          <li className="flex items-start gap-2"><ThumbsUp className="w-3 h-3 text-[#D4AF37] mt-0.5 shrink-0" /> Reports are upvoted by fellow truckers — higher votes = more reliable</li>
          <li className="flex items-start gap-2"><Clock className="w-3 h-3 text-[#D4AF37] mt-0.5 shrink-0" /> Hazard and weigh station reports expire after 4 hours to stay fresh</li>
          <li className="flex items-start gap-2"><MapPin className="w-3 h-3 text-[#D4AF37] mt-0.5 shrink-0" /> Reports appear as map markers when navigating near reported locations</li>
          <li className="flex items-start gap-2"><Users className="w-3 h-3 text-[#D4AF37] mt-0.5 shrink-0" /> More drivers = better data. Share what you see to help the community</li>
        </ul>
      </div>
    </div>
  );
}
