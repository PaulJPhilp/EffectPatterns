/**
 * Execution service barrel exports
 * 
 * Re-exporting shared Execution service for backward compatibility
 */

// Re-export everything from shared services
export * from "@effect-patterns/ep-shared-services/execution";

// Export ep-admin specific TUI adapter
export { EpAdminExecutionTUIAdapter } from "./tui-adapter.js";
