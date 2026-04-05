import React, { useState, useEffect, useCallback } from 'react';
import { 
  Truck, LayoutGrid, Navigation, LayoutPanelTop, Fuel,
  ChevronRight, ChevronLeft, X, Sparkles
} from 'lucide-react';
import { getUserStorageKey } from '../utils/userStorage';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.FC<any>;
  accentColor: string;
  tip: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'truck-profile',
    title: 'Truck Profile',
    description: 'Set up your truck dimensions, weight limits, and hazmat classification. This ensures all routes are calculated specifically for your vehicle.',
    icon: Truck,
    accentColor: '#D4AF37',
    tip: 'Go to Settings to configure your truck profile',
  },
  {
    id: 'dashboard',
    title: 'Command Center',
    description: 'Your hub for weekly earnings, miles driven, fuel costs, and ELD status. Track everything at a glance from your dashboard.',
    icon: LayoutGrid,
    accentColor: '#D4AF37',
    tip: 'Tap any metric card to update its value',
  },
  {
    id: 'navigation',
    title: 'Navigation View',
    description: 'Plan routes with truck-specific routing, real-time traffic, MUTCD road signs, bridge/weight restrictions, and turn-by-turn guidance.',
    icon: Navigation,
    accentColor: '#D4AF37',
    tip: 'Enter a destination in the search bar to start routing',
  },
  {
    id: 'display-layout',
    title: 'Display Layout',
    description: 'Customize which HUD elements appear on your navigation map. Toggle speed warnings, lane guidance, weather overlays, POIs, and more.',
    icon: LayoutPanelTop,
    accentColor: '#D4AF37',
    tip: 'Use the eye icons to show/hide elements',
  },
  {
    id: 'fuel-network',
    title: 'Fuel Network',
    description: "Track real-time fuel prices across your favorite truck stop brands. Filter by Love's, Pilot, TA, and other major networks.",
    icon: Fuel,
    accentColor: '#D4AF37',
    tip: 'Select your preferred fuel networks to track',
  },
];

interface TutorialOverlayProps {
  userId: string;
  onComplete: () => void;
  forceShow?: boolean;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ userId, onComplete, forceShow = false }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [visible, setVisible] = useState(false);

  const storageKey = getUserStorageKey(userId, 'tutorial_completed');

  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      setCurrentStep(0);
      return;
    }
    try {
      const completed = localStorage.getItem(storageKey);
      if (!completed) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, [storageKey, forceShow]);

  const handleComplete = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      try {
        localStorage.setItem(storageKey, 'true');
      } catch {}
      setVisible(false);
      onComplete();
    }, 400);
  }, [storageKey, onComplete]);

  const handleNext = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, handleComplete]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  if (!visible) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const StepIcon = step.icon;
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;

  return (
    <div 
      data-testid="tutorial-overlay"
      className={`fixed inset-0 z-[10000] flex items-center justify-center transition-opacity duration-400 ${isExiting ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.95) 100%)' }}
    >
      {/* Decorative background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#D4AF37]/3 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-[#D4AF37]/5 blur-2xl" />
      </div>

      {/* Skip button */}
      <button
        data-testid="tutorial-skip-btn"
        onClick={handleSkip}
        className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all text-xs font-bold uppercase tracking-wider"
      >
        Skip <X className="w-3 h-3" />
      </button>

      {/* Card */}
      <div className="relative w-full max-w-lg mx-4">
        {/* Step counter chips */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {TUTORIAL_STEPS.map((s, i) => (
            <button 
              key={s.id}
              onClick={() => setCurrentStep(i)}
              data-testid={`tutorial-dot-${i}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep ? 'w-8 bg-[#D4AF37]' : i < currentStep ? 'w-3 bg-[#D4AF37]/50' : 'w-3 bg-zinc-700'
              }`}
            />
          ))}
        </div>

        {/* Main card */}
        <div 
          className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl transition-all duration-300"
          style={{ borderColor: `${step.accentColor}15` }}
        >
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D4AF37] via-[#FFD700] to-[#B8860B] flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.3)]"
                style={{ animation: 'pulse 3s ease-in-out infinite' }}>
                <StepIcon className="w-10 h-10 text-black" strokeWidth={2} />
              </div>
              <div className="absolute -top-2 -right-2 bg-zinc-900 border border-[#D4AF37]/30 px-2 py-0.5 rounded-full">
                <span className="text-[10px] font-black text-[#D4AF37]">{currentStep + 1}/{TUTORIAL_STEPS.length}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-4 mb-8">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">{step.title}</h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">{step.description}</p>
            
            {/* Tip badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-xs font-bold text-[#D4AF37]">{step.tip}</span>
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              data-testid="tutorial-prev-btn"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                currentStep === 0 
                  ? 'text-zinc-700 cursor-not-allowed' 
                  : 'text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700'
              }`}
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            {/* Progress bar */}
            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden mx-2">
              <div 
                className="h-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <button
              data-testid="tutorial-next-btn"
              onClick={handleNext}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                isLast
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]'
                  : 'bg-[#D4AF37] text-black hover:bg-[#c9a432]'
              }`}
            >
              {isLast ? "Let's Go" : 'Next'} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
