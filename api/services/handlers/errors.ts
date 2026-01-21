/**
 * Handlers service errors
 */

import { Data } from "effect";

/**
 * Error thrown when handler operations fail
 */
export class HandlerError extends Data.TaggedError("HandlerError")<{
    readonly cause: unknown;
}> { }
