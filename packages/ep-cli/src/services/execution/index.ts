import type { ExecutionOptions, ExecutionService } from "@effect-patterns/ep-shared-services/execution";
import { Execution } from "@effect-patterns/ep-shared-services/execution";
import { Effect } from "effect";

export { Execution, ExecutionError, ScriptExecutionError } from "@effect-patterns/ep-shared-services/execution";
export type { ExecutionOptions, ExecutionService } from "@effect-patterns/ep-shared-services/execution";

// Export ep-cli specific TUI adapter
export { EpCliExecutionTUIAdapter } from "./tui-adapter.js";

// Convenience functions (mirrors current API for easier migration)
export const executeScriptWithTUI = Execution.executeScriptWithTUI;
export const executeScriptCapture = Execution.executeScriptCapture;
export const executeScriptStream = Execution.executeScriptStream;

export const withSpinner = <A, E, R>(
  message: string,
  effect: Effect.Effect<A, E, R>,
  options?: ExecutionOptions
): Effect.Effect<A, E, R | ExecutionService> =>
  Effect.flatMap(Execution, (service) =>
    service.withSpinner(message, effect, options)
  );
