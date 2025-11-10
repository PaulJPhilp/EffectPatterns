import { Effect, Ref } from "effect";
import type { PatternsServiceAPI } from "./api";
import { CacheError, MemoryRouterError, PatternSearchError } from "./errors";
import {
  buildApiHeaders,
  buildCacheKey,
  createCacheEntry,
  isCacheValid,
  parseMemoriesToPatterns,
} from "./helpers";
import type {
  CacheEntry,
  CacheStats,
  MemoryRouterRequest,
  MemoryRouterResponse,
  Pattern,
  PatternSearchResult,
} from "./types";

/**
 * PatternsService Implementation
 * Manages retrieval of Effect-TS patterns from Supermemory API
 */

const CACHE_EXPIRY_MS = 1000 * 60 * 5; // 5 minutes
const BASE_URL = "https://api.supermemory.ai/v1";

interface PatternsServiceContext {
  apiKey: string;
  projectId: string;
  cache: Ref.Ref<Map<string, CacheEntry<PatternSearchResult>>>;
}

/**
 * Create PatternsService implementation
 */
const makePatternsService = Effect.gen(function* () {
  const apiKey = process.env.SUPERMEMORY_API_KEY || "";
  const projectId = process.env.SUPERMEMORY_PROJECT_ID || "effect-patterns";

  if (!apiKey) {
    yield* Effect.fail(
      new MemoryRouterError({
        message:
          "SUPERMEMORY_API_KEY environment variable is required. Set it in your .env.local file.",
      })
    );
  }

  const cache = yield* Ref.make<Map<string, CacheEntry<PatternSearchResult>>>(
    new Map()
  );

  const context: PatternsServiceContext = {
    apiKey,
    projectId,
    cache,
  };

  /**
   * Query the Supermemory memory router API
   */
  const queryMemoryRouter = (
    request: MemoryRouterRequest
  ): Effect.Effect<MemoryRouterResponse, MemoryRouterError> =>
    Effect.gen(function* () {
      const url = `${BASE_URL}/memory-router/search`;
      const headers = buildApiHeaders(context.apiKey, context.projectId);

      const body = {
        query: request.query,
        limit: request.limit || 10,
        threshold: request.threshold || 0.5,
        rerank: request.rerank || false,
        container: request.container || undefined,
      };

      return yield* Effect.tryPromise({
        try: () =>
          fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
          }).then(async (response) => {
            if (!response.ok) {
              throw new Error(
                `Supermemory API error: ${response.status} ${response.statusText}`
              );
            }
            return (await response.json()) as MemoryRouterResponse;
          }),
        catch: (error) =>
          new MemoryRouterError({
            message: "Memory router API request failed",
            cause: error,
          }),
      });
    });

  /**
   * Search for patterns in Supermemory
   */
  const searchPatterns = (
    query: string,
    options?: Partial<MemoryRouterRequest>
  ): Effect.Effect<PatternSearchResult, PatternSearchError> =>
    Effect.gen(function* () {
      const cacheKey = buildCacheKey(query, options?.limit || 10);

      // Check cache first
      const cachedEntry = yield* Ref.get(context.cache).pipe(
        Effect.map((c) => c.get(cacheKey))
      );

      if (cachedEntry && isCacheValid(cachedEntry)) {
        return cachedEntry.data;
      }

      // Fetch from API
      const response = yield* queryMemoryRouter({
        query,
        projectId: context.projectId,
        limit: options?.limit || 10,
        threshold: options?.threshold || 0.5,
        rerank: options?.rerank ?? false,
      }).pipe(
        Effect.mapError(
          (error) =>
            new PatternSearchError({
              query,
              cause: error,
            })
        )
      );

      const patterns = parseMemoriesToPatterns(response);
      const result: PatternSearchResult = {
        patterns,
        totalCount: response.totalCount,
        query,
        timestamp: Date.now(),
      };

      // Cache the result
      yield* Ref.update(context.cache, (c) =>
        new Map(c).set(cacheKey, createCacheEntry(result, CACHE_EXPIRY_MS))
      );

      return result;
    });

  /**
   * Get patterns by skill level
   */
  const getPatternsBySkillLevel = (
    skillLevel: "beginner" | "intermediate" | "advanced",
    query?: string
  ): Effect.Effect<Pattern[], PatternSearchError> =>
    Effect.gen(function* () {
      const searchQuery = query || skillLevel;
      const result = yield* searchPatterns(searchQuery);
      return result.patterns.filter((p) => p.skillLevel === skillLevel);
    });

  /**
   * Get patterns by use case
   */
  const getPatternsByUseCase = (
    useCase: string
  ): Effect.Effect<Pattern[], PatternSearchError> =>
    Effect.gen(function* () {
      const result = yield* searchPatterns(useCase, { limit: 20 });
      return result.patterns.filter((p) => p.useCase?.includes(useCase));
    });

  /**
   * Clear the cache
   */
  const clearCache = (): Effect.Effect<void, CacheError> =>
    Effect.gen(function* () {
      yield* Ref.set(context.cache, new Map());
    });

  /**
   * Get cache statistics
   */
  const getCacheStats = (): Effect.Effect<CacheStats, CacheError> =>
    Effect.gen(function* () {
      const c = yield* Ref.get(context.cache);
      return {
        size: c.size,
        entries: Array.from(c.keys()),
      };
    });

  return {
    searchPatterns,
    getPatternsBySkillLevel,
    getPatternsByUseCase,
    clearCache,
    getCacheStats,
  } satisfies PatternsServiceAPI;
});

/**
 * PatternsService Effect.Service implementation
 */
export class PatternsService extends Effect.Service<PatternsService>()(
  "PatternsService",
  {
    scoped: makePatternsService,
  }
) {}
