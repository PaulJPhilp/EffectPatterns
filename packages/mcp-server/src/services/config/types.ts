/**
 * MCP Server configuration interface
 */
export interface MCPConfig {
  // API Configuration
  readonly apiKey: string;
  readonly nodeEnv: "development" | "production" | "test";
  readonly port: number;
  readonly tierMode: "free" | "paid";

  // Pattern Configuration
  readonly patternsPath: string;
  readonly patternsCacheTtlMs: number;
  readonly patternsLoadTimeoutMs: number;

  // Request/Response Configuration
  readonly requestTimeoutMs: number;
  readonly maxRequestBodySize: number;
  readonly maxSearchResults: number;

  // Rate Limiting
  readonly rateLimitEnabled: boolean;
  readonly rateLimitRequests: number;
  readonly rateLimitWindowMs: number;

  // Caching
  readonly cacheEnabled: boolean;
  readonly cacheDefaultTtlMs: number;
  readonly cacheMaxEntries: number;
  readonly cacheCleanupIntervalMs: number;

  // Logging
  readonly loggingEnabled: boolean;
  readonly logLevel: "debug" | "info" | "warn" | "error";

  // Metrics
  readonly metricsEnabled: boolean;

  // Tracing
  readonly tracingEnabled: boolean;
  readonly otlpEndpoint: string;
  readonly otlpHeaders: Record<string, string>;
  readonly serviceName: string;
  readonly serviceVersion: string;
  readonly tracingSamplingRate: number; // 0.0 to 1.0, default 0.1 (10%)
}
