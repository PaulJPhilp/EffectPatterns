/**
 * Schema definitions for API responses
 */

import { Schema } from "effect";

/**
 * Schema for API Rule response
 *
 * Represents a pattern rule with metadata and content.
 * All fields except id, title, description, and content are optional.
 */
export const RuleSchema = Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    description: Schema.String,
    skillLevel: Schema.optional(Schema.String),
    useCase: Schema.optional(Schema.Array(Schema.String)),
    content: Schema.String,
});

/**
 * Schema for API documentation response
 */
export const ApiDocumentationSchema = Schema.Struct({
    name: Schema.String,
    version: Schema.String,
    description: Schema.String,
    repository: Schema.String,
    endpoints: Schema.Struct({
        health: Schema.String,
        rules: Schema.Struct({
            list: Schema.String,
            get: Schema.String,
        }),
    }),
});

/**
 * Schema for health check response
 */
export const HealthCheckSchema = Schema.Struct({
    status: Schema.String,
});

/**
 * Schema for error responses
 */
export const ErrorResponseSchema = Schema.Struct({
    error: Schema.String,
});

/**
 * Schema for success responses with data
 */
export const SuccessResponseSchema = <A>(data: Schema.Schema<A>) =>
    Schema.Struct({
        data,
    });
