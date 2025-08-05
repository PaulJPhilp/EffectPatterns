import { Command } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Path } from "@effect/platform/Path";
import { MetricsService } from "../services/metrics-service/service.js";
import { OtelService } from "../services/otel-service/service.js";
export declare const effectPatternsProcessPrompt: Command.Command<"process-prompt", FileSystem.FileSystem | Path | import("../services/config-service/service.js").ConfigService | import("@effect/ai/AiLanguageModel").AiLanguageModel | import("@effect/ai-google/GoogleAiClient").GoogleAiClient | import("@effect/ai-openai/OpenAiClient").OpenAiClient | import("@effect/ai-anthropic/AnthropicClient").AnthropicClient | MetricsService | import("../services/prompt-template/service.js").TemplateService | import("@effect/platform/HttpClient").HttpClient | OtelService, any, {
    readonly file: string;
    readonly provider: string;
    readonly model: string;
    readonly output: import("effect/Option").Option<string>;
}>;
