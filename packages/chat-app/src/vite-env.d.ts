/// <reference types="vite/client" />

declare global {
  type ImportMetaEnv = {
    readonly VITE_MCP_BASE_URL: string;
    readonly VITE_PATTERN_API_KEY: string;
  };

  type ImportMeta = {
    readonly env: ImportMetaEnv;
  };
}
