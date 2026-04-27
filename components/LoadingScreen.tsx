import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  isExiting: boolean;
}

const STATUS_STEPS = [
  'Initializing session...',
  'Loading truck profile...',
  'Connecting to navigation...',
  'Syncing route history...',
  'Ready.',
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isExiting }) => {
  const [statusIndex, setStatusIndex] = useState(0);
  const [dotsCount, setDotsCount] = useState(0);
  const [iconLoaded, setIconLoaded] = useState(false);

  // Cycle through status messages
  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex(prev => Math.min(prev + 1, STATUS_STEPS.length - 1));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDotsCount(prev => (prev + 1) % 4);
    }, 380);
    return () => clearInterval(interval);
  }, []);

  const currentStatus = STATUS_STEPS[statusIndex];
  const isReady = statusIndex === STATUS_STEPS.length - 1;
  const dots = isReady ? '' : '.'.repeat(dotsCount);

  return (
    <div
      data-testid="loading-screen"
      style={{ transition: 'opacity 0.7s ease, transform 0.7s ease' }}
      className={`fixed inset-0 z-[99999] bg-[#050505] flex flex-col items-center justify-center select-none ${
        isExiting ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
    >
      {/* Subtle radial glow background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Main content stack */}
      <div className="relative flex flex-col items-center gap-10">

        {/* ── App Icon ── */}
        <div
          className="relative"
          style={{
            animation: isExiting ? 'none' : 'splashIconIn 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}
        >
          {/* Glow halo behind icon */}
          <div
            className="absolute inset-0 rounded-[2.5rem] blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(212,175,55,0.35) 0%, transparent 70%)',
              transform: 'scale(1.5)',
              animation: 'iconGlow 2.5s ease-in-out infinite alternate',
            }}
          />
          <img
            src="/app-icon.png"
            alt="Truckers Nav"
            onLoad={() => setIconLoaded(true)}
            className="relative w-36 h-36 md:w-44 md:h-44 rounded-[2.2rem] shadow-[0_20px_80px_rgba(212,175,55,0.3)]"
            style={{
              opacity: iconLoaded ? 1 : 0,
              transition: 'opacity 0.4s ease',
            }}
          />
          {/* Shimmer overlay */}
          <div
            className="absolute inset-0 rounded-[2.2rem] pointer-events-none"
            style={{ animation: 'shimmer 3s ease-in-out infinite', background: 'linear-gradient(135deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0) 60%)' }}
          />
        </div>

        {/* ── App title ── */}
        <div
          className="text-center"
          style={{ animation: 'splashTitleIn 0.8s ease 0.3s both' }}
        >
          <h1 className="text-3xl md:text-4xl font-[900] uppercase tracking-[-0.02em] text-white leading-none">
            TRUCKERS NAV
          </h1>
          <p className="text-[#D4AF37] font-black tracking-[0.35em] uppercase text-xs mt-2 opacity-90">
            BY TUE
          </p>
        </div>

        {/* ── TUE Circle Spinner ── */}
        <div
          className="relative flex items-center justify-center"
          style={{ animation: 'splashSpinnerIn 0.8s ease 0.6s both' }}
        >
          {/* Outer glow ring */}
          <div
            className="absolute w-24 h-24 rounded-full"
            style={{
              background: 'transparent',
              boxShadow: '0 0 24px 4px rgba(212,175,55,0.25)',
              animation: 'pulseRing 2s ease-in-out infinite',
            }}
          />

          {/* Outer spinning ring */}
          <div
            className="absolute w-24 h-24 rounded-full"
            style={{
              border: '3px solid transparent',
              borderTopColor: '#D4AF37',
              borderRightColor: 'rgba(212,175,55,0.4)',
              animation: 'spin 1s linear infinite',
            }}
          />

          {/* Inner counter-spinning ring */}
          <div
            className="absolute w-16 h-16 rounded-full"
            style={{
              border: '2px solid transparent',
              borderBottomColor: 'rgba(212,175,55,0.6)',
              borderLeftColor: 'rgba(212,175,55,0.2)',
              animation: 'spinReverse 1.5s linear infinite',
            }}
          />

          {/* Center TUE label */}
          <div className="relative z-10 flex flex-col items-center justify-center w-24 h-24">
            <span
              className="font-[900] text-xl tracking-widest"
              style={{
                color: '#D4AF37',
                textShadow: '0 0 12px rgba(212,175,55,0.8), 0 0 30px rgba(212,175,55,0.3)',
              }}
            >
              TUE
            </span>
          </div>
        </div>

        {/* ── Status text ── */}
        <div
          className="flex flex-col items-center gap-2"
          style={{ animation: 'splashStatusIn 0.8s ease 0.9s both' }}
        >
          <p
            className="text-[11px] uppercase tracking-[0.25em] font-bold"
            style={{
              color: isReady ? '#D4AF37' : 'rgba(212,175,55,0.6)',
              minWidth: '220px',
              textAlign: 'center',
              transition: 'color 0.3s ease',
            }}
          >
            {currentStatus}{dots}
          </p>

          {/* Progress bar */}
          <div className="w-48 h-[2px] rounded-full overflow-hidden bg-white/5">
            <div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, rgba(212,175,55,0.4), #D4AF37)',
                width: `${((statusIndex + 1) / STATUS_STEPS.length) * 100}%`,
                transition: 'width 0.5s ease',
                boxShadow: '0 0 8px rgba(212,175,55,0.6)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer branding */}
      <div
        className="absolute bottom-8 text-center"
        style={{ animation: 'splashStatusIn 1s ease 1s both' }}
      >
        <p className="text-zinc-700 text-[10px] uppercase tracking-[0.3em] font-medium">
          THE HOME OF THE TRUCKERS
        </p>
      </div>

      {/* Keyframe definitions */}
      <style>{`
        @keyframes splashIconIn {
          from { opacity: 0; transform: scale(0.7) translateY(20px); }
          to   { opacity: 1; transform: scale(1)   translateY(0px);  }
        }
        @keyframes splashTitleIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0px);  }
        }
        @keyframes splashSpinnerIn {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1);   }
        }
        @keyframes splashStatusIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0px);  }
        }
        @keyframes spin {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
        @keyframes spinReverse {
          from { transform: rotate(0deg);    }
          to   { transform: rotate(-360deg); }
        }
        @keyframes iconGlow {
          from { opacity: 0.6; transform: scale(1.4); }
          to   { opacity: 1;   transform: scale(1.6); }
        }
        @keyframes pulseRing {
          0%, 100% { transform: scale(1);    opacity: 0.6; }
          50%       { transform: scale(1.08); opacity: 1;   }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
      `}</style>
    </div>
  );
};
