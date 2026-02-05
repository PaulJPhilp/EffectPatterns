import { Effect } from "effect";
import * as path from "node:path";
import { ConfigurationError } from "./errors";
import { MCPConfig } from "./types";

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Omit<MCPConfig, "apiKey" | "nodeEnv"> = {
  port: 3000,
  tierMode: "free",
  patternsPath: path.join(process.cwd(), "data", "patterns.json"),
  patternsCacheTtlMs: 600000, // 10 minutes (increased for 31 patterns)
  patternsLoadTimeoutMs: 15000, // 15 seconds (increased for larger pattern set)
  requestTimeoutMs: 45000, // 45 seconds (increased for complex analysis)
  maxRequestBodySize: 2097152, // 2MB (increased for larger code files)
  maxSearchResults: 100, // Increased to handle more patterns
  rateLimitEnabled: true,
  rateLimitRequests: 150, // Increased rate limit for better UX
  rateLimitWindowMs: 60000, // 1 minute
  cacheEnabled: true,
  cacheDefaultTtlMs: 600000, // 10 minutes (increased for better performance)
  cacheMaxEntries: 2000, // Increased cache size for 31 patterns
  cacheCleanupIntervalMs: 300000, // 5 minutes
  loggingEnabled: true,
  logLevel: "info",
  metricsEnabled: true,
  tracingEnabled: true,
  otlpEndpoint: "http://localhost:4318/v1/traces",
  otlpHeaders: {},
  serviceName: "effect-patterns-mcp-server",
  serviceVersion: "1.1.0", // Updated version
  tracingSamplingRate: 0.05, // Reduced to 5% for production efficiency
  circuitBreakerDb: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
    halfOpenMaxCalls: 3,
  },
  circuitBreakerKv: {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 30000, // 30 seconds
    halfOpenMaxCalls: 2,
  },
};

/**
 * Parse OTLP headers from environment variable
 * Format: "key1=value1,key2=value2"
 */
export function parseOtlpHeaders(
  headersString: string,
): Record<string, string> {
  if (!headersString?.trim()) {
    return {};
  }

  const headers: Record<string, string> = {};
  const pairs = headersString.split(",");

  for (const pair of pairs) {
    const [key, value] = pair.split("=").map((s) => s.trim());
    if (key && value) {
      headers[key] = value;
    }
  }

  return headers;
}

/**
 * Validate configuration values
 */
export function validateConfig(
  config: MCPConfig,
): Effect.Effect<void, ConfigurationError> {
  // API Key validation
  if (!config.apiKey && config.nodeEnv === "production") {
    return Effect.fail(
      new ConfigurationError({
        key: "apiKey",
        expected: "non-empty string in production",
        received: config.apiKey,
      }),
    );
  }

  // Port validation
  if (config.port < 1 || config.port > 65535) {
    return Effect.fail(
      new ConfigurationError({
        key: "port",
        expected: "number between 1-65535",
        received: config.port,
      }),
    );
  }

  // Timeout validations
  if (config.requestTimeoutMs < 1000) {
    return Effect.fail(
      new ConfigurationError({
        key: "requestTimeoutMs",
        expected: "at least 1000ms",
        received: config.requestTimeoutMs,
      }),
    );
  }

  if (config.patternsLoadTimeoutMs < 1000) {
    return Effect.fail(
      new ConfigurationError({
        key: "patternsLoadTimeoutMs",
        expected: "at least 1000ms",
        received: config.patternsLoadTimeoutMs,
      }),
    );
  }

  // Rate limit validations
  if (config.rateLimitRequests < 1) {
    return Effect.fail(
      new ConfigurationError({
        key: "rateLimitRequests",
        expected: "at least 1",
        received: config.rateLimitRequests,
      }),
    );
  }

  if (config.rateLimitWindowMs < 1000) {
    return Effect.fail(
      new ConfigurationError({
        key: "rateLimitWindowMs",
        expected: "at least 1000ms",
        received: config.rateLimitWindowMs,
      }),
    );
  }

  // Cache validations
  if (config.cacheMaxEntries < 1) {
    return Effect.fail(
      new ConfigurationError({
        key: "cacheMaxEntries",
        expected: "at least 1",
        received: config.cacheMaxEntries,
      }),
    );
  }

  // Log level validation
  const validLogLevels = ["debug", "info", "warn", "error"];
  if (!validLogLevels.includes(config.logLevel)) {
    return Effect.fail(
      new ConfigurationError({
        key: "logLevel",
        expected: `one of: ${validLogLevels.join(", ")}`,
        received: config.logLevel,
      }),
    );
  }

  // Tracing sampling rate validation
  if (config.tracingSamplingRate < 0 || config.tracingSamplingRate > 1) {
    return Effect.fail(
      new ConfigurationError({
        key: "tracingSamplingRate",
        expected: "number between 0.0 and 1.0",
        received: config.tracingSamplingRate,
      }),
    );
  }

  // All validations passed
  return Effect.succeed(void 0);
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Effect.Effect<MCPConfig, ConfigurationError> {
  return Effect.gen(function* () {
    const config: MCPConfig = {
      // API Configuration
      apiKey: process.env.PATTERN_API_KEY || "",
      nodeEnv:
        (process.env.CUSTOM_NODE_ENV as MCPConfig["nodeEnv"]) ||
        (process.env.NODE_ENV as MCPConfig["nodeEnv"]) ||
        "development",
      port: parseInt(process.env.PORT || "") || DEFAULT_CONFIG.port,
      tierMode:
        (process.env.TIER_MODE as MCPConfig["tierMode"]) ||
        DEFAULT_CONFIG.tierMode,

      // Pattern Configuration
      patternsPath: process.env.PATTERNS_PATH || DEFAULT_CONFIG.patternsPath,
      patternsCacheTtlMs:
        parseInt(process.env.PATTERNS_CACHE_TTL_MS || "") ||
        DEFAULT_CONFIG.patternsCacheTtlMs,
      patternsLoadTimeoutMs:
        parseInt(process.env.PATTERNS_LOAD_TIMEOUT_MS || "") ||
        DEFAULT_CONFIG.patternsLoadTimeoutMs,

      // Request/Response Configuration
      requestTimeoutMs:
        parseInt(process.env.REQUEST_TIMEOUT_MS || "") ||
        DEFAULT_CONFIG.requestTimeoutMs,
      maxRequestBodySize:
        parseInt(process.env.MAX_REQUEST_BODY_SIZE || "") ||
        DEFAULT_CONFIG.maxRequestBodySize,
      maxSearchResults:
        parseInt(process.env.MAX_SEARCH_RESULTS || "") ||
        DEFAULT_CONFIG.maxSearchResults,

      // Rate Limiting
      rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== "false", // Default true
      rateLimitRequests:
        parseInt(process.env.RATE_LIMIT_REQUESTS || "") ||
        DEFAULT_CONFIG.rateLimitRequests,
      rateLimitWindowMs:
        parseInt(process.env.RATE_LIMIT_WINDOW_MS || "") ||
        DEFAULT_CONFIG.rateLimitWindowMs,

      // Caching
      cacheEnabled: process.env.CACHE_ENABLED !== "false", // Default true
      cacheDefaultTtlMs:
        parseInt(process.env.CACHE_DEFAULT_TTL_MS || "") ||
        DEFAULT_CONFIG.cacheDefaultTtlMs,
      cacheMaxEntries:
        parseInt(process.env.CACHE_MAX_ENTRIES || "") ||
        DEFAULT_CONFIG.cacheMaxEntries,
      cacheCleanupIntervalMs:
        parseInt(process.env.CACHE_CLEANUP_INTERVAL_MS || "") ||
        DEFAULT_CONFIG.cacheCleanupIntervalMs,

      // Logging
      loggingEnabled: process.env.LOGGING_ENABLED !== "false", // Default true
      logLevel:
        (process.env.LOG_LEVEL as MCPConfig["logLevel"]) ||
        DEFAULT_CONFIG.logLevel,

      // Metrics
      metricsEnabled: process.env.METRICS_ENABLED !== "false", // Default true

      // Tracing
      tracingEnabled: process.env.TRACING_ENABLED !== "false", // Default true
      otlpEndpoint: process.env.OTLP_ENDPOINT || DEFAULT_CONFIG.otlpEndpoint,
      otlpHeaders: parseOtlpHeaders(process.env.OTLP_HEADERS || ""),
      serviceName: process.env.SERVICE_NAME || DEFAULT_CONFIG.serviceName,
      serviceVersion:
        process.env.SERVICE_VERSION || DEFAULT_CONFIG.serviceVersion,
      tracingSamplingRate:
        parseFloat(process.env.TRACING_SAMPLING_RATE || "") ||
        DEFAULT_CONFIG.tracingSamplingRate,

      // Circuit Breaker
      circuitBreakerDb: {
        failureThreshold: Number(process.env.CB_DB_FAILURE_THRESHOLD ?? DEFAULT_CONFIG.circuitBreakerDb.failureThreshold),
        successThreshold: Number(process.env.CB_DB_SUCCESS_THRESHOLD ?? DEFAULT_CONFIG.circuitBreakerDb.successThreshold),
        timeout: Number(process.env.CB_DB_TIMEOUT ?? DEFAULT_CONFIG.circuitBreakerDb.timeout),
        halfOpenMaxCalls: Number(process.env.CB_DB_HALF_OPEN_MAX ?? DEFAULT_CONFIG.circuitBreakerDb.halfOpenMaxCalls),
      },
      circuitBreakerKv: {
        failureThreshold: Number(process.env.CB_KV_FAILURE_THRESHOLD ?? DEFAULT_CONFIG.circuitBreakerKv.failureThreshold),
        successThreshold: Number(process.env.CB_KV_SUCCESS_THRESHOLD ?? DEFAULT_CONFIG.circuitBreakerKv.successThreshold),
        timeout: Number(process.env.CB_KV_TIMEOUT ?? DEFAULT_CONFIG.circuitBreakerKv.timeout),
        halfOpenMaxCalls: Number(process.env.CB_KV_HALF_OPEN_MAX ?? DEFAULT_CONFIG.circuitBreakerKv.halfOpenMaxCalls),
      },
    };

    // Validate configuration unless explicitly skipped (useful for preview debugging)
    if (process.env.SKIP_CONFIG_VALIDATE !== "true") {
      yield* validateConfig(config);
    } else {
      console.warn("[Config] SKIP_CONFIG_VALIDATE=true - skipping config validation");
    }
    
    return config;
  });
}
