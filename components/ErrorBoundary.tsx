
import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component to catch rendering errors in the component tree.
 * Fix: Explicitly extend React.Component to ensure the 'props' property is correctly inherited and recognized by TypeScript.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  // Use property initializer for state to ensure it is correctly recognized.
  public state: State = {
    hasError: false,
    error: null
  };

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

    // Access the children property from the inherited props.
    return this.props.children;
  }
}
