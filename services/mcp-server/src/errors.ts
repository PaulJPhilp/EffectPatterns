/**
 * MCP Server Error Types
 *
 * Tagged error types for type-safe error handling in the MCP server.
 * All errors extend Data.TaggedError for proper error classification.
 */

import { Data } from 'effect';

/**
 * Authentication errors
 */
export class AuthenticationError extends Data.TaggedError('AuthenticationError')<{
    readonly message: string;
    readonly providedKey?: string;
}> { }

/**
 * Authorization errors
 */
export class AuthorizationError extends Data.TaggedError('AuthorizationError')<{
    readonly message: string;
    readonly userId?: string;
    readonly requiredRole?: string;
}> { }

/**
 * Pattern-related errors
 */
export class PatternNotFoundError extends Data.TaggedError('PatternNotFoundError')<{
    readonly patternId: string;
}> { }

export class PatternLoadError extends Data.TaggedError('PatternLoadError')<{
    readonly filePath: string;
    readonly cause: unknown;
}> { }

export class PatternValidationError extends Data.TaggedError('PatternValidationError')<{
    readonly patternId?: string;
    readonly errors: Array<{
        field: string;
        message: string;
        actual?: unknown;
    }>;
}> { }

/**
 * Validation errors
 */
export class ValidationError extends Data.TaggedError('ValidationError')<{
    readonly field: string;
    readonly message: string;
    readonly value?: unknown;
}> { }
export class RequestValidationError extends Data.TaggedError('RequestValidationError')<{
    readonly endpoint: string;
    readonly errors: Array<{
        field: string;
        message: string;
        actual?: unknown;
    }>;
}> { }

export class ResponseError extends Data.TaggedError('ResponseError')<{
    readonly statusCode: number;
    readonly message: string;
    readonly cause?: unknown;
}> { }

/**
 * Configuration errors
 */
export class ConfigurationError extends Data.TaggedError('ConfigurationError')<{
    readonly key: string;
    readonly expected: string;
    readonly received: unknown;
}> { }

/**
 * Tracing/monitoring errors
 */
export class TracingError extends Data.TaggedError('TracingError')<{
    readonly operation: string;
    readonly cause: unknown;
}> { }

/**
 * Rate limiting errors
 */
export class RateLimitError extends Data.TaggedError('RateLimitError')<{
    readonly identifier: string;
    readonly limit: number;
    readonly windowMs: number;
    readonly resetTime: Date;
}> { }

/**
 * Cache errors
 */
export class CacheError extends Data.TaggedError('CacheError')<{
    readonly operation: string;
    readonly key?: string;
    readonly cause: unknown;
}> { }

/**
 * Metrics errors
 */
export class MetricsError extends Data.TaggedError('MetricsError')<{
    readonly operation: string;
    readonly cause: unknown;
}> { }

/**
 * General server errors
 */
export class ServerError extends Data.TaggedError('ServerError')<{
    readonly message: string;
    readonly cause?: unknown;
}> { }

export class TimeoutError extends Data.TaggedError('TimeoutError')<{
    readonly operation: string;
    readonly timeoutMs: number;
}> { }

/**
 * Legacy error compatibility
 * These functions help migrate from the old Error-based approach
 */
export function createAuthenticationError(
    message: string,
    providedKey?: string,
): AuthenticationError {
    return new AuthenticationError({ message, providedKey });
}

export function createPatternNotFoundError(patternId: string): PatternNotFoundError {
    return new PatternNotFoundError({ patternId });
}

export function createPatternLoadError(
    filePath: string,
    cause: unknown,
): PatternLoadError {
    return new PatternLoadError({ filePath, cause });
}

export function createRequestValidationError(
    endpoint: string,
    errors: Array<{ field: string; message: string; actual?: unknown }>,
): RequestValidationError {
    return new RequestValidationError({ endpoint, errors });
}

export function createConfigurationError(
    key: string,
    expected: string,
    received: unknown,
): ConfigurationError {
    return new ConfigurationError({ key, expected, received });
}