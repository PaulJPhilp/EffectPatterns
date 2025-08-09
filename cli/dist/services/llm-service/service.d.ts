import { Effect, ExecutionPlan, Stream, type Schema } from "effect";
import { AiLanguageModel } from "@effect/ai";
import { AnthropicClient } from "@effect/ai-anthropic";
import { GoogleAiClient } from "@effect/ai-google";
import { OpenAiClient } from "@effect/ai-openai";
import type { HttpClient } from "@effect/platform";
import { ConfigService } from "../config-service/service.js";
import { MetricsService } from "../metrics-service/service.js";
import { TemplateService } from "../prompt-template/service.js";
import { LlmServiceError, UnsupportedProviderError } from "./errors.js";
import type { Models, Providers } from "./types.js";
export declare const streamText: (prompt: string, provider: Providers, model: Models, parameters?: Record<string, unknown>) => Stream.Stream<string, Error, ConfigService | TemplateService | AnthropicClient.AnthropicClient | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | HttpClient.HttpClient>;
export declare const generateText: (prompt: string, provider: Providers, model: Models, parameters?: Record<string, unknown>) => Effect.Effect<import("@effect/ai/AiResponse").AiResponse, Error | import("@effect/platform/Error").PlatformError, ConfigService | TemplateService | AnthropicClient.AnthropicClient | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | HttpClient.HttpClient | import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path | MetricsService>;
export declare const generateObject: <T extends Record<string, unknown>>(prompt: string, schema: Schema.Schema<T, T, never>, provider: Providers, model: Models, parameters?: Record<string, unknown>) => Effect.Effect<import("@effect/ai/AiResponse").WithStructuredOutput<T>, import("@effect/platform/Error").PlatformError | import("../config-service/errors.js").ConfigError | LlmServiceError | import("../metrics-service/errors.js").MetricsError | UnsupportedProviderError, ConfigService | AnthropicClient.AnthropicClient | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | HttpClient.HttpClient | import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path | MetricsService>;
export declare const processPromptFromMdx: (filePath: string, provider?: Providers, model?: Models) => Effect.Effect<import("@effect/ai/AiResponse").AiResponse, Error | import("@effect/platform/Error").PlatformError, ConfigService | TemplateService | AnthropicClient.AnthropicClient | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | HttpClient.HttpClient | import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path | import("../mdx-service/service.js").MdxService | MetricsService>;
export declare const processPromptFromText: (prompt: string, provider?: Providers, model?: Models) => Effect.Effect<import("@effect/ai/AiResponse").AiResponse, Error | import("@effect/platform/Error").PlatformError, ConfigService | TemplateService | AnthropicClient.AnthropicClient | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | HttpClient.HttpClient | import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path | MetricsService>;
export declare const buildLlmExecutionPlanEffect: (primaryProvider: Providers, primaryModel: Models) => Effect.Effect<ExecutionPlan.ExecutionPlan<{
    provides: AiLanguageModel.AiLanguageModel;
    input: unknown;
    error: import("effect/ConfigError").ConfigError;
    requirements: AnthropicClient.AnthropicClient | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | HttpClient.HttpClient;
}>, import("../config-service/errors.js").ConfigError, ConfigService>;
declare const LLMService_base: Effect.Service.Class<LLMService, "LLMService", {
    readonly effect: Effect.Effect<{
        generateText: (prompt: string, provider: Providers, model: Models, parameters?: Record<string, unknown>) => Effect.Effect<import("@effect/ai/AiResponse").AiResponse, Error | import("@effect/platform/Error").PlatformError, ConfigService | TemplateService | AnthropicClient.AnthropicClient | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | HttpClient.HttpClient | import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path | MetricsService>;
        generateObject: <T extends Record<string, unknown>>(prompt: string, schema: Schema.Schema<T, T, never>, provider: Providers, model: Models, parameters?: Record<string, unknown>) => Effect.Effect<import("@effect/ai/AiResponse").WithStructuredOutput<T>, import("@effect/platform/Error").PlatformError | import("../config-service/errors.js").ConfigError | LlmServiceError | import("../metrics-service/errors.js").MetricsError | UnsupportedProviderError, ConfigService | AnthropicClient.AnthropicClient | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | HttpClient.HttpClient | import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path | MetricsService>;
        processPromptFromMdx: (filePath: string, provider?: Providers, model?: Models) => Effect.Effect<import("@effect/ai/AiResponse").AiResponse, Error | import("@effect/platform/Error").PlatformError, ConfigService | TemplateService | AnthropicClient.AnthropicClient | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | HttpClient.HttpClient | import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path | import("../mdx-service/service.js").MdxService | MetricsService>;
        processPromptFromText: (prompt: string, provider?: Providers, model?: Models) => Effect.Effect<import("@effect/ai/AiResponse").AiResponse, Error | import("@effect/platform/Error").PlatformError, ConfigService | TemplateService | AnthropicClient.AnthropicClient | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | HttpClient.HttpClient | import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path | MetricsService>;
        streamText: (prompt: string, provider: Providers, model: Models, parameters?: Record<string, unknown>) => Stream.Stream<string, Error, ConfigService | TemplateService | AnthropicClient.AnthropicClient | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | HttpClient.HttpClient>;
    }, never, never>;
    readonly dependencies: readonly [];
}>;
export declare class LLMService extends LLMService_base {
}
export {};
