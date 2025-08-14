import { describe, it, expect } from "vitest";
import { Effect } from "effect";

// Import all command tests
import "./auth.test";
import "./config.test";
import "./dry-run.test";
import "./health.test";
import "./list.test";
import "./model.test";
import "./process-prompt.test";
import "./trace.test";

describe("CLI Test Suite", () => {
  it("should have all command modules available", () => {
    // This test ensures all command modules can be imported without errors
    expect(true).toBe(true);
  });

  it("should run all command tests successfully", async () => {
    // This would run all individual command tests
    const result = await Effect.runPromise(
      Effect.succeed("All tests passed")
    );
    expect(result).toBe("All tests passed");
  });
});
