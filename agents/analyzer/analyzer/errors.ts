/**
 * Error Types for Discord Q&A Analyzer
 *
 * This module defines all tagged error types used throughout the analyzer.
 * Each error extends Data.TaggedError for type-safe error handling with Effect.
 */

import { Data } from 'effect';

const RETRY_DELAY_SECONDS_TO_MS = 1000;
const RETRY_DELAY_RATE_LIMIT_DEFAULT = 5000;
const RETRY_DELAY_TIMEOUT = 2000;
const RETRY_DELAY_FILE_IO = 1000;

// ============================================================================
// File System Errors
// ============================================================================

/**
 * Error thrown when an input file cannot be found
 */
export class FileNotFoundError extends Data.TaggedError('FileNotFoundError')<{
  readonly path: string;
  readonly cause?: unknown;
}> {}

/**
 * Error thrown when a file cannot be read
 */
export class FileReadError extends Data.TaggedError('FileReadError')<{
  readonly path: string;
  readonly cause: unknown;
}> {}

/**
 * Error thrown when a file cannot be written
 */
export class FileWriteError extends Data.TaggedError('FileWriteError')<{
  readonly path: string;
  readonly cause: unknown;
}> {}

// ============================================================================
// Data Validation Errors
// ============================================================================

/**
 * Error thrown when JSON parsing fails
 */
export class InvalidJSONError extends Data.TaggedError('InvalidJSONError')<{
  readonly path: string;
  readonly cause: unknown;
}> {}

/**
 * Error thrown when data fails schema validation
 */
export class SchemaValidationError extends Data.TaggedError(
  'SchemaValidationError',
)<{
  readonly errors: readonly string[];
  readonly path?: string;
}> {}

/**
 * Error thrown when insufficient data is provided
 */
export class InsufficientDataError extends Data.TaggedError(
  'InsufficientDataError',
)<{
  readonly count: number;
  readonly min: number;
  readonly message?: string;
}> {}

/**
 * Error thrown when data format is invalid
 */
export class InvalidDataFormatError extends Data.TaggedError(
  'InvalidDataFormatError',
)<{
  readonly expected: string;
  readonly received: string;
  readonly path?: string;
}> {}

// ============================================================================
// LLM Service Errors
// ============================================================================

/**
 * Generic LLM error (base error for LLM operations)
 */
export class LLMError extends Data.TaggedError('LLMError')<{
  readonly message?: string;
  readonly cause?: unknown;
}> {}

/**
 * Error thrown when LLM request times out
 */
export class LLMTimeoutError extends Data.TaggedError('LLMTimeoutError')<{
  readonly duration: number;
  readonly operation: string;
}> {}

/**
 * Error thrown when LLM rate limit is exceeded
 */
export class LLMRateLimitError extends Data.TaggedError('LLMRateLimitError')<{
  readonly retryAfter?: number;
  readonly message?: string;
}> {}

/**
 * Error thrown when LLM returns invalid response
 */
export class LLMInvalidResponseError extends Data.TaggedError(
  'LLMInvalidResponseError',
)<{
  readonly response: unknown;
  readonly expectedFormat: string;
}> {}

/**
 * Error thrown when LLM API authentication fails
 */
export class LLMAuthenticationError extends Data.TaggedError(
  'LLMAuthenticationError',
)<{
  readonly message: string;
}> {}

// ============================================================================
// Configuration Errors
// ============================================================================

/**
 * Error thrown when required configuration is missing
 */
export class ConfigurationError extends Data.TaggedError('ConfigurationError')<{
  readonly key: string;
  readonly message: string;
}> {}

/**
 * Error thrown when configuration value is invalid
 */
export class InvalidConfigurationError extends Data.TaggedError(
  'InvalidConfigurationError',
)<{
  readonly key: string;
  readonly value: unknown;
  readonly reason: string;
}> {}

// ============================================================================
// Chunking Errors
// ============================================================================

/**
 * Error thrown when chunking fails
 */
export class ChunkingError extends Data.TaggedError('ChunkingError')<{
  readonly reason: string;
  readonly messageCount: number;
}> {}

/**
 * Error thrown when chunk size is invalid
 */
export class InvalidChunkSizeError extends Data.TaggedError(
  'InvalidChunkSizeError',
)<{
  readonly size: number;
  readonly min: number;
  readonly max: number;
}> {}

// ============================================================================
// Analysis Errors
// ============================================================================

/**
 * Error thrown when analysis fails
 */
export class AnalysisError extends Data.TaggedError('AnalysisError')<{
  readonly stage: string;
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Error thrown when aggregation fails
 */
export class AggregationError extends Data.TaggedError('AggregationError')<{
  readonly analysisCount: number;
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ============================================================================
// Error Type Unions
// ============================================================================

/**
 * All file-related errors
 */
export type FileError = FileNotFoundError | FileReadError | FileWriteError;

/**
 * All validation-related errors
 */
export type ValidationError =
  | InvalidJSONError
  | SchemaValidationError
  | InsufficientDataError
  | InvalidDataFormatError;

/**
 * All LLM-related errors
 */
export type LLMServiceError =
  | LLMError
  | LLMTimeoutError
  | LLMRateLimitError
  | LLMInvalidResponseError
  | LLMAuthenticationError;

/**
 * All configuration-related errors
 */
export type ConfigError = ConfigurationError | InvalidConfigurationError;

/**
 * All chunking-related errors
 */
export type ChunkError = ChunkingError | InvalidChunkSizeError;

/**
 * All analysis-related errors
 */
export type AnalysisServiceError = AnalysisError | AggregationError;

/**
 * Union of all possible analyzer errors
 */
export type AnalyzerError =
  | FileError
  | ValidationError
  | LLMServiceError
  | ConfigError
  | ChunkError
  | AnalysisServiceError;

// ============================================================================
// Error Helper Functions
// ============================================================================

/**
 * Check if an error is retryable
 */
export const isRetryableError = (error: AnalyzerError): boolean => {
  switch (error._tag) {
    case 'LLMTimeoutError':
    case 'LLMRateLimitError':
    case 'FileReadError':
    case 'FileWriteError':
      return true;
    default:
      return false;
  }
};

/**
 * Get retry delay for retryable errors (in milliseconds)
 */
export const getRetryDelay = (error: AnalyzerError): number => {
  switch (error._tag) {
    case 'LLMRateLimitError':
      return error.retryAfter
        ? error.retryAfter * RETRY_DELAY_SECONDS_TO_MS
        : RETRY_DELAY_RATE_LIMIT_DEFAULT;
    case 'LLMTimeoutError':
      return RETRY_DELAY_TIMEOUT;
    case 'FileReadError':
    case 'FileWriteError':
      return RETRY_DELAY_FILE_IO;
    default:
      return 0;
  }
};

/**
 * Format error for user-friendly display
 */
export const formatError = (error: AnalyzerError): string => {
  switch (error._tag) {
    case 'FileNotFoundError':
      return `File not found: ${error.path}`;

    case 'FileReadError':
      return `Failed to read file: ${error.path}`;

    case 'FileWriteError':
      return `Failed to write file: ${error.path}`;

    case 'InvalidJSONError':
      return `Invalid JSON in file: ${error.path}`;

    case 'SchemaValidationError':
      return `Schema validation failed:\n${error.errors.join('\n')}`;

    case 'InsufficientDataError':
      return (
        error.message ||
        `Insufficient data: found ${error.count} messages, need at least ${error.min}`
      );

    case 'InvalidDataFormatError':
      return `Invalid data format: expected ${error.expected}, received ${error.received}`;

    case 'LLMError':
      return error.message || 'LLM operation failed';

    case 'LLMTimeoutError':
      return `LLM request timed out after ${error.duration}ms (operation: ${error.operation})`;

    case 'LLMRateLimitError':
      return (
        error.message ||
        `Rate limit exceeded${error.retryAfter ? `. Retry after ${error.retryAfter}s` : ''}`
      );

    case 'LLMInvalidResponseError':
      return `LLM returned invalid response. Expected: ${error.expectedFormat}`;

    case 'LLMAuthenticationError':
      return `LLM authentication failed: ${error.message}`;

    case 'ConfigurationError':
      return `Missing configuration: ${error.key} - ${error.message}`;

    case 'InvalidConfigurationError':
      return `Invalid configuration for ${error.key}: ${error.reason}`;

    case 'ChunkingError':
      return `Chunking failed: ${error.reason} (${error.messageCount} messages)`;

    case 'InvalidChunkSizeError':
      return `Invalid chunk size: ${error.size} (must be between ${error.min} and ${error.max})`;

    case 'AnalysisError':
      return `Analysis failed at stage "${error.stage}": ${error.message}`;

    case 'AggregationError':
      return `Failed to aggregate ${error.analysisCount} analyses: ${error.message}`;

    default:
      return 'Unknown error occurred';
  }
};
