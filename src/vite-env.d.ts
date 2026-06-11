/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_EMULATORS?: string;
  readonly VITE_SKILLS_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
