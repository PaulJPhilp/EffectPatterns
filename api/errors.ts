/**
 * Error types for API operations
 */

import { Data } from "effect";

/**
 * Error thrown when database operations fail
 * @param cause - The underlying error from the database
 */
export class DatabaseError extends Data.TaggedError("DatabaseError")<{
    readonly cause: unknown;
}> { }

/**
 * Error thrown when a requested rule is not found
 * @param id - The rule ID that was not found
 */
export class RuleNotFoundError extends Data.TaggedError("RuleNotFoundError")<{
    readonly id: string;
}> { }

/**
 * Union type for all API errors
 */
export type ApiError = DatabaseError | RuleNotFoundError;
