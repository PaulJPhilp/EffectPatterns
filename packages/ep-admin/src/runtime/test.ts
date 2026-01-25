/**
 * Test Runtime for ep-admin CLI
 * 
 * Minimal runtime for testing that avoids @effect/cluster dependency.
 * Uses only essential services without NodeContext.layer.
 */

import { StateStore } from "@effect-patterns/pipeline-state";
import { Effect, Layer, ManagedRuntime } from "effect";
import { createSimpleEnv } from "effect-env";
import { envSchema, type EnvConfig } from "../config/env.js";
import { Logger } from "../services/logger/index.js";

/**
 * Test layer with minimal dependencies
 * Avoids @effect/platform-node which pulls in @effect/cluster
 */
export const TestLayer = Layer.mergeAll(
	Logger.Default,
	// Use Layer.provide to properly type the StateStore layer
	Layer.provide(StateStore.Default, Logger.Default)
);

/**
 * Test runtime for unit testing
 */
export const testRuntime = ManagedRuntime.make(TestLayer);

/**
 * Run an effect with the test runtime
 */
export const runTest = <A, E>(
	effect: Effect.Effect<A, E, Layer.Layer.Success<typeof TestLayer>>
): Promise<A> => testRuntime.runPromise(effect);

/**
 * Create a test environment with optional overrides
 * 
 * Usage:
 * ```typescript
 * const testEnv = createTestEnv({ OPENAI_API_KEY: "test-key" });
 * ```
 */
export const createTestEnv = (overrides: Partial<EnvConfig> = {}) =>
	createSimpleEnv(envSchema as any, {
		NODE_ENV: "test" as const,
		DATABASE_URL: undefined as any,
		...overrides,
	} as any) as any;
