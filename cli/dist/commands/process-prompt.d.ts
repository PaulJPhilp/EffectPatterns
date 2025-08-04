import { Command } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Path } from "@effect/platform/Path";
import { MetricsService } from "../services/metrics-service/service.js";
import { OtelService } from "../services/otel-service/service.js";
import { GoogleAiClient } from "@effect/ai-google";
import { OpenAiClient } from "@effect/ai-openai";
import { AnthropicClient } from "@effect/ai-anthropic";
export declare const effectPatternsProcessPrompt: Command.Command<"process-prompt", FileSystem.FileSystem | Path | import("../services/config-service/service.js").ConfigService | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | AnthropicClient.AnthropicClient | MetricsService | import("../services/prompt-template/service.js").TemplateService | import("@effect/platform/HttpClient").HttpClient | OtelService, any, {
    readonly file: string;
    readonly provider: string;
    readonly model: string;
    readonly output: import("effect/Option").Option<string>;
    readonly "output-format": "json" | "text";
    readonly "schema-prompt": import("effect/Option").Option<string>;
}>;
