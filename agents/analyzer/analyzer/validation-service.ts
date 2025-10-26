/**
 * Data Validation Service
 *
 * Provides validation for Discord Q&A data using Effect.Schema.
 * Implements fail-fast validation strategy as per design decisions.
 */

import { Context, Effect, Layer, Schema } from 'effect';
import {
  InsufficientDataError,
  InvalidDataFormatError,
  SchemaValidationError,
} from './errors.js';
import {
  type Message,
  type MessageCollection,
  MessageCollectionSchema,
  MessageSchema,
} from './schemas.js';

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
export class DataValidationService extends Context.Tag('DataValidationService')<
  DataValidationService,
  {
    /**
     * Validate raw data against MessageCollection schema
     * Fails fast if data doesn't match expected structure
     */
    readonly validateMessages: (
      data: unknown,
    ) => Effect.Effect<MessageCollection, SchemaValidationError>;

    /**
     * Validate that message count meets minimum requirement
     * Fails fast if insufficient messages
     */
    readonly validateMessageCount: (
      messages: readonly Message[],
      min: number,
    ) => Effect.Effect<readonly Message[], InsufficientDataError>;

    /**
     * Validate a single message against schema
     */
    readonly validateMessage: (
      data: unknown,
    ) => Effect.Effect<Message, SchemaValidationError>;

    /**
     * Validate data structure (top-level check)
     */
    readonly validateStructure: (
      data: unknown,
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
          yield* Effect.logDebug('Validating message collection structure');

          // Decode using Effect.Schema
          const decodedCollection = yield* Schema.decodeUnknown(
            MessageCollectionSchema,
          )(data).pipe(
            Effect.mapError(
              (parseError) =>
                new SchemaValidationError({
                  errors: extractValidationErrors(parseError),
                }),
            ),
            Effect.tapError((error) =>
              Effect.gen(function* () {
                yield* Effect.logError(
                  `Schema validation failed: ${error.errors.length} error(s)`,
                );
                for (const err of error.errors) {
                  yield* Effect.logError(`  - ${err}`);
                }
              }),
            ),
            Effect.tap((collection) =>
              Effect.logDebug(
                `Validated ${collection.messages.length} messages successfully`,
              ),
            ),
          );

          return decodedCollection;
        }),

      validateMessageCount: (messages, min) =>
        Effect.gen(function* () {
          const count = messages.length;

          yield* Effect.logDebug(
            `Checking message count: ${count} messages (minimum: ${min})`,
          );

          if (count < min) {
            yield* Effect.logError(
              `Insufficient messages: found ${count}, need at least ${min}`,
            );

            return yield* Effect.fail(
              new InsufficientDataError({
                count,
                min,
                message: `Found ${count} messages, but at least ${min} required`,
              }),
            );
          }

          yield* Effect.logDebug('Message count validation passed');
          return messages;
        }),

      validateMessage: (data: unknown) =>
        Schema.decodeUnknown(MessageSchema)(data).pipe(
          Effect.mapError((parseError) => {
            const errors = extractValidationErrors(parseError);
            return new SchemaValidationError({ errors });
          }),
        ),

      validateStructure: (data: unknown) =>
        Effect.gen(function* () {
          yield* Effect.logDebug('Validating data structure');

          // Check if data is an object
          if (typeof data !== 'object' || data === null) {
            return yield* Effect.fail(
              new InvalidDataFormatError({
                expected: "object with 'messages' array",
                received: typeof data,
              }),
            );
          }

          // Check if messages property exists
          const dataObj = data as Record<string, unknown>;
          if (!('messages' in dataObj)) {
            return yield* Effect.fail(
              new InvalidDataFormatError({
                expected: "object with 'messages' property",
                received: `object with keys: ${Object.keys(dataObj).join(', ')}`,
              }),
            );
          }

          // Check if messages is an array
          if (!Array.isArray(dataObj.messages)) {
            return yield* Effect.fail(
              new InvalidDataFormatError({
                expected: "'messages' to be an array",
                received: typeof dataObj.messages,
              }),
            );
          }

          yield* Effect.logDebug('Data structure validation passed');
        }),
    }),
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract validation error messages from ParseError
 */
const extractValidationErrors = (parseError: unknown): readonly string[] => {
  if (!isRecord(parseError)) {
    return [String(parseError)];
  }

  const errors: string[] = [];

  collectTopLevelMessage(parseError, errors);
  collectIssueErrors(parseError.issues, errors);
  collectNestedErrors(parseError.errors, errors);

  if (errors.length === 0) {
    errors.push(String(parseError));
  }

  return errors;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const collectTopLevelMessage = (
  errorObj: Record<string, unknown>,
  errors: string[],
) => {
  const message = errorObj.message;
  if (typeof message === 'string') {
    errors.push(message);
  }
};

const collectIssueErrors = (issues: unknown, errors: string[]) => {
  if (!Array.isArray(issues)) {
    return;
  }

  for (const issue of issues) {
    if (!isRecord(issue)) {
      continue;
    }

    const issueMessage = issue.message;
    const issuePath = issue.path;
    if (typeof issueMessage !== 'string') {
      continue;
    }

    const pathString = Array.isArray(issuePath)
      ? issuePath.map(String).join('.')
      : 'unknown';

    errors.push(`${pathString}: ${issueMessage}`);
  }
};

const collectNestedErrors = (nested: unknown, errors: string[]) => {
  if (!Array.isArray(nested)) {
    return;
  }

  for (const entry of nested) {
    if (typeof entry === 'string') {
      errors.push(entry);
      continue;
    }

    if (!isRecord(entry)) {
      continue;
    }

    const nestedMessage = entry.message;
    if (typeof nestedMessage === 'string') {
      errors.push(nestedMessage);
    }
  }
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
