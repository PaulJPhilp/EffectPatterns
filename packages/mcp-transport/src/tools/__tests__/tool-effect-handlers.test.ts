import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import { MCPApiService } from "../../services/MCPApiService.js";
import { MCPCacheService } from "../../services/MCPCacheService.js";
import { MCPLoggerService } from "../../services/MCPLoggerService.js";
import { getPatternEffect } from "../handlers/get-pattern.js";
import { searchPatternsEffect } from "../handlers/search-patterns.js";
import {
  getSkillEffect,
  listSkillsEffect,
} from "../handlers/simple-handlers.js";
import type { ApiResult } from "../tool-types.js";

const MOCK_PATTERN = {
  id: "effect-service",
  title: "Effect Service Pattern",
  category: "service",
  difficulty: "intermediate",
  description: "Create composable services with Effect.Service",
  examples: [
    {
      code: 'const svc = Effect.Service("Svc")({});',
      language: "typescript",
      description: "Basic service",
    },
  ],
  useCases: ["Dependency injection"],
  tags: ["service", "di"],
  relatedPatterns: ["layer-composition"],
};

const MOCK_SEARCH_RESULTS = {
  count: 2,
  patterns: [
    MOCK_PATTERN,
    { ...MOCK_PATTERN, id: "layer-composition", title: "Layer Composition" },
  ],
};

const MOCK_PATTERN_DETAIL = {
  pattern: {
    ...MOCK_PATTERN,
    summary: "Create composable services",
  },
};

const MOCK_SKILL = {
  slug: "error-handling-skill",
  name: "Error Handling Skill",
  description: "Master error handling in Effect",
  category: "error-handling",
  patternCount: 5,
  version: 1,
  content: "# Error Handling\n\nThis skill covers...",
};

const MOCK_SKILLS_RESULTS = {
  count: 1,
  skills: [MOCK_SKILL],
};

const makeTestLayer = (
  callApi: (
    endpoint: string,
    method?: "GET" | "POST",
    data?: unknown,
  ) => Effect.Effect<ApiResult<unknown>>,
) =>
  Layer.mergeAll(
    Layer.succeed(
      MCPApiService,
      {
        callApi,
      } as never,
    ),
    MCPCacheService.Default,
    Layer.succeed(
      MCPLoggerService,
      {
        log: () => Effect.void,
        isDebug: () => Effect.succeed(false),
      } as never,
    ),
  );

describe("Effect tool handlers", () => {
  it("searchPatternsEffect executes successfully with Effect-provided services", async () => {
    const layer = makeTestLayer(() =>
      Effect.succeed({ ok: true as const, data: MOCK_SEARCH_RESULTS }),
    );

    const result = await Effect.runPromise(
      searchPatternsEffect({ q: "service", format: "markdown" }).pipe(
        Effect.provide(layer),
      ),
    );

    expect(result.content.length).toBeGreaterThan(0);
    expect(result.isError).not.toBe(true);
  });

  it("searchPatternsEffect uses the cache on repeated calls in the same Effect runtime", async () => {
    let callCount = 0;
    const layer = makeTestLayer(() => {
      callCount++;
      return Effect.succeed({
        ok: true as const,
        data: MOCK_SEARCH_RESULTS,
      });
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const first = yield* searchPatternsEffect({
          q: "service",
          format: "markdown",
        });
        const second = yield* searchPatternsEffect({
          q: "service",
          format: "markdown",
        });
        return { first, second };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.first.content.length).toBeGreaterThan(0);
    expect(result.second.content.length).toBeGreaterThan(0);
    expect(callCount).toBe(1);
  });

  it("searchPatternsEffect returns the zero-results discovery card through the Effect path", async () => {
    const layer = makeTestLayer((endpoint) => {
      if (endpoint.includes("limit=1000")) {
        return Effect.succeed({
          ok: true as const,
          data: MOCK_SEARCH_RESULTS,
        });
      }

      return Effect.succeed({
        ok: true as const,
        data: { count: 0, patterns: [] },
      });
    });

    const result = await Effect.runPromise(
      searchPatternsEffect({
        q: "nonexistent-xyz",
        format: "markdown",
      }).pipe(Effect.provide(layer)),
    );

    const text = result.content.map((block) => block.text).join("");
    expect(text).toContain("No Patterns Found");
  });

  it("searchPatternsEffect still performs detail-fetch fallback for incomplete search summaries", async () => {
    const layer = makeTestLayer((endpoint) => {
      if (endpoint.startsWith("/patterns?")) {
        return Effect.succeed({
          ok: true as const,
          data: {
            count: 1,
            patterns: [
              {
                id: "effect-service",
                title: "Effect Service Pattern",
                category: "service",
                difficulty: "intermediate",
                description: "Create composable services with Effect.Service",
                examples: [],
                useCases: [],
                tags: ["service"],
              },
            ],
          },
        });
      }

      if (endpoint === "/patterns/effect-service") {
        return Effect.succeed({
          ok: true as const,
          data: MOCK_PATTERN_DETAIL,
        });
      }

      return Effect.succeed({ ok: false as const, error: "Not found", status: 404 });
    });

    const result = await Effect.runPromise(
      searchPatternsEffect({ q: "service", format: "markdown" }).pipe(
        Effect.provide(layer),
      ),
    );

    const text = result.content.map((block) => block.text).join("");
    expect(text).toContain("Effect Service Pattern");
  });

  it("getPatternEffect returns the same shaped result through the Effect path", async () => {
    const layer = makeTestLayer((endpoint) =>
      endpoint.startsWith("/patterns/")
        ? Effect.succeed({
            ok: true as const,
            data: MOCK_PATTERN_DETAIL,
          })
        : Effect.succeed({ ok: false as const, error: "Not found", status: 404 }),
    );

    const result = await Effect.runPromise(
      getPatternEffect({
        id: "effect-service",
        format: "json",
        includeStructuredDetails: true,
      }).pipe(Effect.provide(layer)),
    );

    const jsonBlock = result.content.find(
      (block) => "mimeType" in block && block.mimeType === "application/json",
    );
    expect(jsonBlock).toBeDefined();
    expect(result.structuredContent).toBeDefined();
  });

  it("listSkillsEffect and getSkillEffect execute successfully with provided layers", async () => {
    const layer = makeTestLayer((endpoint) => {
      if (endpoint.startsWith("/skills?")) {
        return Effect.succeed({
          ok: true as const,
          data: MOCK_SKILLS_RESULTS,
        });
      }

      if (endpoint === `/skills/${encodeURIComponent(MOCK_SKILL.slug)}`) {
        return Effect.succeed({
          ok: true as const,
          data: { skill: MOCK_SKILL },
        });
      }

      return Effect.succeed({ ok: false as const, error: "Not found", status: 404 });
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const list = yield* listSkillsEffect({ q: "error", format: "markdown" });
        const skill = yield* getSkillEffect({
          slug: MOCK_SKILL.slug,
          format: "markdown",
        });
        return { list, skill };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.list.content.length).toBeGreaterThan(0);
    expect(result.skill.content.length).toBeGreaterThan(0);
  });

  it("active handler files do not contain nested Effect.runPromise calls", () => {
    const files = [
      "../handlers/search-patterns.ts",
      "../handlers/get-pattern.ts",
      "../handlers/simple-handlers.ts",
    ];

    for (const relativePath of files) {
      const filePath = fileURLToPath(new URL(relativePath, import.meta.url));
      const source = readFileSync(filePath, "utf8");
      expect(source).not.toMatch(/Effect\.runPromise\(/);
    }
  });
});
