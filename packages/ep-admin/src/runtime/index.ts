/**
 * Runtime Configuration for ep-admin CLI
 * 
 * Provides separate runtime layers for production and testing.
 * Production runtime includes all platform dependencies.
 * Test runtime uses minimal dependencies to avoid @effect/cluster issues.
 */

export { ProductionLayer, productionRuntime } from "./production.js";
export { TestLayer, testRuntime } from "./test.js";

