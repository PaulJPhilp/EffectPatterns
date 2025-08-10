import { Command } from "@effect/cli";
import { FileSystem } from "@effect/platform/FileSystem";
import { Path } from "@effect/platform/Path";
import { Option } from "effect";
import { ConfigService } from "../services/config-service/service.js";
import { TemplateService } from "../services/prompt-template/service.js";
export declare const applyPromptToDir: Command.Command<"apply-prompt-to-dir", FileSystem | Path | ConfigService | TemplateService | import("@effect/ai-google/GoogleAiClient").GoogleAiClient | import("@effect/ai-openai/OpenAiClient").OpenAiClient | import("@effect/ai-anthropic/AnthropicClient").AnthropicClient | import("@effect/platform/HttpClient").HttpClient, import("@effect/platform/Error").PlatformError | Error, {
    readonly input: string;
    readonly output: string;
    readonly filePattern: string;
    readonly promptFile: string;
    readonly parameters: import("effect/HashMap").HashMap<string, string>;
    readonly quiet: Option.Option<boolean>;
}>;
