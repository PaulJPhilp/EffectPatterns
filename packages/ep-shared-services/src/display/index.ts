/**
 * Display service barrel exports
 */

// Service
export { Display } from "./service.js";

// Types
export type { DisplayService, DisplayServiceError } from "./api.js";
export type { PanelOptions, TableColumn, TableOptions } from "./types.js";

// Errors
export { DisplayError, TUIError } from "./errors.js";

// Helpers
export { colorizeWithConfig, getLoggerConfig } from "./helpers.js";

// TUI Adapter
export { NoTUIAdapter } from "./tui-adapter.js";
export type { TUIAdapter, TUIDisplayMethods } from "./tui-adapter.js";

