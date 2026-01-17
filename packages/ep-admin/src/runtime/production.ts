/**
 * Production Runtime for ep-admin CLI
 * 
 * Runtime with essential dependencies:
 * - FetchHttpClient for HTTP requests
 * - FileSystem for file operations
 * - StateStore for pipeline state management
 * - Logger for structured logging
 * - Display for output formatting
 * - Execution for script execution
 * 
 * NOTE: We avoid @effect/platform-node to prevent @effect/cluster dependency.
 */

import { StateStore } from "@effect-patterns/pipeline-state";
import { FetchHttpClient } from "@effect/platform";
import { layer as NodeFileSystemLayer } from "@effect/platform-node/NodeFileSystem";
import { Effect, Layer, ManagedRuntime } from "effect";
import { Display } from "../services/display/index.js";
import { EnhancedFileSystem } from "../services/filesystem/index.js";
import { Execution } from "../services/execution/index.js";
import { Logger } from "../services/logger/index.js";
import { McpService } from "../services/mcp/service.js";

/**
 * Production layer combining all required services
 */
const McpLayer = Layer.provide(
	McpService.Default,
	FetchHttpClient.layer
) as Layer.Layer<McpService, never, never>;

export const ProductionLayer = Layer.mergeAll(
	NodeFileSystemLayer,
	Logger.Default,
	Layer.provide(Display.Default, Logger.Default),
	Layer.provide(Execution.Default, Logger.Default),
	Layer.provide(EnhancedFileSystem.Default, NodeFileSystemLayer),
	McpLayer,
	// Use Layer.provide to properly type the StateStore layer
	Layer.provide(StateStore.Default, Layer.mergeAll(Logger.Default))
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
