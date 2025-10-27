/**
 * Toolkit Configuration Service
 *
 * Type-safe configuration management for toolkit operations
 * including timeouts, limits, cache settings, and feature flags.
 */

import { Effect } from 'effect';
import { ConfigurationError } from '../errors.js';

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

    /** Enable caching feature */
    readonly enableCache: boolean;

    /** Enable detailed logging */
    readonly enableLogging: boolean;

    /** Enable metrics collection */
    readonly enableMetrics: boolean;
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
};

/**
 * Toolkit configuration service
 */
export class ToolkitConfig extends Effect.Service<ToolkitConfig>()('ToolkitConfig', {
    effect: Effect.gen(function* () {
        // Load configuration from environment with defaults
        const config: ToolkitConfigType = {
            maxSearchResults: parseInt(process.env.TOOLKIT_MAX_SEARCH_RESULTS || '') || DEFAULT_TOOLKIT_CONFIG.maxSearchResults,
            searchTimeoutMs: parseInt(process.env.TOOLKIT_SEARCH_TIMEOUT_MS || '') || DEFAULT_TOOLKIT_CONFIG.searchTimeoutMs,
            loadTimeoutMs: parseInt(process.env.TOOLKIT_LOAD_TIMEOUT_MS || '') || DEFAULT_TOOLKIT_CONFIG.loadTimeoutMs,
            cacheTtlMs: parseInt(process.env.TOOLKIT_CACHE_TTL_MS || '') || DEFAULT_TOOLKIT_CONFIG.cacheTtlMs,
            maxCacheSize: parseInt(process.env.TOOLKIT_MAX_CACHE_SIZE || '') || DEFAULT_TOOLKIT_CONFIG.maxCacheSize,
            enableCache: process.env.TOOLKIT_ENABLE_CACHE !== 'false', // Default true
            enableLogging: process.env.TOOLKIT_ENABLE_LOGGING === 'true', // Default false
            enableMetrics: process.env.TOOLKIT_ENABLE_METRICS === 'true', // Default false
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
        };
    })
}) { }

/**
 * Validate configuration values
 */
function validateConfig(config: ToolkitConfigType): Effect.Effect<void, ConfigurationError> {
    return Effect.gen(function* () {
        if (config.maxSearchResults <= 0) {
            yield* Effect.fail(new ConfigurationError({
                key: 'maxSearchResults',
                expected: 'positive number',
                received: config.maxSearchResults
            }));
        }

        if (config.searchTimeoutMs <= 0) {
            yield* Effect.fail(new ConfigurationError({
                key: 'searchTimeoutMs',
                expected: 'positive number',
                received: config.searchTimeoutMs
            }));
        }

        if (config.loadTimeoutMs <= 0) {
            yield* Effect.fail(new ConfigurationError({
                key: 'loadTimeoutMs',
                expected: 'positive number',
                received: config.loadTimeoutMs
            }));
        }

        if (config.cacheTtlMs <= 0) {
            yield* Effect.fail(new ConfigurationError({
                key: 'cacheTtlMs',
                expected: 'positive number',
                received: config.cacheTtlMs
            }));
        }

        if (config.maxCacheSize <= 0) {
            yield* Effect.fail(new ConfigurationError({
                key: 'maxCacheSize',
                expected: 'positive number',
                received: config.maxCacheSize
            }));
        }
    });
}

/**
 * Default configuration layer
 */
export const ToolkitConfigLive = ToolkitConfig.Default;