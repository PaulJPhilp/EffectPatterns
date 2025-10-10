/**
 * Server Initialization - Effect Layer Composition
 *
 * Composes all Effect layers for the MCP server:
 * ConfigLayer -> TracingLayer -> PatternsLayer -> AppLayer
 *
 * This module sets up the runtime and provides a singleton
 * for running Effects in Next.js route handlers.
 */

import { Effect, Layer, Context, Ref } from "effect";
import { TracingService, TracingLayerLive } from "../tracing/otlpLayer.js";
import {
  loadPatternsFromJsonRunnable,
  Pattern,
  PatternsIndex,
} from "@effect-patterns/toolkit";
import * as path from "node:path";

/**
 * Patterns service tag - provides in-memory pattern cache
 */
export class PatternsService extends Context.Tag("PatternsService")<
  PatternsService,
  {
    readonly patterns: Ref.Ref<Pattern[]>;
    readonly getAllPatterns: () => Effect.Effect<Pattern[]>;
    readonly getPatternById: (id: string) => Effect.Effect<Pattern | undefined>;
  }
>() {}

/**
 * Config service tag - provides environment configuration
 */
export class ConfigService extends Context.Tag("ConfigService")<
  ConfigService,
  {
    readonly apiKey: string;
    readonly patternsPath: string;
    readonly nodeEnv: string;
  }
>() {}

/**
 * Load configuration from environment
 */
const loadConfig = Effect.sync(() => ({
  apiKey: process.env.PATTERN_API_KEY || "",
  patternsPath:
    process.env.PATTERNS_PATH ||
    path.join(process.cwd(), "data", "patterns.json"),
  nodeEnv: process.env.NODE_ENV || "development",
}));

/**
 * Config Layer - Provides environment configuration
 */
export const ConfigLayer = Layer.succeed(ConfigService, {
  apiKey: process.env.PATTERN_API_KEY || "",
  patternsPath:
    process.env.PATTERNS_PATH ||
    path.join(process.cwd(), "data", "patterns.json"),
  nodeEnv: process.env.NODE_ENV || "development",
});

/**
 * Patterns Layer - Loads patterns into memory at startup
 *
 * This layer depends on ConfigLayer to get the patterns file path.
 */
export const PatternsLayer = Layer.scoped(
  PatternsService,
  Effect.gen(function* () {
    const config = yield* ConfigService;

    console.log(`[Patterns] Loading patterns from: ${config.patternsPath}`);

    // Load patterns at cold start
    const patternsIndex = yield* loadPatternsFromJsonRunnable(
      config.patternsPath
    ).pipe(
      Effect.catchAll((error) => {
        console.error("[Patterns] Failed to load patterns:", error);
        // Fallback to empty patterns array
        return Effect.succeed({
          version: "0.0.0",
          patterns: [],
          lastUpdated: new Date().toISOString(),
        } as PatternsIndex);
      })
    );

    console.log(
      `[Patterns] Loaded ${patternsIndex.patterns.length} patterns`
    );

    // Create Ref to hold patterns in memory
    const patternsRef = yield* Ref.make(patternsIndex.patterns);

    // Create service methods
    const getAllPatterns = () => Ref.get(patternsRef);

    const getPatternById = (id: string) =>
      Effect.gen(function* () {
        const patterns = yield* Ref.get(patternsRef);
        return patterns.find((p) => p.id === id);
      });

    return {
      patterns: patternsRef,
      getAllPatterns,
      getPatternById,
    };
  })
);

/**
 * App Layer - Full application layer composition
 *
 * Composes: Config -> Tracing -> Patterns
 */
export const AppLayer = Layer.mergeAll(
  ConfigLayer,
  TracingLayerLive
).pipe(Layer.provideMerge(PatternsLayer));

/**
 * Runtime for running Effects
 *
 * This provides the composed layers to any Effect we run.
 */
export const runtime = Layer.toRuntime(AppLayer).pipe(
  Effect.scoped,
  Effect.runSync
);

/**
 * Helper to run an Effect with the app runtime
 *
 * Use this in Next.js route handlers to execute Effects.
 */
export const runWithRuntime = <A, E>(
  effect: Effect.Effect<A, E>
): Promise<A> => runtime.runPromise(effect);
