// Standard React entry point optimized for production and Vercel hosting.
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Get the root element and ensure it exists before attempting to mount.
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Fatal: Root element #root not found in index.html. Ensure the HTML template is correct.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
