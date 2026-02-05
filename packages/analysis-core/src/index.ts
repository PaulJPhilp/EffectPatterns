/**
 * @effect-patterns/analysis-core
 *
 * Transport-agnostic code analysis services (rules, detection, and
 * refactoring generation) used by the MCP server, CLI harness, and agents.
 */

export * from "./tools/ids";

export * from "./config";

export * from "./services/analysis-service";
export * from "./services/code-analyzer";
export * from "./services/consistency-analyzer";
export * from "./services/fix-utils";
export * from "./services/refactoring-engine";
export * from "./services/rule-registry";

