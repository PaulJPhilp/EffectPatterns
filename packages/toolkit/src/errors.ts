/**
 * Toolkit Error Types
 *
 * Tagged error types for all toolkit operations with proper error
 * classification and context.
 */

import { Data } from 'effect';

/**
 * Base error for pattern loading operations
 */
export class PatternLoadError extends Data.TaggedError('PatternLoadError')<{
    readonly path: string;
    readonly cause: unknown;
}> { }

/**
 * Error for pattern validation failures
 */
export class PatternValidationError extends Data.TaggedError('PatternValidationError')<{
    readonly patternId?: string;
    readonly field: string;
    readonly message: string;
    readonly value?: unknown;
}> { }

/**
 * Error for search operation failures
 */
export class SearchError extends Data.TaggedError('SearchError')<{
    readonly query?: string;
    readonly cause: unknown;
}> { }

/**
 * Error for template generation failures
 */
export class TemplateError extends Data.TaggedError('TemplateError')<{
    readonly patternId: string;
    readonly operation: string;
    readonly cause: unknown;
}> { }

/**
 * Error for configuration validation failures
 */
export class ConfigurationError extends Data.TaggedError('ConfigurationError')<{
    readonly key: string;
    readonly expected: string;
    readonly received: unknown;
}> { }

/**
 * Error for cache operation failures
 */
export class CacheError extends Data.TaggedError('CacheError')<{
    readonly operation: string;
    readonly key: string;
    readonly cause: unknown;
}> { }

/**
 * Error for pattern not found scenarios
 */
export class PatternNotFoundError extends Data.TaggedError('PatternNotFoundError')<{
    readonly patternId: string;
}> { }

/**
 * Error for service unavailability
 */
export class ServiceUnavailableError extends Data.TaggedError('ServiceUnavailableError')<{
    readonly service: string;
    readonly reason: string;
}> { }