/**
 * Data Validation Service
 *
 * Provides validation for Discord Q&A data using Effect.Schema.
 * Implements fail-fast validation strategy as per design decisions.
 */

import { Context, Effect, Layer, Schema } from "effect";
import {
    InsufficientDataError,
    InvalidDataFormatError,
    SchemaValidationError,
} from "./errors.js";
import {
    MessageCollectionSchema,
    MessageSchema,
    type Message,
    type MessageCollection
} from "./schemas.js";

// ============================================================================
// Service Definition
// ============================================================================

/**
 * Service for validating Discord Q&A data
 *
 * Provides methods to validate:
 * - Raw data against MessageCollection schema
 * - Minimum message count requirements
 * - Individual message structures
 */
export class DataValidationService extends Context.Tag(
    "DataValidationService"
)<
    DataValidationService,
    {
        /**
         * Validate raw data against MessageCollection schema
         * Fails fast if data doesn't match expected structure
         */
        readonly validateMessages: (
            data: unknown
        ) => Effect.Effect<MessageCollection, SchemaValidationError>;

        /**
         * Validate that message count meets minimum requirement
         * Fails fast if insufficient messages
         */
        readonly validateMessageCount: (
            messages: ReadonlyArray<Message>,
            min: number
        ) => Effect.Effect<ReadonlyArray<Message>, InsufficientDataError>;

        /**
         * Validate a single message against schema
         */
        readonly validateMessage: (
            data: unknown
        ) => Effect.Effect<Message, SchemaValidationError>;

        /**
         * Validate data structure (top-level check)
         */
        readonly validateStructure: (
            data: unknown
        ) => Effect.Effect<void, InvalidDataFormatError>;
    }
>() {
    /**
     * Live implementation of DataValidationService
     */
    static readonly Live = Layer.succeed(
        DataValidationService,
        DataValidationService.of({
            validateMessages: (data: unknown) =>
                Effect.gen(function* () {
                    yield* Effect.logDebug("Validating message collection structure");

                    // Decode using Effect.Schema
                    const result = yield* Schema.decodeUnknown(MessageCollectionSchema)(
                        data
                    ).pipe(
                        Effect.mapError((parseError) => {
                            // Extract error messages from ParseError
                            const errors = extractValidationErrors(parseError);

                            // Log errors synchronously before failing
                            console.error(`Schema validation failed: ${errors.length} error(s)`);
                            errors.forEach((err) => console.error(`  - ${err}`));

                            return new SchemaValidationError({ errors });
                        }),
                        Effect.tap((result) =>
                            Effect.logDebug(
                                `Validated ${result.messages.length} messages successfully`
                            )
                        )
                    );

                    return result;
                }),

            validateMessageCount: (messages, min) =>
                Effect.gen(function* () {
                    const count = messages.length;

                    yield* Effect.logDebug(
                        `Checking message count: ${count} messages (minimum: ${min})`
                    );

                    if (count < min) {
                        yield* Effect.logError(
                            `Insufficient messages: found ${count}, need at least ${min}`
                        );

                        return yield* Effect.fail(
                            new InsufficientDataError({
                                count,
                                min,
                                message: `Found ${count} messages, but at least ${min} required`,
                            })
                        );
                    }

                    yield* Effect.logDebug("Message count validation passed");
                    return messages;
                }),

            validateMessage: (data: unknown) =>
                Schema.decodeUnknown(MessageSchema)(data).pipe(
                    Effect.mapError((parseError) => {
                        const errors = extractValidationErrors(parseError);
                        return new SchemaValidationError({ errors });
                    })
                ),

            validateStructure: (data: unknown) =>
                Effect.gen(function* () {
                    yield* Effect.logDebug("Validating data structure");

                    // Check if data is an object
                    if (typeof data !== "object" || data === null) {
                        return yield* Effect.fail(
                            new InvalidDataFormatError({
                                expected: "object with 'messages' array",
                                received: typeof data,
                            })
                        );
                    }

                    // Check if messages property exists
                    const dataObj = data as Record<string, unknown>;
                    if (!("messages" in dataObj)) {
                        return yield* Effect.fail(
                            new InvalidDataFormatError({
                                expected: "object with 'messages' property",
                                received: `object with keys: ${Object.keys(dataObj).join(", ")}`,
                            })
                        );
                    }

                    // Check if messages is an array
                    if (!Array.isArray(dataObj.messages)) {
                        return yield* Effect.fail(
                            new InvalidDataFormatError({
                                expected: "'messages' to be an array",
                                received: typeof dataObj.messages,
                            })
                        );
                    }

                    yield* Effect.logDebug("Data structure validation passed");
                }),
        })
    );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract validation error messages from ParseError
 */
const extractValidationErrors = (parseError: unknown): ReadonlyArray<string> => {
    // ParseError has a complex structure, we'll extract meaningful messages
    const errors: string[] = [];

    try {
        const errorObj = parseError as any;

        // Check if it has a message property
        if (errorObj?.message) {
            errors.push(String(errorObj.message));
        }

        // Check for issues array (common in ParseError)
        if (Array.isArray(errorObj?.issues)) {
            errorObj.issues.forEach((issue: any) => {
                if (issue?.message) {
                    const path = issue?.path?.join(".") || "unknown";
                    errors.push(`${path}: ${issue.message}`);
                }
            });
        }

        // Check for errors array
        if (Array.isArray(errorObj?.errors)) {
            errorObj.errors.forEach((err: any) => {
                if (typeof err === "string") {
                    errors.push(err);
                } else if (err?.message) {
                    errors.push(String(err.message));
                }
            });
        }

        // Fallback: stringify the error
        if (errors.length === 0) {
            errors.push(JSON.stringify(errorObj, null, 2));
        }
    } catch (e) {
        // Last resort: generic error message
        errors.push("Unknown validation error occurred");
    }

    return errors;
};

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Validate a message collection from unknown data
 * Convenience wrapper that combines structure and schema validation
 */
export const validateMessageCollection = (data: unknown) =>
    Effect.gen(function* () {
        const validation = yield* DataValidationService;

        // First check structure
        yield* validation.validateStructure(data);

        // Then validate against schema
        const collection = yield* validation.validateMessages(data);

        // Finally check minimum count (at least 1)
        yield* validation.validateMessageCount(collection.messages, 1);

        return collection;
    });

/**
 * Validate messages with custom minimum count
 */
export const validateMessagesWithMinimum = (data: unknown, min: number) =>
    Effect.gen(function* () {
        const validation = yield* DataValidationService;

        yield* validation.validateStructure(data);
        const collection = yield* validation.validateMessages(data);
        yield* validation.validateMessageCount(collection.messages, min);

        return collection;
    });
