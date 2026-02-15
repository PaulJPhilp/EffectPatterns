import { Effect } from "effect";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PatternApi } from "../service.js";

const runPatternApi = <A>(effect: Effect.Effect<A, Error, PatternApi>) =>
  Effect.runPromise(effect.pipe(Effect.provide(PatternApi.Default)));

describe("PatternApi Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.PATTERN_API_KEY;
    delete process.env.EP_API_KEY_FILE;
    delete process.env.EP_CONFIG_FILE;
    delete process.env.XDG_CONFIG_HOME;
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

  it("reads api key from EP_API_KEY_FILE when PATTERN_API_KEY is not set", async () => {
    process.env.EFFECT_PATTERNS_API_URL = "https://example.test";
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ep-cli-api-key-file-"));
    const keyFile = path.join(tmpDir, "api-key.txt");
    await fs.writeFile(keyFile, "file-key\n", "utf8");
    process.env.EP_API_KEY_FILE = keyFile;

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ count: 0, patterns: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );

    await runPatternApi(
      Effect.gen(function* () {
        const api = yield* PatternApi;
        return yield* api.search({ query: "retry" });
      })
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({
      "x-api-key": "file-key",
    });

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("prefers PATTERN_API_KEY over file-based key sources", async () => {
    process.env.EFFECT_PATTERNS_API_URL = "https://example.test";
    process.env.PATTERN_API_KEY = "env-key";

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ep-cli-api-key-precedence-"));
    const keyFile = path.join(tmpDir, "api-key.txt");
    await fs.writeFile(keyFile, "file-key\n", "utf8");
    process.env.EP_API_KEY_FILE = keyFile;

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ count: 0, patterns: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );

    await runPatternApi(
      Effect.gen(function* () {
        const api = yield* PatternApi;
        return yield* api.search({ query: "retry" });
      })
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({
      "x-api-key": "env-key",
    });

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("reads api key from default XDG config when available", async () => {
    process.env.EFFECT_PATTERNS_API_URL = "https://example.test";

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ep-cli-api-key-config-"));
    const configHome = path.join(tmpDir, "config-home");
    const configDir = path.join(configHome, "ep-cli");
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(
      path.join(configDir, "config.json"),
      JSON.stringify({ apiKey: "config-key" }),
      "utf8"
    );
    process.env.XDG_CONFIG_HOME = configHome;

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ count: 0, patterns: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );

    await runPatternApi(
      Effect.gen(function* () {
        const api = yield* PatternApi;
        return yield* api.search({ query: "retry" });
      })
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({
      "x-api-key": "config-key",
    });

    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
