// @google/genai: Load environment variables and define process.env.API_KEY for the client bundle.
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

// Fix: Define __dirname for ES modules which is missing by default.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Fix: Use imported process to ensure 'cwd' property is correctly recognized by TypeScript.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    // Define environment variables that need to be accessible in the client-side code.
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          // Optimization: Separate core vendor libraries into distinct chunks for better Vercel edge caching.
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ai-vendor': ['@google/genai'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
    server: {
      port: 3000,
      strictPort: false,
    },
  };
});
