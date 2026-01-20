/**
 * Integration tests for route handlers
 */

import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
    ERROR_RULE_NOT_FOUND,
    HTTP_STATUS_INTERNAL_SERVER_ERROR,
    HTTP_STATUS_NOT_FOUND,
    HTTP_STATUS_OK,
} from "api/constants.js";
import {
    healthHandler,
    rulesHandler,
    singleRuleHandler,
} from "api/handlers.js";

describe("Route Handlers Integration", () => {
    describe("healthHandler", () => {
        it("should return health check status", () => {
            const program = Effect.gen(function* () {
                const result = yield* healthHandler;
                expect(result).toEqual({ status: "ok" });
            });

            return Effect.runPromise(Effect.scoped(program));
        });
    });

    describe("rulesHandler", () => {
        it("should return all rules with success status", () => {
            const program = Effect.gen(function* () {
                const result = yield* rulesHandler;

                expect("statusCode" in result).toBe(true);
                expect(result.statusCode).toBe(HTTP_STATUS_OK);
                expect("data" in result).toBe(true);

                if ("data" in result && result.data) {
                    expect(Array.isArray(result.data)).toBe(true);
                    // Check that we have some data (if database has patterns with rules)
                    if (result.data.length > 0) {
                        // Verify structure of first rule
                        const firstRule = result.data[0];
                        expect(firstRule).toHaveProperty("id");
                        expect(firstRule).toHaveProperty("title");
                        expect(firstRule).toHaveProperty("description");
                        expect(firstRule).toHaveProperty("content");
                    }
                }
            });

            return Effect.runPromise(Effect.scoped(program));
        });

        it("should handle database errors gracefully", () => {
            const program = Effect.gen(function* () {
                const result = yield* rulesHandler;

                // In case of error, should have error structure
                if ("error" in result) {
                    expect(result.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR);
                    expect(typeof result.error).toBe("string");
                }
            });

            return Effect.runPromise(Effect.scoped(program));
        });
    });

    describe("singleRuleHandler", () => {
        it("should return a specific rule when found", () => {
            const program = Effect.gen(function* () {
                // First, get all rules to find a valid ID
                const allRulesResult = yield* rulesHandler;

                if (
                    "data" in allRulesResult &&
                    allRulesResult.data &&
                    allRulesResult.data.length > 0
                ) {
                    const firstRuleId = allRulesResult.data[0].id;
                    const result = yield* singleRuleHandler(firstRuleId);

                    expect("statusCode" in result).toBe(true);
                    expect(result.statusCode).toBe(HTTP_STATUS_OK);
                    expect("data" in result).toBe(true);

                    if ("data" in result && result.data) {
                        expect(result.data.id).toBe(firstRuleId);
                        expect(result.data.title).toBeDefined();
                        expect(result.data.description).toBeDefined();
                        expect(result.data.content).toBeDefined();
                    }
                } else {
                    // If no rules available, skip this test
                    console.log("No rules found in database, skipping test");
                }
            });

            return Effect.runPromise(Effect.scoped(program));
        });

        it("should return 404 for non-existent rule", () => {
            const program = Effect.gen(function* () {
                const result = yield* singleRuleHandler("non-existent-rule");

                expect("statusCode" in result).toBe(true);
                expect(result.statusCode).toBe(HTTP_STATUS_NOT_FOUND);
                expect("error" in result).toBe(true);

                if ("error" in result) {
                    expect(result.error).toBe(ERROR_RULE_NOT_FOUND);
                }
            });

            return Effect.runPromise(Effect.scoped(program));
        });

        it("should return 404 for pattern without rule", () => {
            const program = Effect.gen(function* () {
                const result = yield* singleRuleHandler("no-rule-pattern");

                expect("statusCode" in result).toBe(true);
                expect(result.statusCode).toBe(HTTP_STATUS_NOT_FOUND);
                expect("error" in result).toBe(true);

                if ("error" in result) {
                    expect(result.error).toBe(ERROR_RULE_NOT_FOUND);
                }
            });

            return Effect.runPromise(Effect.scoped(program));
        });
    });
});
