import React, { useState, useRef, useEffect, useCallback } from 'react';
import Header from './components/Header';
import LoadingOverlay from './components/LoadingOverlay';
import ErrorBoundary from './components/ErrorBoundary';
import { generateProductAngle } from './services/geminiService';
import { ProductImage, GenerationState } from './types';

const App: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [results, setResults] = useState<ProductImage[]>([]);
  const [status, setStatus] = useState<GenerationState>(GenerationState.IDLE);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingTask, setLoadingTask] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourceImage(reader.result as string);
        setResults([]);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleGenerate = async () => {
    if (!sourceImage) return;

    setStatus(GenerationState.LOADING);
    setResults([]);
    setError(null);
    setLoadingProgress(5);

    try {
      const angles = [
        { id: '1', label: 'Frontal Master', prompt: 'Centered frontal view, eye level.' },
        { id: '2', label: 'Hero Perspective', prompt: 'Three-quarter view from a slightly high angle.' },
        { id: '3', label: 'Side/Detail View', prompt: 'Profile side view showing depth and texture.' }
      ];

      const generatedImages: ProductImage[] = [];

      for (let i = 0; i < angles.length; i++) {
        const angle = angles[i];
        setLoadingTask(`Capturing ${angle.label}...`);
        
        // Throttling to avoid 429 errors from Google
        if (i > 0) await new Promise(res => setTimeout(res, 3000));

        const resultUrl = await generateProductAngle(sourceImage, angle.prompt, userPrompt);
        
        if (resultUrl) {
          generatedImages.push({
            id: angle.id,
            url: resultUrl,
            angle: angle.label,
            description: `Professional ${angle.label}`
          });
        }
        setLoadingProgress(Math.floor(10 + ((i + 1) * 30)));
      }

      setResults(generatedImages);
      setLoadingProgress(100);
      setStatus(GenerationState.SUCCESS);
    } catch (err: any) {
      console.error("Session Error:", err);
      setError(err.message || "An unexpected snag occurred in the AI Studio.");
      setStatus(GenerationState.ERROR);
    }
  };

  const reset = () => {
    setSourceImage(null);
    setResults([]);
    setUserPrompt('');
    setStatus(GenerationState.IDLE);
    setError(null);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#020617] text-slate-200">
        <Header />

        <main className="flex-grow max-w-6xl mx-auto w-full p-4 sm:p-10 relative">
          {/* Background Ambient Glows */}
          <div className="fixed inset-0 pointer-events-none -z-10">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full"></div>
          </div>

          {status === GenerationState.LOADING && (
            <LoadingOverlay progress={loadingProgress} currentTask={loadingTask} />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Controls Side */}
            <div className="lg:col-span-4 space-y-6">
              <div className="glass rounded-[2rem] p-6 border border-white/5 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                  </div>
                  <h2 className="font-black text-white uppercase tracking-tighter italic">Studio Config</h2>
                </div>

                <div className="space-y-6">
                  {/* Image Upload */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Source Asset</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`aspect-square rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-4 overflow-hidden
                        ${sourceImage ? 'border-indigo-500/50 bg-slate-900/50' : 'border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/50'}
                      `}
                    >
                      {sourceImage ? (
                        <img src={sourceImage} alt="Source" className="w-full h-full object-contain p-4" />
                      ) : (
                        <>
                          <i className="fa-solid fa-cloud-arrow-up text-3xl text-slate-600"></i>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Drop or click</span>
                        </>
                      )}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                  </div>

                  {/* Prompt */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Atmosphere</label>
                    <textarea 
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      placeholder="e.g. 'minimalist loft', 'sunset warmth'..."
                      className="w-full rounded-2xl bg-slate-950/50 border-white/5 text-sm p-4 h-24 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-700"
                    />
                  </div>

                  {error && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold animate-in slide-in-from-top-2">
                      <div className="flex gap-3">
                        <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
                        <p>{error}</p>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={handleGenerate}
                    disabled={!sourceImage || status === GenerationState.LOADING}
                    className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white font-black uppercase tracking-widest text-xs transition-all active:scale-[0.98] shadow-lg shadow-indigo-600/20"
                  >
                    {status === GenerationState.LOADING ? 'Capturing...' : 'Run Session'}
                  </button>
                </div>
              </div>
            </div>

            {/* Showcase Side */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="font-black text-white text-2xl uppercase tracking-tighter italic">Showcase</h2>
                {results.length > 0 && (
                  <button onClick={reset} className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors">
                    Reset Session
                  </button>
                )}
              </div>

              {results.length === 0 ? (
                <div className="h-[500px] glass rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center opacity-40">
                  <i className="fa-solid fa-camera-retro text-5xl mb-6 text-slate-600"></i>
                  <p className="font-bold uppercase tracking-[0.2em] text-xs">Waiting for session input</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-8">
                  {results.map((img) => (
                    <div key={img.id} className="glass rounded-[3rem] overflow-hidden border border-white/5 group shadow-2xl">
                      <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic">{img.angle}</span>
                        <a href={img.url} download={`${img.angle}.png`} className="text-slate-500 hover:text-white transition-colors">
                          <i className="fa-solid fa-download"></i>
                        </a>
                      </div>
                      <div className="aspect-video bg-black flex items-center justify-center overflow-hidden">
                        <img 
                          src={img.url} 
                          alt={img.angle} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;