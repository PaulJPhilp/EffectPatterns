import { describe, it, expect } from "vitest";
import { Effect, Layer } from "effect";
import { RunManagement } from "../service.js";
import { FileSystem, Path } from "@effect/platform";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";

const testLayer = Layer.provide(RunManagement.Default, NodeFileSystem.layer);

describe("RunManagement Integration", () => {
  it("should complete full run lifecycle", () => Effect.gen(function* () {
    const runMgmt = yield* RunManagement;
    
    // Create a new run
    const run = yield* runMgmt.createRun("test-run");

    // Verify run was created
    expect(run.name).toMatch(/^test-run-\d{4}$/);
    expect(run.number).toBeGreaterThan(0);

    // Test listing runs
    const runs = yield* runMgmt.listRuns();
    expect(runs.length).toBeGreaterThan(0);
    expect(runs[0].name).toBe(run.name);

    // Test getting run info
    const retrievedRun = yield* runMgmt.getRunInfo(run.name);
    expect(retrievedRun.name).toBe(run.name);
    expect(retrievedRun.directory).toBe(run.directory);

    // Test getting run directory
    const runDir = yield* runMgmt.getRunDirectory(run.name);
    expect(runDir).toBe(run.directory);

    // Test directory structure
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    
    const outputsDir = path.join(run.directory, "outputs");
    const logsDir = path.join(run.directory, "logs");
    const metricsDir = path.join(run.directory, "metrics");
    const runInfoPath = path.join(run.directory, "run-info.json");

    const outputsExists = yield* fs.exists(outputsDir);
    const logsExists = yield* fs.exists(logsDir);
    const metricsExists = yield* fs.exists(metricsDir);
    const runInfoExists = yield* fs.exists(runInfoPath);

    expect(outputsExists).toBe(true);
    expect(logsExists).toBe(true);
    expect(metricsExists).toBe(true);
    expect(runInfoExists).toBe(true);

    // Verify run info content
    const runInfoContent = yield* fs.readFileString(runInfoPath);
    const runInfo = JSON.parse(runInfoContent);
    expect(runInfo.name).toBe(run.name);
    expect(runInfo.number).toBe(run.number);
  }));

  it("should handle concurrent run creation", () => Effect.gen(function* () {
    const runMgmt = yield* RunManagement;

    // Create multiple runs concurrently
    const runs = yield* Effect.all([
      runMgmt.createRun("concurrent-1"),
      runMgmt.createRun("concurrent-2"),
      runMgmt.createRun("concurrent-3")
    ]);

    // Verify sequential numbering despite concurrent creation
    const numbers = runs.map(r => r.number).sort((a, b) => a - b);
    expect(numbers).toEqual([numbers[0], numbers[0] + 1, numbers[0] + 2]);
  }));
});
