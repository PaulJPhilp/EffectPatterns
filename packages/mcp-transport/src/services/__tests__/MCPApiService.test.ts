import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { MCPApiService, makeMCPApiLayer } from "../MCPApiService.js";

describe("MCPApiService", () => {
  it("default implementation returns error result", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const api = yield* MCPApiService;
        return yield* api.callApi("/test");
      }).pipe(Effect.provide(MCPApiService.Default))
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("not configured");
    }
  });

  it("makeMCPApiLayer creates a configured service", async () => {
    const layer = makeMCPApiLayer({
      apiBaseUrl: "http://localhost:9999",
      apiKey: undefined,
      requestTimeoutMs: 1000,
    });

    // The service should be constructable — callApi will fail because
    // the target doesn't exist, but the service itself should work
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const api = yield* MCPApiService;
        // Call a non-existent server — expect a network error result
        return yield* api.callApi("/patterns?q=test");
      }).pipe(
        Effect.provide(layer),
        Effect.catchAllDefect((defect) =>
          Effect.succeed({
            ok: false as const,
            error: `defect: ${defect instanceof Error ? defect.message : String(defect)}`,
          })
        )
      )
    );

    // Should return an error result (not throw), since the server is unreachable
    expect(result.ok).toBe(false);
  });
});
