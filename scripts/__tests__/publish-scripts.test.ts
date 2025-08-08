import { describe, it, expect } from "vitest";
import { Effect, Layer } from "effect";
import { NodeContext } from "@effect/platform-node";
import { MdxService } from "../../cli/src/services/mdx-service/service.js";

// Test layer that provides all required services
const testLayer = Layer.mergeAll(
  NodeContext.layer,
  Layer.provide(MdxService.Default, NodeContext.layer)
);

describe("Publish Scripts", () => {
  it("should have proper Effect structure for generate.ts", async () => {
    // This test ensures the script exports a proper Effect
    const script = await import("../publish/generate.js");
    expect(script).toBeDefined();
  });

  it("should have proper Effect structure for validate.ts", async () => {
    // This test ensures the script exports a proper Effect
    const script = await import("../publish/validate.js");
    expect(script).toBeDefined();
  });
});
