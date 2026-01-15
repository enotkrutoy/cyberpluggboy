
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Header from './components/Header';
import LoadingOverlay from './components/LoadingOverlay';
import ErrorBoundary from './components/ErrorBoundary';
import { generateProductAngle } from './services/geminiService';
import { ProductImage, GenerationState } from './types';

const useDevice = () => {
  const [device, setDevice] = useState({ isMobile: false, isIOS: false, isPC: true });

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
        setError("Image exceeds 15MB limit.");
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
        { id: '1', label: 'Frontal Master', prompt: 'Perfect centered frontal view, professional lighting.' },
        { id: '2', label: 'Hero Perspective', prompt: 'Three-quarter dynamic view, premium depth.' },
        { id: '3', label: 'Detail View', prompt: 'Close-up texture focus or side-profile view.' }
      ];

      const generatedImages: ProductImage[] = [];

      for (let i = 0; i < angles.length; i++) {
        const angle = angles[i];
        setLoadingTask(`Rendering ${angle.label}...`);
        
        // Add a 2-second delay between requests to prevent Rate Limit (429) errors
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 2500));
        }

        const resultUrl = await generateProductAngle(sourceImage, angle.prompt, userPrompt);
        
        if (resultUrl) {
          generatedImages.push({
            id: angle.id,
            url: resultUrl,
            angle: angle.label,
            description: `Generated ${angle.label}`
          });
        }
        setLoadingProgress(Math.floor(10 + ((i + 1) * 30)));
      }

      setResults(generatedImages);
      setLoadingProgress(100);
      setStatus(GenerationState.SUCCESS);
      
      if (device.isMobile) {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred. Please check your connection.");
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

  return (
    <ErrorBoundary>
      <div className={`min-h-screen flex flex-col bg-[#020617] text-slate-200 selection:bg-indigo-500/30 ${device.isIOS ? 'safe-pb' : ''}`}>
        <Header />

        <main className="flex-grow max-w-6xl mx-auto w-full p-4 sm:p-6 lg:p-10 relative">
          <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
            <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[180px] rounded-full animate-pulse"></div>
            <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-blue-600/10 blur-[180px] rounded-full animate-pulse"></div>
          </div>

          {status === GenerationState.LOADING && (
            <LoadingOverlay progress={loadingProgress} currentTask={loadingTask} />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            <div className="lg:col-span-5 space-y-6">
              <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                      <i className="fa-solid fa-camera-viewfinder"></i>
                    </div>
                    <h2 className="font-black text-white uppercase tracking-tighter italic">Input Asset</h2>
                  </div>
                </div>
                
                <div className="p-6">
                  {!sourceImage ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-3xl border-2 border-dashed border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center gap-5 cursor-pointer hover:bg-slate-800 transition-all group"
                    >
                      <i className="fa-solid fa-cloud-arrow-up text-4xl text-slate-600 group-hover:text-indigo-400"></i>
                      <p className="text-sm font-black text-slate-200 uppercase tracking-tight">Upload Product</p>
                    </div>
                  ) : (
                    <div className="relative aspect-square rounded-3xl overflow-hidden bg-slate-950 border border-white/5 group">
                      <img src={sourceImage} alt="Input" className="w-full h-full object-contain p-4" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={() => fileInputRef.current?.click()} className="bg-white text-black px-6 py-2 rounded-full font-bold text-xs">Replace</button>
                      </div>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </div>
              </div>

              <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                      <i className="fa-solid fa-wand-sparkles"></i>
                    </div>
                  <h2 className="font-black text-white uppercase tracking-tighter italic">Studio Config</h2>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Atmosphere Prompt</label>
                    <textarea 
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      placeholder="e.g. 'minimalist concrete loft', 'soft sun'..."
                      className="w-full rounded-3xl bg-slate-950/60 border-white/5 text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/30 min-h-[100px] p-5 outline-none transition-all"
                    />
                  </div>

                  {error && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold flex items-center gap-3">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                      <span>{error}</span>
                    </div>
                  )}

                  <button 
                    onClick={handleGenerate}
                    disabled={!sourceImage || status === GenerationState.LOADING}
                    className="w-full py-5 rounded-3xl font-black text-xs uppercase tracking-[0.3em] bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {status === GenerationState.LOADING ? 'Processing...' : 'Run Session'}
                  </button>
                </div>
              </div>
            </div>

            <div id="results-section" className="lg:col-span-7 space-y-8 pb-20">
              <div className="flex items-center justify-between px-2 pt-2">
                <h2 className="font-black text-white text-3xl tracking-tighter uppercase italic">Showcase</h2>
                {results.length > 0 && <button onClick={reset} className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest">Reset</button>}
              </div>

              {results.length === 0 ? (
                <div className="glass rounded-[3rem] border-2 border-dashed border-white/5 h-[400px] flex flex-col items-center justify-center p-12 text-center opacity-50">
                  <i className="fa-solid fa-camera-retro text-5xl mb-6"></i>
                  <p className="font-bold uppercase tracking-widest text-xs">Studio Waiting for Input</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-10">
                  {results.map((img) => (
                    <div key={img.id} className="glass rounded-[3rem] shadow-2xl border border-white/5 overflow-hidden group">
                      <div className="p-5 border-b border-white/5 flex items-center justify-between">
                         <h4 className="font-black text-white uppercase tracking-widest text-xs italic">{img.angle}</h4>
                         <a href={img.url} download className="text-indigo-400 hover:text-white transition-colors"><i className="fa-solid fa-download"></i></a>
                      </div>
                      <div className="aspect-video bg-black flex items-center justify-center overflow-hidden">
                        <img src={img.url} alt={img.angle} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-1000" />
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
