import { Effect, Layer, Runtime, Logger } from "effect";
import { McpClient, McpClientLive } from "./services/mcp-client";

/**
 * AppContext - Union of all services required by the application
 */
export type AppContext = McpClient;

/**
 * AppLayer - Composition of all application layers
 * This is where all service dependencies are wired together
 */
export const AppLayer = Layer.mergeAll(
  McpClientLive,
  Logger.pretty
);

/**
 * appRuntime - Singleton Effect Runtime for the entire application
 * Created once when this module is loaded and cached by Node.js module system
 *
 * This is a performance optimization critical for serverless environments:
 * - The runtime is instantiated only once per container
 * - Subsequent invocations reuse the same runtime
 * - Avoids reconstructing the dependency graph on every request
 */
const appRuntime: Runtime.Runtime<AppContext> = Effect.runSync(
  Effect.scoped(Layer.toRuntime(AppLayer))
);

/**
 * runEffect - Helper function to execute an Effect program using the app runtime
 *
 * This provides a clean Promise-based interface for the Next.js API routes
 *
 * @param effect - The Effect program to execute
 * @returns A Promise that resolves with the effect's result or rejects with an error
 */
export function runEffect<E, A>(
  effect: Effect.Effect<A, E, AppContext>
): Promise<A> {
  return Runtime.runPromise(appRuntime)(effect);
}
