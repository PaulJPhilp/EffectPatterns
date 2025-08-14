/**
 * @fileoverview Runtime selector for CLI commands
 *
 * This module provides intelligent runtime selection based on command requirements.
 * Commands that don't need AI services use the minimal runtime to avoid startup
 * failures due to missing API keys or AI service issues.
 */
import type { Effect, Exit } from "effect";
/**
 * Determines which runtime to use based on the command being executed
 */
export declare function selectRuntime(args: string[]): import("effect/ManagedRuntime").ManagedRuntime<import("../services/config-service/service.js").ConfigService | import("@effect/platform-node/NodeContext").NodeContext | import("../services/metrics-service/service.js").MetricsService | import("../services/mdx-service/service.js").MdxService | import("../services/prompt-template/service.js").TemplateService | import("@effect/platform/HttpClient").HttpClient | import("../services/output-handler/service.js").OutputHandlerService | import("../services/otel-service/service.js").OtelService | import("../services/run-service/service.js").RunService, import("../services/config-service/errors.js").ConfigError> | import("effect/ManagedRuntime").ManagedRuntime<import("../services/config-service/service.js").ConfigService | import("@effect/platform-node/NodeContext").NodeContext | import("../services/metrics-service/service.js").MetricsService | import("../services/mdx-service/service.js").MdxService | import("../services/prompt-template/service.js").TemplateService | import("@effect/ai-google/GoogleAiClient").GoogleAiClient | import("@effect/ai-openai/OpenAiClient").OpenAiClient | import("@effect/ai-anthropic/AnthropicClient").AnthropicClient | import("@effect/platform/HttpClient").HttpClient | import("../services/llm-service/service.js").LLMService | import("../services/output-handler/service.js").OutputHandlerService | import("../services/auth-service/service.js").AuthService | import("../services/otel-service/service.js").OtelService | import("../services/run-service/service.js").RunService, import("../services/config-service/errors.js").ConfigError | import("effect/ConfigError").ConfigError>;
/**
 * Run an effect with the appropriate runtime based on command
 */
export declare function runWithAppropriateRuntime<A, E>(effect: Effect.Effect<A, E>, args?: string[]): Promise<A>;
/**
 * Run an effect and get exit with the appropriate runtime based on command
 */
export declare function runExitWithAppropriateRuntime<A, E>(effect: Effect.Effect<A, E>, args?: string[]): Promise<Exit.Exit<A, unknown>>;
//# sourceMappingURL=runtime-selector.d.ts.map