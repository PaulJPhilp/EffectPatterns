/**
 * Server Initialization - Effect Layer Composition
 *
 * Composes all Effect layers for the MCP server:
 * ConfigLayer -> TracingLayer -> PatternsLayer -> AppLayer
 *
 * This module sets up the runtime and provides a singleton
 * for running Effects in Next.js route handlers.
 */

// biome-ignore assist/source/organizeImports: <>
import {
  loadPatternsFromJsonRunnable,
  type Pattern,
  type PatternsIndex,
} from "@effect-patterns/toolkit";
import { NodeSdk } from "@effect/opentelemetry";
import { Effect, Layer, Ref } from "effect";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import * as path from "node:path";
import { TracingLayerLive, type TracingService } from "../tracing/otlpLayer";

/**
 * Config service - provides environment configuration
 */
export class ConfigService extends Effect.Service<ConfigService>()(
  "ConfigService",
  {
    sync: () => ({
      apiKey: process.env.PATTERN_API_KEY || "",
      patternsPath:
        process.env.PATTERNS_PATH ||
        path.join(process.cwd(), "data", "patterns.json"),
      nodeEnv: process.env.NODE_ENV || "development",
    }),
  }
) {}

/**
 * Patterns service - provides in-memory pattern cache
 */
const makePatternsService = Effect.gen(function* () {
  const config = yield* ConfigService;

  console.log(`[Patterns] Loading patterns from: ${config.patternsPath}`);

  // Load patterns at cold start, with empty index fallback
  const fallbackIndex: PatternsIndex = {
    version: "0.0.0",
    patterns: [],
    lastUpdated: new Date().toISOString(),
  };

  const patternsIndex: PatternsIndex = yield* Effect.matchEffect(
    loadPatternsFromJsonRunnable(
      config.patternsPath
    ) as unknown as Effect.Effect<PatternsIndex>,
    {
      onFailure: () => Effect.succeed(fallbackIndex),
      onSuccess: (idx) => Effect.succeed(idx as PatternsIndex),
    }
  );

  console.log(`[Patterns] Loaded ${patternsIndex.patterns.length} patterns`);

  // Create Ref to hold patterns in memory
  const patternsRef = yield* Ref.make<readonly Pattern[]>(
    patternsIndex.patterns
  );

  // Create service methods
  const getAllPatterns = () => Ref.get(patternsRef);

  const getPatternById = (id: string): Effect.Effect<Pattern | undefined> =>
    Effect.gen(function* () {
      const patterns: readonly Pattern[] = yield* Ref.get(patternsRef);
      return patterns.find((p: Pattern) => p.id === id);
    });

  return {
    patterns: patternsRef,
    getAllPatterns,
    getPatternById,
  };
});

export class PatternsService extends Effect.Service<PatternsService>()(
  "PatternsService",
  {
    scoped: makePatternsService,
    dependencies: [ConfigService.Default],
  }
) {}

/**
 * App Layer - Full application layer composition
 *
 * Composes: Config -> Tracing (with NodeSdk) -> Patterns
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
              return [key.trim(), value.trim()];
            })
          )
        : {},
    })
  ),
}));

export const AppLayer = Layer.mergeAll(
  ConfigService.Default,
  PatternsService.Default,
  TracingLayerLive,
  NodeSdkLayer
);

/**
 * Helper to run an Effect with the app runtime
 *
 * Use this in Next.js route handlers to execute Effects.
 * This provides all layers to the effect before running it.
 */
export const runWithRuntime = <A, E>(
  effect: Effect.Effect<A, E, PatternsService | ConfigService | TracingService>
): Promise<A> =>
  effect.pipe(
    Effect.provide(AppLayer),
    Effect.scoped,
    Effect.runPromise as (
      effect: Effect.Effect<
        A,
        E,
        PatternsService | ConfigService | TracingService
      >
    ) => Promise<A>
  );
