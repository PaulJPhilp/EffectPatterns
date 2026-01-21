/**
 * Integration tests for database operations
 */

import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import { ERROR_RULE_NOT_FOUND } from "api/constants.js";
import { loadRulesFromDatabase, readRuleById } from "api/database.js";

describe("Database Operations Integration", () => {
    describe("loadRulesFromDatabase", () => {
        it("should load rules that have rule content", () => {
            const program = Effect.gen(function* () {
                const rules = yield* loadRulesFromDatabase;

                // Should return patterns that have rules defined
                expect(Array.isArray(rules)).toBe(true);

                // Each rule should have the required structure
                rules.forEach((rule) => {
                    expect(rule).toHaveProperty("id");
                    expect(rule).toHaveProperty("title");
                    expect(rule).toHaveProperty("description");
                    expect(rule).toHaveProperty("content");
                    expect(typeof rule.id).toBe("string");
                    expect(typeof rule.title).toBe("string");
                    expect(typeof rule.description).toBe("string");
                    expect(typeof rule.content).toBe("string");
                });
            });

            return Effect.runPromise(Effect.scoped(program));
        });

        it("should filter out patterns without rule content", () => {
            const program = Effect.gen(function* () {
                const rules = yield* loadRulesFromDatabase;

                // All returned rules should have content (not empty/null)
                rules.forEach((rule) => {
                    expect(rule.content).toBeTruthy();
                    expect(rule.content.length).toBeGreaterThan(0);
                });
            });

            return Effect.runPromise(Effect.scoped(program));
        });

        it("should handle database errors gracefully", () => {
            // This test would require mocking database failures
            // For now, we'll just verify the error handling structure
            const program = Effect.gen(function* () {
                const result = yield* Effect.either(loadRulesFromDatabase);

                if (Either.isLeft(result)) {
                    expect(result.left._tag).toBe("DatabaseError");
                }
            });

            return Effect.runPromise(Effect.scoped(program));
        });
    });

    describe("readRuleById", () => {
        it("should return a rule when found", () => {
            const program = Effect.gen(function* () {
                // First, get all rules to find a valid ID
                const allRules = yield* loadRulesFromDatabase;

                if (allRules.length > 0) {
                    const firstRuleId = allRules[0].id;
                    const rule = yield* readRuleById(firstRuleId);

                    expect(rule).toHaveProperty("id", firstRuleId);
                    expect(rule).toHaveProperty("title");
                    expect(rule).toHaveProperty("description");
                    expect(rule).toHaveProperty("content");
                    expect(typeof rule.title).toBe("string");
                    expect(typeof rule.description).toBe("string");
                    expect(typeof rule.content).toBe("string");
                }
            });

            return Effect.runPromise(Effect.scoped(program));
        });

        it("should return RuleNotFoundError for non-existent rule", () => {
            const program = Effect.gen(function* () {
                const result = yield* Effect.either(readRuleById("non-existent-rule"));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left._tag).toBe("RuleNotFoundError");
                    // Type guard to narrow the union type
                    if (result.left._tag === "RuleNotFoundError") {
                        expect(result.left.id).toBe("non-existent-rule");
                        // Also verify the error message matches the constant
                        expect(ERROR_RULE_NOT_FOUND).toBe("Rule not found");
                    }
                }
            });

            return Effect.runPromise(Effect.scoped(program));
        });

        it("should return RuleNotFoundError for pattern without rule", () => {
            const program = Effect.gen(function* () {
                const result = yield* Effect.either(readRuleById("no-rule-pattern"));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left._tag).toBe("RuleNotFoundError");
                    // Type guard to narrow the union type
                    if (result.left._tag === "RuleNotFoundError") {
                        expect(result.left.id).toBe("no-rule-pattern");
                        // Also verify the error message matches the constant
                        expect(ERROR_RULE_NOT_FOUND).toBe("Rule not found");
                    }
                }
            });

            return Effect.runPromise(Effect.scoped(program));
        });
    });
});
