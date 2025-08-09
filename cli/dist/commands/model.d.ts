import { Command } from "@effect/cli";
import { Option as EffectOption } from "effect";
import { ConfigService } from "../services/config-service/service.js";
export declare const modelCommand: Command.Command<"model", ConfigService, import("../services/config-service/errors.js").ConfigError, {
    readonly subcommand: EffectOption.Option<{
        readonly provider: EffectOption.Option<string>;
    } | {
        readonly provider: string;
        readonly model: string;
    }>;
}>;
