
import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import { ToolkitConfig } from "../src/services/config.js";
import {
    ApplicationPatternRepositoryService,
    DatabaseService,
    findAllApplicationPatterns
} from "../src/services/database.js";
import { ToolkitLogger } from "../src/services/logger.js";

// Mock Repository helper
const createMockRepo = (fails: number, successData: any = []) => {
  let callCount = 0;
  return {
    findAll: vi.fn(async () => {
      callCount++;
      if (callCount <= fails) {
        throw new Error("Simulated DB connection failure");
      }
      return successData;
    }),
    getCallCount: () => callCount
  };
};

// Mock Config helper
const createMockConfig = (retries: number, delay: number = 5) => ({
  getDbRetryAttempts: () => Effect.succeed(retries),
  getDbRetryDelayMs: () => Effect.succeed(delay),
  getMaxConcurrentDbRequests: () => Effect.succeed(10), // Minimal semaphore size
  isLoggingEnabled: () => Effect.succeed(false),
} as unknown as ToolkitConfig);

// Mock Database Service helper (needs semaphore)
const createMockDbService = () => Effect.gen(function*() {
  const semaphore = yield* Effect.makeSemaphore(10);
  return { semaphore } as unknown as DatabaseService;
});

describe("Database Resilience", () => {
  
  it("should retry operations until success within limit", async () => {
    // Setup: Fail 2 times, then succeed
    // Config: 3 retries allowed
    const successData = [{ id: "test-pattern", slug: "test-pattern" }];
    const mockRepo = createMockRepo(2, successData);
    const mockConfig = createMockConfig(3);

    const TestLayer = Layer.mergeAll(
      Layer.succeed(ApplicationPatternRepositoryService, mockRepo as any),
      Layer.succeed(ToolkitConfig, mockConfig),
      Layer.succeed(ToolkitLogger, { error: () => Effect.void, warn: () => Effect.void } as any),
      Layer.effect(DatabaseService, createMockDbService())
    );

    const result = await Effect.runPromise(
      findAllApplicationPatterns().pipe(Effect.provide(TestLayer))
    );

    expect(result).toEqual(successData);
    expect(mockRepo.findAll).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it("should return fallback value after exhausting retries", async () => {
    // Setup: Fail 5 times (permanent failure)
    // Config: 2 retries allowed
    const mockRepo = createMockRepo(5);
    const mockConfig = createMockConfig(2);

    const TestLayer = Layer.mergeAll(
      Layer.succeed(ApplicationPatternRepositoryService, mockRepo as any),
      Layer.succeed(ToolkitConfig, mockConfig),
      Layer.succeed(ToolkitLogger, { error: () => Effect.void, warn: () => Effect.void } as any),
      Layer.effect(DatabaseService, createMockDbService())
    );

    const result = await Effect.runPromise(
      findAllApplicationPatterns().pipe(Effect.provide(TestLayer))
    );

    // Expect fallback value (empty array for findAllApplicationPatterns)
    expect(result).toEqual([]);
    expect(mockRepo.findAll).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });
});
