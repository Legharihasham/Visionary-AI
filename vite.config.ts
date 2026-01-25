import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // loadEnv with empty prefix to load all env vars (not just VITE_ prefixed)
    const env = loadEnv(mode, '.', '');
    // Also check process.env directly for variables that might not be in .env file
    const geminiApiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    const apiKey = env.API_KEY || process.env.API_KEY;
    const apiSecretKey = env.VITE_API_SECRET_KEY || process.env.VITE_API_SECRET_KEY;
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // Note: Vite uses import.meta.env for environment variables
      // Variables must be prefixed with VITE_ to be exposed to client
      // For security, consider using a server-side proxy instead
      define: {
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiApiKey),
        'import.meta.env.API_KEY': JSON.stringify(apiKey || geminiApiKey),
        'import.meta.env.VITE_API_SECRET_KEY': JSON.stringify(apiSecretKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
