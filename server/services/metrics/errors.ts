/**
 * Metrics service errors
 */

import { Data } from "effect";

/**
 * Error thrown when metrics collection fails
 */
export class MetricsError extends Data.TaggedError("MetricsError")<{
    readonly cause: unknown;
}> { }
