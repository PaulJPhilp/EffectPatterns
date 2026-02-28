import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("otel-init", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("should return null when OTEL_ENABLED=false", async () => {
    process.env.OTEL_ENABLED = "false";
    // Dynamic import to pick up env changes
    const { initOtel } = await import("../otel-init.js");
    const sdk = initOtel();
    expect(sdk).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("disabled")
    );
  });

  it("should return SDK instance when enabled", async () => {
    process.env.OTEL_ENABLED = "true";
    process.env.OTLP_ENDPOINT = "http://localhost:4318/v1/traces";
    const { initOtel } = await import("../otel-init.js");
    const sdk = initOtel();
    expect(sdk).not.toBeNull();
    // Clean up
    if (sdk) {
      await sdk.shutdown();
    }
  });
});
