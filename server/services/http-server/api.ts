/**
 * HTTP Server service API
 */

import { HttpServerResponse } from "@effect/platform";
import { Effect } from "effect";
import { ServerConfig } from "./types.js";

/**
 * HTTP Server service interface
 */
export interface HttpServerService {
    /**
     * Start the HTTP server
     */
    readonly start: (config: ServerConfig) => Effect.Effect<void, never, never>;

    /**
     * Stop the HTTP server
     */
    readonly stop: () => Effect.Effect<void, never, never>;

    /**
     * Create an HTTP response
     */
    readonly createResponse: (
        statusCode: number,
        headers?: Record<string, string>,
    ) => HttpServerResponse.HttpServerResponse;

    /**
     * Add security headers to a response
     */
    readonly addSecurityHeaders: (
        response: HttpServerResponse.HttpServerResponse,
    ) => HttpServerResponse.HttpServerResponse;
}
