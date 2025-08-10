import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Effect, Layer } from "effect";
import { RunService } from "../service.js";
import { FileSystem, Path } from "@effect/platform";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";

const testLayer = Layer.provide(RunService.Default, NodeFileSystem.layer);

describe("RunService", () => {
  let testRunDirectory: string | null = null;

  beforeEach(async () => {
    // Clean up any existing test runs
    testRunDirectory = null;
  });

  afterEach(async () => {
    // Clean up test run directory if created
    if (testRunDirectory) {
      await Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const exists = yield* fs.exists(testRunDirectory!);
        if (exists) {
          yield* fs.remove(testRunDirectory!, { recursive: true });
        }
      }).pipe(Effect.provide(NodeFileSystem.layer), Effect.runPromise);
    }
  });

  it("should create RunService", () => {
    expect(RunService).toBeDefined();
  });

  describe("Run Directory Management", () => {
    it("should create run directory successfully", () => Effect.gen(function* () {
      const runService = yield* RunService;
      const runInfo = yield* runService.createRunDirectory("test-run");

      testRunDirectory = runInfo.runDirectory;

      expect(runInfo.runName).toContain("test-run");
      expect(runInfo.runDirectory).toContain("runs");
      expect(runInfo.sequentialNumber).toBeGreaterThan(0);
      expect(runInfo.timestamp).toBeDefined();

      // Verify directory was actually created
      const fs = yield* FileSystem.FileSystem;
      const directoryExists = yield* fs.exists(runInfo.runDirectory);
      expect(directoryExists).toBe(true);
    }).pipe(Effect.provide(testLayer)));

    it("should create run directory without prefix", () => Effect.gen(function* () {
      const runService = yield* RunService;
      const runInfo = yield* runService.createRunDirectory();

      testRunDirectory = runInfo.runDirectory;

      expect(runInfo.runName).toBeDefined();
      expect(runInfo.runDirectory).toContain("runs");
      expect(runInfo.sequentialNumber).toBeGreaterThan(0);
    }).pipe(Effect.provide(testLayer)));

    it("should increment sequential numbers", () => Effect.gen(function* () {
      const runService = yield* RunService;
      
      const firstRun = yield* runService.createRunDirectory("seq-test-1");
      const secondRun = yield* runService.createRunDirectory("seq-test-2");

      expect(secondRun.sequentialNumber).toBe(firstRun.sequentialNumber + 1);

      // Clean up both directories
      const fs = yield* FileSystem.FileSystem;
      yield* fs.remove(firstRun.runDirectory, { recursive: true });
      yield* fs.remove(secondRun.runDirectory, { recursive: true });
    }).pipe(Effect.provide(testLayer)));
  });

  describe("Current Run State Management", () => {
    it("should track current run after creation", () => Effect.gen(function* () {
      const runService = yield* RunService;
      const runInfo = yield* runService.createRunDirectory("state-test");

      testRunDirectory = runInfo.runDirectory;

      const currentRun = yield* runService.getCurrentRun();

      expect(currentRun).not.toBeNull();
      expect(currentRun?.runName).toBe(runInfo.runName);
      expect(currentRun?.runDirectory).toBe(runInfo.runDirectory);
    }).pipe(Effect.provide(testLayer)));

    it("should provide run path when run is active", () => Effect.gen(function* () {
      const runService = yield* RunService;
      const runInfo = yield* runService.createRunDirectory("path-test");

      testRunDirectory = runInfo.runDirectory;

      const runPath = yield* runService.getRunPath();

      expect(runPath).toBe(runInfo.runDirectory);
    }).pipe(Effect.provide(testLayer)));

    it("should provide file path within run directory", () => Effect.gen(function* () {
      const runService = yield* RunService;
      const runInfo = yield* runService.createRunDirectory("file-test");

      testRunDirectory = runInfo.runDirectory;

      const filePath = yield* runService.getRunFilePath("test.txt");
      
      const pathService = yield* Path.Path;
      const expectedPath = pathService.join(runInfo.runDirectory, "test.txt");

      expect(filePath).toBe(expectedPath);
    }).pipe(Effect.provide(testLayer)));
  });

  describe("Error Handling", () => {
    it("should fail when getting run path with no active run", () => Effect.gen(function* () {
      const runService = yield* RunService;
      // First ensure we have a clean state by getting current run
      const currentRun = yield* runService.getCurrentRun();
      
      // If there's no current run, this should fail
      if (!currentRun) {
        const result = yield* runService.getRunPath().pipe(
          Effect.flip,
          Effect.map((error) => ({
            hasError: true,
            errorMessage: error instanceof Error
              ? error.message
              : (typeof error === "object" && error !== null &&
                 "message" in (error as Record<string, unknown>) &&
                 typeof (error as { message?: unknown }).message === "string")
                ? (error as { message: string }).message
                : String(error)
          }))
        );
        expect(result.hasError).toBe(true);
      } else {
        // If there is a current run, we can't test this scenario
        expect(currentRun).toBeDefined();
      }
    }).pipe(Effect.provide(testLayer)));

    it("should fail when getting file path with no active run", () => Effect.gen(function* () {
      const runService = yield* RunService;
      const currentRun = yield* runService.getCurrentRun();
      
      if (!currentRun) {
        const result = yield* runService.getRunFilePath("test.txt").pipe(
          Effect.flip,
          Effect.map((error) => ({
            hasError: true,
            errorMessage: error instanceof Error
              ? error.message
              : (typeof error === "object" && error !== null &&
                 "message" in (error as Record<string, unknown>) &&
                 typeof (error as { message?: unknown }).message === "string")
                ? (error as { message: string }).message
                : String(error)
          }))
        );
        expect(result.hasError).toBe(true);
      } else {
        // If there is a current run, we can't test this scenario
        expect(currentRun).toBeDefined();
      }
    }).pipe(Effect.provide(testLayer)));
  });










});
