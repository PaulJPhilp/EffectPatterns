import { Effect } from "effect";
import { loadConfig } from "./helpers";

/**
 * MCP Server Configuration Service
 */
export class MCPConfigService extends Effect.Service<MCPConfigService>()(
  "MCPConfigService",
  {
    effect: Effect.gen(function* () {
      const config = yield* loadConfig();

      return {
        // Direct configuration access (pure values don't need Effect wrapping)
        config,

        // API Configuration
        apiKey: config.apiKey,
        nodeEnv: config.nodeEnv,
        port: config.port,
        tierMode: config.tierMode,

        // Pattern Configuration
        patternsPath: config.patternsPath,
        patternsCacheTtlMs: config.patternsCacheTtlMs,
        patternsLoadTimeoutMs: config.patternsLoadTimeoutMs,

        // Request/Response Configuration
        requestTimeoutMs: config.requestTimeoutMs,
        maxRequestBodySize: config.maxRequestBodySize,
        maxSearchResults: config.maxSearchResults,

        // Rate Limiting
        rateLimitEnabled: config.rateLimitEnabled,
        rateLimitRequests: config.rateLimitRequests,
        rateLimitWindowMs: config.rateLimitWindowMs,

        // Caching
        cacheEnabled: config.cacheEnabled,
        cacheDefaultTtlMs: config.cacheDefaultTtlMs,
        cacheMaxEntries: config.cacheMaxEntries,
        cacheCleanupIntervalMs: config.cacheCleanupIntervalMs,

        // Logging
        loggingEnabled: config.loggingEnabled,
        logLevel: config.logLevel,

        // Metrics
        metricsEnabled: config.metricsEnabled,

        // Tracing
        tracingEnabled: config.tracingEnabled,
        otlpEndpoint: config.otlpEndpoint,
        otlpHeaders: config.otlpHeaders,
        serviceName: config.serviceName,
        serviceVersion: config.serviceVersion,
        tracingSamplingRate: config.tracingSamplingRate,
      };
    }),
  }
) {}
