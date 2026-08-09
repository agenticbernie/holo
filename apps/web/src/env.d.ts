/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_HOLO_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
