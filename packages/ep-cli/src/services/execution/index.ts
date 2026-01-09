import { Effect } from "effect";
import { Execution } from "./service.js";
import type { ExecutionOptions } from "./types.js";

export type { ExecutionService } from "./api.js";
export { ExecutionError, ScriptExecutionError } from "./errors.js";
export { Execution } from "./service.js";
export type { ExecutionOptions } from "./types.js";

// Convenience functions (mirrors current API for easier migration)

export const executeScriptWithTUI = Execution.executeScriptWithTUI;
export const executeScriptCapture = Execution.executeScriptCapture;
export const executeScriptStream = Execution.executeScriptStream;

export const withSpinner = <A, E, R>(
  message: string,
  effect: Effect.Effect<A, E, R>,
  options?: ExecutionOptions
): Effect.Effect<A, E, R | Execution> => Execution.withSpinner(message, effect, options);
