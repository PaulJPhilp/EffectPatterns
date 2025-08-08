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
import { ConfigProvider, Layer, ManagedRuntime, type Effect } from "effect";
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
 * Test configuration provider with fixed values for consistent testing.
 *
 * This configuration provider eliminates external dependencies by providing
 * hardcoded test values for all required configuration keys. This ensures:
 * - Deterministic test execution
 * - No network dependencies
 * - No environment variable requirements
 * - Consistent test results across environments
 *
 * @example
 * ```typescript
 * // All AI provider API keys are set to test values
 * const config = yield* ConfigService;
 * const apiKey = yield* config.get("OPENAI_API_KEY"); // Returns "test-key"
 * ```
 */
const TestConfigProvider = ConfigProvider.fromMap(
  new Map([
    ["OPENAI_API_KEY", "test-key"],
    ["OPENAI_ORG_ID", "test-org"],
    ["OPENAI_PROJECT_ID", "test-project"],
    ["ANTHROPIC_API_KEY", "test-anthropic-key"],
    ["ANTHROPIC_PROJECT_ID", "test-anthropic-project"],
    ["GROQ_API_KEY", "test-groq-key"],
    ["MISTRAL_API_KEY", "test-mistral-key"],
    ["COHERE_API_KEY", "test-cohere-key"],
    ["FIREWORKS_API_KEY", "test-fireworks-key"],
    ["PERPLEXITY_API_KEY", "test-perplexity-key"],
    ["NODE_ENV", "test"],
  ])
);

/**
 * Platform layer providing Node.js platform services.
 *
 * This layer provides essential platform services including:
 * - FileSystem operations (read, write, delete files)
 * - Path utilities (join, resolve, normalize paths)
 * - Process information
 * - Console output
 *
 * Uses NodeContext.layer which automatically provides all @effect/platform-node
 * services required by the application.
 */
const TestPlatformLayer = NodeContext.layer;

/**
 * Application service layer containing all business logic services.
 *
 * This layer combines all application-specific services into a single layer:
 * - ConfigService: Configuration management
 * - AuthService: Authentication and authorization
 * - MetricsService: Metrics collection and reporting
 * - OtelService: OpenTelemetry integration
 * - RunService: Run management and execution
 * - LLMService: Large language model interactions
 *
 * Each service uses the Effect.Service pattern with .Default for clean
 * dependency injection and service provision.
 */
const TestAppServiceLayer = Layer.mergeAll(
  ConfigService.Default,
  AuthService.Default,
  MetricsService.Default,
  MdxService.Default,
  OtelService.Default,
  OutputHandlerService.Default,
  RunManagement.Default,
  LLMService.Default,
  TemplateService.Default
);

/**
 * Test runtime with configuration - internal implementation.
 *
 * This creates a managed runtime that combines all services and configuration
 * into a single layer with no requirements. The runtime manages:
 * - Service lifecycle (initialization and cleanup)
 * - Dependency injection
 * - Resource management
 * - Error handling
 *
 * @deprecated Use TestRuntime instead - this is kept for backward compatibility
 */
const TestRuntimeWithConfig = ManagedRuntime.make(
  Layer.mergeAll(
    Layer.provideMerge(TestAppServiceLayer, TestPlatformLayer),
    Layer.setConfigProvider(TestConfigProvider)
  )
);

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
export const TestRuntime = ManagedRuntime.make(
  Layer.mergeAll(
    Layer.provideMerge(TestAppServiceLayer, TestPlatformLayer),
    Layer.setConfigProvider(TestConfigProvider)
  )
);

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
export const runTestEffect = <A, E>(effect: Effect.Effect<A, E>) => {
  return TestRuntime.runPromise(effect);
};

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
export const runTestExit = <A, E>(effect: Effect.Effect<A, E>) => {
  return TestRuntime.runSyncExit(effect);
};
