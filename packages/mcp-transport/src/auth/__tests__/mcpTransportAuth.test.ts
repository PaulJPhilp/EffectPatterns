import { describe, expect, it } from "vitest";
import { validateTransportApiKey } from "../mcpTransportAuth";

describe("validateTransportApiKey", () => {
  it("requires OAuth when no API key is provided", () => {
    const result = validateTransportApiKey(undefined, "configured-key");

    expect(result).toEqual({
      ok: true,
      authenticatedByApiKey: false,
    });
  });

  it("rejects provided API key when server key is not configured", () => {
    const result = validateTransportApiKey("some-key", undefined);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("not configured");
    }
  });

  it("rejects incorrect API key", () => {
    const result = validateTransportApiKey("wrong-key", "correct-key");

    expect(result).toEqual({
      ok: false,
      error: "Invalid API key",
    });
  });

  it("accepts exact matching API key", () => {
    const result = validateTransportApiKey("correct-key", "correct-key");

    expect(result).toEqual({
      ok: true,
      authenticatedByApiKey: true,
    });
  });
});
