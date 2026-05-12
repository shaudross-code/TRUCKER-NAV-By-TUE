import React from 'react';
import { Megaphone, TabletSmartphone, Apple, ArrowUpCircle, Sparkles, CheckCircle2, DollarSign, Route, MapPin, Construction, Smartphone, Moon, Bell } from 'lucide-react';
import { markAnnouncementsSeen } from '../utils/announcements';

interface ShippedFeature {
  icon: React.ComponentType<any>;
  title: string;
  blurb: string;
  tag?: string;
}

const RECENTLY_SHIPPED: ShippedFeature[] = [
  {
    icon: DollarSign,
    title: 'Pay Summary Overhaul',
    blurb:
      'Six new fee cards on Pay Summary — Cash Advance, Insurance/Cargo & Liability ($350), IFTA Fee ($35), Physical Damage ($150), Trailer Charge ($200), Admin Fee ($135). Each is editable, persisted, and deducted from Net Pay. New Net-Pay breakdown popover shows line-by-line math.',
    tag: 'Money',
  },
  {
    icon: DollarSign,
    title: 'Maintenance Fee + Account + Ledger',
    blurb:
      'Set your own ¢/mile rate (default 5¢) — every mile you drive auto-deposits into your Maintenance Account. Manual deposit / withdraw / reset, plus a chronological Maintenance Ledger logging every transaction with date, miles, ¢/mi snapshot, and running balance.',
    tag: 'Money',
  },
  {
    icon: DollarSign,
    title: 'Smart Escrow (3% Auto-Track)',
    blurb:
      'Escrow now defaults to 3% of weekly gross and follows your gross both up AND down in real time (capped at $2,500). Featured "This Week" panel, progress-to-cap bar, and a cap-hit toast that fires the moment your contribution gets reduced — so you know exactly why your net pay just jumped.',
    tag: 'Money',
  },
  {
    icon: Route,
    title: 'Route Corridor View',
    blurb:
      'When a route starts, the map automatically fits the entire route polyline with a 5-mile buffer so every Pilot/Loves/TA/rest stop along the corridor is visible at once. Toggle on/off via the green Route button.',
    tag: 'Navigation',
  },
  {
    icon: MapPin,
    title: 'Cinematic Auto-Tilt @ Zoom 13+',
    blurb:
      'On route start, the map auto-tilts to a 55° cinematic pitch when zoomed in to street level — professional-grade trucker GPS perspective, no manual setup required.',
    tag: 'Navigation',
  },
  {
    icon: Construction,
    title: 'Glowing Roads & Highways Layer',
    blurb:
      'A vivid neon-green tile layer highlights motorway/trunk/primary roads beneath the route polyline so the corridor visually pops on satellite imagery. Auto-syncs with your active route.',
    tag: 'Navigation',
  },
  {
    icon: MapPin,
    title: 'Larger, More Visible POI Markers',
    blurb:
      'Pilot, Loves, TA, and other truck-POI icons enlarged to 40 px with a drop-shadow glow halo so they stand out against satellite imagery — and you actually see them when scanning the map.',
    tag: 'Navigation',
  },
  {
    icon: Smartphone,
    title: 'Always-On Screen (Wake Lock)',
    blurb:
      'The device screen stays awake automatically while the app or site is open and visible — sleeps when you close the tab/app, swipe it away, or press the power button. No more tapping the screen mid-route.',
    tag: 'Driver UX',
  },
  {
    icon: Moon,
    title: 'Night Mode Auto-Dimming',
    blurb:
      'Map and HUD dim automatically based on local sunset so you’re never blinded at night and never squinting in daylight. Toggle override in MapControls.',
    tag: 'Driver UX',
  },
];

const tagPalette: Record<string, { bg: string; text: string }> = {
  Money:      { bg: 'bg-emerald-400/10', text: 'text-emerald-300' },
  Navigation: { bg: 'bg-sky-400/10',      text: 'text-sky-300'     },
  'Driver UX':{ bg: 'bg-violet-400/10',  text: 'text-violet-300'  },
};

interface AnnouncementsViewProps {
  onStartTour?: () => void;
}

const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({ onStartTour }) => {
  // Mark announcements as seen when this view is opened so the sidebar dot disappears.
  React.useEffect(() => {
    markAnnouncementsSeen();
    // Notify other tabs / sidebar instances so the dot updates immediately
    try { window.dispatchEvent(new StorageEvent('storage', { key: 'tue_announcements_seen_version' })); } catch {}
  }, []);
  return (
    <div data-testid="announcements-view" className="p-6 md:p-10 max-w-4xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-2 flex items-center gap-3">
        <Megaphone className="w-7 h-7 text-[#D4AF37]" />
        Announcements
      </h1>
      <p className="text-zinc-500 text-sm mb-6">Latest updates and upcoming features for TRUCKERS NAV</p>

      {onStartTour && (
        <button
          data-testid="announcements-start-tour-btn"
          onClick={onStartTour}
          className="mb-8 inline-flex items-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] hover:from-[#FFD700] hover:to-[#FFE57F] text-black font-black uppercase tracking-widest text-xs px-5 py-2.5 rounded-xl shadow-[0_4px_20px_rgba(212,175,55,0.4)] transition-all hover:scale-[1.02]"
        >
          <Sparkles className="w-4 h-4" />
          Take the 9-Step Tour
        </button>
      )}

      {/* Recently Shipped */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300 bg-emerald-400/10 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
            <Bell className="w-3 h-3" />
            Just Shipped — May 2026
          </span>
        </div>
        <div className="space-y-3">
          {RECENTLY_SHIPPED.map((f) => {
            const Icon = f.icon;
            const palette = tagPalette[f.tag || ''] || { bg: 'bg-zinc-800', text: 'text-zinc-300' };
            return (
              <div
                key={f.title}
                data-testid={`shipped-${f.title.replace(/\s+/g, '-').toLowerCase()}`}
                className="bg-gradient-to-br from-emerald-400/[0.04] to-transparent border border-emerald-400/10 hover:border-emerald-400/25 transition-colors rounded-2xl p-5 group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center group-hover:bg-emerald-400/15 transition-colors">
                    <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <h3 className="text-white font-bold text-base">{f.title}</h3>
                      {f.tag && (
                        <span className={`text-[9px] font-black uppercase tracking-widest ${palette.bg} ${palette.text} px-2 py-0.5 rounded-full`}>
                          {f.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed flex items-start gap-2">
                      <Icon className="w-4 h-4 mt-0.5 text-zinc-600 flex-shrink-0" />
                      <span>{f.blurb}</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* iOS & Android */}
      <div className="space-y-5">
        <div className="bg-gradient-to-br from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/20 rounded-2xl p-6">
          <div className="flex items-start gap-5">
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.3)]">
              <TabletSmartphone className="w-7 h-7 text-black" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 px-3 py-1 rounded-full">In Development</span>
              </div>
              <h2 className="text-white font-bold text-lg mb-3">iOS & Android App Coming Soon</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-5">
                We're actively developing native apps for both the Apple App Store and Google Play Store.
                Get the full TRUCKERS NAV experience with offline support, push notifications for traffic alerts,
                and optimized performance built specifically for your device.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-3 bg-black/40 rounded-xl px-4 py-3 border border-white/5">
                  <Apple className="w-5 h-5 text-zinc-400" />
                  <div>
                    <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">iOS</span>
                    <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700] rounded-full" style={{ width: '20%' }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-black/40 rounded-xl px-4 py-3 border border-white/5">
                  <TabletSmartphone className="w-5 h-5 text-zinc-400" />
                  <div>
                    <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">Android</span>
                    <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700] rounded-full" style={{ width: '15%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Features */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base mb-2">Upcoming Features</h3>
              <ul className="text-zinc-400 text-sm space-y-2">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />Snap-to-Next-Fuel-Stop (cheapest fuel along your corridor, with net dollar-impact)</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />Apple Sign-In</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />PC*MILER data integration (mileage + routing)</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />Route Safety Score badge on the map</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />Driver reputation/review system</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />Enhanced offline map support</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />Speed-limit warning with audio alerts</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Continuous Improvements */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
              <ArrowUpCircle className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base mb-2">Continuous Improvements</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                We're constantly improving route accuracy, adding new truck-specific POIs,
                and enhancing the navigation experience. Stay tuned for regular updates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementsView;
