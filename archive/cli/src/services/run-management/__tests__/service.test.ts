import { describe, it, expect } from "vitest";
import { Effect, Layer } from "effect";
import { RunManagement } from "../service.js";
import type { RunManagementApi } from "../api.js";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as FileSystem from "@effect/platform/FileSystem";

// Use RunManagement.Default with NodeFileSystem.layer
// Modern Effect.Service pattern automatically provides .Default layer
const testLayer = Layer.provide(RunManagement.Default, NodeFileSystem.layer);

describe("RunManagement Service", () => {
  it("should create a run with sequential numbering", () => Effect.gen(function* () {
    const runManagement = yield* RunManagement;
    const run1 = yield* runManagement.createRun();
    
    const run2 = yield* runManagement.createRun();

    expect(run1.number).toBe(1);
    expect(run2.number).toBe(2);
    expect(run1.name).toContain("run_0001_");
    expect(run2.name).toContain("run_0002_");
  }));

  it("should create a run with custom prefix", () => Effect.gen(function* () {
    const runManagement = yield* RunManagement;
    const run = yield* runManagement.createRun("test");

    expect(run.name).toContain("test_");
  }));

  it("should list runs in descending order", () => Effect.gen(function* () {
    const runManagement = yield* RunManagement;
    yield* runManagement.createRun("first");
    
    yield* runManagement.createRun("second");
    
    const runs = yield* runManagement.listRuns();

    expect(runs.length).toBeGreaterThanOrEqual(2);
    expect(runs[0].number).toBeGreaterThan(runs[1].number);
  }));

  it("should create run directory structure", () => Effect.gen(function* () {
    const runManagement = yield* RunManagement;
    const run = yield* runManagement.createRun();

    const fs = yield* FileSystem.FileSystem;
    
    // Check standard directories exist
    const outputsDir = `${run.directory}/outputs`;
    const logsDir = `${run.directory}/logs`;
    const metricsDir = `${run.directory}/metrics`;

    const outputsExists = yield* fs.exists(outputsDir);
    const logsExists = yield* fs.exists(logsDir);
    const metricsExists = yield* fs.exists(metricsDir);

    expect(outputsExists).toBe(true);
    expect(logsExists).toBe(true);
    expect(metricsExists).toBe(true);
  }));

  it("should persist run info", () => Effect.gen(function* () {
    const runManagement = yield* RunManagement;
    const run = yield* runManagement.createRun();

    const retrieved = yield* runManagement.getRunInfo(run.name);

    expect(String(retrieved.name)).toBe(String(run.name));
    expect(Number(retrieved.number)).toBe(Number(run.number));
    expect(retrieved.timestamp).toBeInstanceOf(Date);
  }));

  it("should get run directory", () => Effect.gen(function* () {
    const runManagement = yield* RunManagement;
    const run = yield* runManagement.createRun();
    
    const directory = yield* runManagement.getRunDirectory(run.name);

    expect(String(directory)).toBe(String(run.directory));
  }));

  it("should handle state persistence across runs", () => Effect.gen(function* () {
    // Create multiple runs and verify sequential numbering persists
    const runManagement = yield* RunManagement;
    const run1 = yield* runManagement.createRun();
    const run2 = yield* runManagement.createRun();
    const run3 = yield* runManagement.createRun();

    expect(Number(run1.number) + 1).toBe(Number(run2.number));
    expect(Number(run2.number) + 1).toBe(Number(run3.number));
  }));
});
