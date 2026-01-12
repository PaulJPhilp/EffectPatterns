/**
 * Execution service barrel exports
 */

// Service
export { Execution } from "./service.js";

// Types
export type { ExecutionOptions } from "./types.js";

// API
export type { ExecutionService } from "./api.js";

// Errors
export { ExecutionError, ScriptExecutionError, TimeoutError } from "./errors.js";

// Helpers
export { spawnEffect, withSpinner } from "./helpers.js";

// TUI Adapter
export { NoExecutionTUIAdapter } from "./tui-adapter.js";
export type { ExecutionTUIAdapter, ExecutionTUISpinnerMethods } from "./tui-adapter.js";

