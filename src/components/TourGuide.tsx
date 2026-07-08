import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ChevronRight, ChevronLeft, X } from 'lucide-react';

export interface TourStep {
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface TourGuideProps {
  steps: TourStep[];
  isActive: boolean;
  onClose: () => void;
}

export const TourGuide: React.FC<TourGuideProps> = ({ steps, isActive, onClose }) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({ display: 'none' });
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({ display: 'none' });
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) {
      setHighlightStyle({ display: 'none' });
      setPopoverStyle({ display: 'none' });
      return;
    }

    const updatePosition = () => {
      const step = steps[currentStepIdx];
      if (!step) return;

      const element = document.querySelector(step.target);
      if (!element) {
        // If target element is not found on current page, skip to next step
        if (currentStepIdx < steps.length - 1) {
          setCurrentStepIdx(currentStepIdx + 1);
        } else {
          handleFinish();
        }
        return;
      }

      // Scroll element into view smoothly if not fully visible
      element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

      const rect = element.getBoundingClientRect();
      const padding = 6;
      
      // Calculate highlight cutout position
      const top = rect.top - padding;
      const left = rect.left - padding;
      const width = rect.width + padding * 2;
      const height = rect.height + padding * 2;

      setHighlightStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        height: `${height}px`,
        boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.65)',
        borderRadius: '12px',
        border: '2px solid #0d9488',
        zIndex: 9998,
        pointerEvents: 'none',
        transition: 'all 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
      });

      // Calculate popover bubble position based on target placement
      let popoverTop = 0;
      let popoverLeft = 0;

      // Estimate popover dimensions
      const popoverWidth = 320;
      const popoverHeight = 180;
      const gap = 16;

      if (step.position === 'bottom') {
        popoverTop = top + height + gap;
        popoverLeft = left + width / 2 - popoverWidth / 2;
      } else if (step.position === 'top') {
        popoverTop = top - popoverHeight - gap;
        popoverLeft = left + width / 2 - popoverWidth / 2;
      } else if (step.position === 'left') {
        popoverTop = top + height / 2 - popoverHeight / 2;
        popoverLeft = left - popoverWidth - gap;
      } else { // right
        popoverTop = top + height / 2 - popoverHeight / 2;
        popoverLeft = left + width + gap;
      }

      // Bound checks inside client viewport boundaries
      popoverTop = Math.max(16, Math.min(window.innerHeight - popoverHeight - 16, popoverTop));
      popoverLeft = Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, popoverLeft));

      setPopoverStyle({
        position: 'fixed',
        top: `${popoverTop}px`,
        left: `${popoverLeft}px`,
        width: `${popoverWidth}px`,
        zIndex: 9999,
        transition: 'all 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
      });
    };

    // Initial position trigger
    updatePosition();

    // Attach resize listeners
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isActive, currentStepIdx, steps]);

  const handleNext = () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('hmis_tour_completed', 'true');
    setCurrentStepIdx(0);
    onClose();
  };

  if (!isActive) return null;

  const currentStep = steps[currentStepIdx];
  if (!currentStep) return null;

  return (
    <>
      {/* Target spotlight mask div */}
      <div style={highlightStyle} />

      {/* Popover Bubble Card */}
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="bg-white border border-slate-200/80 rounded-2xl shadow-2xl p-5 space-y-4 font-sans select-none flex flex-col pointer-events-auto"
      >
        {/* Header toolbar */}
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2 text-teal-600 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="h-4 w-4 text-teal-500 animate-pulse" />
            <span>App Tour: Step {currentStepIdx + 1} / {steps.length}</span>
          </div>
          <button
            onClick={handleFinish}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg hover:bg-slate-100 cursor-pointer"
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Bubble copy */}
        <div className="space-y-1">
          <h4 className="text-sm font-extrabold text-slate-800 leading-snug">{currentStep.title}</h4>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">{currentStep.content}</p>
        </div>

        {/* Action button row */}
        <div className="flex justify-between items-center pt-2">
          <button
            onClick={handleFinish}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:underline cursor-pointer"
          >
            Skip Tour
          </button>
          
          <div className="flex space-x-2">
            {currentStepIdx > 0 && (
              <button
                onClick={handleBack}
                className="inline-flex items-center px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-[10px] font-bold text-slate-700 cursor-pointer transition-all"
              >
                <ChevronLeft className="h-3 w-3 mr-0.5" /> Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="inline-flex items-center px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-bold shadow-md cursor-pointer transition-all"
            >
              {currentStepIdx === steps.length - 1 ? 'Finish' : 'Next'}
              {currentStepIdx < steps.length - 1 && <ChevronRight className="h-3 w-3 ml-0.5" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
