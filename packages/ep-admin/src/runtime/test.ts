/**
 * Test Runtime for ep-admin CLI
 * 
 * Minimal runtime for testing that avoids @effect/cluster dependency.
 * Uses only essential services without NodeContext.layer.
 */

import { StateStore } from "@effect-patterns/pipeline-state";
import { Effect, Layer, ManagedRuntime } from "effect";
import { Logger } from "../services/logger/index.js";

/**
 * Test layer with minimal dependencies
 * Avoids @effect/platform-node which pulls in @effect/cluster
 */
export const TestLayer = Layer.mergeAll(
	Logger.Default,
	StateStore.Default as unknown as Layer.Layer<StateStore>
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
