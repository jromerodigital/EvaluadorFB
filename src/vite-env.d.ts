/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APISPERU_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
