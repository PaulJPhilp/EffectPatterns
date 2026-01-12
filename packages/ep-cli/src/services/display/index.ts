/**
 * Display service barrel exports
 * 
 * Re-exporting shared Display service with ep-cli specific TUI adapter
 */

// Re-export everything from shared services
export * from "@effect-patterns/ep-shared-services/display";

// Export ep-cli specific TUI adapter and loader
export { EpCliTUIAdapter } from "./tui-adapter.js";
export { LiveTUILoader, TUILoader } from "./tui-loader.js";

