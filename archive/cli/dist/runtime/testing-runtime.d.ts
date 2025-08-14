/**
 * @fileoverview Testing runtime for Effect Patterns CLI
 *
 * This module provides a managed runtime specifically designed for testing
 * Effect applications. It includes:
 *
 * - Fixed configuration values for consistent testing
 * - All platform services (FileSystem, Path, etc.) via NodeContext
 * - All application services (Config, Auth, Metrics, etc.)
 * - Helper functions for running effects in test environments
 *
 * The testing runtime eliminates external dependencies like environment variables
 * and network calls, ensuring tests are deterministic and fast.
 */
import { NodeContext } from "@effect/platform-node";
import { ManagedRuntime, type Effect } from "effect";
import { AuthService } from "../services/auth-service/service.js";
import { ConfigService } from "../services/config-service/service.js";
import { LLMService } from "../services/llm-service/service.js";
import { MdxService } from "../services/mdx-service/service.js";
import { MetricsService } from "../services/metrics-service/service.js";
import { OtelService } from "../services/otel-service/service.js";
import { OutputHandlerService } from "../services/output-handler/service.js";
import { TemplateService } from "../services/prompt-template/service.js";
import { RunManagement } from "../services/run-management/service.js";
/**
 * Primary testing runtime for Effect applications.
 *
 * This managed runtime provides a complete testing environment with:
 * - All platform services (FileSystem, Path, etc.)
 * - All application services (Config, Auth, Metrics, etc.)
 * - Fixed test configuration values
 * - Proper service lifecycle management
 *
 * Usage:
 * ```typescript
 * import { TestRuntime } from './runtime/testing-runtime';
 *
 * // Run an effect with full service provision
 * const result = yield* TestRuntime.runPromise(myEffect);
 * ```
 */
export declare const TestRuntime: ManagedRuntime.ManagedRuntime<ConfigService | NodeContext.NodeContext | MetricsService | MdxService | TemplateService | import("@effect/platform/HttpClient").HttpClient | LLMService | OutputHandlerService | AuthService | OtelService | RunManagement, import("../services/config-service/errors.js").ConfigError>;
/**
 * Helper function to run effects in the test runtime.
 *
 * This convenience function wraps TestRuntime.runPromise for cleaner
 * test syntax. It automatically provides all required services and
 * configuration.
 *
 * @template A The success type of the effect
 * @template E The error type of the effect
 * @param effect The effect to run in the test environment
 * @returns A Promise resolving to the effect's success value
 *
 * @example
 * ```typescript
 * test('my service works', async () => {
 *   const result = await runTestEffect(myService.doSomething());
 *   expect(result).toBe(expectedValue);
 * });
 * ```
 */
export declare const runTestEffect: <A, E>(effect: Effect.Effect<A, E, NodeContext.NodeContext | ConfigService | AuthService | MetricsService | MdxService | OtelService | OutputHandlerService | RunManagement | LLMService | TemplateService>) => Promise<A>;
/**
 * Helper function to run effects and get the Exit result.
 *
 * This function provides the Exit (success or failure) of running an effect
 * in the test environment. Useful for testing error cases and success paths
 * without throwing exceptions.
 *
 * @template A The success type of the effect
 * @template E The error type of the effect
 * @param effect The effect to run in the test environment
 * @returns The Exit containing either success value or error
 *
 * @example
 * ```typescript
 * test('handles errors gracefully', () => {
 *   const exit = runTestExit(failingEffect);
 *   expect(Exit.isFailure(exit)).toBe(true);
 *   expect(exit.error).toBeInstanceOf(MyError);
 * });
 * ```
 */
export declare const runTestExit: <A, E>(effect: Effect.Effect<A, E, ConfigService | NodeContext.NodeContext | AuthService | MetricsService | MdxService | OtelService | OutputHandlerService | RunManagement | LLMService | TemplateService>) => import("effect/Exit").Exit<A, import("../services/config-service/errors.js").ConfigError | E>;
//# sourceMappingURL=testing-runtime.d.ts.map