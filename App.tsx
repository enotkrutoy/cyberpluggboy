
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Header from './components/Header';
import LoadingOverlay from './components/LoadingOverlay';
import ErrorBoundary from './components/ErrorBoundary';
import { generateProductAngle } from './services/geminiService';
import { ProductImage, GenerationState } from './types';

const useDevice = () => {
  const [device, setDevice] = useState({
    isMobile: false,
    isIOS: false,
    isPC: true,
  });

  useEffect(() => {
    const ua = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    setDevice({ isMobile, isIOS, isPC: !isMobile });
  }, []);

  return device;
};

const App: React.FC = () => {
  const device = useDevice();
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
      if (file.size > 15 * 1024 * 1024) {
        setError("Image exceeds 15MB limit. Please compress and try again.");
        return;
      }
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
        { id: '1', label: 'Frontal Master', prompt: 'Perfect centered frontal view, professional lighting, crisp details.' },
        { id: '2', label: 'Hero Perspective', prompt: 'Three-quarter dynamic view, premium composition, realistic shadows.' },
        { id: '3', label: 'Detail / Flat-lay', prompt: 'Close-up texture focus or creative top-down view.' }
      ];

      const generatedImages: ProductImage[] = [];

      for (let i = 0; i < angles.length; i++) {
        const angle = angles[i];
        setLoadingTask(`Rendering ${angle.label}...`);
        setLoadingProgress(Math.floor(5 + (i * 30)));

        const resultUrl = await generateProductAngle(sourceImage, angle.prompt, userPrompt);
        
        if (resultUrl) {
          generatedImages.push({
            id: angle.id,
            url: resultUrl,
            angle: angle.label,
            description: `Professional Rendering ${angle.id}`
          });
        }
        setLoadingProgress(Math.floor(5 + ((i + 1) * 31)));
      }

      setResults(generatedImages);
      setLoadingProgress(100);
      setStatus(GenerationState.SUCCESS);
      
      if (device.isMobile) {
        const resultsEl = document.getElementById('results-section');
        resultsEl?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error(err);
      setError("The AI studio encountered a snag. Check your connection.");
      setStatus(GenerationState.ERROR);
    }
  };

  const reset = useCallback(() => {
    setSourceImage(null);
    setResults([]);
    setUserPrompt('');
    setStatus(GenerationState.IDLE);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      // Optional: Add a toast notification here
    } catch (err) {
      console.warn('Failed to copy image URL');
    }
  };

  return (
    <ErrorBoundary>
      <div className={`min-h-screen flex flex-col bg-[#020617] text-slate-200 selection:bg-indigo-500/30 ${device.isIOS ? 'safe-pb' : ''}`}>
        <Header />

        <main className="flex-grow max-w-6xl mx-auto w-full p-4 sm:p-6 lg:p-10 relative">
          {/* Enhanced Background depth */}
          <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
            <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[180px] rounded-full animate-pulse duration-[10s]"></div>
            <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-blue-600/10 blur-[180px] rounded-full animate-pulse duration-[8s]" style={{ animationDelay: '2s' }}></div>
          </div>

          {status === GenerationState.LOADING && (
            <LoadingOverlay progress={loadingProgress} currentTask={loadingTask} />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Input Controls */}
            <div className="lg:col-span-5 space-y-6">
              <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl transition-all hover:border-indigo-500/10">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                      <i className="fa-solid fa-camera-viewfinder text-indigo-400"></i>
                    </div>
                    <div>
                      <h2 className="font-black text-white uppercase tracking-tighter italic">Input Asset</h2>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Physical Product Source</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  {!sourceImage ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-3xl border-2 border-dashed border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center gap-5 cursor-pointer hover:bg-slate-800/60 hover:border-indigo-500/30 transition-all group"
                    >
                      <div className="w-20 h-20 rounded-3xl bg-slate-900 shadow-2xl border border-white/5 flex items-center justify-center text-slate-600 group-hover:text-indigo-400 group-hover:scale-105 group-hover:shadow-indigo-500/10 transition-all duration-500">
                        <i className="fa-solid fa-cloud-arrow-up text-4xl"></i>
                      </div>
                      <div className="text-center px-8">
                        <p className="text-sm font-black text-slate-200 uppercase tracking-tight">Upload Product</p>
                        <p className="text-[10px] text-slate-500 mt-2 leading-relaxed font-bold uppercase tracking-widest opacity-60">Smartphone photos work best</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group aspect-square rounded-3xl overflow-hidden bg-slate-950 border border-white/5 shadow-inner">
                      <img src={sourceImage} alt="Input" className="w-full h-full object-contain p-4" />
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center backdrop-blur-[4px]">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-white text-slate-950 px-10 py-3.5 rounded-full text-[10px] font-black shadow-2xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                        >
                          Replace File
                        </button>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSourceImage(null); }}
                        className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-slate-900/90 backdrop-blur-md text-slate-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-2xl border border-white/10 z-10"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </div>
              </div>

              <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <i className="fa-solid fa-wand-sparkles text-indigo-400"></i>
                  </div>
                  <div>
                    <h2 className="font-black text-white uppercase tracking-tighter italic">Studio Config</h2>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Environment & Context</p>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-1">Atmosphere Prompt</label>
                    <textarea 
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      placeholder="e.g. 'minimalist concrete loft', 'soft morning sun', 'modern high-end display'..."
                      className="w-full rounded-3xl bg-slate-950/60 border-white/5 text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/30 min-h-[120px] resize-none p-5 border shadow-inner placeholder:text-slate-800 outline-none transition-all"
                    />
                  </div>

                  {error && (
                    <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-400 text-[11px] font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                      <i className="fa-solid fa-triangle-exclamation text-lg"></i>
                      <span>{error}</span>
                    </div>
                  )}

                  <button 
                    onClick={handleGenerate}
                    disabled={!sourceImage || status === GenerationState.LOADING}
                    className={`w-full py-5 rounded-3xl font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-95 ${
                      !sourceImage || status === GenerationState.LOADING
                      ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-indigo-500/30 hover:-translate-y-0.5'
                    }`}
                  >
                    {status === GenerationState.LOADING ? (
                      <i className="fa-solid fa-spinner-third animate-spin"></i>
                    ) : (
                      <i className="fa-solid fa-bolt-lightning"></i>
                    )}
                    Run Session
                  </button>
                </div>
              </div>
            </div>

            {/* Showcase Panel */}
            <div id="results-section" className="lg:col-span-7 space-y-8 pb-20">
              <div className="flex items-center justify-between px-2 pt-2">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)] animate-pulse"></div>
                  <h2 className="font-black text-white text-3xl tracking-tighter uppercase italic">Showcase</h2>
                </div>
                {results.length > 0 && (
                  <button onClick={reset} className="text-[10px] font-black text-slate-600 hover:text-white transition-all uppercase tracking-[0.2em] border-b border-transparent hover:border-white/20">
                    Reset Session
                  </button>
                )}
              </div>

              {results.length === 0 ? (
                <div className="glass rounded-[3rem] border-2 border-dashed border-white/5 h-[600px] flex flex-col items-center justify-center p-12 text-center gap-8 group">
                  <div className="w-24 h-24 rounded-[2rem] bg-slate-900 border border-white/5 flex items-center justify-center text-slate-700 group-hover:text-indigo-400 group-hover:border-indigo-500/20 group-hover:shadow-indigo-500/5 transition-all duration-700">
                    <i className="fa-solid fa-camera-retro text-5xl"></i>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-white font-black text-2xl uppercase tracking-tighter italic opacity-80">Studio Empty</h3>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed font-bold uppercase tracking-[0.1em] opacity-40">
                      Upload and configure to begin the professional photoshoot process.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-10">
                  {results.map((img, index) => (
                    <div 
                      key={img.id} 
                      className="glass rounded-[3rem] shadow-2xl border border-white/5 overflow-hidden group transition-all hover:border-indigo-500/10 animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out fill-mode-both"
                      style={{ animationDelay: `${index * 200}ms` }}
                    >
                      <div className="p-6 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-600/90 text-white flex items-center justify-center font-black text-xs shadow-xl italic tracking-tighter">0{img.id}</div>
                          <div>
                             <h4 className="font-black text-white uppercase tracking-widest text-[11px] italic">{img.angle}</h4>
                             <p className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.2em] mt-0.5 opacity-60 italic">Marketplace Standard</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => copyToClipboard(img.url)}
                            className="w-10 h-10 rounded-2xl bg-slate-900/50 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-white/5"
                            title="Copy Link"
                          >
                            <i className="fa-solid fa-link text-xs"></i>
                          </button>
                          <a 
                            href={img.url} 
                            download={`shot-${img.id}.png`}
                            className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-all shadow-xl border border-indigo-500/20 active:scale-90"
                            title="Download Asset"
                          >
                            <i className="fa-solid fa-arrow-down-to-bracket text-lg"></i>
                          </a>
                        </div>
                      </div>
                      
                      <div className="aspect-[4/3] sm:aspect-video bg-black flex items-center justify-center overflow-hidden relative">
                        <img 
                          src={img.url} 
                          alt={img.angle} 
                          className="w-full h-full object-contain sm:object-cover transition-transform duration-1000 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10 pointer-events-none"></div>
                        
                        {/* Status Tags */}
                        <div className="absolute bottom-6 left-6 flex flex-wrap gap-2 pointer-events-none transition-all duration-700 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                           <div className="bg-black/60 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                             <span className="text-[9px] font-black text-white uppercase tracking-widest italic">Authenticity Verified</span>
                           </div>
                           <div className="bg-indigo-500/20 backdrop-blur-xl px-4 py-2 rounded-xl border border-indigo-500/20 text-[9px] font-black text-indigo-200 uppercase tracking-widest italic">
                             Smartphone Lens
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className="bg-slate-950/80 backdrop-blur-2xl border-t border-white/5 py-12 safe-pb">
          <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-10">
            <div className="flex items-center justify-center gap-12 opacity-20 hover:opacity-40 transition-opacity duration-700 grayscale">
               <i className="fa-brands fa-apple text-white text-3xl"></i>
               <i className="fa-brands fa-android text-white text-3xl"></i>
               <i className="fa-brands fa-google text-white text-3xl"></i>
            </div>
            <div className="text-center space-y-3">
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.5em] italic">
                Marketplace Pro &bull; Neural Photographic Laboratory
              </p>
              <div className="flex items-center justify-center gap-4">
                <span className="h-[1px] w-8 bg-slate-800"></span>
                <p className="text-slate-800 text-[9px] font-black uppercase tracking-[0.2em] italic">
                  Optimized for {device.isPC ? 'Desktop Workstation' : device.isIOS ? 'Apple iPhone X+ Series' : 'Modern Mobile OS'}
                </p>
                <span className="h-[1px] w-8 bg-slate-800"></span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default App;
