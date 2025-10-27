/**
 * MCP Server Validation Service
 *
 * Production-ready request validation with detailed error reporting,
 * schema validation, and security checks.
 */

import { Effect, Schema } from 'effect';
import { ValidationError } from '../errors.js';
import { MCPConfigService } from './config.js';
import { MCPLoggerService } from './logger.js';

/**
 * Validation result
 */
export interface ValidationResult<T> {
    readonly success: boolean;
    readonly data?: T;
    readonly errors?: readonly ValidationError[];
}

/**
 * Request validation schema
 */
export interface RequestValidation {
    readonly method: string;
    readonly path: string;
    readonly query?: Record<string, unknown>;
    readonly body?: unknown;
    readonly headers?: Record<string, string>;
}

/**
 * Pattern search validation schema
 */
export interface PatternSearchValidation {
    readonly query?: string;
    readonly skillLevel?: 'beginner' | 'intermediate' | 'advanced';
    readonly useCase?: readonly string[];
    readonly limit?: number;
    readonly offset?: number;
}

/**
 * Pattern retrieval validation schema
 */
export interface PatternRetrievalValidation {
    readonly id: string;
}

/**
 * MCP Server Validation Service
 */
export class MCPValidationService extends Effect.Service<MCPValidationService>()('MCPValidationService', {
    dependencies: [MCPConfigService.Default, MCPLoggerService.Default],
    effect: Effect.gen(function* () {
        const config = yield* MCPConfigService;
        const logger = yield* MCPLoggerService;

        /**
         * Validate pattern search request
         */
        const validatePatternSearch = (
            request: RequestValidation
        ): Effect.Effect<PatternSearchValidation, ValidationError> => {
            return Effect.gen(function* () {
                const startTime = Date.now();

                try {
                    // Extract query parameters
                    const query = typeof request.query?.query === 'string' ? request.query.query : undefined;
                    const skillLevel = request.query?.skillLevel;
                    const useCase = request.query?.useCase;
                    const limit = request.query?.limit;
                    const offset = request.query?.offset;

                    // Validate skill level
                    const validSkillLevels = ['beginner', 'intermediate', 'advanced'];
                    if (skillLevel !== undefined && !validSkillLevels.includes(skillLevel as string)) {
                        yield* Effect.fail(
                            new ValidationError({
                                field: 'skillLevel',
                                message: `Must be one of: ${validSkillLevels.join(', ')}`,
                                value: skillLevel,
                            })
                        );
                    }

                    // Validate use case
                    let validatedUseCase: readonly string[] | undefined;
                    if (useCase !== undefined) {
                        if (Array.isArray(useCase)) {
                            validatedUseCase = useCase.filter((uc): uc is string => typeof uc === 'string');
                        } else if (typeof useCase === 'string') {
                            validatedUseCase = [useCase];
                        } else {
                            yield* Effect.fail(
                                new ValidationError({
                                    field: 'useCase',
                                    message: 'Must be a string or array of strings',
                                    value: useCase,
                                })
                            );
                        }
                    }

                    // Validate limit
                    const maxResults = yield* config.getMaxSearchResults();
                    const validatedLimit = limit !== undefined ? parseInt(String(limit), 10) : undefined;
                    if (validatedLimit !== undefined && (isNaN(validatedLimit) || validatedLimit < 1 || validatedLimit > maxResults)) {
                        yield* Effect.fail(
                            new ValidationError({
                                field: 'limit',
                                message: `Must be between 1 and ${maxResults}`,
                                value: limit,
                            })
                        );
                    }

                    // Validate offset
                    const validatedOffset = offset !== undefined ? parseInt(String(offset), 10) : undefined;
                    if (validatedOffset !== undefined && (isNaN(validatedOffset) || validatedOffset < 0)) {
                        yield* Effect.fail(
                            new ValidationError({
                                field: 'offset',
                                message: 'Must be a non-negative integer',
                                value: offset,
                            })
                        );
                    }

                    // Validate query length
                    if (query !== undefined && query.length > 500) {
                        yield* Effect.fail(
                            new ValidationError({
                                field: 'query',
                                message: 'Query must be 500 characters or less',
                                value: query,
                            })
                        );
                    }

                    const result: PatternSearchValidation = {
                        query,
                        skillLevel: skillLevel as PatternSearchValidation['skillLevel'],
                        useCase: validatedUseCase,
                        limit: validatedLimit,
                        offset: validatedOffset,
                    };

                    yield* logger.withOperation('validation.patternSearch').debug(
                        'Pattern search validation successful',
                        { duration: Date.now() - startTime }
                    );

                    return result;

                } catch (error) {
                    yield* logger.withOperation('validation.patternSearch').error(
                        'Pattern search validation failed',
                        error,
                        { duration: Date.now() - startTime }
                    );
                    throw error;
                }
            });
        };

        /**
         * Validate pattern retrieval request
         */
        const validatePatternRetrieval = (
            request: RequestValidation
        ): Effect.Effect<PatternRetrievalValidation, ValidationError> => {
            return Effect.gen(function* () {
                const startTime = Date.now();

                try {
                    // Extract path parameters
                    const pathParts = request.path.split('/');
                    const id = pathParts[pathParts.length - 1];

                    if (!id || typeof id !== 'string') {
                        yield* Effect.fail(
                            new ValidationError({
                                field: 'id',
                                message: 'Pattern ID is required',
                                value: id,
                            })
                        );
                    }

                    // Validate ID format (kebab-case)
                    const idPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
                    if (!idPattern.test(id)) {
                        yield* Effect.fail(
                            new ValidationError({
                                field: 'id',
                                message: 'Pattern ID must be in kebab-case format',
                                value: id,
                            })
                        );
                    }

                    // Validate ID length
                    if (id.length < 3 || id.length > 100) {
                        yield* Effect.fail(
                            new ValidationError({
                                field: 'id',
                                message: 'Pattern ID must be between 3 and 100 characters',
                                value: id,
                            })
                        );
                    }

                    const result: PatternRetrievalValidation = { id };

                    yield* logger.withOperation('validation.patternRetrieval').debug(
                        'Pattern retrieval validation successful',
                        { patternId: id, duration: Date.now() - startTime }
                    );

                    return result;

                } catch (error) {
                    yield* logger.withOperation('validation.patternRetrieval').error(
                        'Pattern retrieval validation failed',
                        error,
                        { duration: Date.now() - startTime }
                    );
                    throw error;
                }
            });
        };

        /**
         * Validate API key
         */
        const validateApiKey = (
            apiKey: string | undefined
        ): Effect.Effect<string, ValidationError> => {
            return Effect.gen(function* () {
                const startTime = Date.now();

                try {
                    const expectedApiKey = yield* config.getApiKey();

                    if (!apiKey || apiKey.trim().length === 0) {
                        yield* Effect.fail(
                            new ValidationError({
                                field: 'x-api-key',
                                message: 'API key is required',
                            })
                        );
                    }

                    if (apiKey !== expectedApiKey) {
                        yield* Effect.fail(
                            new ValidationError({
                                field: 'x-api-key',
                                message: 'Invalid API key',
                            })
                        );
                    }

                    yield* logger.withOperation('validation.apiKey').debug(
                        'API key validation successful',
                        { duration: Date.now() - startTime }
                    );

                    // Return the validated API key (guaranteed to be a non-empty string at this point)
                    return apiKey as string;

                } catch (error) {
                    yield* logger.withOperation('validation.apiKey').error(
                        'API key validation failed',
                        error,
                        { duration: Date.now() - startTime }
                    );
                    throw error;
                }
            });
        };

        /**
         * Validate request body size
         */
        const validateRequestBodySize = (
            body: unknown,
            headers: Record<string, string> = {}
        ): Effect.Effect<void, ValidationError> => {
            return Effect.gen(function* () {
                const startTime = Date.now();

                try {
                    const maxSize = yield* config.getMaxRequestBodySize();
                    const contentLength = headers['content-length'];

                    if (contentLength) {
                        const size = parseInt(contentLength, 10);
                        if (isNaN(size)) {
                            yield* Effect.fail(
                                new ValidationError({
                                    field: 'content-length',
                                    message: 'Invalid content-length header',
                                    value: contentLength,
                                })
                            );
                        }

                        if (size > maxSize) {
                            yield* Effect.fail(
                                new ValidationError({
                                    field: 'content-length',
                                    message: `Request body too large. Maximum size: ${maxSize} bytes`,
                                    value: size,
                                })
                            );
                        }
                    }

                    // Also check actual body size if available
                    if (body !== undefined) {
                        const bodySize = JSON.stringify(body).length;
                        if (bodySize > maxSize) {
                            yield* Effect.fail(
                                new ValidationError({
                                    field: 'body',
                                    message: `Request body too large. Maximum size: ${maxSize} bytes`,
                                    value: bodySize,
                                })
                            );
                        }
                    }

                    yield* logger.withOperation('validation.bodySize').debug(
                        'Request body size validation successful',
                        { duration: Date.now() - startTime }
                    );

                } catch (error) {
                    yield* logger.withOperation('validation.bodySize').error(
                        'Request body size validation failed',
                        error,
                        { duration: Date.now() - startTime }
                    );
                    throw error;
                }
            });
        };

        /**
         * Validate request headers
         */
        const validateRequestHeaders = (
            headers: Record<string, string>
        ): Effect.Effect<void, ValidationError> => {
            return Effect.gen(function* () {
                const startTime = Date.now();

                try {
                    // Validate content-type for POST/PUT requests
                    const contentType = headers['content-type'];
                    if (contentType && !contentType.includes('application/json')) {
                        yield* Effect.fail(
                            new ValidationError({
                                field: 'content-type',
                                message: 'Content-Type must be application/json',
                                value: contentType,
                            })
                        );
                    }

                    // Validate user-agent
                    const userAgent = headers['user-agent'];
                    if (!userAgent || userAgent.trim().length === 0) {
                        yield* Effect.fail(
                            new ValidationError({
                                field: 'user-agent',
                                message: 'User-Agent header is required',
                            })
                        );
                    }

                    yield* logger.withOperation('validation.headers').debug(
                        'Request headers validation successful',
                        { duration: Date.now() - startTime }
                    );

                } catch (error) {
                    yield* logger.withOperation('validation.headers').error(
                        'Request headers validation failed',
                        error,
                        { duration: Date.now() - startTime }
                    );
                    throw error;
                }
            });
        };

        /**
         * Generic schema validation
         */
        const validateSchema = <A>(
            schema: Schema.Schema<unknown, A>,
            input: unknown,
            context: string = 'unknown'
        ): Effect.Effect<A, ValidationError> => {
            return Effect.gen(function* () {
                const startTime = Date.now();

                try {
                    const result = yield* Schema.decodeUnknown(schema)(input).pipe(
                        Effect.mapError((parseError) => {
                            return new ValidationError({
                                field: context,
                                message: `Schema validation failed: ${parseError.message}`,
                                value: input,
                            });
                        })
                    ) as Effect.Effect<A, ValidationError>;

                    yield* logger.withOperation('validation.schema').debug(
                        `Schema validation successful for ${context}`,
                        { duration: Date.now() - startTime }
                    );

                    return result;

                } catch (error) {
                    yield* logger.withOperation('validation.schema').error(
                        `Schema validation failed for ${context}`,
                        error,
                        { duration: Date.now() - startTime }
                    );
                    throw error;
                }
            });
        };

        /**
         * Validate complete request
         */
        const validateRequest = (
            request: RequestValidation,
            requireApiKey: boolean = true
        ): Effect.Effect<PatternSearchValidation | PatternRetrievalValidation, ValidationError> => {
            return Effect.gen(function* () {
                const startTime = Date.now();

                try {
                    // Validate API key if required
                    if (requireApiKey) {
                        const apiKey = request.headers?.['x-api-key'];
                        yield* validateApiKey(apiKey);
                    }

                    // Validate headers
                    yield* validateRequestHeaders(request.headers || {});

                    // Validate body size
                    yield* validateRequestBodySize(request.body, request.headers);

                    // Route-specific validation
                    if (request.path.includes('/search')) {
                        const result = yield* validatePatternSearch(request);
                        yield* logger.withOperation('validation.request').debug(
                            'Request validation successful for search',
                            { path: request.path, duration: Date.now() - startTime }
                        );
                        return result;
                    } else if (request.path.includes('/patterns/')) {
                        const result = yield* validatePatternRetrieval(request);
                        yield* logger.withOperation('validation.request').debug(
                            'Request validation successful for pattern retrieval',
                            { path: request.path, duration: Date.now() - startTime }
                        );
                        return result;
                    } else {
                        yield* Effect.fail(
                            new ValidationError({
                                field: 'path',
                                message: 'Invalid request path',
                                value: request.path,
                            })
                        );
                        // This line will never be reached due to Effect.fail above
                        throw new Error('Unreachable');
                    }

                } catch (error) {
                    yield* logger.withOperation('validation.request').error(
                        'Request validation failed',
                        error,
                        { path: request.path, duration: Date.now() - startTime }
                    );
                    throw error;
                }
            });
        };

        return {
            // Request validation
            validateRequest,
            validatePatternSearch,
            validatePatternRetrieval,

            // Component validation
            validateApiKey,
            validateRequestBodySize,
            validateRequestHeaders,

            // Generic validation
            validateSchema,
        };
    })
}) { }

/**
 * Default MCP validation service layer
 */
export const MCPValidationServiceLive = MCPValidationService.Default;

/**
 * Legacy validation functions (for backward compatibility)
 */
export function validatePatternId(id: string): boolean {
    const idPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    return idPattern.test(id) && id.length >= 3 && id.length <= 100;
}

export function validateSkillLevel(level: string): level is 'beginner' | 'intermediate' | 'advanced' {
    return ['beginner', 'intermediate', 'advanced'].includes(level);
}