/**
 * Handlers service tests
 */

import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { HandlersService } from "../service.js";
import { DatabaseService } from "api/services/database/service.js";

describe("HandlersService", () => {
    const testLayer = Layer.provide(
        HandlersService.Default,
        DatabaseService.Default,
    );

    it("should handle health check", () =>
        Effect.gen(function* () {
            const handlers = yield* HandlersService;

            const result = yield* handlers.healthHandler();

            expect(result.status).toBe("ok");
        }).pipe(Effect.provide(testLayer), Effect.scoped, Effect.runPromise));

    it("should handle rules request", () =>
        Effect.gen(function* () {
            const handlers = yield* HandlersService;

            const result = yield* handlers.rulesHandler();

            expect(result.statusCode).toBe(200);
            expect(Array.isArray(result.data)).toBe(true);
        }).pipe(Effect.provide(testLayer), Effect.scoped, Effect.runPromise));

    it("should handle single rule request", () =>
        Effect.gen(function* () {
            const handlers = yield* HandlersService;

            // Test with a non-existent ID since we don't have real data
            const result = yield* handlers.singleRuleHandler("non-existent-id");

            // This should return 404 since the rule doesn't exist
            expect(result.statusCode).toBe(404);
            expect(result.error).toBe("Rule not found");
        }).pipe(Effect.provide(testLayer), Effect.scoped, Effect.runPromise));

    it("should handle rule not found", () =>
        Effect.gen(function* () {
            const handlers = yield* HandlersService;

            const result = yield* handlers.singleRuleHandler("test-id");

            expect(result.statusCode).toBe(404);
            expect(result.error).toBe("Rule not found");
        }).pipe(Effect.provide(testLayer), Effect.scoped, Effect.runPromise));
});
