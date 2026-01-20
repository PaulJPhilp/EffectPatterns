/**
 * Database service tests
 */

import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import { DatabaseService } from "../service.js";

describe("DatabaseService", () => {
    it("should load rules from database", () =>
        Effect.gen(function* () {
            const database = yield* DatabaseService;

            // Test loading all rules
            const rules = yield* database.loadRulesFromDatabase();

            expect(Array.isArray(rules)).toBe(true);
            // In a real test, you'd mock the database and test specific behavior
        }).pipe(
            Effect.provide(DatabaseService.Default),
            Effect.scoped,
            Effect.runPromise,
        ));

    it("should read rule by ID", () =>
        Effect.gen(function* () {
            const database = yield* DatabaseService;

            // First load all rules to get a valid ID
            const rules = yield* database.loadRulesFromDatabase();

            if (rules.length > 0) {
                // Test reading a specific rule that exists
                const rule = yield* database.readRuleById(rules[0].id);

                expect(rule).toBeDefined();
                expect(typeof rule.id).toBe("string");
                expect(typeof rule.title).toBe("string");
            } else {
                // Skip test if no rules exist
                console.log("No rules found in database, skipping test");
            }
        }).pipe(
            Effect.provide(DatabaseService.Default),
            Effect.scoped,
            Effect.runPromise,
        ));

    it("should handle rule not found", () =>
        Effect.gen(function* () {
            const database = yield* DatabaseService;

            // Test reading a non-existent rule
            const result = yield* Effect.either(
                database.readRuleById("non-existent-id"),
            );

            expect(result._tag).toBe("Left");
            if (Either.isLeft(result)) {
                expect(result.left._tag).toBe("RuleNotFoundError");
            }
        }).pipe(
            Effect.provide(DatabaseService.Default),
            Effect.scoped,
            Effect.runPromise,
        ));
});
