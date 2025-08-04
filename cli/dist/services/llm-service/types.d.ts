import { AiResponse } from "@effect/ai";
export type GeneratedText = AiResponse.AiResponse;
export type GeneratedObject<T> = T;
export interface MdxPromptConfig {
    provider: Providers;
    model: Models;
    parameters?: Record<string, unknown>;
}
export type GoogleModels = "gemini-2.5-pro" | "gemini-2.5-flash" | "gemini-2.5-flash-lite" | "gemini-2.0-flash" | "gemini-2.0-flash-lite";
export type OpenAIModels = "gpt-4.1" | "gpt-4o" | "gpt-4o-mini" | "gpt-4-turbo" | "gpt-4" | "gpt-3.5-turbo" | "o1" | "o1-mini" | "o3" | "o3-mini" | "o4-mini";
export type AnthropicModels = "claude-4" | "claude-4-sonnet" | "claude-4-haiku" | "claude-3-7-sonnet" | "claude-3-7-haiku" | "claude-3-5-sonnet" | "claude-3-5-haiku" | "claude-3-opus" | "claude-3-sonnet" | "claude-3-haiku";
export type Providers = "google" | "openai" | "anthropic";
export type Models = GoogleModels | OpenAIModels | AnthropicModels;
export declare const selectModel: (provider: Providers, model: Models) => import("effect/Layer").Layer<import("@effect/ai/AiLanguageModel").AiLanguageModel, never, import("@effect/ai-google/GoogleAiClient").GoogleAiClient> | import("effect/Layer").Layer<import("@effect/ai/AiLanguageModel").AiLanguageModel, never, import("@effect/ai-openai/OpenAiClient").OpenAiClient> | import("effect/Layer").Layer<import("@effect/ai/AiLanguageModel").AiLanguageModel, never, import("@effect/ai-anthropic/AnthropicClient").AnthropicClient>;
