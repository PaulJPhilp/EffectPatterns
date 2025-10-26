/**
 * Configuration Service
 *
 * Provides environment-based configuration for the analyzer using Effect.Config.
 * Supports customization via environment variables with sensible defaults.
 */

import { Config, Context, Effect, Layer } from 'effect';
import { InvalidConfigurationError } from './errors.js';

const DEFAULT_CHUNK_SIZE = 50;
const MIN_CHUNK_SIZE = 1;
const MAX_CHUNK_SIZE = 500;

const DEFAULT_MODEL_NAME = 'gpt-4o';

const MIN_TEMPERATURE = 0;
const MAX_TEMPERATURE = 2;

const DEFAULT_REQUEST_TIMEOUT = 30_000;
const MIN_REQUEST_TIMEOUT = 1000;
const MAX_REQUEST_TIMEOUT = 300_000;

const DEFAULT_MAX_RETRIES = 3;
const MIN_MAX_RETRIES = 0;
const MAX_MAX_RETRIES = 10;

const DEFAULT_MIN_RELATIONSHIP_SCORE = 75;
const MIN_RELATIONSHIP_SCORE = 0;
const MAX_RELATIONSHIP_SCORE = 100;

// ============================================================================
// Configuration Schema
// ============================================================================

/**
 * Analyzer configuration settings
 */
export type AnalyzerConfig = {
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
};

// ============================================================================
// Service Definition
// ============================================================================

/**
 * Service for accessing analyzer configuration
 */
export class AnalyzerConfigService extends Context.Tag('AnalyzerConfigService')<
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
      const openaiApiKey = yield* Config.string('OPENAI_API_KEY').pipe(
        Effect.flatMap((key) =>
          key.trim().length > 0
            ? Effect.succeed(key)
            : Effect.fail(
                new InvalidConfigurationError({
                  key: 'OPENAI_API_KEY',
                  value: key,
                  reason:
                    'OpenAI API key is required. Set the OPENAI_API_KEY environment variable.',
                }),
              ),
        ),
      );

      const chunkSize = yield* Config.number('CHUNK_SIZE').pipe(
        Config.withDefault(DEFAULT_CHUNK_SIZE),
      );
      if (chunkSize < MIN_CHUNK_SIZE || chunkSize > MAX_CHUNK_SIZE) {
        return yield* Effect.fail(
          new InvalidConfigurationError({
            key: 'CHUNK_SIZE',
            value: chunkSize,
            reason: `Chunk size must be between ${MIN_CHUNK_SIZE} and ${MAX_CHUNK_SIZE}`,
          }),
        );
      }

      const modelName = yield* Config.string('MODEL_NAME').pipe(
        Config.withDefault(DEFAULT_MODEL_NAME),
      );

      const temperature = yield* Config.number('TEMPERATURE').pipe(
        Config.withDefault(MIN_TEMPERATURE),
      );
      if (temperature < MIN_TEMPERATURE || temperature > MAX_TEMPERATURE) {
        return yield* Effect.fail(
          new InvalidConfigurationError({
            key: 'TEMPERATURE',
            value: temperature,
            reason: `Temperature must be between ${MIN_TEMPERATURE} and ${MAX_TEMPERATURE}`,
          }),
        );
      }

      const requestTimeout = yield* Config.number('REQUEST_TIMEOUT').pipe(
        Config.withDefault(DEFAULT_REQUEST_TIMEOUT),
      );
      if (
        requestTimeout < MIN_REQUEST_TIMEOUT ||
        requestTimeout > MAX_REQUEST_TIMEOUT
      ) {
        return yield* Effect.fail(
          new InvalidConfigurationError({
            key: 'REQUEST_TIMEOUT',
            value: requestTimeout,
            reason: `Request timeout must be between ${MIN_REQUEST_TIMEOUT}ms and ${MAX_REQUEST_TIMEOUT}ms`,
          }),
        );
      }

      const maxRetries = yield* Config.number('MAX_RETRIES').pipe(
        Config.withDefault(DEFAULT_MAX_RETRIES),
      );
      if (maxRetries < MIN_MAX_RETRIES || maxRetries > MAX_MAX_RETRIES) {
        return yield* Effect.fail(
          new InvalidConfigurationError({
            key: 'MAX_RETRIES',
            value: maxRetries,
            reason: `Max retries must be between ${MIN_MAX_RETRIES} and ${MAX_MAX_RETRIES}`,
          }),
        );
      }

      const smartChunking = yield* Config.boolean('SMART_CHUNKING').pipe(
        Config.withDefault(true),
      );

      const minRelationshipScore = yield* Config.number(
        'MIN_RELATIONSHIP_SCORE',
      ).pipe(Config.withDefault(DEFAULT_MIN_RELATIONSHIP_SCORE));
      if (
        minRelationshipScore < MIN_RELATIONSHIP_SCORE ||
        minRelationshipScore > MAX_RELATIONSHIP_SCORE
      ) {
        return yield* Effect.fail(
          new InvalidConfigurationError({
            key: 'MIN_RELATIONSHIP_SCORE',
            value: minRelationshipScore,
            reason: `Relationship score must be between ${MIN_RELATIONSHIP_SCORE} and ${MAX_RELATIONSHIP_SCORE}`,
          }),
        );
      }

      const verboseLogging = yield* Config.boolean('VERBOSE_LOGGING').pipe(
        Config.withDefault(false),
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
      yield* Effect.logInfo('Analyzer configuration loaded:');
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
    }),
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
            openaiApiKey: 'test-key',
            chunkSize: DEFAULT_CHUNK_SIZE,
            modelName: DEFAULT_MODEL_NAME,
            temperature: MIN_TEMPERATURE,
            requestTimeout: DEFAULT_REQUEST_TIMEOUT,
            maxRetries: DEFAULT_MAX_RETRIES,
            smartChunking: true,
            minRelationshipScore: DEFAULT_MIN_RELATIONSHIP_SCORE,
            verboseLogging: false,
            ...overrides,
          }),
        getOpenAIKey: () =>
          Effect.succeed(overrides.openaiApiKey ?? 'test-key'),
        getChunkSize: () =>
          Effect.succeed(overrides.chunkSize ?? DEFAULT_CHUNK_SIZE),
        getModelName: () =>
          Effect.succeed(overrides.modelName ?? DEFAULT_MODEL_NAME),
        getTemperature: () =>
          Effect.succeed(overrides.temperature ?? MIN_TEMPERATURE),
        getRequestTimeout: () =>
          Effect.succeed(overrides.requestTimeout ?? DEFAULT_REQUEST_TIMEOUT),
        getMaxRetries: () =>
          Effect.succeed(overrides.maxRetries ?? DEFAULT_MAX_RETRIES),
        getSmartChunking: () => Effect.succeed(overrides.smartChunking ?? true),
        getMinRelationshipScore: () =>
          Effect.succeed(
            overrides.minRelationshipScore ?? DEFAULT_MIN_RELATIONSHIP_SCORE,
          ),
        getVerboseLogging: () =>
          Effect.succeed(overrides.verboseLogging ?? false),
      }),
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
