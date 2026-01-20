/**
 * HTTP Server service errors
 */

import { Data } from "effect";

/**
 * Error thrown when HTTP server fails to start
 */
export class HttpServerError extends Data.TaggedError("HttpServerError")<{
    readonly cause: unknown;
}> { }

/**
 * Error thrown when HTTP server fails to stop
 */
export class HttpServerStopError extends Data.TaggedError(
    "HttpServerStopError",
)<{
    readonly cause: unknown;
}> { }
