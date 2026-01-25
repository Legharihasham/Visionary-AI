/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  readonly API_KEY?: string;
  readonly VITE_API_SECRET_KEY?: string;
  readonly GEMINI_API_KEY?: string;
}

// Extend ImportMeta to include env
declare module 'vite/client' {
  interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY?: string;
    readonly API_KEY?: string;
    readonly VITE_API_SECRET_KEY?: string;
    readonly GEMINI_API_KEY?: string;
  }
}
