import React, { useState, useRef, useEffect, useCallback } from 'react';
import Header from './components/Header';
import LoadingOverlay from './components/LoadingOverlay';
import ErrorBoundary from './components/ErrorBoundary';
import { generateProductAngle, RateLimitError } from './services/geminiService';
import { ProductImage, GenerationState } from './types';

const STYLE_PRESETS = [
  { id: 'minimal', label: 'Minimal Studio', prompt: 'Clean white minimalist studio, soft top-down lighting.' },
  { id: 'loft', label: 'Modern Loft', prompt: 'Modern industrial loft with large windows and warm sunset light.' },
  { id: 'cafe', label: 'Cozy Cafe', prompt: 'A stylish marble cafe table with soft morning bokeh.' },
  { id: 'nature', label: 'Outdoor Natural', prompt: 'Natural wooden surface in a lush green garden, soft daylight.' },
  { id: 'luxury', label: 'Dark Luxury', prompt: 'Matte black surface with dramatic low-key rim lighting.' }
];

const App: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [results, setResults] = useState<ProductImage[]>([]);
  const [status, setStatus] = useState<GenerationState>(GenerationState.IDLE);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingTask, setLoadingTask] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cooldown, setCooldown] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle countdown for rate limits
  useEffect(() => {
    let timer: any;
    if (cooldown !== null && cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => (prev !== null && prev > 0 ? prev - 1 : null));
      }, 1000);
    } else if (cooldown === 0) {
      setCooldown(null);
      setError(null);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const startCamera = async () => {
    try {
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1080 }, height: { ideal: 1440 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Camera access denied. Please use upload.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setSourceImage(canvas.toDataURL('image/jpeg', 0.9));
        stopCamera();
        setResults([]);
        setError(null);
      }
    }
  };

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

  const handleGenerate = async (startIndex = 0, existingResults: ProductImage[] = []) => {
    if (!sourceImage) return;

    setStatus(GenerationState.LOADING);
    setResults(existingResults);
    setError(null);
    
    const angles = [
      { id: '1', label: 'Frontal Master', prompt: 'Perfect eye-level frontal shot, crisp product details.' },
      { id: '2', label: 'Hero Perspective', prompt: 'Dynamic 3/4 view from a slightly high smartphone-held angle.' },
      { id: '3', label: 'Top/Side View', prompt: 'Modern side profile or flat-lay view depending on product form.' }
    ];

    const currentResults = [...existingResults];

    try {
      for (let i = startIndex; i < angles.length; i++) {
        const angle = angles[i];
        setLoadingProgress(Math.floor(((i + 1) / angles.length) * 100));
        setLoadingTask(`Rendering ${angle.label}...`);
        
        // Significant delay to avoid 429 Rate Limits (Common on Free Tier)
        if (i > startIndex) await new Promise(res => setTimeout(res, 3500));

        const resultUrl = await generateProductAngle(sourceImage, angle.prompt, userPrompt);
        
        if (resultUrl) {
          const newImage = {
            id: angle.id,
            url: resultUrl,
            angle: angle.label,
            description: `AI-Generated ${angle.label}`
          };
          currentResults.push(newImage);
          setResults([...currentResults]);
        }
      }

      setLoadingProgress(100);
      setStatus(GenerationState.SUCCESS);
    } catch (err: any) {
      console.error("Generation Loop Error:", err);
      if (err instanceof RateLimitError) {
        setError("Rate Limit hit. The AI studio is cooling down for 15s...");
        setCooldown(15);
        setStatus(GenerationState.IDLE);
      } else {
        setError(err.message || "An unexpected error occurred.");
        setStatus(GenerationState.ERROR);
      }
    }
  };

  const reset = () => {
    setSourceImage(null);
    setResults([]);
    setUserPrompt('');
    setStatus(GenerationState.IDLE);
    setError(null);
    setCooldown(null);
    stopCamera();
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#020617] text-slate-200">
        <Header />

        <main className="flex-grow max-w-6xl mx-auto w-full p-4 sm:p-10 relative">
          <div className="fixed inset-0 pointer-events-none -z-10">
            <div className="absolute top-0 left-1/4 w-[60%] h-[60%] bg-indigo-500/10 blur-[200px] rounded-full"></div>
            <div className="absolute bottom-0 right-1/4 w-[60%] h-[60%] bg-blue-500/10 blur-[200px] rounded-full"></div>
          </div>

          {status === GenerationState.LOADING && (
            <LoadingOverlay progress={loadingProgress} currentTask={loadingTask} />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Input Controls */}
            <div className="lg:col-span-5 space-y-6">
              <div className="glass rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                    <i className="fa-solid fa-camera-viewfinder text-xl"></i>
                  </div>
                  <div>
                    <h2 className="font-black text-white text-xl uppercase tracking-tighter italic leading-none">Capture Asset</h2>
                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">Single source image</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Visual Source Input */}
                  <div className="relative">
                    {showCamera ? (
                      <div className="aspect-[3/4] rounded-[2rem] overflow-hidden bg-black relative shadow-inner border border-white/5">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 px-6">
                          <button onClick={stopCamera} className="w-12 h-12 rounded-full bg-slate-800/80 backdrop-blur-md flex items-center justify-center text-white"><i className="fa-solid fa-xmark"></i></button>
                          <button onClick={capturePhoto} className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-black shadow-xl scale-110 active:scale-90 transition-transform"><div className="w-12 h-12 rounded-full border-2 border-black"></div></button>
                          <div className="w-12 h-12"></div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div 
                          className={`aspect-[3/4] rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center justify-center gap-6 overflow-hidden relative group
                            ${sourceImage ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-slate-800 bg-slate-900/40 hover:border-indigo-500/30'}
                          `}
                        >
                          {sourceImage ? (
                            <>
                              <img src={sourceImage} alt="Source" className="w-full h-full object-contain p-4" />
                              <button onClick={() => setSourceImage(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-opacity"><i className="fa-solid fa-trash-can"></i></button>
                            </>
                          ) : (
                            <>
                              <div className="flex gap-4">
                                <button onClick={startCamera} className="w-20 h-20 rounded-3xl bg-indigo-500 text-white flex flex-col items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 hover:scale-105 transition-transform">
                                  <i className="fa-solid fa-camera text-2xl"></i>
                                  <span className="text-[9px] font-black uppercase tracking-widest">Snap</span>
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="w-20 h-20 rounded-3xl bg-slate-800 text-slate-300 flex flex-col items-center justify-center gap-2 hover:bg-slate-700 hover:scale-105 transition-transform">
                                  <i className="fa-solid fa-image text-2xl"></i>
                                  <span className="text-[9px] font-black uppercase tracking-widest">File</span>
                                </button>
                              </div>
                              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Capture or Upload</p>
                            </>
                          )}
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                      </div>
                    )}
                  </div>

                  {/* Atmosphere Settings */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 flex justify-between">
                      <span>Studio Context</span>
                      <span className="text-indigo-400">Styles</span>
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {STYLE_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => setUserPrompt(preset.prompt)}
                          className="px-3 py-1.5 rounded-full glass border-white/5 text-[9px] font-bold uppercase tracking-wider hover:bg-white/5 active:bg-indigo-500/20 transition-all"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <textarea 
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      placeholder="Describe the environment or select a style above..."
                      className="w-full rounded-2xl bg-slate-950/80 border border-white/10 text-sm p-5 h-28 focus:ring-2 focus:ring-indigo-500/40 outline-none transition-all placeholder:text-slate-700 resize-none"
                    />
                  </div>

                  {error && (
                    <div className={`p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${cooldown ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                      <i className={`fa-solid ${cooldown ? 'fa-clock animate-pulse' : 'fa-circle-exclamation'} mt-0.5`}></i>
                      <div className="text-xs font-bold">
                        <p>{error}</p>
                        {cooldown !== null && (
                          <p className="mt-1 opacity-80">Retrying in {cooldown}s...</p>
                        )}
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => handleGenerate(results.length, results)}
                    disabled={!sourceImage || status === GenerationState.LOADING || !!cooldown}
                    className="w-full py-5 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 text-white font-black uppercase tracking-[0.2em] text-xs transition-all active:scale-[0.97] shadow-xl shadow-indigo-600/30"
                  >
                    {status === GenerationState.LOADING ? (
                      <span className="flex items-center justify-center gap-2">
                        <i className="fa-solid fa-circle-notch animate-spin"></i> Engine Active
                      </span>
                    ) : results.length > 0 && results.length < 3 ? 'Resume Generation' : 'Start Session'}
                  </button>
                </div>
              </div>
            </div>

            {/* Showcase Section */}
            <div className="lg:col-span-7 space-y-10">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${status === GenerationState.SUCCESS ? 'bg-green-500' : 'bg-indigo-500'} animate-pulse`}></div>
                  <h2 className="font-black text-white text-2xl uppercase tracking-tighter italic">Studio Output</h2>
                </div>
                {results.length > 0 && (
                  <button onClick={reset} className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-[0.2em] transition-colors border-b border-transparent hover:border-white">
                    Clear Workspace
                  </button>
                )}
              </div>

              {results.length === 0 ? (
                <div className="min-h-[600px] glass rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center p-12 text-center group">
                  <div className="w-24 h-24 rounded-[2rem] bg-slate-900 flex items-center justify-center mb-8 border border-white/5 shadow-inner group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-camera-retro text-4xl text-slate-700"></i>
                  </div>
                  <h3 className="text-xl font-black text-slate-400 uppercase tracking-tight italic mb-2">Showcase Empty</h3>
                  <p className="text-slate-600 text-xs font-medium max-w-[240px] leading-relaxed uppercase tracking-widest">
                    Capture or upload a product to start the session.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-12 pb-20">
                  {results.map((img, idx) => (
                    <div 
                      key={img.id} 
                      className="glass rounded-[3rem] overflow-hidden border border-white/10 group shadow-2xl animate-in fade-in slide-in-from-bottom-10"
                      style={{ animationDelay: `${idx * 0.2}s` }}
                    >
                      <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-[10px]">0{idx + 1}</span>
                          <span className="text-xs font-black text-white uppercase tracking-[0.2em] italic">{img.angle}</span>
                        </div>
                        <div className="flex gap-4">
                          <button onClick={() => window.open(img.url)} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
                            <i className="fa-solid fa-expand"></i>
                          </button>
                          <a href={img.url} download={`${img.angle}.jpg`} className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all">
                            <i className="fa-solid fa-download"></i>
                          </a>
                        </div>
                      </div>
                      <div className="aspect-[3/4] bg-slate-950 flex items-center justify-center overflow-hidden relative">
                        <img 
                          src={img.url} 
                          alt={img.angle} 
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                        />
                        <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"></div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Placeholder for remaining items if limited */}
                  {results.length < 3 && status !== GenerationState.LOADING && !cooldown && (
                    <button 
                      onClick={() => handleGenerate(results.length, results)}
                      className="aspect-[3/4] glass rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-4 hover:border-indigo-500/30 transition-all"
                    >
                      <i className="fa-solid fa-plus text-slate-600 text-3xl"></i>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Continue Sequence</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
        
        {/* Helper Canvas for Camera Capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </ErrorBoundary>
  );
};

export default App;