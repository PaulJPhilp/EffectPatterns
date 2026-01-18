import { Effect, Either } from "effect";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ConfigurationError } from "../errors";
import { MCPTierService } from "./tier";

describe("MCPTierService", () => {
	const originalEnv = { ...process.env };

	const restoreEnv = () => {
		process.env = { ...originalEnv };
	};

	const setEnv = (overrides: Record<string, string>) => {
		restoreEnv();
		for (const [k, v] of Object.entries(overrides)) {
			process.env[k] = v;
		}
	};

	describe("Free Tier", () => {
		beforeEach(() => {
			setEnv({
				TIER_MODE: "free",
				PATTERN_API_KEY: "test-key",
			});
		});

		it("should identify free tier correctly", async () => {
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const tier = yield* MCPTierService;
					return yield* tier.isFreeTier();
				}).pipe(Effect.provide(MCPTierService.Default))
			);

			expect(result).toBe(true);
		});

		it("should allow free tier endpoints", async () => {
			const freeEndpoints = [
				"/api/health",
				"/api/patterns",
				"/api/patterns/retry-with-backoff",
				"/api/analyze-code",
				"/api/list-rules",
			];

			for (const endpoint of freeEndpoints) {
				const result = await Effect.runPromise(
					Effect.gen(function* () {
						const tier = yield* MCPTierService;
						return yield* tier.isEndpointAllowed(endpoint);
					}).pipe(Effect.provide(MCPTierService.Default))
				);
				expect(result).toBe(true);
			}
		});

		it("should block paid tier endpoints", async () => {
			const paidEndpoints = [
				"/api/generate",
				"/api/analyze-consistency",
				"/api/apply-refactoring",
				"/api/trace-wiring",
				"/api/db-check",
			];

			for (const endpoint of paidEndpoints) {
				const result = await Effect.runPromise(
					Effect.gen(function* () {
						const tier = yield* MCPTierService;
						return yield* tier.isEndpointAllowed(endpoint);
					}).pipe(Effect.provide(MCPTierService.Default))
				);
				expect(result).toBe(false);
			}
		});

		it("should provide upgrade message", async () => {
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const tier = yield* MCPTierService;
					return yield* tier.getUpgradeMessage();
				}).pipe(Effect.provide(MCPTierService.Default))
			);

			expect(result).toContain("Paid Tier");
			expect(result).toContain("Upgrade");
		});

		it("should return correct feature categories", async () => {
			const categories = await Effect.runPromise(
				Effect.gen(function* () {
					const tier = yield* MCPTierService;
					return yield* tier.getFeatureCategories();
				}).pipe(Effect.provide(MCPTierService.Default))
			);

			expect(categories).toHaveLength(5); // patterns, retrieval, analysis, review, infrastructure
			expect(categories.map((c: any) => c.name)).toEqual([
				"Pattern Search",
				"Pattern Retrieval",
				"Read-Only Analysis",
				"Code Review",
				"Infrastructure",
			]);
		});
	});

	describe("Paid Tier", () => {
		beforeEach(() => {
			setEnv({
				TIER_MODE: "paid",
				PATTERN_API_KEY: "test-key",
			});
		});

		it("should identify paid tier correctly", async () => {
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const tier = yield* MCPTierService;
					return yield* tier.isPaidTier();
				}).pipe(Effect.provide(MCPTierService.Default))
			);

			expect(result).toBe(true);
		});

		it("should allow all endpoints", async () => {
			const allEndpoints = [
				"/api/health",
				"/api/patterns",
				"/api/analyze-code",
				"/api/generate",
				"/api/analyze-consistency",
				"/api/apply-refactoring",
				"/api/trace-wiring",
				"/api/generate-pattern",
			];

			for (const endpoint of allEndpoints) {
				const result = await Effect.runPromise(
					Effect.gen(function* () {
						const tier = yield* MCPTierService;
						return yield* tier.isEndpointAllowed(endpoint);
					}).pipe(Effect.provide(MCPTierService.Default))
				);
				expect(result).toBe(true);
			}
		});

		it("should return all feature categories", async () => {
			const categories = await Effect.runPromise(
				Effect.gen(function* () {
					const tier = yield* MCPTierService;
					return yield* tier.getFeatureCategories();
				}).pipe(Effect.provide(MCPTierService.Default))
			);

			expect(categories).toHaveLength(9); // All features
			expect(categories.map((c: any) => c.name)).toContain("Code Generation");
			expect(categories.map((c: any) => c.name)).toContain("Refactoring Engine");
		});

		it("should provide paid tier message", async () => {
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const tier = yield* MCPTierService;
					return yield* tier.getUpgradeMessage();
				}).pipe(Effect.provide(MCPTierService.Default))
			);

			expect(result).toContain("All features are available");
		});
	});

	describe("Invalid Configuration", () => {
		it("should fail with invalid tier mode", async () => {
			setEnv({
				TIER_MODE: "invalid",
				PATTERN_API_KEY: "test-key",
			});

			const either = await Effect.runPromise(
				Effect.gen(function* () {
					const tier = yield* MCPTierService;
					return yield* tier.getTierMode();
				}).pipe(Effect.provide(MCPTierService.Default), Effect.either)
			);

			expect(Either.isLeft(either)).toBe(true);
			if (Either.isLeft(either)) {
				expect(either.left).toBeInstanceOf(ConfigurationError);
				expect((either.left as any).key).toBe("TIER_MODE");
			}
		});

		it("should fail with missing tier mode", async () => {
			setEnv({
				PATTERN_API_KEY: "test-key",
			});

			const either = await Effect.runPromise(
				Effect.gen(function* () {
					const tier = yield* MCPTierService;
					return yield* tier.getTierMode();
				}).pipe(Effect.provide(MCPTierService.Default), Effect.either)
			);

			expect(Either.isLeft(either)).toBe(true);
			if (Either.isLeft(either)) {
				expect(either.left).toBeInstanceOf(ConfigurationError);
				expect((either.left as any).key).toBe("TIER_MODE");
			}
		});
	});

	describe("Dynamic Route Handling", () => {
		beforeEach(() => {
			setEnv({
				TIER_MODE: "free",
				PATTERN_API_KEY: "test-key",
			});
		});

		it("should handle dynamic pattern routes correctly", async () => {
			const dynamicRoutes = [
				"/api/patterns/retry-with-backoff",
				"/api/patterns/service-effect-service",
				"/api/patterns/error-tagged-error",
			];

			for (const route of dynamicRoutes) {
				const result = await Effect.runPromise(
					Effect.gen(function* () {
						const tier = yield* MCPTierService;
						return yield* tier.isEndpointAllowed(route);
					}).pipe(Effect.provide(MCPTierService.Default))
				);
				expect(result).toBe(true);
			}
		});

		it("should handle query parameters correctly", async () => {
			const routesWithQuery = [
				"/api/patterns?q=retry&category=error-handling",
				"/api/analyze-code?analysisType=all",
				"/api/health?verbose=true",
			];

			for (const route of routesWithQuery) {
				const result = await Effect.runPromise(
					Effect.gen(function* () {
						const tier = yield* MCPTierService;
						return yield* tier.isEndpointAllowed(route);
					}).pipe(Effect.provide(MCPTierService.Default))
				);
				expect(result).toBe(true);
			}
		});
	});

	describe("Feature Availability", () => {
		beforeEach(() => {
			setEnv({
				TIER_MODE: "free",
				PATTERN_API_KEY: "test-key",
			});
		});

		it("should correctly identify available features", async () => {
			const availableFeatures = [
				"Pattern Search",
				"Pattern Retrieval",
				"Read-Only Analysis",
				"Code Review",
				"Infrastructure",
			];

			for (const feature of availableFeatures) {
				const result = await Effect.runPromise(
					Effect.gen(function* () {
						const tier = yield* MCPTierService;
						return yield* tier.isFeatureAvailable(feature);
					}).pipe(Effect.provide(MCPTierService.Default))
				);
				expect(result).toBe(true);
			}
		});

		it("should correctly identify unavailable features", async () => {
			const unavailableFeatures = [
				"Code Generation",
				"Refactoring Engine",
				"Consistency Analysis",
			];

			for (const feature of unavailableFeatures) {
				const result = await Effect.runPromise(
					Effect.gen(function* () {
						const tier = yield* MCPTierService;
						return yield* tier.isFeatureAvailable(feature);
					}).pipe(Effect.provide(MCPTierService.Default))
				);
				expect(result).toBe(false);
			}
		});
	});

	afterAll(() => {
		restoreEnv();
	});
});
