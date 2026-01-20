/**
 * Handlers service schemas
 */

import { Schema } from "effect";

/**
 * Schema for API response
 */
export const ApiResponseSchema = Schema.Struct({
    data: Schema.optional(Schema.Unknown),
    error: Schema.optional(Schema.String),
    statusCode: Schema.Number,
});

/**
 * Schema for health check response
 */
export const HealthCheckResponseSchema = Schema.Struct({
    status: Schema.String,
});

/**
 * Schema for handler error response
 */
export const HandlerErrorSchema = Schema.Struct({
    message: Schema.String,
    cause: Schema.Unknown,
});
