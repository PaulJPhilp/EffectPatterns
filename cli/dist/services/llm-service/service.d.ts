import { Effect, Schema, Stream } from "effect";
import { AiLanguageModel, AiError } from "@effect/ai";
import { GoogleAiClient } from "@effect/ai-google";
import { OpenAiClient } from "@effect/ai-openai";
import { AnthropicClient } from "@effect/ai-anthropic";
import { UnsupportedProviderError } from "./errors.js";
import type { Providers, Models } from "./types.js";
import { FileSystem } from "@effect/platform";
import { MetricsService } from "../metrics-service/service.js";
import { ConfigService } from "../config-service/service.js";
import { TemplateService } from "../prompt-template/service.js";
export declare const streamText: (prompt: string, provider: Providers, model: Models, parameters?: Record<string, unknown>) => Stream.Stream<string, Error | AiError.AiError, AiLanguageModel.AiLanguageModel | ConfigService | TemplateService>;
export declare const generateText: (prompt: string, provider: Providers, model: Models, parameters?: Record<string, unknown>) => Effect.Effect<import("@effect/ai/AiResponse").AiResponse, Error | AiError.AiError | import("effect/ConfigError").ConfigError, ConfigService | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | AnthropicClient.AnthropicClient | MetricsService | TemplateService | import("@effect/platform/HttpClient").HttpClient>;
export declare const generateObject: <T extends Record<string, unknown>>(prompt: string, schema: Schema.Schema<T, T, never>, provider: Providers, model: Models, parameters?: Record<string, unknown>) => Effect.Effect<any, UnsupportedProviderError, AiLanguageModel.AiLanguageModel | MetricsService>;
export declare const processPromptFromMdx: (filePath: string, provider?: Providers, model?: Models) => Effect.Effect<import("@effect/ai/AiResponse").AiResponse, Error | AiError.AiError | import("effect/ConfigError").ConfigError, FileSystem.FileSystem | ConfigService | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | AnthropicClient.AnthropicClient | MetricsService | TemplateService | import("@effect/platform/HttpClient").HttpClient>;
export declare const processPromptFromText: (prompt: string, provider?: Providers, model?: Models) => Effect.Effect<import("@effect/ai/AiResponse").AiResponse, Error | AiError.AiError | import("effect/ConfigError").ConfigError, ConfigService | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | AnthropicClient.AnthropicClient | MetricsService | TemplateService | import("@effect/platform/HttpClient").HttpClient>;
declare const LLMService_base: Effect.Service.Class<LLMService, "LLMService", {
    readonly effect: Effect.Effect<{
        generateText: (prompt: string, provider: Providers, model: Models, parameters?: Record<string, unknown>) => Effect.Effect<import("@effect/ai/AiResponse").AiResponse, Error | AiError.AiError | import("effect/ConfigError").ConfigError, ConfigService | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | AnthropicClient.AnthropicClient | MetricsService | TemplateService | import("@effect/platform/HttpClient").HttpClient>;
        generateObject: <T extends Record<string, unknown>>(prompt: string, schema: Schema.Schema<T, T, never>, provider: Providers, model: Models, parameters?: Record<string, unknown>) => Effect.Effect<any, UnsupportedProviderError, AiLanguageModel.AiLanguageModel | MetricsService>;
        processPromptFromMdx: (filePath: string, provider?: Providers, model?: Models) => Effect.Effect<import("@effect/ai/AiResponse").AiResponse, Error | AiError.AiError | import("effect/ConfigError").ConfigError, FileSystem.FileSystem | ConfigService | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | AnthropicClient.AnthropicClient | MetricsService | TemplateService | import("@effect/platform/HttpClient").HttpClient>;
        processPromptFromText: (prompt: string, provider?: Providers, model?: Models) => Effect.Effect<import("@effect/ai/AiResponse").AiResponse, Error | AiError.AiError | import("effect/ConfigError").ConfigError, ConfigService | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | AnthropicClient.AnthropicClient | MetricsService | TemplateService | import("@effect/platform/HttpClient").HttpClient>;
        streamText: (prompt: string, provider: Providers, model: Models, parameters?: Record<string, unknown>) => Stream.Stream<string, Error | AiError.AiError, AiLanguageModel.AiLanguageModel | ConfigService | TemplateService>;
    }, never, never>;
    readonly dependencies: readonly [];
}>;
export declare class LLMService extends LLMService_base {
}
export {};
