import { Command } from "@effect/cli";
import { Option } from "effect";
import { ConfigService } from "../services/config-service/service.js";
import { LLMService } from "../services/llm-service/service.js";
export declare const health: Command.Command<"health", import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path | ConfigService | LLMService | import("../services/prompt-template/service.js").TemplateService | import("@effect/ai-google/GoogleAiClient").GoogleAiClient | import("@effect/ai-openai/OpenAiClient").OpenAiClient | import("@effect/ai-anthropic/AnthropicClient").AnthropicClient | import("@effect/platform/HttpClient").HttpClient | import("../services/metrics-service/service.js").MetricsService, import("../services/config-service/errors.js").ConfigError, {
    readonly provider: Option.Option<"google" | "openai" | "anthropic">;
    readonly detailed: Option.Option<boolean>;
    readonly json: Option.Option<boolean>;
    readonly output: Option.Option<string>;
    readonly force: Option.Option<boolean>;
    readonly quiet: Option.Option<boolean>;
}>;
