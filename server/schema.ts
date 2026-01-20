/**
 * Schema definitions for server responses
 */

import { Schema } from "effect";

/**
 * Schema for server configuration
 */
export const ServerConfigSchema = Schema.Struct({
    port: Schema.Number.pipe(Schema.between(0, 65535)),
    host: Schema.String,
    nodeEnv: Schema.Literal("development", "staging", "production"),
    logLevel: Schema.Literal("debug", "info", "warn", "error"),
});

/**
 * Schema for a Rule object with enhanced validation
 */
export const RuleSchema = Schema.Struct({
    id: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
    title: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(200)),
    description: Schema.String.pipe(Schema.minLength(0), Schema.maxLength(500)),
    skillLevel: Schema.optional(
        Schema.Literal("beginner", "intermediate", "advanced"),
    ),
    useCase: Schema.optional(
        Schema.Array(Schema.String.pipe(Schema.minLength(1))),
    ),
    content: Schema.String.pipe(Schema.minLength(1)),
});

/**
 * Schema for API response wrapper
 */
export const ApiResponseSchema = <T>(dataSchema: Schema.Schema<any, T>) =>
    Schema.Struct({
        success: Schema.Boolean,
        data: dataSchema,
        meta: Schema.Struct({
            timestamp: Schema.String,
            requestId: Schema.String,
            version: Schema.String,
        }),
    });

/**
 * Schema for error response
 */
export const ErrorResponseSchema = Schema.Struct({
    success: Schema.Boolean,
    error: Schema.Struct({
        message: Schema.String,
        code: Schema.String,
        details: Schema.optional(Schema.Unknown),
    }),
    meta: Schema.Struct({
        timestamp: Schema.String,
        requestId: Schema.String,
        version: Schema.String,
    }),
});

/**
 * Schema for health check response
 */
export const HealthCheckSchema = Schema.Struct({
    status: Schema.String,
    timestamp: Schema.String,
    uptime: Schema.String,
    memory: Schema.Struct({
        used: Schema.String,
        total: Schema.String,
        healthy: Schema.Boolean,
    }),
    filesystem: Schema.Struct({
        rulesFileExists: Schema.Boolean,
    }),
    services: Schema.Struct({
        rules: Schema.Boolean,
    }),
    version: Schema.String,
});

/**
 * Schema for server metrics response
 */
export const ServerMetricsSchema = Schema.Struct({
    server: Schema.Struct({
        uptime: Schema.Number,
        startTime: Schema.String,
        version: Schema.String,
        environment: Schema.String,
    }),
    requests: Schema.Struct({
        total: Schema.Number,
        errors: Schema.Number,
        rateLimitHits: Schema.Number,
    }),
    health: Schema.Struct({
        lastHealthCheck: Schema.String,
        healthCheckAge: Schema.Number,
    }),
});
