import React from 'react';
import { Megaphone, TabletSmartphone, Apple, ArrowUpCircle, Sparkles } from 'lucide-react';

const AnnouncementsView: React.FC = () => {
  return (
    <div data-testid="announcements-view" className="p-6 md:p-10 max-w-4xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-2 flex items-center gap-3">
        <Megaphone className="w-7 h-7 text-[#D4AF37]" />
        Announcements
      </h1>
      <p className="text-zinc-500 text-sm mb-8">Latest updates and upcoming features for TRUCKERS NAV</p>

      <div className="space-y-5">
        {/* iOS & Android */}
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
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />Speed limit warning system with audio alerts</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />Route safety score badges</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />Enhanced offline map support</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />PC*MILER data integration</li>
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
