import { Command } from "@effect/cli";
import { Option as EffectOption } from "effect";
import { LLMService } from "../services/llm-service/service.js";
export declare const health: Command.Command<"health", import("../services/config-service/service.js").ConfigService | import("../services/metrics-service/service.js").MetricsService | import("../services/prompt-template/service.js").TemplateService | import("@effect/platform/HttpClient").HttpClient | LLMService, Error | import("@effect/ai/AiError").AiError | import("effect/ConfigError").ConfigError, {
    readonly provider: EffectOption.Option<"openai" | "anthropic" | "google">;
    readonly detailed: EffectOption.Option<boolean>;
    readonly json: EffectOption.Option<boolean>;
    readonly output: EffectOption.Option<string>;
    readonly force: EffectOption.Option<boolean>;
    readonly quiet: EffectOption.Option<boolean>;
}>;
