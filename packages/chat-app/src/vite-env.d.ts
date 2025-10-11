/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MCP_BASE_URL: string
  readonly VITE_PATTERN_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
