
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-500 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
            <i className="fa-solid fa-camera-retro text-white text-xl"></i>
          </div>
          <div>
            <h1 className="font-bold text-white text-lg leading-tight tracking-tight">Marketplace Pro</h1>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">AI Photo Lab</p>
          </div>
        </div>
        <div className="hidden sm:block">
          <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full border border-slate-700 uppercase tracking-wider">
            Gemini 2.5 Flash
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
