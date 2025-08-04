import { Command } from "@effect/cli";
import { Option } from "effect";
import { ConfigService } from "../services/config-service/service.js";
export declare const configCommand: Command.Command<"config", ConfigService, import("../services/config-service/service.js").ConfigError, {
    readonly subcommand: Option.Option<{
        readonly key: string;
    } | {
        readonly key: string;
        readonly value: string;
    } | {}>;
}>;
