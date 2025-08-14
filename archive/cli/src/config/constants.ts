/**
 * Global configuration constants for API keys and service configuration
 */

export const CONFIG_KEYS = {
  // AI Provider API Keys
  GOOGLE_AI_API_KEY: "GOOGLE_AI_API_KEY",
  OPENAI_API_KEY: "OPENAI_API_KEY",
  ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY",
  
  // Service Configuration
  DEFAULT_MODEL: "DEFAULT_MODEL",
  MAX_TOKENS: "MAX_TOKENS",
  TEMPERATURE: "TEMPERATURE",
  
  // Provider-specific settings
  GOOGLE_MODEL: "GOOGLE_MODEL",
  OPENAI_MODEL: "OPENAI_MODEL",
  ANTHROPIC_MODEL: "ANTHROPIC_MODEL",
  
  // CLI Configuration
  OUTPUT_FORMAT: "OUTPUT_FORMAT",
  VERBOSE: "VERBOSE",
  DRY_RUN: "DRY_RUN",
} as const;

export type ConfigKey = keyof typeof CONFIG_KEYS;
