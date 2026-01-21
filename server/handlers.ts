/**
 * Route handlers for the server
 */

import { FileSystem, HttpServerResponse } from "@effect/platform";
import { Effect, Either, Schema } from "effect";
import {
    ERROR_FAILED_TO_LOAD_RULE,
    ERROR_FAILED_TO_LOAD_RULES,
    ERROR_RULE_NOT_FOUND,
    ERROR_UNEXPECTED_ERROR,
    HEALTH_STATUS_OK,
    HTTP_STATUS_INTERNAL_SERVER_ERROR,
    HTTP_STATUS_NOT_FOUND,
    HTTP_STATUS_OK,
} from "./constants.js";
import { readAndParseRules, readRuleById } from "./database.js";
import { ApiError } from "./errors.js";
import { RuleSchema } from "./schema.js";
import {
    createApiResponse,
    createErrorResponse,
    generateRequestId,
} from "./utils.js";

/**
 * Health check handler
 *
 * Always succeeds with status "ok"
 */
export const healthHandler = Effect.succeed({ status: HEALTH_STATUS_OK });

/**
 * GET /api/v1/rules handler
 *
 * Returns all patterns that have associated rules.
 * Validates response against RuleSchema.
 *
 * @returns Effect containing array of rules or error response
 * - statusCode 200: Array of rule objects
 * - statusCode 500: Database error
 */
export const rulesHandler = Effect.gen(function* () {
    const rulesResult = yield* Effect.either(
        Effect.gen(function* () {
            const rules = yield* readAndParseRules;
            const validated = yield* Schema.decodeUnknown(Schema.Array(RuleSchema))(
                rules,
            );
            return validated;
        }),
    );

    if (Either.isLeft(rulesResult)) {
        return {
            error: ERROR_FAILED_TO_LOAD_RULES,
            statusCode: HTTP_STATUS_INTERNAL_SERVER_ERROR,
        };
    }

    return {
        data: Either.getOrThrow(rulesResult),
        statusCode: HTTP_STATUS_OK,
    };
});

/**
 * GET /api/v1/rules/{id} handler
 *
 * Returns a single rule by ID (pattern slug).
 * Validates response against RuleSchema.
 *
 * @param id - The pattern slug to retrieve
 * @returns Effect containing rule object or error response
 * - statusCode 200: Single rule object
 * - statusCode 404: Rule not found
 * - statusCode 500: Database error
 */
export const singleRuleHandler = (id: string) =>
    Effect.gen(function* () {
        const ruleResult = yield* Effect.either(
            Effect.gen(function* () {
                const rule = yield* readRuleById(id);
                const validated = yield* Schema.decodeUnknown(RuleSchema)(rule);
                return validated;
            }),
        );

        if (Either.isLeft(ruleResult)) {
            const error = ruleResult.left;

            switch (error._tag) {
                case "RuleNotFoundError":
                    return {
                        error: ERROR_RULE_NOT_FOUND,
                        statusCode: HTTP_STATUS_NOT_FOUND,
                    };
                case "RuleLoadError":
                case "RuleParseError":
                    return {
                        error: ERROR_FAILED_TO_LOAD_RULE,
                        statusCode: HTTP_STATUS_INTERNAL_SERVER_ERROR,
                    };
                default:
                    // This should never happen with our current error types
                    return {
                        error: ERROR_UNEXPECTED_ERROR,
                        statusCode: HTTP_STATUS_INTERNAL_SERVER_ERROR,
                    };
            }
        }

        return {
            data: Either.getOrThrow(ruleResult),
            statusCode: HTTP_STATUS_OK,
        };
    });

/**
 * Enhanced health check handler with comprehensive system status
 */
export const enhancedHealthHandler = Effect.gen(function* () {
    const requestId = generateRequestId();
    const startTime = Date.now();

    // Perform comprehensive health checks
    const healthResult = yield* Effect.either(
        Effect.gen(function* () {
            // Check file system access
            const fs = yield* FileSystem.FileSystem;
            const rulesExist = yield* fs.exists("rules/rules.json");

            // Check memory usage
            const memUsage = process.memoryUsage();
            const memoryHealthy = memUsage.heapUsed < memUsage.heapTotal * 0.9;

            // Check uptime
            const uptime = process.uptime();

            // Check if we can read rules
            const rulesCheck = yield* Effect.either(readAndParseRules);
            const rulesHealthy = rulesCheck._tag === "Right";

            return {
                status: "healthy",
                timestamp: new Date().toISOString(),
                uptime: `${uptime.toFixed(2)}s`,
                memory: {
                    used: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
                    total: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
                    healthy: memoryHealthy,
                },
                filesystem: {
                    rulesFileExists: rulesExist,
                },
                services: {
                    rules: rulesHealthy,
                },
                version: "1.0.0",
            };
        }),
    );

    if (healthResult._tag === "Left") {
        const error = healthResult.left;
        const duration = Date.now() - startTime;

        const apiError = ApiError.internalServerError("Health check failed");
        const response = createErrorResponse(apiError, requestId);
        const httpResponse = yield* HttpServerResponse.json(response, {
            status: apiError.statusCode,
            headers: {
                "X-Request-ID": requestId,
            },
        });

        return httpResponse;
    }

    const health = healthResult.right;
    const duration = Date.now() - startTime;

    const response = createApiResponse(health, requestId);
    const httpResponse = yield* HttpServerResponse.json(response, {
        status: 200,
        headers: {
            "Cache-Control": "no-cache",
            "X-Request-ID": requestId,
        },
    });

    return httpResponse;
});
