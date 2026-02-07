/**
 * Display service barrel exports
 *
 * Re-exporting shared Display service with ep-cli specific TUI loader
 */

// Re-export everything from shared services
export * from "@effect-patterns/ep-shared-services/display";

// Export ep-cli specific TUI loader
export { LiveTUILoader, TUILoader } from "./tui-loader.js";
