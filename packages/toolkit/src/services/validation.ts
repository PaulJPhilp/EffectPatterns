/**
 * Production-Ready Validation Service
 *
 * Effect-based validation with schema validation, detailed error reporting,
 * and proper error handling for runtime data validation.
 */

import { ParseResult, Schema } from '@effect/schema';
import { Data, Effect } from 'effect';
import { ToolkitConfig } from './config.js';
import { ToolkitLogger } from './logger.js';

/**
 * Validation result
 */
export interface ValidationResult<T> {
    /** Whether validation succeeded */
    success: boolean;
    /** Validated data (only present if success is true) */
    data?: T;
    /** Validation errors (only present if success is false) */
    errors?: ValidationError[];
}

/**
 * Validation error details
 */
export interface ValidationError {
    /** Path to the field that failed validation */
    path: string[];
    /** Human-readable error message */
    message: string;
    /** Actual value that failed validation */
    actual?: unknown;
    /** Expected value or type */
    expected?: string;
}

/**
 * Validation operation errors
 */
export class ValidationServiceError extends Data.TaggedError('ValidationServiceError')<{
    operation: string;
    schema?: string;
    cause?: unknown;
}> { }

export class SchemaValidationError extends Data.TaggedError('SchemaValidationError')<{
    errors: ValidationError[];
    input?: unknown;
}> { }

/**
 * Validation service with production features
 */
export class ValidationService extends Effect.Service<ValidationService>()('ValidationService', {
    effect: Effect.gen(function* () {
        const config = yield* ToolkitConfig;
        const logger = yield* ToolkitLogger;

        const isLoggingEnabled = yield* config.isLoggingEnabled();
        // Use a sensible default timeout for validation operations
        const validationTimeoutMs = 5000; // 5 seconds

        /**
         * Convert Effect Schema errors to our ValidationError format
         */
        const convertSchemaErrors = (errors: any[]): ValidationError[] => {
            return errors.map(error => ({
                path: Array.isArray(error.path) ? error.path : [],
                message: error.message || 'Validation error',
                actual: error.actual
            }));
        };        /**
         * Validate data against a schema with timeout and error handling
         */
        const validate = <I, A>(schema: Schema.Schema<I, A>, input: unknown, schemaName?: string) =>
            Effect.gen(function* () {
                const startTime = Date.now();
                const operationLogger = logger.withOperation('validate');

                if (isLoggingEnabled) {
                    yield* operationLogger.debug('Starting schema validation', {
                        schemaName,
                        inputType: typeof input
                    });
                }

                const validationEffect = Effect.gen(function* () {
                    try {
                        const result = yield* Schema.decodeUnknown(schema)(input);
                        return { success: true as const, data: result };
                    } catch (error: unknown) {
                        if (error instanceof ParseResult.ParseError) {
                            // ParseError has an issue property, not errors
                            const validationErrors: ValidationError[] = [{
                                path: [],
                                message: error.message || 'Schema validation failed'
                            }];
                            return {
                                success: false as const,
                                errors: validationErrors
                            };
                        }
                        throw error;
                    }
                });

                // Apply timeout to validation
                const result = yield* validationEffect.pipe(
                    Effect.timeout(validationTimeoutMs),
                    Effect.catchTag('TimeoutException', () =>
                        Effect.fail(new ValidationServiceError({
                            operation: 'validate',
                            schema: schemaName,
                            cause: new Error(`Validation timeout after ${validationTimeoutMs}ms`)
                        }))
                    ),
                    Effect.catchAll(error =>
                        Effect.fail(new ValidationServiceError({
                            operation: 'validate',
                            schema: schemaName,
                            cause: error
                        }))
                    )
                );

                if (isLoggingEnabled) {
                    yield* logger.withDuration(startTime, 'validate')
                        .debug('Schema validation completed', {
                            schemaName,
                            success: result.success,
                            errorCount: result.success ? 0 : result.errors?.length
                        });
                }

                return result;
            });

        /**
         * Validate data and throw on failure
         */
        const validateOrFail = <I, A>(schema: Schema.Schema<I, A>, input: unknown, schemaName?: string) =>
            Effect.gen(function* () {
                const result = yield* validate(schema, input, schemaName);

                if (!result.success) {
                    yield* Effect.fail(new SchemaValidationError({
                        errors: result.errors!,
                        input
                    }));
                }

                return result.data!;
            });

        /**
         * Validate multiple items against a schema
         */
        const validateMany = <I, A>(schema: Schema.Schema<I, A>, inputs: unknown[], schemaName?: string) =>
            Effect.gen(function* () {
                const operationLogger = logger.withOperation('validateMany');

                if (isLoggingEnabled) {
                    yield* operationLogger.debug('Starting batch validation', {
                        schemaName,
                        itemCount: inputs.length
                    });
                }

                const results = yield* Effect.forEach(inputs, (input, index) =>
                    validate(schema, input, `${schemaName}[${index}]`)
                );

                const successful = results.filter(r => r.success);
                const failed = results.filter(r => !r.success);

                if (isLoggingEnabled) {
                    yield* operationLogger.debug('Batch validation completed', {
                        schemaName,
                        successfulCount: successful.length,
                        failedCount: failed.length
                    });
                }

                return {
                    successful: successful.map(r => r.data!),
                    failed: failed.map(r => r.errors!),
                    results
                };
            });

        /**
         * Create a validation function for a specific schema
         */
        const createValidator = <I, A>(schema: Schema.Schema<I, A>, schemaName?: string) => ({
            validate: (input: unknown) => validate(schema, input, schemaName),
            validateOrFail: (input: unknown) => validateOrFail(schema, input, schemaName),
            schema,
            schemaName
        });

        /**
         * Validate string input with common string validations
         */
        const validateString = (input: unknown, options?: {
            minLength?: number;
            maxLength?: number;
            pattern?: RegExp;
            required?: boolean;
        }) =>
            Effect.gen(function* () {
                const operationLogger = logger.withOperation('validateString');

                if (isLoggingEnabled) {
                    yield* operationLogger.debug('Validating string', { options });
                }

                // Basic type check
                if (typeof input !== 'string') {
                    return {
                        success: false,
                        errors: [{
                            path: [],
                            message: 'Expected string',
                            actual: input,
                            expected: 'string'
                        }]
                    } satisfies ValidationResult<string>;
                }

                const errors: ValidationError[] = [];

                // Required check
                if (options?.required && input.trim().length === 0) {
                    errors.push({
                        path: [],
                        message: 'String is required',
                        actual: input,
                        expected: 'non-empty string'
                    });
                }

                // Length checks
                if (options?.minLength && input.length < options.minLength) {
                    errors.push({
                        path: [],
                        message: `String must be at least ${options.minLength} characters`,
                        actual: input.length,
                        expected: `>= ${options.minLength}`
                    });
                }

                if (options?.maxLength && input.length > options.maxLength) {
                    errors.push({
                        path: [],
                        message: `String must be at most ${options.maxLength} characters`,
                        actual: input.length,
                        expected: `<= ${options.maxLength}`
                    });
                }

                // Pattern check
                if (options?.pattern && !options.pattern.test(input)) {
                    errors.push({
                        path: [],
                        message: `String does not match required pattern`,
                        actual: input,
                        expected: options.pattern.toString()
                    });
                }

                if (errors.length > 0) {
                    return { success: false, errors };
                }

                return { success: true, data: input };
            });

        /**
         * Validate number input with common number validations
         */
        const validateNumber = (input: unknown, options?: {
            min?: number;
            max?: number;
            integer?: boolean;
            required?: boolean;
        }) =>
            Effect.gen(function* () {
                const operationLogger = logger.withOperation('validateNumber');

                if (isLoggingEnabled) {
                    yield* operationLogger.debug('Validating number', { options });
                }

                // Basic type check
                if (typeof input !== 'number' || isNaN(input)) {
                    return {
                        success: false,
                        errors: [{
                            path: [],
                            message: 'Expected valid number',
                            actual: input,
                            expected: 'number'
                        }]
                    } satisfies ValidationResult<number>;
                }

                const errors: ValidationError[] = [];

                // Required check (for numbers, this might mean not NaN)
                if (options?.required && (input === null || input === undefined)) {
                    errors.push({
                        path: [],
                        message: 'Number is required',
                        actual: input,
                        expected: 'number'
                    });
                }

                // Range checks
                if (options?.min !== undefined && input < options.min) {
                    errors.push({
                        path: [],
                        message: `Number must be at least ${options.min}`,
                        actual: input,
                        expected: `>= ${options.min}`
                    });
                }

                if (options?.max !== undefined && input > options.max) {
                    errors.push({
                        path: [],
                        message: `Number must be at most ${options.max}`,
                        actual: input,
                        expected: `<= ${options.max}`
                    });
                }

                // Integer check
                if (options?.integer && !Number.isInteger(input)) {
                    errors.push({
                        path: [],
                        message: 'Number must be an integer',
                        actual: input,
                        expected: 'integer'
                    });
                }

                if (errors.length > 0) {
                    return { success: false, errors };
                }

                return { success: true, data: input };
            });

        return {
            validate,
            validateOrFail,
            validateMany,
            createValidator,
            validateString,
            validateNumber,
        };
    })
}) { }

/**
 * Default validation service layer
 */
export const ValidationServiceLive = ValidationService.Default;

/**
 * Legacy compatibility functions
 * These will be deprecated in favor of the service-based approach
 */
export function validateData<T>(
    schema: Schema.Schema<unknown, T>,
    input: unknown
): ValidationResult<T> {
    try {
        const result = Schema.decodeUnknownSync(schema)(input);
        return { success: true, data: result as T };
    } catch (error: unknown) {
        if (error instanceof ParseResult.ParseError) {
            const errors: ValidationError[] = [{
                path: [],
                message: error.message || 'Validation failed'
            }];
            return { success: false, errors };
        }
        return {
            success: false,
            errors: [{
                path: [],
                message: 'Validation failed',
                actual: input
            }]
        };
    }
}

export function validateString(input: unknown, options?: {
    minLength?: number;
    maxLength?: number;
    required?: boolean;
}): ValidationResult<string> {
    if (typeof input !== 'string') {
        return {
            success: false,
            errors: [{
                path: [],
                message: 'Expected string',
                actual: input,
                expected: 'string'
            }]
        };
    }

    const errors: ValidationError[] = [];

    if (options?.required && input.trim().length === 0) {
        errors.push({
            path: [],
            message: 'String is required',
            actual: input,
            expected: 'non-empty string'
        });
    }

    if (options?.minLength && input.length < options.minLength) {
        errors.push({
            path: [],
            message: `String must be at least ${options.minLength} characters`,
            actual: input.length,
            expected: `>= ${options.minLength}`
        });
    }

    if (options?.maxLength && input.length > options.maxLength) {
        errors.push({
            path: [],
            message: `String must be at most ${options.maxLength} characters`,
            actual: input.length,
            expected: `<= ${options.maxLength}`
        });
    }

    if (errors.length > 0) {
        return { success: false, errors };
    }

    return { success: true, data: input };
}