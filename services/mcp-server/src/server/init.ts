/**
 * Server Initialization - Effect Layer Composition
 *
 * Composes all Effect layers for the MCP server:
 * ConfigLayer -> TracingLayer -> PatternsLayer -> AppLayer
 *
 * This module sets up the runtime and provides a singleton
 * for running Effects in Next.js route handlers.
 */

import * as path from 'node:path';
import {
  loadPatternsFromJsonRunnable,
  type Pattern,
  type PatternsIndex,
} from '@effect-patterns/toolkit';
import { Context, Effect, Layer, Ref } from 'effect';
import { TracingLayerLive, TracingService } from '../tracing/otlpLayer.js';

/**
 * Patterns service tag - provides in-memory pattern cache
 */
export class PatternsService extends Context.Tag('PatternsService')<
  PatternsService,
  {
    readonly patterns: Ref.Ref<readonly Pattern[]>;
    readonly getAllPatterns: () => Effect.Effect<readonly Pattern[]>;
    readonly getPatternById: (id: string) => Effect.Effect<Pattern | undefined>;
  }
>() {}

/**
 * Config service tag - provides environment configuration
 */
export class ConfigService extends Context.Tag('ConfigService')<
  ConfigService,
  {
    readonly apiKey: string;
    readonly patternsPath: string;
    readonly nodeEnv: string;
  }
>() {}


/**
 * Config Layer - Provides environment configuration
 */
export const ConfigLayer = Layer.succeed(ConfigService, {
  apiKey: process.env.PATTERN_API_KEY || '',
  patternsPath:
    process.env.PATTERNS_PATH ||
    path.join(process.cwd(), 'data', 'patterns.json'),
  nodeEnv: process.env.NODE_ENV || 'development',
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
        console.error('[Patterns] Failed to load patterns:', error);
        // Fallback to empty patterns array
        return Effect.succeed({
          version: '0.0.0',
          patterns: [],
          lastUpdated: new Date().toISOString(),
        } as PatternsIndex);
      })
    );

    console.log(`[Patterns] Loaded ${patternsIndex.patterns.length} patterns`);

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
 * PatternsLayer depends on ConfigService, so we provide it.
 */
const BaseLayers = Layer.mergeAll(ConfigLayer, TracingLayerLive);
const PatternsLayerWithDeps = PatternsLayer.pipe(Layer.provide(ConfigLayer));
export const AppLayer = Layer.mergeAll(BaseLayers, PatternsLayerWithDeps);

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
    Effect.runPromise
  );
