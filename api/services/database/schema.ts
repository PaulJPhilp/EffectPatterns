/**
 * Database service schemas
 */

import { Schema } from "effect";

/**
 * Schema for database configuration
 */
export const DatabaseConfigSchema = Schema.Struct({
    url: Schema.String,
    ssl: Schema.optional(Schema.Boolean),
});

/**
 * Schema for database pattern
 */
export const DatabasePatternSchema = Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    description: Schema.String,
    skillLevel: Schema.String,
    useCase: Schema.Array(Schema.String),
    content: Schema.String,
});

/**
 * Schema for database error response
 */
export const DatabaseErrorSchema = Schema.Struct({
    message: Schema.String,
    cause: Schema.Unknown,
});

/**
 * Schema for rule not found error response
 */
export const RuleNotFoundErrorSchema = Schema.Struct({
    id: Schema.String,
});
