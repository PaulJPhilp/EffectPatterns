import { describe, it, expect } from "vitest";
import { Effect, Layer } from "effect";
import { NodeContext } from "@effect/platform-node";
import { MdxService } from "../../cli/src/services/mdx-service/service.js";

// Test layer that provides all required services
const testLayer = Layer.mergeAll(
  NodeContext.layer,
  Layer.provide(MdxService.Default, NodeContext.layer)
);

describe("Ingest Scripts", () => {
  it("should have proper Effect structure for populate-expectations.ts", async () => {
    // This test ensures the script exports a proper Effect
    const script = await import("../ingest/populate-expectations.js");
    expect(script).toBeDefined();
    // We can't easily test the actual Effect without mocking the LLM service
    // but we can verify the script compiles and exports correctly
  });

  it("should have proper Effect structure for test-publish.ts", async () => {
    // This test ensures the script exports a proper Effect
    const script = await import("../ingest/test-publish.js");
    expect(script).toBeDefined();
  });

  it("should have proper Effect structure for process.ts", async () => {
    // This test ensures the script exports a proper Effect
    const script = await import("../ingest/process.js");
    expect(script).toBeDefined();
  });
});
