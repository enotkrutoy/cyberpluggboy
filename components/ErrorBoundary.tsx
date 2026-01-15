// Fix: Ensure proper React class component imports for stable inheritance.
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Standard ErrorBoundary to catch and display rendering errors.
 */
// Fix: Explicitly extending Component<Props, State> ensures 'this.props' is correctly typed.
export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  // Fix: Removed redundant constructor that only called super(props) to clean up class definition.

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-center">
          <div className="glass p-8 rounded-[2rem] border border-red-500/20 max-w-md">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-triangle-exclamation text-red-500 text-2xl"></i>
            </div>
            <h1 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Interface Error</h1>
            <p className="text-slate-400 text-sm mb-6">The application encountered an unexpected rendering issue.</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    // Fix: Accessing 'this.props.children' from the extended Component class.
    return this.props.children;
  }
}
