import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PatternApi } from "../service.js";

const runPatternApi = <A>(effect: Effect.Effect<A, Error, PatternApi>) =>
  Effect.runPromise(effect.pipe(Effect.provide(PatternApi.Default)));

describe("PatternApi Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.PATTERN_API_KEY;
    delete process.env.EFFECT_PATTERNS_API_URL;
    delete process.env.EP_API_TIMEOUT_MS;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("searches patterns through HTTP API with query params and auth header", async () => {
    process.env.EFFECT_PATTERNS_API_URL = "https://example.test/";
    process.env.PATTERN_API_KEY = "test-key";

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            count: 1,
            patterns: [
              {
                id: "retry-failed-operations",
                title: "Retry failed operations",
                description: "Description",
                category: "error-handling",
                difficulty: "beginner",
                tags: ["retry"],
                examples: [],
                useCases: ["resilience"],
                relatedPatterns: [],
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );

    const results = await runPatternApi(
      Effect.gen(function* () {
        const api = yield* PatternApi;
        return yield* api.search({
          query: "retry",
          category: "error-handling",
          difficulty: "beginner",
          limit: 5,
        });
      })
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("retry-failed-operations");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://example.test/api/patterns?q=retry&category=error-handling&difficulty=beginner&limit=5"
    );
    expect(init.headers).toMatchObject({
      accept: "application/json",
      "x-api-key": "test-key",
    });
  });

  it("returns null for missing patterns", async () => {
    process.env.EFFECT_PATTERNS_API_URL = "https://example.test";

    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("not found", { status: 404 }));

    const result = await runPatternApi(
      Effect.gen(function* () {
        const api = yield* PatternApi;
        return yield* api.getById("missing-pattern");
      })
    );

    expect(result).toBeNull();
  });

  it("maps unauthorized responses to PATTERN_API_KEY guidance", async () => {
    process.env.EFFECT_PATTERNS_API_URL = "https://example.test";

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("unauthorized", { status: 401 })
    );

    await expect(
      runPatternApi(
        Effect.gen(function* () {
          const api = yield* PatternApi;
          return yield* api.search({ query: "retry" });
        })
      )
    ).rejects.toThrow(/PATTERN_API_KEY/);
  });
});
