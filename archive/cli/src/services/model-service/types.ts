export interface RateLimit {
  requestsPerMinute?: number;
  tokensPerMinute?: number;
}

export interface Model {
  readonly name: string;
  readonly capabilities: string[];
  readonly contextWindow: number;
  readonly inputCostPerMillionTokens: number;
  readonly outputCostPerMillionTokens: number;
  readonly rateLimit?: RateLimit;
  readonly maxOutputTokens?: number;
  readonly knowledgeCutoff?: string;
}

export interface Provider {
  readonly name: string;
  readonly apiKeyEnvVar: string;
  readonly supportedModels: string[];
}

// Canonical provider identifiers for CLI inputs/config
export type ProviderSlug = "openai" | "anthropic" | "google";
