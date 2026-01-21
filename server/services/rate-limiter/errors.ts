/**
 * Rate limiter service errors
 */

import { Data } from "effect";

/**
 * Error thrown when rate limiting fails
 */
export class RateLimitError extends Data.TaggedError("RateLimitError")<{
    readonly cause: unknown;
}> { }
