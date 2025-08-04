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
import { NodeContext, NodeFileSystem, NodeHttpClient, NodePath, NodeTerminal } from "@effect/platform-node";
import { ConfigProvider, Config, Effect, Layer, ManagedRuntime } from "effect";
import { AuthService } from "../services/auth-service/service.js";
import { ConfigService } from "../services/config-service/service.js";
import { LLMService } from "../services/llm-service/service.js";
import { MetricsService } from "../services/metrics-service/service.js";
import { OtelService } from "../services/otel-service/service.js";
import { TemplateService } from "../services/prompt-template/service.js";
import { RunService } from "../services/run-service/service.js";

/**
 * Production configuration provider using environment variables.
 * 
 * This configuration provider reads values from process.env, enabling
 * runtime configuration without code changes. It supports:
 * - API keys for AI providers (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.)
 * - Organization and project IDs
 * - Environment-specific settings
 * - Secure credential management via environment variables
 * 
 * @example
 * ```typescript
 * // Access configuration values
 * const config = yield* ConfigService;
 * const apiKey = yield* config.get("OPENAI_API_KEY");
 * ```
 */
const ProductionConfigProvider = ConfigProvider.fromEnv();

/**
 * Platform services layer providing all Node.js platform capabilities.
 * 
 * This layer combines all essential platform services into a single layer:
 * - NodeContext.layer: Core Node.js services (FileSystem, Path, Process)
 * - NodeHttpClient.layer: HTTP client for network requests
 * - NodeFileSystem.layer: File system operations (read, write, delete)
 * - NodePath.layer: Path utilities (join, resolve, normalize)
 * - NodeTerminal.layer: Terminal/console output capabilities
 * 
 * These services form the foundation for all application functionality.
 */
const ProductionPlatformLayer = Layer.mergeAll(
  NodeContext.layer,
  NodeHttpClient.layer,
  NodeFileSystem.layer,
  NodePath.layer,
  NodeTerminal.layer,
);

/**
 * Application service layer containing all business logic services.
 * 
 * This layer combines all application-specific services into a single layer:
 * - ConfigService: Configuration management with environment variable support
 * - AuthService: Authentication and authorization for AI provider APIs
 * - MetricsService: Metrics collection, aggregation, and reporting
 * - OtelService: OpenTelemetry integration for observability
 * - RunService: Run management, execution tracking, and lifecycle management
 * - LLMService: Large language model interactions and prompt processing
 * 
 * Each service uses the Effect.Service pattern with .Default for clean
 * dependency injection and service provision.
 */
// Merge all application-level services into a single layer.
const AiClientLayers = Layer.mergeAll(
  Layer.scoped(
    GoogleAiClient.GoogleAiClient,
    Effect.flatMap(Config.redacted("GOOGLE_AI_API_KEY"), (apiKey) =>
      GoogleAiClient.make({ apiKey })
    )
  ),
  Layer.scoped(
    OpenAiClient.OpenAiClient,
    Effect.flatMap(Config.redacted("OPENAI_API_KEY"), (apiKey) =>
      OpenAiClient.make({ apiKey })
    )
  ),
  Layer.scoped(
    AnthropicClient.AnthropicClient,
    Effect.flatMap(Config.redacted("ANTHROPIC_API_KEY"), (apiKey) =>
      AnthropicClient.make({ apiKey })
    )
  )
);
const AppLayer = Layer.mergeAll(
  ConfigService.Default,
  AuthService.Default,
  MetricsService.Default,
  OtelService.Default,
  RunService.Default,
  LLMService.Default,
  TemplateService.Default,
  AiClientLayers
);

/**
 * Live environment layer providing platform services and configuration.
 * 
 * This layer combines the platform services with environment-based configuration
 * to create the foundation for all live service implementations. It ensures:
 * - All platform services are available
 * - Configuration is loaded from environment variables
 * - Services can access real external dependencies
 * 
 * This layer is used as the base for providing all other service layers.
 */
// The LiveEnv layer provides all the live implementations for the application's context.
const LiveEnv = Layer.merge(
  ProductionPlatformLayer,
  Layer.setConfigProvider(ProductionConfigProvider)
);

/**
 * AI client layers providing integrations with external AI providers.
 * 
 * This layer creates and configures AI client instances for:
 * - Anthropic: Claude AI models via Anthropic API
 * - Google AI: Gemini models via Google AI API
 * - OpenAI: GPT models via OpenAI API
 * 
 * Each client is configured with API keys from environment variables
 * using Config.redacted for secure credential handling.
 * 
 * @example
 * ```typescript
 * // Use AI clients in effects
 * const anthropic = yield* AnthropicClient.AnthropicClient;
 * const response = yield* anthropic.createMessage({
 *   model: "claude-3-sonnet-20240229",
 *   messages: [{ role: "user", content: "Hello" }]
 * });
 * ```
 */


/**
 * Combined application and AI client layer.
 * 
 * This layer merges the application services with AI client services,
 * creating a complete service layer that includes both business logic
 * and external API integrations.
 */
// The final ProductionLayers provides the live environment to the application, resolving all dependencies.
const AppAndAiLayer = Layer.merge(AppLayer, AiClientLayers);

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
// The final ProductionLayers provides the live environment to the application, resolving all dependencies,
// and then merges the LiveEnv back in to expose the platform services in the final output.
export const ProductionLayers = Layer.provide(AppAndAiLayer, LiveEnv).pipe(
  Layer.merge(LiveEnv)
);

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
// Create the managed runtime for production
export const ProductionRuntime = ManagedRuntime.make(ProductionLayers);

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
// Helper function to run effects in production runtime
export const runProductionEffect = <A, E>(effect: Effect.Effect<A, E>) => {
  return ProductionRuntime.runPromise(effect);
};

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
// Helper function to run effects and get exit in production
export const runProductionExit = <A, E>(effect: Effect.Effect<A, E>) => {
  return ProductionRuntime.runSyncExit(effect);
};
