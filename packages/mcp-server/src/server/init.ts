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
import { ReviewCodeService } from "../services/review-code";
import { AnalysisServiceLive } from "@effect-patterns/analysis-core";
import {
  DatabaseLayer,
  findEffectPatternBySlug,
  searchEffectPatterns
} from "@effect-patterns/toolkit";
import { NodeContext } from "@effect/platform-node";
import { Cause, Effect, Exit, Layer, Option } from "effect";
import { MCPCacheService } from "../services/cache";
import { MCPConfigService } from "../services/config";
import { MCPLoggerService } from "../services/logger";
import { PatternGeneratorService } from "../services/pattern-generator";
import { MCRateLimitService } from "../services/rate-limit";
import { MCPTierService } from "../services/tier";
import { MCPValidationService } from "../services/validation";
import { TracingLayerLive } from "../tracing/otlpLayer";

/**
 * Patterns service - provides database-backed pattern access
 */
const makePatternsService = Effect.gen(function* () {
  console.log("[Patterns] Initializing database-backed patterns service");

  /**
   * Get all patterns
   */
  const getAllPatterns = () =>
    searchEffectPatterns({});

  /**
   * Get pattern by ID/slug
   */
  const getPatternById = (id: string) =>
    Effect.gen(function* () {
      const pattern = yield* findEffectPatternBySlug(id);
      return pattern ?? undefined;
    });

  /**
   * Search patterns
   */
  const searchPatterns = (params: {
    query?: string;
    category?: string;
    skillLevel?: "beginner" | "intermediate" | "advanced";
    limit?: number;
  }) =>
    searchEffectPatterns({
      query: params.query,
      category: params.category,
      skillLevel: params.skillLevel,
      limit: params.limit,
    });

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
    dependencies: [DatabaseLayer],
  }
) { }

/**
 * App Layer - Full application layer composition
 *
 * Composes: Config -> Tracing -> Database -> Patterns
 * Services are self-managed via Effect.Service pattern.
 */
export const AppLayer = Layer.mergeAll(
  NodeContext.layer,
  MCPConfigService.Default,
  MCPLoggerService.Default,
  MCPTierService.Default,
  MCPValidationService.Default,
  MCRateLimitService.Default,
  MCPCacheService.Default,
  DatabaseLayer,
  PatternsService.Default,
  TracingLayerLive,
  // NodeSdkLayer, // Disabled - OTLP endpoint not available locally
  AnalysisServiceLive,
  PatternGeneratorService.Default,
  ReviewCodeService.Default
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
