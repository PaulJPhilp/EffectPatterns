/**
 * HTTP Server service schemas
 */

import { Schema } from "effect";

/**
 * Schema for server configuration
 */
export const ServerConfigSchema = Schema.Struct({
    port: Schema.Number.pipe(Schema.between(0, 65535)),
    host: Schema.String,
});

/**
 * Schema for HTTP response
 */
export const HttpResponseSchema = Schema.Struct({
    response: Schema.Unknown,
    statusCode: Schema.Number,
    headers: Schema.Record(Schema.String, Schema.String),
});
