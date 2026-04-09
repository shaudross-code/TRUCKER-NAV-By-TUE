import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Building2, Truck, Check, Clock, Phone, MapPin, ChevronRight, Plus } from 'lucide-react';
import {
  Facility, FacilityReport, FacilityType, SpeedRating,
  submitFacilityReport, fetchFacilityHours, addFacility,
  getSpeedScore, getTotalVotes, facilityIconSVG,
} from '../services/facilityService';
import { FacilityReputation } from './ReputationScore';

// ─── Sub-components ───────────────────────────────────────────────────────────

const TypeBadge: React.FC<{ type: FacilityType }> = ({ type }) => {
  const cfg = {
    shipper:  { label: 'SHIPPER',  bg: 'bg-blue-500/20',   text: 'text-blue-300',   border: 'border-blue-500/40' },
    receiver: { label: 'RECEIVER', bg: 'bg-green-500/20',  text: 'text-green-300',  border: 'border-green-500/40' },
    both:     { label: 'SHIPPER / RECEIVER', bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40' },
  };
  const c = cfg[type] || cfg.both;
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
      {c.label}
    </span>
  );
};

const SpeedBar: React.FC<{ votes: { fast: number; average: number; slow: number }; label: string }> = ({ votes, label }) => {
  const { label: winner, pct } = getSpeedScore(votes);
  const total = votes.fast + votes.average + votes.slow;
  const color = winner === 'fast' ? 'bg-emerald-400' : winner === 'average' ? 'bg-yellow-400' : winner === 'slow' ? 'bg-red-400' : 'bg-zinc-700';
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-zinc-400 w-24 shrink-0">{label}</span>
      <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[9px] font-bold w-14 text-right capitalize ${winner === 'fast' ? 'text-emerald-400' : winner === 'average' ? 'text-yellow-400' : winner === 'slow' ? 'text-red-400' : 'text-zinc-600'}`}>
        {winner || '—'} {total > 0 ? `(${total})` : ''}
      </span>
    </div>
  );
};

const BoolRow: React.FC<{ label: string; votes: { yes: number; no: number } }> = ({ label, votes }) => {
  const total = votes.yes + votes.no;
  const val = votes.yes >= votes.no ? 'yes' : 'no';
  if (total === 0) return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-zinc-400 w-24 shrink-0">{label}</span>
      <span className="text-[9px] text-zinc-600">No reports yet</span>
    </div>
  );
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-zinc-400 w-24 shrink-0">{label}</span>
      {val === 'yes'
        ? <Check className="w-3.5 h-3.5 text-emerald-400" />
        : <X className="w-3.5 h-3.5 text-red-400" />}
      <span className={`text-[9px] font-bold ${val === 'yes' ? 'text-emerald-400' : 'text-red-400'}`}>
        {val === 'yes' ? 'Allowed' : 'Not Allowed'}
        <span className="text-zinc-600 font-normal ml-1">({Math.max(votes.yes, votes.no)}/{total})</span>
      </span>
    </div>
  );
};

const ToggleGroup: React.FC<{
  label: string;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (v: string) => void;
  color?: string;
}> = ({ label, options, value, onChange, color = '#D4AF37' }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] text-zinc-400 w-24 shrink-0">{label}</span>
    <div className="flex gap-1 flex-wrap">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`text-[9px] font-bold px-2.5 py-1 rounded-full border transition-all ${
            value === o.value
              ? 'text-black border-transparent'
              : 'text-zinc-400 border-zinc-700 hover:border-zinc-500'
          }`}
          style={value === o.value ? { backgroundColor: color, borderColor: color } : {}}
        >
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

// ─── Add Facility Form ────────────────────────────────────────────────────────

interface AddFormProps {
  userLocation: [number, number] | null;
  onAdd: (f: Facility) => void;
  onClose: () => void;
}

const AddFacilityForm: React.FC<AddFormProps> = ({ userLocation, onAdd, onClose }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<FacilityType>('both');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !userLocation) return;
    setSubmitting(true);
    const result = await addFacility({ name: name.trim(), lat: userLocation[0], lon: userLocation[1], address, type });
    setSubmitting(false);
    if (result) { onAdd(result); onClose(); }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-white uppercase tracking-widest">Add New Facility</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
      </div>
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Facility name (e.g. XYZ Distribution Center)"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37]"
        />
        <input
          type="text"
          placeholder="Address (optional)"
          value={address}
          onChange={e => setAddress(e.target.value)}
          className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37]"
        />
        <div className="space-y-1.5">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Facility Type</span>
          <div className="flex gap-2">
            {(['shipper','receiver','both'] as FacilityType[]).map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${type === t ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[8px] text-zinc-600">
          Location: {userLocation ? `${userLocation[0].toFixed(4)}, ${userLocation[1].toFixed(4)}` : 'GPS not available'}
        </p>
      </div>
      <button
        onClick={handleSubmit}
        disabled={!name.trim() || !userLocation || submitting}
        className="w-full py-3 rounded-xl bg-[#D4AF37] text-black text-xs font-black uppercase tracking-widest disabled:opacity-40 transition-all active:scale-95"
      >
        {submitting ? 'Adding...' : 'Add Facility to Map'}
      </button>
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface FacilityPanelProps {
  facility: Facility;
  userLocation: [number, number] | null;
  onClose: () => void;
  onReportSubmitted: (facilityId: string, majority: any, totalReports: number) => void;
}

export const FacilityPanel: React.FC<FacilityPanelProps> = ({ facility, userLocation, onClose, onReportSubmitted }) => {
  const [hours, setHours] = useState<string[]>(facility.google_hours || []);
  const [phone, setPhone] = useState(facility.phone || '');
  const [loadingHours, setLoadingHours] = useState(false);
  const [reportType,       setReportType]       = useState<FacilityType | null>(null);
  const [reportLoading,    setReportLoading]     = useState<SpeedRating | null>(null);
  const [reportUnloading,  setReportUnloading]   = useState<SpeedRating | null>(null);
  const [reportParking,    setReportParking]     = useState<boolean | null>(null);
  const [reportOvernight,  setReportOvernight]   = useState<boolean | null>(null);
  const [reportOpenDays,   setReportOpenDays]    = useState<string[]>([]);
  const [reportOpenTime,   setReportOpenTime]    = useState('');
  const [reportCloseTime,  setReportCloseTime]   = useState('');
  const [submitting,       setSubmitting]        = useState(false);
  const [submitted,        setSubmitted]         = useState(false);
  const [crowd, setCrowd] = useState(facility.crowd_data);
  const [majority, setMajority] = useState(facility.majority);

  // Lazy-load Google hours on open if not yet fetched
  useEffect(() => {
    if (facility.source === 'google' && !facility.hours_fetched && hours.length === 0) {
      setLoadingHours(true);
      fetchFacilityHours(facility.id).then(d => {
        if (d.google_hours?.length) setHours(d.google_hours);
        if (d.phone) setPhone(d.phone);
        setLoadingHours(false);
      });
    }
  }, [facility.id]);

  const dist = userLocation
    ? (() => {
        const R = 3959;
        const dlat = (facility.lat - userLocation[0]) * Math.PI / 180;
        const dlon = (facility.lon - userLocation[1]) * Math.PI / 180;
        const a = Math.sin(dlat/2)**2 + Math.cos(userLocation[0]*Math.PI/180) * Math.cos(facility.lat*Math.PI/180) * Math.sin(dlon/2)**2;
        return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
      })()
    : null;

  const toggleDay = (d: string) => setReportOpenDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const handleSubmit = async () => {
    if (!reportType && reportLoading === null && reportUnloading === null && reportParking === null && reportOvernight === null) return;
    setSubmitting(true);
    const report: FacilityReport = {
      facility_id: facility.id,
      ...(reportType        && { type: reportType }),
      ...(reportLoading     && { loading_speed: reportLoading }),
      ...(reportUnloading   && { unloading_speed: reportUnloading }),
      ...(reportParking     !== null && { parking_allowed: reportParking }),
      ...(reportOvernight   !== null && { overnight_parking: reportOvernight }),
      ...(reportOpenDays.length && { open_days: reportOpenDays }),
      ...(reportOpenTime    && { open_time: reportOpenTime }),
      ...(reportCloseTime   && { close_time: reportCloseTime }),
    };
    const result = await submitFacilityReport(report);
    setSubmitting(false);
    if (result) {
      setMajority(result.majority);
      setCrowd(prev => ({ ...prev, total_reports: result.total_reports }));
      onReportSubmitted(facility.id, result.majority, result.total_reports);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }
  };

  const typeColor = majority.type === 'shipper' ? '#3b82f6' : majority.type === 'receiver' ? '#22c55e' : '#a855f7';

  return (
    <div className="flex flex-col h-full overflow-hidden bg-black">
      {/* ── Header ── */}
      <div className="flex items-start justify-between p-4 pb-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center mt-0.5"
            style={{ backgroundColor: `${typeColor}22`, border: `1px solid ${typeColor}44` }}
            dangerouslySetInnerHTML={{ __html: facilityIconSVG(majority.type, 28) }}
          />
          <div className="min-w-0">
            <h2 className="text-sm font-black text-white leading-tight truncate">{facility.name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <TypeBadge type={majority.type} />
              {dist && <span className="text-[9px] text-zinc-500">{dist} mi</span>}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-zinc-600 hover:text-white ml-2 shrink-0 p-1 rounded-lg hover:bg-zinc-800 transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 p-4">

        {/* Address / Phone */}
        <div className="space-y-1.5">
          {facility.address && (
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <MapPin className="w-3 h-3 shrink-0" />
              <span>{facility.address}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <Phone className="w-3 h-3 shrink-0" />
              <a href={`tel:${phone}`} className="hover:text-[#D4AF37] transition-colors">{phone}</a>
            </div>
          )}
        </div>

        {/* ── Facility Reputation Score ── */}
        <div data-testid="facility-reputation-section" className="bg-black/60 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800">
            <svg className="w-3.5 h-3.5 text-[#D4AF37]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Reputation Score</span>
          </div>
          <div className="px-4 py-3">
            <FacilityReputation crowdData={crowd} />
          </div>
        </div>

        {/* ── Google Hours ── */}
        <div className="bg-black/60 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Operating Hours</span>
              {facility.source === 'google' && <span className="text-[8px] text-zinc-600 font-medium">via Google</span>}
            </div>
            {loadingHours && <RefreshCw className="w-3 h-3 text-zinc-500 animate-spin" />}
          </div>
          <div className="px-4 py-3 space-y-1">
            {hours.length > 0
              ? hours.map((h, i) => (
                  <p key={i} className="text-[9px] text-zinc-400 leading-relaxed">{h}</p>
                ))
              : <p className="text-[9px] text-zinc-600 italic">{loadingHours ? 'Fetching hours...' : 'Hours not available — be the first to report below'}</p>
            }
          </div>
        </div>

        {/* ── Driver Consensus ── */}
        {crowd.total_reports > 0 && (
          <div className="bg-black/60 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Driver Reports</span>
              </div>
              <span className="text-[9px] text-zinc-500">{crowd.total_reports} report{crowd.total_reports !== 1 ? 's' : ''}</span>
            </div>
            <div className="px-4 py-3 space-y-3">
              <SpeedBar votes={crowd.loading_speed}   label="Loading Speed" />
              <SpeedBar votes={crowd.unloading_speed} label="Unloading Speed" />
              <div className="border-t border-zinc-800/60 my-1" />
              <BoolRow label="Parking" votes={crowd.parking_allowed} />
              <BoolRow label="Overnight Park" votes={crowd.overnight_parking} />
              {majority.open_days?.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-zinc-400 w-24 shrink-0">Open Days</span>
                  <div className="flex gap-1 flex-wrap">
                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                      <span key={d} className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${majority.open_days?.includes(d) ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'text-zinc-700'}`}>{d}</span>
                    ))}
                  </div>
                </div>
              )}
              {(majority.open_time || majority.close_time) && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-zinc-400 w-24 shrink-0">Hours Reported</span>
                  <span className="text-[9px] text-[#D4AF37] font-bold">
                    {majority.open_time || '?'} – {majority.close_time || '?'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Report Form ── */}
        <div className="bg-black/60 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800">
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Submit Your Report</span>
          </div>
          <div className="px-4 py-3 space-y-3">
            <ToggleGroup label="Facility Type" value={reportType} onChange={v => setReportType(v as FacilityType)}
              options={[{ value: 'shipper', label: 'Shipper' }, { value: 'receiver', label: 'Receiver' }, { value: 'both', label: 'Both' }]} />
            <ToggleGroup label="Loading Speed" value={reportLoading} onChange={v => setReportLoading(v as SpeedRating)}
              options={[{ value: 'fast', label: 'Fast' }, { value: 'average', label: 'Average' }, { value: 'slow', label: 'Slow' }]} />
            <ToggleGroup label="Unloading Speed" value={reportUnloading} onChange={v => setReportUnloading(v as SpeedRating)}
              options={[{ value: 'fast', label: 'Fast' }, { value: 'average', label: 'Average' }, { value: 'slow', label: 'Slow' }]} />
            <ToggleGroup label="Parking" value={reportParking === null ? null : reportParking ? 'yes' : 'no'}
              onChange={v => setReportParking(v === 'yes')}
              options={[{ value: 'yes', label: 'Allowed' }, { value: 'no', label: 'Not Allowed' }]} />
            <ToggleGroup label="Overnight" value={reportOvernight === null ? null : reportOvernight ? 'yes' : 'no'}
              onChange={v => setReportOvernight(v === 'yes')}
              options={[{ value: 'yes', label: 'Allowed' }, { value: 'no', label: 'Not Allowed' }]} />

            {/* Days */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-zinc-400">Open Days (optional)</span>
              <div className="flex gap-1 flex-wrap">
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                  <button key={d} onClick={() => toggleDay(d)}
                    className={`text-[8px] font-bold px-2 py-1 rounded border transition-all ${reportOpenDays.includes(d) ? 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/40' : 'text-zinc-500 border-zinc-700 hover:border-zinc-500'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Hours */}
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <span className="text-[9px] text-zinc-500">Open Time</span>
                <input type="time" value={reportOpenTime} onChange={e => setReportOpenTime(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-[#D4AF37]" />
              </div>
              <div className="flex-1 space-y-1">
                <span className="text-[9px] text-zinc-500">Close Time</span>
                <input type="time" value={reportCloseTime} onChange={e => setReportCloseTime(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-[#D4AF37]" />
              </div>
            </div>

            <button
              data-testid="facility-submit-report"
              onClick={handleSubmit}
              disabled={submitting || submitted}
              className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
                submitted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                'bg-[#D4AF37] text-black hover:bg-[#c9a430] disabled:opacity-40'
              }`}
            >
              {submitted ? '✓ Report Submitted!' : submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Add Facility Panel (exported for use in NavigationView) ──────────────────
export { AddFacilityForm };
