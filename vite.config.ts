import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: process.env.BASE_PATH || '/',
    plugins: [react(), tailwindcss()],
    // ✅ Security Fix: GEMINI_API_KEY is NO LONGER injected into the client bundle.
    // All Gemini API calls must go through the backend proxy at /api/gemini.
    // See server/index.ts and src/services/geminiService.ts.
    define: {
      // Only expose non-sensitive public env vars here if needed in the future.
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // ✅ Security Fix: proxy /api requests to the backend server during development
      proxy: {
        '/api': {
          target: `http://localhost:${env.BACKEND_PORT || 3001}`,
          changeOrigin: true,
        },
      },
    },
  };
});
