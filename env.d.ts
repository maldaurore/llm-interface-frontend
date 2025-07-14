/// <reference types="vite/client" />

// Para habilitar autocompletado y verificación de nombres por TypeScript
interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
