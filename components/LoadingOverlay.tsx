
import React from 'react';

interface LoadingOverlayProps {
  progress: number;
  currentTask: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ progress, currentTask }) => {
  const steps = [
    { label: 'Analysis', min: 0 },
    { label: 'Lighting', min: 30 },
    { label: 'Rendering', min: 60 },
    { label: 'Polishing', min: 90 }
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="max-w-md w-full">
        {/* Animated Icon */}
        <div className="relative w-32 h-32 mx-auto mb-10">
          <div className="absolute inset-0 border-[3px] border-slate-800 rounded-full"></div>
          <div 
            className="absolute inset-0 border-[3px] border-indigo-500 rounded-full border-t-transparent animate-spin"
            style={{ animationDuration: '0.8s' }}
          ></div>
          <div className="absolute inset-4 bg-indigo-500/10 blur-xl rounded-full animate-pulse"></div>
          <div className="absolute inset-0 flex items-center justify-center font-black text-white text-3xl italic tracking-tighter">
            {progress}%
          </div>
        </div>
        
        {/* Textual Feedback */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight italic">Studio Engine Active</h2>
          <p className="text-slate-400 text-sm font-medium opacity-80">{currentTask}</p>
        </div>

        {/* Stepper Logic */}
        <div className="grid grid-cols-4 gap-2 mb-8">
          {steps.map((step, idx) => {
            const isActive = progress >= step.min;
            return (
              <div key={idx} className="space-y-3">
                <div className={`h-1 rounded-full transition-all duration-700 ${isActive ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-slate-800'}`}></div>
                <p className={`text-[9px] text-center font-black uppercase tracking-widest ${isActive ? 'text-indigo-400' : 'text-slate-600'}`}>
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Dynamic Tip */}
        <div className="glass p-4 rounded-2xl border border-white/5 text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-loose">
            <i className="fa-solid fa-lightbulb text-indigo-400 mr-2"></i>
            Tip: Use high-contrast backgrounds for better edge detection.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
