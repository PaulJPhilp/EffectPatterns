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
import {
  DatabaseLayer,
  findEffectPatternBySlug,
  searchEffectPatterns
} from "@effect-patterns/toolkit";
import * as NodeSdk from "@effect/opentelemetry/NodeSdk";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { Cause, Effect, Exit, Layer, Option } from "effect";
import { CodeAnalyzerService } from "../services/code-analyzer";
import { MCPConfigService } from "../services/config";
import { ConsistencyAnalyzerService } from "../services/consistency-analyzer";
import { MCPLoggerService } from "../services/logger";
import { PatternGeneratorService } from "../services/pattern-generator";
import { RefactoringEngineService } from "../services/refactoring-engine";
import { RuleRegistryService } from "../services/rule-registry";
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
 * Composes: Config -> Tracing (with NodeSdk) -> Database -> Patterns
 * Services are self-managed via Effect.Service pattern.
 * The NodeSdk layer enables automatic span creation via Effect.fn.
 */
const NodeSdkLayer = NodeSdk.layer(() => ({
  resource: {
    serviceName: process.env.SERVICE_NAME || "effect-patterns-mcp-server",
    serviceVersion: process.env.SERVICE_VERSION || "0.5.0",
  },
  spanProcessor: new BatchSpanProcessor(
    new OTLPTraceExporter({
      url: process.env.OTLP_ENDPOINT || "http://localhost:4318/v1/traces",
      headers: process.env.OTLP_HEADERS
        ? Object.fromEntries(
          process.env.OTLP_HEADERS.split(",").map((pair) => {
            const [key, value] = pair.split("=");
            return [key?.trim() || "", value?.trim() || ""];
          })
        )
        : {},
    })
  ),
}));

export const AppLayer = Layer.mergeAll(
  MCPConfigService.Default,
  MCPLoggerService.Default,
  DatabaseLayer,
  PatternsService.Default,
  TracingLayerLive,
  NodeSdkLayer,
  CodeAnalyzerService.Default,
  PatternGeneratorService.Default,
  ConsistencyAnalyzerService.Default,
  RefactoringEngineService.Default,
  RuleRegistryService.Default
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
