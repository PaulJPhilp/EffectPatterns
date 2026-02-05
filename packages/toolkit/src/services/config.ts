/**
 * Toolkit Configuration Service
 *
 * Type-safe configuration management for toolkit operations
 * including timeouts, limits, cache settings, and feature flags.
 */

import { Effect } from "effect";
import { ConfigurationError } from "../errors.js";

/**
 * Toolkit configuration interface
 */
export interface ToolkitConfigType {
  /** Maximum number of search results to return */
  readonly maxSearchResults: number;

  /** Search timeout in milliseconds */
  readonly searchTimeoutMs: number;

  /** Pattern loading timeout in milliseconds */
  readonly loadTimeoutMs: number;

  /** Cache TTL in milliseconds */
  readonly cacheTtlMs: number;

  /** Maximum cache size in entries */
  readonly maxCacheSize: number;

  /* Enable caching feature */
  readonly enableCache: boolean;

  /** Enable detailed logging */
  readonly enableLogging: boolean;

  /** Enable metrics collection */
  readonly enableMetrics: boolean;

  /** Maximum concurrent database requests (Bulkhead) */
  readonly maxConcurrentDbRequests: number;

  /** Number of retry attempts for DB operations */
  readonly dbRetryAttempts: number;

  /** Base delay for DB retries in milliseconds */
  readonly dbRetryDelayMs: number;

  /** Redis URL for L2 Caching (optional) */
  readonly redisUrl?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_TOOLKIT_CONFIG: ToolkitConfigType = {
  maxSearchResults: 100,
  searchTimeoutMs: 5000,
  loadTimeoutMs: 10000,
  cacheTtlMs: 300000, // 5 minutes
  maxCacheSize: 1000,
  enableCache: true,
  enableLogging: false,
  enableMetrics: false,
  maxConcurrentDbRequests: 10,
  dbRetryAttempts: 3,
  dbRetryDelayMs: 100,
};

/**
 * Toolkit configuration service
 */
export class ToolkitConfig extends Effect.Service<ToolkitConfig>()(
  "ToolkitConfig",
  {
    effect: Effect.gen(function* () {
      // Load configuration from environment with defaults
      const config: ToolkitConfigType = {
        maxSearchResults:
          parseInt(process.env.TOOLKIT_MAX_SEARCH_RESULTS || "") ||
          DEFAULT_TOOLKIT_CONFIG.maxSearchResults,
        searchTimeoutMs:
          parseInt(process.env.TOOLKIT_SEARCH_TIMEOUT_MS || "") ||
          DEFAULT_TOOLKIT_CONFIG.searchTimeoutMs,
        loadTimeoutMs:
          parseInt(process.env.TOOLKIT_LOAD_TIMEOUT_MS || "") ||
          DEFAULT_TOOLKIT_CONFIG.loadTimeoutMs,
        cacheTtlMs:
          parseInt(process.env.TOOLKIT_CACHE_TTL_MS || "") ||
          DEFAULT_TOOLKIT_CONFIG.cacheTtlMs,
        maxCacheSize:
          parseInt(process.env.TOOLKIT_MAX_CACHE_SIZE || "") ||
          DEFAULT_TOOLKIT_CONFIG.maxCacheSize,
        enableCache: process.env.TOOLKIT_ENABLE_CACHE !== "false", // Default true
        enableLogging: process.env.TOOLKIT_ENABLE_LOGGING === "true", // Default false
        enableMetrics: process.env.TOOLKIT_ENABLE_METRICS === "true", // Default false
        maxConcurrentDbRequests:
          parseInt(process.env.TOOLKIT_MAX_CONCURRENT_DB_REQUESTS || "") ||
          DEFAULT_TOOLKIT_CONFIG.maxConcurrentDbRequests,
        dbRetryAttempts:
          parseInt(process.env.TOOLKIT_DB_RETRY_ATTEMPTS || "") ||
          DEFAULT_TOOLKIT_CONFIG.dbRetryAttempts,
        dbRetryDelayMs:
          parseInt(process.env.TOOLKIT_DB_RETRY_DELAY_MS || "") ||
          DEFAULT_TOOLKIT_CONFIG.dbRetryDelayMs,
        redisUrl: process.env.TOOLKIT_REDIS_URL,
      };

      // Validate configuration
      yield* validateConfig(config);

      return {
        getConfig: () => Effect.succeed(config),

        getMaxSearchResults: () => Effect.succeed(config.maxSearchResults),
        getSearchTimeoutMs: () => Effect.succeed(config.searchTimeoutMs),
        getLoadTimeoutMs: () => Effect.succeed(config.loadTimeoutMs),
        getCacheTtlMs: () => Effect.succeed(config.cacheTtlMs),
        getMaxCacheSize: () => Effect.succeed(config.maxCacheSize),
        isCacheEnabled: () => Effect.succeed(config.enableCache),
        isLoggingEnabled: () => Effect.succeed(config.enableLogging),
        isMetricsEnabled: () => Effect.succeed(config.enableMetrics),
        getMaxConcurrentDbRequests: () =>
          Effect.succeed(config.maxConcurrentDbRequests),
        getDbRetryAttempts: () => Effect.succeed(config.dbRetryAttempts),
        getDbRetryDelayMs: () => Effect.succeed(config.dbRetryDelayMs),
        getRedisUrl: () => Effect.succeed(config.redisUrl),
      };
    }),
  }
) {}

/**
 * Validate configuration values
 */
function validateConfig(
  config: ToolkitConfigType
): Effect.Effect<void, ConfigurationError> {
  return Effect.gen(function* () {
    const validations = [
      {
        key: "maxSearchResults" as const,
        value: config.maxSearchResults,
      },
      {
        key: "searchTimeoutMs" as const,
        value: config.searchTimeoutMs,
      },
      {
        key: "loadTimeoutMs" as const,
        value: config.loadTimeoutMs,
      },
      {
        key: "cacheTtlMs" as const,
        value: config.cacheTtlMs,
      },
      {
        key: "maxCacheSize" as const,
        value: config.maxCacheSize,
      },
      {
        key: "maxConcurrentDbRequests" as const,
        value: config.maxConcurrentDbRequests,
      },
      {
        key: "dbRetryAttempts" as const,
        value: config.dbRetryAttempts,
      },
      {
        key: "dbRetryDelayMs" as const,
        value: config.dbRetryDelayMs,
      },
    ];

    for (const { key, value } of validations) {
      if (value <= 0) {
        yield* Effect.fail(
          new ConfigurationError({
            key,
            expected: "positive number",
            received: value,
          })
        );
      }
    }
  });
}

