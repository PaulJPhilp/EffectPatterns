import { Command } from "@effect/cli";
import { Option } from "effect";
import { LLMService } from "../services/llm-service/service.js";
export declare const health: Command.Command<"health", import("../services/config-service/service.js").ConfigService | import("@effect/ai-google/GoogleAiClient").GoogleAiClient | import("@effect/ai-openai/OpenAiClient").OpenAiClient | import("@effect/ai-anthropic/AnthropicClient").AnthropicClient | import("../services/metrics-service/service.js").MetricsService | import("../services/prompt-template/service.js").TemplateService | import("@effect/platform/HttpClient").HttpClient | LLMService, never, {
    readonly provider: Option.Option<"openai" | "anthropic" | "google">;
    readonly detailed: Option.Option<boolean>;
    readonly json: Option.Option<boolean>;
    readonly output: Option.Option<string>;
    readonly force: Option.Option<boolean>;
    readonly quiet: Option.Option<boolean>;
}>;
