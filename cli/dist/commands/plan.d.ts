import { Command } from "@effect/cli";
import { Option } from "effect";
import { ConfigService } from "../services/config-service/service.js";
export declare const planCommand: Command.Command<"plan", ConfigService, import("../services/config-service/errors.js").ConfigError, {
    readonly subcommand: Option.Option<{
        readonly retries: Option.Option<number>;
        readonly retryMs: Option.Option<number>;
        readonly fallbacks: Option.Option<string>;
    } | {} | {} | {}>;
}>;
