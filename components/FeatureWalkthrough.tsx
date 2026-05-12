import React, { useEffect, useState, useRef, useCallback } from 'react';
import { WALKTHROUGH_STEPS } from '../utils/walkthroughSteps';
import { ViewType } from '../types';
import { CheckCircle2, X, ChevronRight, Sparkles } from 'lucide-react';

interface FeatureWalkthroughProps {
  open: boolean;
  onClose: () => void;
  setActiveView: (v: ViewType) => void;
}

/**
 * Step-by-step in-app tour of newly-shipped features.
 * Highlights the target element with a glowing outline and a bottom-anchored
 * popover. The dimmed backdrop is non-blocking for the highlighted element
 * (uses `clip-path`-style cutout via box-shadow trick).
 */
export const FeatureWalkthrough: React.FC<FeatureWalkthroughProps> = ({ open, onClose, setActiveView }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const lastViewRef = useRef<ViewType | null>(null);

  const step = WALKTHROUGH_STEPS[stepIdx];

  // Switch view when entering a step that targets a different page
  useEffect(() => {
    if (!open || !step) return;
    if (lastViewRef.current !== step.view) {
      setActiveView(step.view);
      lastViewRef.current = step.view;
    }
  }, [open, step, setActiveView]);

  // Locate the target element after view switches & whenever step changes
  const updateRect = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(`[data-testid="${step.testId}"]`) as HTMLElement | null;
    if (!el) {
      setTargetRect(null);
      return;
    }
    // Scroll into view smoothly
    try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
    // Measure after scroll
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    }, 350);
  }, [step]);

  useEffect(() => {
    if (!open) return;
    // Allow view-switch render to complete
    const t = window.setTimeout(updateRect, 400);
    const onResize = () => updateRect();
    const onScroll = () => {
      if (!step) return;
      const el = document.querySelector(`[data-testid="${step.testId}"]`) as HTMLElement | null;
      if (el) setTargetRect(el.getBoundingClientRect());
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, stepIdx, updateRect, step]);

  // Reset when reopened
  useEffect(() => {
    if (open) {
      setStepIdx(0);
      lastViewRef.current = null;
    }
  }, [open]);

  if (!open || !step) return null;

  const isLastStep = stepIdx === WALKTHROUGH_STEPS.length - 1;
  const next = () => {
    if (isLastStep) onClose();
    else setStepIdx(stepIdx + 1);
  };
  const prev = () => {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  };

  // Padding around the highlighted element
  const PAD = 12;
  const highlightStyle: React.CSSProperties = targetRect
    ? {
        position: 'fixed',
        top: Math.max(0, targetRect.top - PAD),
        left: Math.max(0, targetRect.left - PAD),
        width: targetRect.width + PAD * 2,
        height: targetRect.height + PAD * 2,
        pointerEvents: 'none',
        zIndex: 10001,
        borderRadius: 24,
        border: '2px solid #D4AF37',
        boxShadow:
          '0 0 0 9999px rgba(0,0,0,0.7), ' +
          '0 0 30px rgba(212,175,55,0.6), ' +
          '0 0 60px rgba(212,175,55,0.4)',
        animation: 'walkthroughPulse 2s ease-in-out infinite',
        transition: 'top 0.4s ease, left 0.4s ease, width 0.4s ease, height 0.4s ease',
      }
    : { display: 'none' };

  // Position popover below the highlighted element if there's room, else above
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const popoverWidth = Math.min(360, viewportW - 32);
  let popoverTop = 0;
  let popoverLeft = 0;
  if (targetRect) {
    const spaceBelow = viewportH - (targetRect.bottom + PAD);
    const spaceAbove = targetRect.top - PAD;
    if (spaceBelow > 240 || spaceBelow >= spaceAbove) {
      popoverTop = targetRect.bottom + PAD + 16;
    } else {
      popoverTop = Math.max(16, targetRect.top - PAD - 16 - 280);
    }
    popoverLeft = Math.max(16, Math.min(viewportW - popoverWidth - 16, targetRect.left + targetRect.width / 2 - popoverWidth / 2));
  } else {
    // Element not yet found — center the popover
    popoverTop = viewportH / 2 - 140;
    popoverLeft = viewportW / 2 - popoverWidth / 2;
  }

  return (
    <>
      {/* Full-screen dim backdrop (only shown when no target rect — otherwise box-shadow handles it) */}
      {!targetRect && (
        <div
          data-testid="walkthrough-backdrop"
          className="fixed inset-0 z-[10000] bg-black/70"
        />
      )}

      {/* Glowing highlight on target */}
      <div data-testid="walkthrough-highlight" style={highlightStyle} />

      {/* Popover */}
      <div
        data-testid="walkthrough-popover"
        className="fixed z-[10002] bg-[#0a0a0a] border border-[#D4AF37]/40 rounded-2xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.9)] animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={{ top: popoverTop, left: popoverLeft, width: popoverWidth }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-[#D4AF37]/15 p-1.5 rounded-lg text-[#D4AF37]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">
              Tour · {stepIdx + 1} of {WALKTHROUGH_STEPS.length}
            </span>
            {step.tag && (
              <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                {step.tag}
              </span>
            )}
          </div>
          <button
            data-testid="walkthrough-close-btn"
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1"
            aria-label="Skip tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="text-white font-bold text-base mb-2">{step.title}</h3>
        <p className="text-zinc-400 text-sm leading-relaxed mb-4">{step.body}</p>

        {/* Progress dots */}
        <div className="flex items-center gap-1 mb-4">
          {WALKTHROUGH_STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === stepIdx ? 'w-6 bg-[#D4AF37]' : i < stepIdx ? 'w-1.5 bg-[#D4AF37]/60' : 'w-1.5 bg-zinc-700'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {stepIdx > 0 && (
            <button
              data-testid="walkthrough-prev-btn"
              onClick={prev}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white px-3 py-2 transition-colors"
            >
              Back
            </button>
          )}
          <button
            data-testid="walkthrough-skip-btn"
            onClick={onClose}
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white px-3 py-2 transition-colors ml-auto"
          >
            Skip
          </button>
          <button
            data-testid="walkthrough-next-btn"
            onClick={next}
            className="text-[10px] font-black uppercase tracking-widest bg-[#D4AF37] hover:bg-[#FFD700] text-black px-4 py-2 rounded-lg flex items-center gap-1 transition-colors"
          >
            {isLastStep ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Finish
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default FeatureWalkthrough;
