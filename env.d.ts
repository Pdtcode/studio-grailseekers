/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly SANITY_STUDIO_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
