import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY environment variable is not set. Please define it in your environment (e.g., .env file) before starting the dev server.',
    );
  }
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/google-api': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/google-api/, ''),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              proxyReq.setHeader('x-goog-api-key', apiKey);
            });
          }
        }
      }
    },
    plugins: [react()],
    define: {
      // Compatibility shims for legacy client-side references.
      // These do NOT expose real API keys; they just prevent `process` from being undefined
      // in the browser bundle. Real keys are injected via the proxy/middleware instead.
      'process.env.API_KEY': JSON.stringify(''),
      'process.env.GEMINI_API_KEY': JSON.stringify(''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
