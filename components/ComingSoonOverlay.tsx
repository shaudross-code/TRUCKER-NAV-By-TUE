import React from 'react';
import { Construction, Wrench, Clock } from 'lucide-react';

interface ComingSoonOverlayProps {
  title: string;
  children: React.ReactNode;
}

const ComingSoonOverlay: React.FC<ComingSoonOverlayProps> = ({ title, children }) => {
  return (
    <div className="relative w-full h-full min-h-[60vh]">
      {/* Underlying view - blurred */}
      <div className="w-full h-full pointer-events-none select-none filter blur-[3px] opacity-30">
        {children}
      </div>

      {/* Overlay */}
      <div data-testid="coming-soon-overlay" className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-6 max-w-md px-8">
          {/* Animated icon ring */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-2 border-[#D4AF37]/30 flex items-center justify-center"
              style={{ animation: 'pulse 2.5s ease-in-out infinite' }}>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D4AF37] via-[#FFD700] to-[#B8860B] flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.4)]">
                <Construction className="w-8 h-8 text-black" strokeWidth={2.5} />
              </div>
            </div>
            {/* Orbiting icons */}
            <div className="absolute -top-1 -right-1 bg-zinc-900 border border-[#D4AF37]/30 p-1.5 rounded-full" style={{ animation: 'bounce 3s ease-in-out infinite' }}>
              <Wrench className="w-3.5 h-3.5 text-[#D4AF37]" />
            </div>
            <div className="absolute -bottom-1 -left-1 bg-zinc-900 border border-[#D4AF37]/30 p-1.5 rounded-full" style={{ animation: 'bounce 3s ease-in-out infinite 0.5s' }}>
              <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
            </div>
          </div>

          {/* Text */}
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">{title}</h2>
            <div className="flex items-center justify-center gap-2">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#D4AF37]/60" />
              <span className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.3em]">Coming Soon</span>
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#D4AF37]/60" />
            </div>
            <p className="text-sm text-zinc-500 font-medium leading-relaxed max-w-xs mx-auto">
              This feature is currently in development. We're working hard to bring you the best experience.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="w-48 space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
              <span className="text-zinc-600">Progress</span>
              <span className="text-[#D4AF37]">In Development</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700] rounded-full" 
                style={{ width: '35%', animation: 'pulse 2s ease-in-out infinite' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonOverlay;
