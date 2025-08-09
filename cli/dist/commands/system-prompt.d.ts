import { Command } from "@effect/cli";
import { Option } from "effect";
import { ConfigService } from "../services/config-service/service.js";
import { TemplateService } from "../services/prompt-template/service.js";
import { Path } from "@effect/platform";
export declare const systemPromptCommand: Command.Command<"system-prompt", TemplateService | Path.Path | ConfigService, Error, {
    readonly subcommand: Option.Option<{
        readonly file: string;
    } | {}>;
}>;
