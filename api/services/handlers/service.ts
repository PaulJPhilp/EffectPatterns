/**
 * Handlers service implementation
 */

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
} from "api/constants.js";
import { RuleSchema } from "api/schema.js";
import { DatabaseService } from "api/services/database/service.js";
import { ApiResponse, HealthCheckResponse } from "api/services/handlers/types.js";

/**
 * Handlers service using Effect.Service pattern
 */
export class HandlersService extends Effect.Service<HandlersService>()(
    "HandlersService",
    {
        effect: Effect.gen(function* () {
            const database = yield* DatabaseService;

            const healthHandler = () =>
                Effect.succeed({ status: HEALTH_STATUS_OK } as HealthCheckResponse);

            const rulesHandler = () =>
                Effect.gen(function* () {
                    const rulesResult = yield* Effect.either(
                        Effect.gen(function* () {
                            const rules = yield* database.loadRulesFromDatabase();
                            const validated = yield* Schema.decodeUnknown(
                                Schema.Array(RuleSchema),
                            )(rules);
                            return validated;
                        }),
                    );

                    if (Either.isLeft(rulesResult)) {
                        return {
                            error: ERROR_FAILED_TO_LOAD_RULES,
                            statusCode: HTTP_STATUS_INTERNAL_SERVER_ERROR,
                        } as ApiResponse;
                    }

                    return {
                        data: Either.getOrThrow(rulesResult),
                        statusCode: HTTP_STATUS_OK,
                    } as ApiResponse;
                });

            const singleRuleHandler = (id: string) =>
                Effect.gen(function* () {
                    const ruleResult = yield* Effect.either(
                        Effect.gen(function* () {
                            const rule = yield* database.readRuleById(id);
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
                                } as ApiResponse;
                            case "DatabaseError":
                                return {
                                    error: ERROR_FAILED_TO_LOAD_RULE,
                                    statusCode: HTTP_STATUS_INTERNAL_SERVER_ERROR,
                                } as ApiResponse;
                            default:
                                // This should never happen with our current error types
                                return {
                                    error: ERROR_UNEXPECTED_ERROR,
                                    statusCode: HTTP_STATUS_INTERNAL_SERVER_ERROR,
                                } as ApiResponse;
                        }
                    }

                    return {
                        data: Either.getOrThrow(ruleResult),
                        statusCode: HTTP_STATUS_OK,
                    } as ApiResponse;
                });

            return {
                healthHandler,
                rulesHandler,
                singleRuleHandler,
            };
        }),
    },
) { }
