/**
 * MCP Server Configuration Service
 *
 * Production-ready configuration management with environment variable support,
 * validation, and type-safe access to all server settings.
 */

import { Effect } from 'effect';
import * as path from 'node:path';
import { ConfigurationError } from '../errors.js';

/**
 * MCP Server configuration interface
 */
export interface MCPConfig {
    // API Configuration
    readonly apiKey: string;
    readonly nodeEnv: 'development' | 'production' | 'test';
    readonly port: number;

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
    readonly logLevel: 'debug' | 'info' | 'warn' | 'error';

    // Metrics
    readonly metricsEnabled: boolean;

    // Tracing
    readonly tracingEnabled: boolean;
    readonly otlpEndpoint: string;
    readonly otlpHeaders: Record<string, string>;
    readonly serviceName: string;
    readonly serviceVersion: string;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Omit<MCPConfig, 'apiKey' | 'nodeEnv'> = {
    port: 3000,
    patternsPath: path.join(process.cwd(), 'data', 'patterns.json'),
    patternsCacheTtlMs: 300000, // 5 minutes
    patternsLoadTimeoutMs: 10000, // 10 seconds
    requestTimeoutMs: 30000, // 30 seconds
    maxRequestBodySize: 1048576, // 1MB
    maxSearchResults: 50,
    rateLimitEnabled: true,
    rateLimitRequests: 100,
    rateLimitWindowMs: 60000, // 1 minute
    cacheEnabled: true,
    cacheDefaultTtlMs: 300000, // 5 minutes
    cacheMaxEntries: 1000,
    cacheCleanupIntervalMs: 300000, // 5 minutes
    loggingEnabled: true,
    logLevel: 'info',
    metricsEnabled: true,
    tracingEnabled: true,
    otlpEndpoint: 'http://localhost:4318/v1/traces',
    otlpHeaders: {},
    serviceName: 'effect-patterns-mcp-server',
    serviceVersion: '1.0.0',
};

/**
 * Parse OTLP headers from environment variable
 * Format: "key1=value1,key2=value2"
 */
function parseOtlpHeaders(headersString: string): Record<string, string> {
    if (!headersString?.trim()) {
        return {};
    }

    const headers: Record<string, string> = {};
    const pairs = headersString.split(',');

    for (const pair of pairs) {
        const [key, value] = pair.split('=').map((s) => s.trim());
        if (key && value) {
            headers[key] = value;
        }
    }

    return headers;
}

/**
 * Validate configuration values
 */
function validateConfig(config: MCPConfig): Effect.Effect<void, ConfigurationError> {
    return Effect.gen(function* () {
        // API Key validation
        if (!config.apiKey && config.nodeEnv === 'production') {
            yield* Effect.fail(
                new ConfigurationError({
                    key: 'apiKey',
                    expected: 'non-empty string in production',
                    received: config.apiKey,
                }),
            );
        }

        // Port validation
        if (config.port < 1 || config.port > 65535) {
            yield* Effect.fail(
                new ConfigurationError({
                    key: 'port',
                    expected: 'number between 1-65535',
                    received: config.port,
                }),
            );
        }

        // Timeout validations
        if (config.requestTimeoutMs < 1000) {
            yield* Effect.fail(
                new ConfigurationError({
                    key: 'requestTimeoutMs',
                    expected: 'at least 1000ms',
                    received: config.requestTimeoutMs,
                }),
            );
        }

        if (config.patternsLoadTimeoutMs < 1000) {
            yield* Effect.fail(
                new ConfigurationError({
                    key: 'patternsLoadTimeoutMs',
                    expected: 'at least 1000ms',
                    received: config.patternsLoadTimeoutMs,
                }),
            );
        }

        // Rate limit validations
        if (config.rateLimitRequests < 1) {
            yield* Effect.fail(
                new ConfigurationError({
                    key: 'rateLimitRequests',
                    expected: 'at least 1',
                    received: config.rateLimitRequests,
                }),
            );
        }

        if (config.rateLimitWindowMs < 1000) {
            yield* Effect.fail(
                new ConfigurationError({
                    key: 'rateLimitWindowMs',
                    expected: 'at least 1000ms',
                    received: config.rateLimitWindowMs,
                }),
            );
        }

        // Cache validations
        if (config.cacheMaxEntries < 1) {
            yield* Effect.fail(
                new ConfigurationError({
                    key: 'cacheMaxEntries',
                    expected: 'at least 1',
                    received: config.cacheMaxEntries,
                }),
            );
        }

        // Log level validation
        const validLogLevels = ['debug', 'info', 'warn', 'error'];
        if (!validLogLevels.includes(config.logLevel)) {
            yield* Effect.fail(
                new ConfigurationError({
                    key: 'logLevel',
                    expected: `one of: ${validLogLevels.join(', ')}`,
                    received: config.logLevel,
                }),
            );
        }
    });
}

/**
 * Load configuration from environment variables
 */
function loadConfig(): Effect.Effect<MCPConfig, ConfigurationError> {
    return Effect.gen(function* () {
        const config: MCPConfig = {
            // API Configuration
            apiKey: process.env.PATTERN_API_KEY || '',
            nodeEnv: (process.env.NODE_ENV as MCPConfig['nodeEnv']) || 'development',
            port: parseInt(process.env.PORT || '') || DEFAULT_CONFIG.port,

            // Pattern Configuration
            patternsPath:
                process.env.PATTERNS_PATH || DEFAULT_CONFIG.patternsPath,
            patternsCacheTtlMs:
                parseInt(process.env.PATTERNS_CACHE_TTL_MS || '') ||
                DEFAULT_CONFIG.patternsCacheTtlMs,
            patternsLoadTimeoutMs:
                parseInt(process.env.PATTERNS_LOAD_TIMEOUT_MS || '') ||
                DEFAULT_CONFIG.patternsLoadTimeoutMs,

            // Request/Response Configuration
            requestTimeoutMs:
                parseInt(process.env.REQUEST_TIMEOUT_MS || '') ||
                DEFAULT_CONFIG.requestTimeoutMs,
            maxRequestBodySize:
                parseInt(process.env.MAX_REQUEST_BODY_SIZE || '') ||
                DEFAULT_CONFIG.maxRequestBodySize,
            maxSearchResults:
                parseInt(process.env.MAX_SEARCH_RESULTS || '') ||
                DEFAULT_CONFIG.maxSearchResults,

            // Rate Limiting
            rateLimitEnabled:
                process.env.RATE_LIMIT_ENABLED !== 'false', // Default true
            rateLimitRequests:
                parseInt(process.env.RATE_LIMIT_REQUESTS || '') ||
                DEFAULT_CONFIG.rateLimitRequests,
            rateLimitWindowMs:
                parseInt(process.env.RATE_LIMIT_WINDOW_MS || '') ||
                DEFAULT_CONFIG.rateLimitWindowMs,

            // Caching
            cacheEnabled: process.env.CACHE_ENABLED !== 'false', // Default true
            cacheDefaultTtlMs:
                parseInt(process.env.CACHE_DEFAULT_TTL_MS || '') ||
                DEFAULT_CONFIG.cacheDefaultTtlMs,
            cacheMaxEntries:
                parseInt(process.env.CACHE_MAX_ENTRIES || '') ||
                DEFAULT_CONFIG.cacheMaxEntries,
            cacheCleanupIntervalMs:
                parseInt(process.env.CACHE_CLEANUP_INTERVAL_MS || '') ||
                DEFAULT_CONFIG.cacheCleanupIntervalMs,

            // Logging
            loggingEnabled: process.env.LOGGING_ENABLED !== 'false', // Default true
            logLevel:
                (process.env.LOG_LEVEL as MCPConfig['logLevel']) ||
                DEFAULT_CONFIG.logLevel,

            // Metrics
            metricsEnabled: process.env.METRICS_ENABLED !== 'false', // Default true

            // Tracing
            tracingEnabled: process.env.TRACING_ENABLED !== 'false', // Default true
            otlpEndpoint: process.env.OTLP_ENDPOINT || DEFAULT_CONFIG.otlpEndpoint,
            otlpHeaders: parseOtlpHeaders(process.env.OTLP_HEADERS || ''),
            serviceName: process.env.SERVICE_NAME || DEFAULT_CONFIG.serviceName,
            serviceVersion: process.env.SERVICE_VERSION || DEFAULT_CONFIG.serviceVersion,
        };

        // Validate configuration
        yield* validateConfig(config);

        return config;
    });
}

/**
 * MCP Server Configuration Service
 */
export class MCPConfigService extends Effect.Service<MCPConfigService>()('MCPConfigService', {
    effect: Effect.gen(function* () {
        const config = yield* loadConfig();

        return {
            // Configuration access
            getConfig: () => Effect.succeed(config),

            // API Configuration
            getApiKey: () => Effect.succeed(config.apiKey),
            getNodeEnv: () => Effect.succeed(config.nodeEnv),
            getPort: () => Effect.succeed(config.port),

            // Pattern Configuration
            getPatternsPath: () => Effect.succeed(config.patternsPath),
            getPatternsCacheTtlMs: () => Effect.succeed(config.patternsCacheTtlMs),
            getPatternsLoadTimeoutMs: () => Effect.succeed(config.patternsLoadTimeoutMs),

            // Request/Response Configuration
            getRequestTimeoutMs: () => Effect.succeed(config.requestTimeoutMs),
            getMaxRequestBodySize: () => Effect.succeed(config.maxRequestBodySize),
            getMaxSearchResults: () => Effect.succeed(config.maxSearchResults),

            // Rate Limiting
            isRateLimitEnabled: () => Effect.succeed(config.rateLimitEnabled),
            getRateLimitRequests: () => Effect.succeed(config.rateLimitRequests),
            getRateLimitWindowMs: () => Effect.succeed(config.rateLimitWindowMs),

            // Caching
            isCacheEnabled: () => Effect.succeed(config.cacheEnabled),
            getCacheDefaultTtlMs: () => Effect.succeed(config.cacheDefaultTtlMs),
            getCacheMaxEntries: () => Effect.succeed(config.cacheMaxEntries),
            getCacheCleanupIntervalMs: () => Effect.succeed(config.cacheCleanupIntervalMs),

            // Logging
            isLoggingEnabled: () => Effect.succeed(config.loggingEnabled),
            getLogLevel: () => Effect.succeed(config.logLevel),

            // Metrics
            isMetricsEnabled: () => Effect.succeed(config.metricsEnabled),

            // Tracing
            isTracingEnabled: () => Effect.succeed(config.tracingEnabled),
            getOtlpEndpoint: () => Effect.succeed(config.otlpEndpoint),
            getOtlpHeaders: () => Effect.succeed(config.otlpHeaders),
            getServiceName: () => Effect.succeed(config.serviceName),
            getServiceVersion: () => Effect.succeed(config.serviceVersion),
        };
    })
}) { }

/**
 * Default MCP configuration service layer
 */
export const MCPConfigServiceLive = MCPConfigService.Default;

/**
 * Legacy configuration access (for backward compatibility)
 */
export function getConfig(): Promise<MCPConfig> {
    return Effect.runPromise(loadConfig());
}