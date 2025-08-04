import { Command } from "@effect/cli";
import { FileSystem } from "@effect/platform/FileSystem";
import { Path } from "@effect/platform/Path";
import { TemplateService } from "../services/prompt-template/service.js";
export declare const applyPromptToDir: Command.Command<"apply-prompt-to-dir", FileSystem | Path | import("../services/config-service/service.js").ConfigService | import("@effect/ai/AiLanguageModel").AiLanguageModel | TemplateService, import("@effect/platform/Error").PlatformError | Error | import("@effect/ai/AiError").AiError, {
    readonly input: string;
    readonly output: string;
    readonly filePattern: string;
    readonly promptFile: string;
    readonly parameters: import("effect/HashMap").HashMap<string, string>;
}>;
