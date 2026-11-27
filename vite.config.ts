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
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('motion') || id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
            return 'vendor-ui';
          },
        },
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
