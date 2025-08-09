/**
 * @fileoverview Production runtime for Effect Patterns CLI
 *
 * This module provides the complete production runtime for the CLI application.
 * It includes:
 *
 * - Environment-based configuration from process.env
 * - All platform services (FileSystem, Path, HttpClient, Terminal)
 * - All application services (Config, Auth, Metrics, Otel, Run, LLM)
 * - AI client integrations (Anthropic, Google AI, OpenAI)
 * - Helper functions for running effects in production
 *
 * The production runtime connects to real external services including:
 * - Environment variables for configuration
 * - AI provider APIs (OpenAI, Anthropic, Google AI)
 * - File system operations
 * - Network requests via HttpClient
 */
import { AnthropicClient } from "@effect/ai-anthropic";
import { GoogleAiClient } from "@effect/ai-google";
import { OpenAiClient } from "@effect/ai-openai";
import { NodeContext } from "@effect/platform-node";
import { Effect, Layer, ManagedRuntime } from "effect";
import { AuthService } from "../services/auth-service/service.js";
import { ConfigService } from "../services/config-service/service.js";
import { LLMService } from "../services/llm-service/service.js";
import { MdxService } from "../services/mdx-service/service.js";
import { MetricsService } from "../services/metrics-service/service.js";
import { OtelService } from "../services/otel-service/service.js";
import { OutputHandlerService } from "../services/output-handler/service.js";
import { TemplateService } from "../services/prompt-template/service.js";
import { RunService } from "../services/run-service/service.js";
/**
 * Complete production layer providing all services and platform capabilities.
 *
 * This is the final production layer that combines:
 * - All platform services (FileSystem, HttpClient, etc.)
 * - All application services (Config, Auth, Metrics, etc.)
 * - All AI client integrations (Anthropic, Google AI, OpenAI)
 * - Environment-based configuration
 * - Proper service lifecycle management
 *
 * This layer resolves all dependencies and provides a complete runtime
 * environment for production execution.
 */
export declare const ProductionLayers: Layer.Layer<ConfigService | TemplateService | AnthropicClient.AnthropicClient | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | import("@effect/platform/HttpClient").HttpClient | NodeContext.NodeContext | MdxService | MetricsService | LLMService | AuthService | OtelService | OutputHandlerService | RunService, import("../services/config-service/errors.js").ConfigError | import("effect/ConfigError").ConfigError, never>;
/**
 * Primary production runtime for the CLI application.
 *
 * This managed runtime provides the complete production environment with:
 * - All platform services (FileSystem, Path, HttpClient, Terminal)
 * - All application services (Config, Auth, Metrics, Otel, Run, LLM)
 * - AI client integrations (Anthropic, Google AI, OpenAI)
 * - Environment-based configuration from process.env
 * - Proper service lifecycle management
 *
 * Usage:
 * ```typescript
 * import { ProductionRuntime } from './runtime/production-runtime';
 *
 * // Run an effect with full production service provision
 * const result = yield* ProductionRuntime.runPromise(myEffect);
 * ```
 */
export declare const ProductionRuntime: ManagedRuntime.ManagedRuntime<ConfigService | TemplateService | AnthropicClient.AnthropicClient | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | import("@effect/platform/HttpClient").HttpClient | NodeContext.NodeContext | MdxService | MetricsService | LLMService | AuthService | OtelService | OutputHandlerService | RunService, import("../services/config-service/errors.js").ConfigError | import("effect/ConfigError").ConfigError>;
/**
 * Helper function to run effects in the production runtime.
 *
 * This convenience function wraps ProductionRuntime.runPromise for cleaner
 * application code. It automatically provides all required services and
 * configuration from environment variables.
 *
 * @template A The success type of the effect
 * @template E The error type of the effect
 * @param effect The effect to run in the production environment
 * @returns A Promise resolving to the effect's success value
 *
 * @example
 * ```typescript
 * // Run CLI commands with full production setup
 * const result = await runProductionEffect(cliCommandEffect);
 * console.log('Command completed:', result);
 * ```
 */
export declare const runProductionEffect: <A, E>(effect: Effect.Effect<A, E>) => Promise<A>;
/**
 * Helper function to run effects and get the Exit result in production.
 *
 * This function provides the Exit (success or failure) of running an effect
 * in the production environment. Useful for handling both success and error
 * cases without throwing exceptions.
 *
 * @template A The success type of the effect
 * @template E The error type of the effect
 * @param effect The effect to run in the production environment
 * @returns The Exit containing either success value or error
 *
 * @example
 * ```typescript
 * // Handle both success and failure cases
 * const exit = runProductionExit(cliCommandEffect);
 * if (Exit.isSuccess(exit)) {
 *   console.log('Success:', exit.value);
 * } else {
 *   console.error('Error:', exit.cause);
 * }
 * ```
 */
export declare const runProductionExit: <A, E>(effect: Effect.Effect<A, E>) => import("effect/Exit").Exit<A, import("../services/config-service/errors.js").ConfigError | import("effect/ConfigError").ConfigError | E>;
