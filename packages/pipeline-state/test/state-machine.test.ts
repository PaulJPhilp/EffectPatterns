import { describe, it, expect } from "vitest";
import { Effect, Layer } from "effect";
import {
  PipelineStateMachine,
  StateStore,
  createInitialPatternState,
  PatternMetadata,
  StateError,
} from "../src/index.js";

describe("PipelineStateMachine", () => {
  const testMetadata: PatternMetadata = {
    id: "test-pattern",
    title: "Test Pattern",
    rawPath: "content/new/raw/test-pattern.mdx",
    srcPath: "content/new/src/test-pattern.ts",
  };

  // Note: These are placeholder tests that demonstrate the API
  // Full integration tests would require mocking the state store

  it("should export PipelineStateMachine", () => {
    expect(PipelineStateMachine).toBeDefined();
  });

  it("should export StateStore", () => {
    expect(StateStore).toBeDefined();
  });

  it("should have correct workflow steps", () => {
    const state = createInitialPatternState("test", testMetadata);
    expect(state.currentStep).toBe("draft");
    expect(state.status).toBe("draft");
    expect(Object.keys(state.steps)).toEqual([
      "draft",
      "ingested",
      "tested",
      "validated",
      "published",
      "finalized",
    ]);
  });

  it("should initialize pattern state correctly", () => {
    const state = createInitialPatternState("test-pattern", testMetadata);
    expect(state.id).toBe("test-pattern");
    expect(state.metadata.title).toBe("Test Pattern");
    expect(state.steps.draft.status).toBe("completed");
    expect(state.steps.ingested.status).toBe("pending");
  });

  it("should have all required step states", () => {
    const state = createInitialPatternState("test", testMetadata);
    const steps = Object.keys(state.steps);
    expect(steps.length).toBe(6);
    expect(steps).toContain("draft");
    expect(steps).toContain("ingested");
    expect(steps).toContain("tested");
    expect(steps).toContain("validated");
    expect(steps).toContain("published");
    expect(steps).toContain("finalized");
  });

  it("should track checkpoints", () => {
    const state = createInitialPatternState("test", testMetadata);
    expect(state.steps.tested.checkpoints).toEqual([]);
  });

  it("should track errors", () => {
    const state = createInitialPatternState("test", testMetadata);
    expect(state.errors).toEqual([]);
  });

  it("should initialize with timestamps", () => {
    const state = createInitialPatternState("test", testMetadata);
    expect(state.createdAt).toBeDefined();
    expect(state.updatedAt).toBeDefined();
    expect(new Date(state.createdAt).getTime()).toBeGreaterThan(0);
  });

  it("should support attempts tracking", () => {
    const state = createInitialPatternState("test", testMetadata);
    expect(state.steps.tested.attempts).toBe(0);
  });
});
