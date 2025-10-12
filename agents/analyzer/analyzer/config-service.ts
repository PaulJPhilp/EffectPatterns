/**
 * Configuration Service
 *
 * Provides environment-based configuration for the analyzer using Effect.Config.
 * Supports customization via environment variables with sensible defaults.
 */

import { Config, Context, Effect, Layer, Either } from "effect";
import { ConfigurationError, InvalidConfigurationError } from "./errors.js";

// ============================================================================
// Configuration Schema
// ============================================================================

/**
 * Analyzer configuration settings
 */
export interface AnalyzerConfig {
    /** OpenAI API key for LLM requests */
    readonly openaiApiKey: string;

    /** Target chunk size for message grouping */
    readonly chunkSize: number;

    /** OpenAI model name to use */
    readonly modelName: string;

    /** Temperature for LLM responses (0-2, lower = more deterministic) */
    readonly temperature: number;

    /** Request timeout in milliseconds */
    readonly requestTimeout: number;

    /** Maximum retry attempts for failed requests */
    readonly maxRetries: number;

    /** Enable smart chunking (keeps Q&A pairs together) */
    readonly smartChunking: boolean;

    /** Minimum relationship score for smart chunking (0-100) */
    readonly minRelationshipScore: number;

    /** Enable verbose logging */
    readonly verboseLogging: boolean;
}

// ============================================================================
// Service Definition
// ============================================================================

/**
 * Service for accessing analyzer configuration
 */
export class AnalyzerConfigService extends Context.Tag(
    "AnalyzerConfigService"
)<
    AnalyzerConfigService,
    {
        /** Get the complete configuration */
        readonly getConfig: () => Effect.Effect<AnalyzerConfig, never>;

        /** Get OpenAI API key */
        readonly getOpenAIKey: () => Effect.Effect<string, never>;

        /** Get chunk size */
        readonly getChunkSize: () => Effect.Effect<number, never>;

        /** Get model name */
        readonly getModelName: () => Effect.Effect<string, never>;

        /** Get temperature */
        readonly getTemperature: () => Effect.Effect<number, never>;

        /** Get request timeout */
        readonly getRequestTimeout: () => Effect.Effect<number, never>;

        /** Get max retries */
        readonly getMaxRetries: () => Effect.Effect<number, never>;

        /** Check if smart chunking is enabled */
        readonly getSmartChunking: () => Effect.Effect<boolean, never>;

        /** Get minimum relationship score */
        readonly getMinRelationshipScore: () => Effect.Effect<number, never>;

        /** Check if verbose logging is enabled */
        readonly getVerboseLogging: () => Effect.Effect<boolean, never>;
    }
>() {
    /**
     * Live implementation that loads configuration from environment variables
     */
    static readonly Live = Layer.effect(
        AnalyzerConfigService,
        Effect.gen(function* () {
            // Load configuration from environment with defaults
            const openaiApiKey = yield* Config.string("OPENAI_API_KEY").pipe(
                Effect.flatMap((key) =>
                    key.trim().length > 0
                        ? Effect.succeed(key)
                        : Effect.fail(
                            new InvalidConfigurationError({
                                key: "OPENAI_API_KEY",
                                value: key,
                                reason: "OpenAI API key is required. Set the OPENAI_API_KEY environment variable.",
                            })
                        )
                )
            );

            const chunkSize = yield* Config.number("CHUNK_SIZE")
                .pipe(Config.withDefault(50))
                .pipe(
                    Config.mapOrFail((size) =>
                        size >= 1 && size <= 500
                            ? Either.right(size)
                            : Either.left(
                                new InvalidConfigurationError({
                                    key: "CHUNK_SIZE",
                                    value: size,
                                    reason: "Chunk size must be between 1 and 500",
                                })
                            )
                    )
                );

            const modelName = yield* Config.string("MODEL_NAME").pipe(
                Config.withDefault("gpt-4o")
            );

            const temperature = yield* Config.number("TEMPERATURE")
                .pipe(Config.withDefault(0))
                .pipe(
                    Config.mapOrFail((temp) =>
                        temp >= 0 && temp <= 2
                            ? Effect.succeed(temp)
                            : Effect.fail(
                                new InvalidConfigurationError({
                                    key: "TEMPERATURE",
                                    value: temp,
                                    reason: "Temperature must be between 0 and 2",
                                })
                            )
                    )
                );

            const requestTimeout = yield* Config.number("REQUEST_TIMEOUT")
                .pipe(Config.withDefault(30000))
                .pipe(
                    Config.mapOrFail((timeout) =>
                        timeout >= 1000 && timeout <= 300000
                            ? Effect.succeed(timeout)
                            : Effect.fail(
                                new InvalidConfigurationError({
                                    key: "REQUEST_TIMEOUT",
                                    value: timeout,
                                    reason: "Request timeout must be between 1000ms and 300000ms",
                                })
                            )
                    )
                );

            const maxRetries = yield* Config.number("MAX_RETRIES")
                .pipe(Config.withDefault(3))
                .pipe(
                    Config.mapOrFail((retries) =>
                        retries >= 0 && retries <= 10
                            ? Effect.succeed(retries)
                            : Effect.fail(
                                new InvalidConfigurationError({
                                    key: "MAX_RETRIES",
                                    value: retries,
                                    reason: "Max retries must be between 0 and 10",
                                })
                            )
                    )
                );

            const smartChunking = yield* Config.boolean("SMART_CHUNKING").pipe(
                Config.withDefault(true)
            );

            const minRelationshipScore = yield* Config.number(
                "MIN_RELATIONSHIP_SCORE"
            )
                .pipe(Config.withDefault(75))
                .pipe(
                    Config.mapOrFail((score) =>
                        score >= 0 && score <= 100
                            ? Effect.succeed(score)
                            : Effect.fail(
                                new InvalidConfigurationError({
                                    key: "MIN_RELATIONSHIP_SCORE",
                                    value: score,
                                    reason: "Relationship score must be between 0 and 100",
                                })
                            )
                    )
                );

            const verboseLogging = yield* Config.boolean("VERBOSE_LOGGING").pipe(
                Config.withDefault(false)
            );

            // Create the configuration object
            const config: AnalyzerConfig = {
                openaiApiKey,
                chunkSize,
                modelName,
                temperature,
                requestTimeout,
                maxRetries,
                smartChunking,
                minRelationshipScore,
                verboseLogging,
            };

            // Log configuration (excluding sensitive data)
            yield* Effect.logInfo("Analyzer configuration loaded:");
            yield* Effect.logInfo(`  Model: ${config.modelName}`);
            yield* Effect.logInfo(`  Temperature: ${config.temperature}`);
            yield* Effect.logInfo(`  Chunk Size: ${config.chunkSize}`);
            yield* Effect.logInfo(`  Smart Chunking: ${config.smartChunking}`);
            yield* Effect.logInfo(`  Request Timeout: ${config.requestTimeout}ms`);
            yield* Effect.logInfo(`  Max Retries: ${config.maxRetries}`);
            yield* Effect.logInfo(`  Verbose Logging: ${config.verboseLogging}`);

            // Return service implementation
            return AnalyzerConfigService.of({
                getConfig: () => Effect.succeed(config),
                getOpenAIKey: () => Effect.succeed(config.openaiApiKey),
                getChunkSize: () => Effect.succeed(config.chunkSize),
                getModelName: () => Effect.succeed(config.modelName),
                getTemperature: () => Effect.succeed(config.temperature),
                getRequestTimeout: () => Effect.succeed(config.requestTimeout),
                getMaxRetries: () => Effect.succeed(config.maxRetries),
                getSmartChunking: () => Effect.succeed(config.smartChunking),
                getMinRelationshipScore: () =>
                    Effect.succeed(config.minRelationshipScore),
                getVerboseLogging: () => Effect.succeed(config.verboseLogging),
            });
        })
    );

    /**
     * Test implementation with mock configuration
     * Useful for testing without environment variables
     */
    static readonly Test = (overrides: Partial<AnalyzerConfig> = {}) =>
        Layer.succeed(
            AnalyzerConfigService,
            AnalyzerConfigService.of({
                getConfig: () =>
                    Effect.succeed({
                        openaiApiKey: "test-key",
                        chunkSize: 50,
                        modelName: "gpt-4o",
                        temperature: 0,
                        requestTimeout: 30000,
                        maxRetries: 3,
                        smartChunking: true,
                        minRelationshipScore: 75,
                        verboseLogging: false,
                        ...overrides,
                    }),
                getOpenAIKey: () =>
                    Effect.succeed(overrides.openaiApiKey || "test-key"),
                getChunkSize: () => Effect.succeed(overrides.chunkSize || 50),
                getModelName: () => Effect.succeed(overrides.modelName || "gpt-4o"),
                getTemperature: () => Effect.succeed(overrides.temperature || 0),
                getRequestTimeout: () =>
                    Effect.succeed(overrides.requestTimeout || 30000),
                getMaxRetries: () => Effect.succeed(overrides.maxRetries || 3),
                getSmartChunking: () => Effect.succeed(overrides.smartChunking ?? true),
                getMinRelationshipScore: () =>
                    Effect.succeed(overrides.minRelationshipScore || 75),
                getVerboseLogging: () =>
                    Effect.succeed(overrides.verboseLogging ?? false),
            })
        );
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Get the complete configuration
 */
export const getConfig = () =>
    Effect.gen(function* () {
        const service = yield* AnalyzerConfigService;
        return yield* service.getConfig();
    });

/**
 * Get a specific configuration value
 */
export const getConfigValue = <K extends keyof AnalyzerConfig>(key: K) =>
    Effect.gen(function* () {
        const config = yield* getConfig();
        return config[key];
    });
