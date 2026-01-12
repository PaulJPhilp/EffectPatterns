/**
 * Display service barrel exports
 * 
 * Re-exporting shared Display service with ep-admin specific TUI adapter
 */

// Re-export everything from shared services
export * from "@effect-patterns/ep-shared-services/display";

// Export ep-admin specific TUI adapter
export { EpAdminTUIAdapter } from "./tui-adapter.js";

