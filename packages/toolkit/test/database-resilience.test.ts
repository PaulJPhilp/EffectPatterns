/**
 * Database resilience tests — no behavioral mocks.
 * Uses Effect-based error injection and plain call counting instead of mock functions.
 */

import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { ToolkitConfig } from "../src/services/config.js";
import {
	ApplicationPatternRepositoryService,
	DatabaseService,
	findAllApplicationPatterns,
} from "../src/services/database.js";
import { ToolkitLogger } from "../src/services/logger.js";

// Repository with call counting and configurable failure
const createTrackingRepo = (failCount: number, successData: any = []) => {
	let callCount = 0;
	return {
		repo: {
			findAll: async () => {
				callCount++;
				if (callCount <= failCount) {
					throw new Error("Simulated DB connection failure");
				}
				return successData;
			},
		},
		getCallCount: () => callCount,
	};
};

// Config with retry parameters
const createTestConfig = (retries: number, delay: number = 5) =>
	({
		getDbRetryAttempts: () => Effect.succeed(retries),
		getDbRetryDelayMs: () => Effect.succeed(delay),
		getMaxConcurrentDbRequests: () => Effect.succeed(10),
		isLoggingEnabled: () => Effect.succeed(false),
	}) as unknown as ToolkitConfig;

// Database service with semaphore
const createTestDbService = () =>
	Effect.gen(function* () {
		const semaphore = yield* Effect.makeSemaphore(10);
		return { semaphore } as unknown as DatabaseService;
	});

describe("Database Resilience", () => {
	it("should retry operations until success within limit", async () => {
		const successData = [{ id: "test-pattern", slug: "test-pattern" }];
		const { repo, getCallCount } = createTrackingRepo(2, successData);
		const config = createTestConfig(3);

		const TestLayer = Layer.mergeAll(
			Layer.succeed(ApplicationPatternRepositoryService, repo as any),
			Layer.succeed(ToolkitConfig, config),
			Layer.succeed(ToolkitLogger, {
				error: () => Effect.void,
				warn: () => Effect.void,
			} as any),
			Layer.effect(DatabaseService, createTestDbService())
		);

		const result = await Effect.runPromise(
			findAllApplicationPatterns().pipe(Effect.provide(TestLayer))
		);

		expect(result).toEqual(successData);
		expect(getCallCount()).toBe(3); // Initial + 2 retries
	});

	it("should return fallback value after exhausting retries", async () => {
		const { repo, getCallCount } = createTrackingRepo(5);
		const config = createTestConfig(2);

		const TestLayer = Layer.mergeAll(
			Layer.succeed(ApplicationPatternRepositoryService, repo as any),
			Layer.succeed(ToolkitConfig, config),
			Layer.succeed(ToolkitLogger, {
				error: () => Effect.void,
				warn: () => Effect.void,
			} as any),
			Layer.effect(DatabaseService, createTestDbService())
		);

		const result = await Effect.runPromise(
			findAllApplicationPatterns().pipe(Effect.provide(TestLayer))
		);

		// Expect fallback value (empty array for findAllApplicationPatterns)
		expect(result).toEqual([]);
		expect(getCallCount()).toBe(3); // Initial + 2 retries
	});
});
