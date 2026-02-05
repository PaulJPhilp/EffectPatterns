/**
 * Server Initialization - Effect Layer Composition
 *
 * Composes all Effect layers for the MCP server:
 * ConfigLayer -> TracingLayer -> DatabaseLayer -> PatternsLayer -> AppLayer
 *
 * This module sets up the runtime and provides a singleton
 * for running Effects in Next.js route handlers.
 */

// biome-ignore assist/source/organizeImports: <>
import { AnalysisServiceLive } from "@effect-patterns/analysis-core";
import {
    DatabaseLayer,
    findEffectPatternBySlug,
    searchEffectPatterns,
    ToolkitConfig,
    ToolkitLogger
} from "@effect-patterns/toolkit";
import { Cause, Effect, Exit, Layer, Option } from "effect";
import { MCPCacheService } from "../services/cache";
import { CircuitBreakerService } from "../services/circuit-breaker";
import { MCPConfigService } from "../services/config";
import { MCPLoggerService } from "../services/logger";
import { PatternGeneratorService } from "../services/pattern-generator";
import { MCRateLimitService } from "../services/rate-limit";
import { ReviewCodeService } from "../services/review-code";
import { MCPTierService } from "../services/tier";
import { MCPValidationService } from "../services/validation";
import { TracingLayerLive } from "../tracing/otlpLayer";

/**
 * Patterns service - provides database-backed pattern access
 */
const makePatternsService = Effect.gen(function* () {
  yield* Effect.logInfo("[Patterns] Initializing database-backed patterns service");

  // PERFORMANCE: Import cache service for query result caching
  const cache = yield* MCPCacheService;
  const circuitBreaker = yield* CircuitBreakerService;
  const config = yield* MCPConfigService;

  /**
   * Get all patterns
   *
   * PERFORMANCE: Cached with 1-hour TTL (popular query)
   * RESILIENCE: Protected by circuit breaker against database failures
   */
  const getAllPatterns = () =>
    cache.getOrSet(
      "patterns:all", // Cache key
      () => circuitBreaker.execute(
        "database-get-all-patterns",
        searchEffectPatterns({}),
        config.circuitBreakerDb
      ),
      3600000 // 1 hour TTL in milliseconds
    );

  /**
   * Get pattern by ID/slug
   *
   * PERFORMANCE: Cached with 24-hour TTL (stable data)
   * RESILIENCE: Protected by circuit breaker against database failures
   */
  const getPatternById = (id: string) =>
    cache.getOrSet(
      `patterns:by-id:${id}`, // Unique cache key per pattern
      () =>
        Effect.gen(function* () {
          const pattern = yield* circuitBreaker.execute(
            "database-get-pattern-by-id",
            findEffectPatternBySlug(id),
            config.circuitBreakerDb
          ).pipe(
            Effect.catchAll(() => {
              // If circuit is open or database lookup fails, return null (pattern not found)
              return Effect.succeed(null);
            })
          );
          return pattern ?? undefined;
        }),
      86400000 // 24 hours TTL in milliseconds
    );

  /**
   * Search patterns
   *
   * PERFORMANCE: Cached with 1-hour TTL
   * Cache key includes all search parameters to differentiate searches
   * RESILIENCE: Protected by circuit breaker against database failures
   */
  const searchPatterns = (params: {
    query?: string;
    category?: string;
    skillLevel?: "beginner" | "intermediate" | "advanced";
    limit?: number;
  }) =>
    cache.getOrSet(
      `patterns:search:${JSON.stringify(params)}`, // Cache key includes all params
      () =>
        circuitBreaker.execute(
          "database-search-patterns",
          searchEffectPatterns({
            query: params.query,
            category: params.category,
            skillLevel: params.skillLevel,
            limit: params.limit,
          }),
          config.circuitBreakerDb
        ),
      3600000 // 1 hour TTL in milliseconds
    );

  return {
    getAllPatterns,
    getPatternById,
    searchPatterns,
  };
});

export class PatternsService extends Effect.Service<PatternsService>()(
  "PatternsService",
  {
    scoped: makePatternsService,
    dependencies: [DatabaseLayer, MCPCacheService.Default, CircuitBreakerService.Default, MCPConfigService.Default],
  }
) { }

/**
 * Get NodeContext layer (lazy import to avoid issues in tests)
 * 
 * platform-node is an implementation detail, not a service.
 * This function lazily imports it only when needed in production.
 */
function getNodeContextLayer(): Layer.Layer<never, never, never> {
  // Lazy import to avoid module resolution issues in tests
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NodeContext } = require("@effect/platform-node");
  return NodeContext.layer;
}

/**
 * App Layer - Full application layer composition
 *
 * Composes: Config -> Tracing -> Database -> Patterns
 * Services are self-managed via Effect.Service pattern.
 * 
 * Note: NodeContext.layer is included for production (Next.js runtime).
 * For tests, use TestAppLayer which excludes platform-node implementation.
 */
export const AppLayer = Layer.mergeAll(
  getNodeContextLayer(),
  MCPConfigService.Default,
  MCPLoggerService.Default,
  CircuitBreakerService.Default,
  MCPTierService.Default,
  MCPValidationService.Default,
  MCRateLimitService.Default,
  MCPCacheService.Default,
  DatabaseLayer,
  TracingLayerLive,
  AnalysisServiceLive,
  PatternGeneratorService.Default,
  ReviewCodeService.Default,
  ToolkitConfig.Default,
  ToolkitLogger.Default
);

/**
 * Test App Layer - Application layer without platform-node implementation
 *
 * Use this in integration tests to avoid importing platform-node
 * (which is an implementation detail, not a service).
 * 
 * platform-node provides NodeContext which is needed for Node.js-specific
 * functionality in production, but not required for testing business logic.
 */
export const TestAppLayer = Layer.mergeAll(
  // NodeContext.layer excluded - platform-node is implementation detail
  MCPConfigService.Default,
  MCPLoggerService.Default,
  CircuitBreakerService.Default,
  MCPTierService.Default,
  MCPValidationService.Default,
  MCRateLimitService.Default,
  MCPCacheService.Default,
  DatabaseLayer,
  PatternsService.Default,
  TracingLayerLive,
  AnalysisServiceLive,
  PatternGeneratorService.Default,
  ReviewCodeService.Default,
  ToolkitConfig.Default,
  ToolkitLogger.Default
);

/**
 * Helper to run an Effect with the app runtime
 *
 * Use this in Next.js route handlers to execute Effects.
 * This provides all layers to the effect before running it.
 * 
 * Wraps the entire execution in a try-catch to prevent function crashes.
 * All errors (including initialization errors) are caught and converted to
 * proper Error instances that can be handled by route handlers.
 */
export const runWithRuntime = <A, E>(
  effect: Effect.Effect<
    A,
    E,
    any
  >
): Promise<A> => {
  const runnable = effect.pipe(
    Effect.provide(AppLayer),
    Effect.scoped
  ) as Effect.Effect<A, E, never>;

  return Effect.runPromiseExit(runnable).then((exit) => {
    if (Exit.isSuccess(exit)) {
      return exit.value;
    }

    const failure = Option.getOrUndefined(
      Cause.failureOption(exit.cause)
    );
    if (failure !== undefined) {
      return Promise.reject(failure);
    }

    const defect = Cause.squash(exit.cause);
    return Promise.reject(
      defect instanceof Error
        ? defect
        : new Error(`Runtime error: ${String(defect)}`)
    );
  });
};
