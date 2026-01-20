/**
 * HTTP Server service types
 */

import { HttpServerResponse } from "@effect/platform";

/**
 * Server configuration
 */
export interface ServerConfig {
    readonly port: number;
    readonly host: string;
}

/**
 * HTTP response wrapper
 */
export interface HttpResponse {
    readonly response: HttpServerResponse.HttpServerResponse;
    readonly statusCode: number;
    readonly headers: Record<string, string>;
}
