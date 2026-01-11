/**
 * Production Runtime for ep-admin CLI
 * 
 * Runtime with essential dependencies:
 * - FetchHttpClient for HTTP requests
 * - StateStore for pipeline state management
 * - Logger for structured logging
 * 
 * NOTE: We avoid @effect/platform-node to prevent @effect/cluster dependency.
 */

import { StateStore } from "@effect-patterns/pipeline-state";
import { FetchHttpClient } from "@effect/platform";
import { Effect, Layer, ManagedRuntime } from "effect";
import { Logger } from "../services/logger/index.js";

/**
 * Production layer combining all required services
 */
export const ProductionLayer = Layer.mergeAll(
	FetchHttpClient.layer,
	Logger.Default,
	StateStore.Default as unknown as Layer.Layer<StateStore>
);

/**
 * Production runtime for CLI execution
 */
export const productionRuntime = ManagedRuntime.make(ProductionLayer);

/**
 * Run an effect with the production runtime
 */
export const runProduction = <A, E>(
	effect: Effect.Effect<A, E, Layer.Layer.Success<typeof ProductionLayer>>
): Promise<A> => productionRuntime.runPromise(effect);
