/**
 * Database service errors
 */

import { Data } from "effect";

/**
 * Error thrown when database operations fail
 */
export class DatabaseError extends Data.TaggedError("DatabaseError")<{
    readonly cause: unknown;
}> { }

/**
 * Error thrown when a rule is not found
 */
export class RuleNotFoundError extends Data.TaggedError("RuleNotFoundError")<{
    readonly id: string;
}> { }
