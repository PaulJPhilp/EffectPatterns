/**
 * MCP Server Services Unit Tests
 *
 * Comprehensive test suite for all MCP server production services.
 * This test validates that the MCP server services are properly implemented
 * with enterprise-grade features including configuration management,
 * error handling, caching, rate limiting, validation, logging, and metrics.
 *
 * Coverage:
 * - Service instantiation and basic functionality
 * - Tagged error types for type-safe error handling
 * - Configuration service with environment variable support
 * - Logging service with operation tracking
 * - Caching service with TTL and statistics
 * - Validation service with request validation
 * - Rate limiting service with sliding window algorithm
 * - Metrics service with Prometheus export
 * - Service composition and integration
 */

import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Import services
import { MCPCacheService, MCPCacheServiceLive } from "./services/cache";
import { MCPConfigService, MCPConfigServiceLive } from "./services/config";
import { MCPLoggerService, MCPLoggerServiceLive } from "./services/logger";
import {
  MCPMetricsService,
  MCPMetricsServiceLive,
} from "./services/metrics";
import {
  MCRateLimitService,
  MCRateLimitServiceLive,
} from "./services/rate-limit";
import {
  MCPValidationService,
  MCPValidationServiceLive,
} from "./services/validation";

// Import error types
import {
  AuthenticationError,
  AuthorizationError,
  CacheError,
  ConfigurationError,
  MetricsError,
  PatternLoadError,
  PatternNotFoundError,
  PatternValidationError,
  RateLimitError,
  RequestValidationError,
  ResponseError,
  ServerError,
  TimeoutError,
  TracingError,
  ValidationError,
} from "./errors";

// Create combined test layers
const TestBaseLayer = MCPConfigServiceLive;
const TestLoggerLayer = Layer.provide(MCPLoggerServiceLive, TestBaseLayer);
const TestFullLayer = Layer.provideMerge(
  Layer.provideMerge(
    Layer.provideMerge(
      Layer.provideMerge(
        Layer.provideMerge(TestLoggerLayer, MCPCacheServiceLive),
        MCPValidationServiceLive
      ),
      MCRateLimitServiceLive
    ),
    MCPMetricsServiceLive
  ),
  MCPConfigServiceLive
);

// Test configuration with test environment variables
const testEnv = {
  PATTERN_API_KEY: "test-api-key",
  NODE_ENV: "test" as const,
  PORT: "3000",
  PATTERNS_PATH: "/test/patterns.json",
  PATTERNS_CACHE_TTL_MS: "5000",
  PATTERNS_LOAD_TIMEOUT_MS: "1000",
  REQUEST_TIMEOUT_MS: "5000",
  MAX_REQUEST_BODY_SIZE: "1024",
  MAX_SEARCH_RESULTS: "10",
  RATE_LIMIT_ENABLED: "true",
  RATE_LIMIT_REQUESTS: "5",
  RATE_LIMIT_WINDOW_MS: "1000",
  CACHE_ENABLED: "true",
  CACHE_DEFAULT_TTL_MS: "5000",
  CACHE_MAX_ENTRIES: "100",
  CACHE_CLEANUP_INTERVAL_MS: "10000",
  LOGGING_ENABLED: "true",
  LOG_LEVEL: "debug",
  METRICS_ENABLED: "true",
  TRACING_ENABLED: "false",
  OTLP_ENDPOINT: "http://localhost:4318/v1/traces",
  OTLP_HEADERS: "",
  SERVICE_NAME: "test-service",
  SERVICE_VERSION: "1.0.0",
};

// Mock process.env for tests
const originalEnv = process.env;
beforeEach(() => {
  process.env = { ...originalEnv, ...testEnv } as any;
});

afterEach(() => {
  process.env = originalEnv;
});

describe("MCP Server Services", () => {
  describe("MCPConfigService", () => {
    it("should provide configuration values", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const config = yield* MCPConfigService;
          const apiKey = yield* config.getApiKey();
          const port = yield* config.getPort();
          const cacheEnabled = yield* config.isCacheEnabled();
          const rateLimitRequests = yield* config.getRateLimitRequests();

          return { apiKey, port, cacheEnabled, rateLimitRequests };
        }).pipe(Effect.provide(MCPConfigServiceLive))
      );

      expect(result.apiKey).toBe("test-api-key");
      expect(result.port).toBe(3000);
      expect(result.cacheEnabled).toBe(true);
      expect(result.rateLimitRequests).toBe(5);
    });

    it("should provide all configuration getters", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const config = yield* MCPConfigService;
          const configData = yield* config.getConfig();

          return configData;
        }).pipe(Effect.provide(MCPConfigServiceLive))
      );

      expect(result.apiKey).toBe("test-api-key");
      expect(result.nodeEnv).toBe("test");
      expect(result.port).toBe(3000);
      expect(result.patternsPath).toBe("/test/patterns.json");
      expect(result.patternsCacheTtlMs).toBe(5000);
      expect(result.rateLimitEnabled).toBe(true);
      expect(result.cacheEnabled).toBe(true);
      expect(result.loggingEnabled).toBe(true);
      expect(result.metricsEnabled).toBe(true);
    });
  });

  describe("MCPLoggerService", () => {
    it("should provide logging operations", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const logger = yield* MCPLoggerService;
          const logLevel = yield* logger.getLogLevel();
          const loggingEnabled = yield* logger.isLoggingEnabled();

          return { logLevel, loggingEnabled };
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result.logLevel).toBe("debug");
      expect(result.loggingEnabled).toBe(true);
    });

    it("should support operation-scoped logging", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const logger = yield* MCPLoggerService;
          const opLogger = logger.withOperation("test.operation");

          // These should not throw
          yield* opLogger.debug("Debug message");
          yield* opLogger.info("Info message");
          yield* opLogger.warn("Warn message");
          yield* opLogger.error("Error message");

          return true;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result).toBe(true);
    });

    it("should support duration tracking", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const logger = yield* MCPLoggerService;
          const startTime = Date.now() - 100; // 100ms ago
          const durationLogger = logger.withDuration(
            startTime,
            "test.duration"
          );

          yield* durationLogger.info("Operation completed");

          return true;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result).toBe(true);
    });
  });

  describe("MCPCacheService", () => {
    it("should cache and retrieve values", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const cache = yield* MCPCacheService;

          // Set a value
          yield* cache.set("test-key", "test-value", 5000);

          // Get the value
          const getResult = yield* cache.get("test-key");

          return getResult;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result.hit).toBe(true);
      expect(result.value).toBe("test-value");
      expect(result.stats.entries).toBe(1);
    });

    it("should handle cache misses", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const cache = yield* MCPCacheService;

          const getResult = yield* cache.get("nonexistent-key");

          return getResult;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result.hit).toBe(false);
      expect(result.value).toBeUndefined();
    });

    it("should support getOrSet pattern", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const cache = yield* MCPCacheService;

          const value = yield* cache.getOrSet(
            "test-key-2",
            () => Effect.succeed("computed-value"),
            5000
          );

          return value;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result).toBe("computed-value");
    });

    it("should delete cached values", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const cache = yield* MCPCacheService;

          yield* cache.set("delete-test", "value");
          const existed = yield* cache.del("delete-test");
          const getResult = yield* cache.get("delete-test");

          return { existed, hit: getResult.hit };
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result.existed).toBe(true);
      expect(result.hit).toBe(false);
    });

    it("should provide cache statistics", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const cache = yield* MCPCacheService;

          yield* cache.set("stats-key", "stats-value");
          const stats = yield* cache.getStats();

          return stats;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result.entries).toBe(1);
      expect(result.hits).toBe(0); // No hits yet
      expect(result.misses).toBe(0);
    });
  });

  describe("MCPValidationService", () => {
    it("should validate pattern search requests", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const validation = yield* MCPValidationService;

          const searchValidation = yield* validation.validatePatternSearch({
            method: "GET",
            path: "/api/search",
            query: { query: "test", skillLevel: "beginner" },
          });

          return searchValidation;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result.query).toBe("test");
      expect(result.skillLevel).toBe("beginner");
    });

    it("should validate pattern retrieval requests", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const validation = yield* MCPValidationService;

          const retrievalValidation =
            yield* validation.validatePatternRetrieval({
              method: "GET",
              path: "/api/patterns/error-handling-pattern",
            });

          return retrievalValidation;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result.id).toBe("error-handling-pattern");
    });

    it("should validate API keys", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const validation = yield* MCPValidationService;

          const apiKey = yield* validation.validateApiKey("test-api-key");

          return apiKey;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result).toBe("test-api-key");
    });

    it("should reject invalid API keys", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const validation = yield* MCPValidationService;

          return yield* validation.validateApiKey("invalid-key").pipe(
            Effect.match({
              onFailure: (error) => ({ success: false, error }),
              onSuccess: (key) => ({ success: true, key }),
            })
          );
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result.success).toBe(false);
      if ("error" in result) {
        expect(result.error).toBeInstanceOf(ValidationError);
      } else {
        throw new Error("Expected error property on result");
      }
    });

    it("should validate request body size", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const validation = yield* MCPValidationService;

          yield* validation.validateRequestBodySize("small body", {
            "content-length": "10",
          });

          return true;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result).toBe(true);
    });

    it("should reject oversized request bodies", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const validation = yield* MCPValidationService;

          return yield* validation
            .validateRequestBodySize("x".repeat(2000), {
              "content-length": "2000",
            })
            .pipe(
              Effect.match({
                onFailure: (error) => ({ success: false, error }),
                onSuccess: () => ({ success: true }),
              })
            );
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result.success).toBe(false);
      if ("error" in result) {
        expect(result.error).toBeInstanceOf(ValidationError);
      } else {
        throw new Error("Expected error property on result");
      }
    });
  });

  describe("MCRateLimitService", () => {
    it("should allow requests within limits", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rateLimit = yield* MCRateLimitService;

          const checkResult = yield* rateLimit.checkRateLimit("test-user");

          return checkResult;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1 = 4
      expect(result.limit).toBe(5);
    });

    it("should block requests over limits", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rateLimit = yield* MCRateLimitService;

          // Make 5 requests (the limit)
          for (let i = 0; i < 5; i++) {
            yield* rateLimit.checkRateLimit("test-user-2");
          }

          // This one should be blocked
          return yield* rateLimit.checkRateLimit("test-user-2").pipe(
            Effect.match({
              onFailure: (error) => ({ success: false, error }),
              onSuccess: (result) => ({ success: true, result }),
            })
          );
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result.success).toBe(false);
      if ("error" in result) {
        expect(result.error).toBeInstanceOf(RateLimitError);
      } else {
        throw new Error("Expected error property on result");
      }
    });

    it("should reset rate limits", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rateLimit = yield* MCRateLimitService;

          yield* rateLimit.checkRateLimit("reset-test");
          yield* rateLimit.resetRateLimit("reset-test");
          const status = yield* rateLimit.getRateLimitStatus("reset-test");

          return { resetResult: "ok", status };
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result.resetResult).toBe("ok");
      expect(result.status.allowed).toBe(true);
      expect(result.status.remaining).toBe(5);
    });

    it("should provide rate limit status", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rateLimit = yield* MCRateLimitService;

          yield* rateLimit.checkRateLimit("status-test");
          const status = yield* rateLimit.getRateLimitStatus("status-test");

          return status;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.limit).toBe(5);
      expect(result.resetTime).toBeInstanceOf(Date);
    });
  });

  describe("MCPCacheService", () => {
    it("should set and get values", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const cache = yield* MCPCacheService;

          // Set a value
          yield* cache.set("test-key", "test-value");

          // Get the value
          const result = yield* cache.get("test-key");

          expect(result.hit).toBe(true);
          expect(result.value).toBe("test-value");

          return true;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result).toBe(true);
    });

    it("should return miss for non-existent keys", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const cache = yield* MCPCacheService;

          const result = yield* cache.get("non-existent-key");

          expect(result.hit).toBe(false);
          expect(result.value).toBeUndefined();

          return true;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result).toBe(true);
    });

    it("should check if key exists", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const cache = yield* MCPCacheService;

          // Initially should not exist
          const exists1 = yield* cache.has("test-key");
          expect(exists1).toBe(false);

          // Set a value
          yield* cache.set("test-key", "test-value");

          // Should exist now
          const exists2 = yield* cache.has("test-key");
          expect(exists2).toBe(true);

          return true;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result).toBe(true);
    });

    it("should delete keys", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const cache = yield* MCPCacheService;

          // Set a value
          yield* cache.set("test-key", "test-value");

          // Verify it exists
          const exists1 = yield* cache.has("test-key");
          expect(exists1).toBe(true);

          // Delete the key
          const deleted = yield* cache.del("test-key");
          expect(deleted).toBe(true);

          // Verify it's gone
          const exists2 = yield* cache.has("test-key");
          expect(exists2).toBe(false);

          return true;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result).toBe(true);
    });

    it("should clear all keys", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const cache = yield* MCPCacheService;

          // Set multiple values
          yield* cache.set("key1", "value1");
          yield* cache.set("key2", "value2");
          yield* cache.set("key3", "value3");

          // Clear all
          yield* cache.clear();

          // Verify they're all gone
          expect(yield* cache.has("key1")).toBe(false);
          expect(yield* cache.has("key2")).toBe(false);
          expect(yield* cache.has("key3")).toBe(false);

          return true;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result).toBe(true);
    });

    it("should handle TTL expiration", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const cache = yield* MCPCacheService;

          // Set a value with very short TTL (50ms)
          yield* cache.set("ttl-key", "ttl-value", 50);

          // Should be available immediately
          const result1 = yield* cache.get("ttl-key");
          expect(result1.hit).toBe(true);

          // Wait for expiration
          yield* Effect.sleep(100);

          // Should be expired now
          const result2 = yield* cache.get("ttl-key");
          expect(result2.hit).toBe(false);

          return true;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result).toBe(true);
    });

    it("should use getOrSet", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const cache = yield* MCPCacheService;

          // First call - key doesn't exist, should set new value
          const result1 = yield* cache.getOrSet(
            "get-or-set-key",
            () => Effect.succeed("computed-value")
          );
          expect(result1).toBe("computed-value");

          // Second call - key exists, should return cached value
          const result2 = yield* cache.getOrSet(
            "get-or-set-key",
            () => Effect.succeed("should-not-be-called")
          );
          expect(result2).toBe("computed-value");

          return true;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result).toBe(true);
    });

    it("should provide cache statistics", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const cache = yield* MCPCacheService;

          // Get initial stats
          const stats1 = yield* cache.getStats();
          expect(stats1.hits).toBe(0);
          expect(stats1.misses).toBe(0);

          // Perform operations
          yield* cache.get("miss-key"); // miss
          yield* cache.set("test-key", "test-value"); // set
          yield* cache.get("test-key"); // hit
          yield* cache.del("test-key"); // delete

          // Get updated stats
          const stats2 = yield* cache.getStats();
          expect(stats2.hits).toBe(1);
          expect(stats2.misses).toBe(1);

          return true;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result).toBe(true);
    });

    it("should warm up cache with initial data", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const cache = yield* MCPCacheService;

          // Warm up with initial data
          yield* cache.warmup(
            ["warm-key-1", "warm-key-2", "warm-key-3"],
            (key) => Effect.succeed(`warm-value-${key.split("-")[2]}`)
          );

          // Verify warm-up data exists
          const result1 = yield* cache.get("warm-key-1");
          const result2 = yield* cache.get("warm-key-2");
          const result3 = yield* cache.get("warm-key-3");

          expect(result1.hit).toBe(true);
          expect(result1.value).toBe("warm-value-1");
          expect(result2.hit).toBe(true);
          expect(result2.value).toBe("warm-value-2");
          expect(result3.hit).toBe(true);
          expect(result3.value).toBe("warm-value-3");

          return true;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result).toBe(true);
    });

    it("should check if cache is enabled", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const cache = yield* MCPCacheService;
          const config = yield* MCPConfigService;

          const enabled = yield* cache.isEnabled();
          const configEnabled = yield* config.isCacheEnabled();

          expect(enabled).toBe(configEnabled);

          return true;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result).toBe(true);
    });
  });

  describe("MCPMetricsService", () => {
    it("should increment counters", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const metrics = yield* MCPMetricsService;

          yield* metrics.incrementCounter("test_counter", 5, {
            label: "value",
          });
          const snapshot = yield* metrics.getSnapshot();

          return snapshot;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result.counters.length).toBe(1);
      expect(result.counters[0].name).toBe("test_counter");
      expect(result.counters[0].value).toBe(5);
      expect(result.counters[0].labels).toEqual({ label: "value" });
    });

    it("should record histogram observations", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const metrics = yield* MCPMetricsService;

          yield* metrics.observeHistogram("test_histogram", 2.5, {
            method: "GET",
          });
          const snapshot = yield* metrics.getSnapshot();

          return snapshot;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result.histograms.length).toBe(1);
      expect(result.histograms[0].name).toBe("test_histogram");
      expect(result.histograms[0].value).toBe(2.5);
      expect(result.histograms[0].count).toBe(1);
      expect(result.histograms[0].sum).toBe(2.5);
    });

    it("should set gauge values", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const metrics = yield* MCPMetricsService;

          yield* metrics.setGauge("test_gauge", 42, { service: "test" });
          const snapshot = yield* metrics.getSnapshot();

          return snapshot;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result.gauges.length).toBe(1);
      expect(result.gauges[0].name).toBe("test_gauge");
      expect(result.gauges[0].value).toBe(42);
    });

    it("should record request metrics", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const metrics = yield* MCPMetricsService;

          yield* metrics.recordRequest("GET", "/api/test", 200, 150);
          const snapshot = yield* metrics.getSnapshot();

          return snapshot;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(
        result.counters.some((c) => c.name === "http_requests_total")
      ).toBe(true);
      expect(
        result.histograms.some(
          (h) => h.name === "http_request_duration_seconds"
        )
      ).toBe(true);
    });

    it("should export metrics in Prometheus format", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const metrics = yield* MCPMetricsService;

          yield* metrics.incrementCounter("test_counter", 1);
          const prometheusOutput = yield* metrics.exportPrometheus();

          return prometheusOutput;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(typeof result).toBe("string");
      expect(result).toContain("# HELP test_counter");
      expect(result).toContain("# TYPE test_counter counter");
      expect(result).toContain("test_counter 1");
    });

    it("should reset all metrics", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const metrics = yield* MCPMetricsService;

          yield* metrics.incrementCounter("test_counter", 1);
          yield* metrics.setGauge("test_gauge", 42);

          let snapshot = yield* metrics.getSnapshot();
          expect(snapshot.counters.length).toBeGreaterThan(0);

          yield* metrics.reset();
          snapshot = yield* metrics.getSnapshot();

          return snapshot;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result.counters.length).toBe(0);
      expect(result.gauges.length).toBe(0);
      expect(result.histograms.length).toBe(0);
    });

    it("should check if metrics are enabled", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const metrics = yield* MCPMetricsService;
          const enabled = yield* metrics.isEnabled();

          return enabled;
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result).toBe(true);
    });
  });

  describe("Error Types", () => {
    it("should create ValidationError correctly", () => {
      const error = new ValidationError({
        field: "test-field",
        message: "Test validation error",
        value: "invalid-value",
      });

      expect(error._tag).toBe("ValidationError");
      expect(error.field).toBe("test-field");
      expect(error.message).toBe("Test validation error");
      expect(error.value).toBe("invalid-value");
    });

    it("should create RateLimitError correctly", () => {
      const resetTime = new Date();
      const error = new RateLimitError({
        identifier: "test-user",
        limit: 100,
        windowMs: 60000,
        resetTime,
      });

      expect(error._tag).toBe("RateLimitError");
      expect(error.identifier).toBe("test-user");
      expect(error.limit).toBe(100);
      expect(error.windowMs).toBe(60000);
      expect(error.resetTime).toBe(resetTime);
    });

    it("should create ConfigurationError correctly", () => {
      const error = new ConfigurationError({
        key: "test-field",
        expected: "expected-value",
        received: "invalid-value",
      });

      expect(error._tag).toBe("ConfigurationError");
      expect(error.key).toBe("test-field");
      expect(error.expected).toBe("expected-value");
      expect(error.received).toBe("invalid-value");
    });

    it("should create AuthenticationError correctly", () => {
      const error = new AuthenticationError({
        message: "Invalid API key",
        providedKey: "test-key",
      });

      expect(error._tag).toBe("AuthenticationError");
      expect(error.message).toBe("Invalid API key");
      expect(error.providedKey).toBe("test-key");
    });

    it("should create AuthorizationError correctly", () => {
      const error = new AuthorizationError({
        message: "Insufficient permissions",
        userId: "user-123",
        requiredRole: "admin",
      });

      expect(error._tag).toBe("AuthorizationError");
      expect(error.message).toBe("Insufficient permissions");
      expect(error.userId).toBe("user-123");
      expect(error.requiredRole).toBe("admin");
    });

    it("should create PatternNotFoundError correctly", () => {
      const error = new PatternNotFoundError({
        patternId: "non-existent-pattern",
      });

      expect(error._tag).toBe("PatternNotFoundError");
      expect(error.patternId).toBe("non-existent-pattern");
    });

    it("should create PatternLoadError correctly", () => {
      const cause = new Error("File not found");
      const error = new PatternLoadError({
        filePath: "/path/to/pattern.json",
        cause,
      });

      expect(error._tag).toBe("PatternLoadError");
      expect(error.filePath).toBe("/path/to/pattern.json");
      expect(error.cause).toBe(cause);
    });

    it("should create PatternValidationError correctly", () => {
      const errors = [
        { field: "title", message: "Required", actual: undefined },
        { field: "category", message: "Invalid", actual: "invalid" },
      ];

      const error = new PatternValidationError({
        patternId: "test-pattern",
        errors,
      });

      expect(error._tag).toBe("PatternValidationError");
      expect(error.patternId).toBe("test-pattern");
      expect(error.errors).toEqual(errors);
    });

    it("should create RequestValidationError correctly", () => {
      const errors = [
        { field: "query", message: "Missing required parameter", actual: undefined }
      ];

      const error = new RequestValidationError({
        endpoint: "/api/patterns",
        errors,
      });

      expect(error._tag).toBe("RequestValidationError");
      expect(error.endpoint).toBe("/api/patterns");
      expect(error.errors).toEqual(errors);
    });

    it("should create ResponseError correctly", () => {
      const error = new ResponseError({
        statusCode: 500,
        message: "Internal server error",
      });

      expect(error._tag).toBe("ResponseError");
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("Internal server error");
    });

    it("should create TracingError correctly", () => {
      const error = new TracingError({
        operation: "trace-operation",
        cause: new Error("Tracing service unavailable"),
      });

      expect(error._tag).toBe("TracingError");
      expect(error.operation).toBe("trace-operation");
      expect(error.cause).toBeInstanceOf(Error);
    });

    it("should create CacheError correctly", () => {
      const error = new CacheError({
        operation: "get",
        key: "test-key",
        cause: new Error("Cache service unavailable"),
      });

      expect(error._tag).toBe("CacheError");
      expect(error.operation).toBe("get");
      expect(error.key).toBe("test-key");
      expect(error.cause).toBeInstanceOf(Error);
    });

    it("should create MetricsError correctly", () => {
      const error = new MetricsError({
        operation: "increment-counter",
        cause: new Error("Metrics service unavailable"),
      });

      expect(error._tag).toBe("MetricsError");
      expect(error.operation).toBe("increment-counter");
      expect(error.cause).toBeInstanceOf(Error);
    });

    it("should create ServerError correctly", () => {
      const error = new ServerError({
        message: "Database connection failed",
        cause: new Error("Connection timeout"),
      });

      expect(error._tag).toBe("ServerError");
      expect(error.message).toBe("Database connection failed");
      expect(error.cause).toBeInstanceOf(Error);
    });

    it("should create TimeoutError correctly", () => {
      const error = new TimeoutError({
        operation: "database-query",
        timeoutMs: 5000,
      });

      expect(error._tag).toBe("TimeoutError");
      expect(error.operation).toBe("database-query");
      expect(error.timeoutMs).toBe(5000);
    });
  });

  describe("Service Integration", () => {
    it("should compose multiple services together", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          // Get multiple services
          const config = yield* MCPConfigService;
          const logger = yield* MCPLoggerService;
          const metrics = yield* MCPMetricsService;
          const cache = yield* MCPCacheService;

          // Test basic functionality across services
          const port = yield* config.getPort();
          yield* logger
            .withOperation("integration.test")
            .info("Services composed successfully");
          yield* metrics.recordRequest("GET", "/api/integration", 200, 100);
          yield* cache.set("integration-test", "success");

          const cacheResult = yield* cache.get("integration-test");

          return {
            port,
            cacheHit: cacheResult.hit,
            cacheValue: cacheResult.value,
          };
        }).pipe(Effect.provide(TestFullLayer))
      );

      expect(result.port).toBe(3000);
      expect(result.cacheHit).toBe(true); // Cache should work in TestFullLayer
      expect(result.cacheValue).toBe("success");
    });
  });
});
