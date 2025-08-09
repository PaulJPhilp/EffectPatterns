import { Command } from "@effect/cli";
import { Option } from "effect";
import { ConfigService } from "../services/config-service/service.js";
export declare const configCommand: Command.Command<"config", ConfigService, import("../services/config-service/errors.js").ConfigError, {
    readonly subcommand: Option.Option<{
        readonly key: string;
    } | {
        readonly key: string;
        readonly value: string;
    } | {
        readonly json: Option.Option<boolean>;
        readonly output: Option.Option<string>;
        readonly force: Option.Option<boolean>;
        readonly quiet: Option.Option<boolean>;
        readonly verbose: Option.Option<boolean>;
        readonly noColor: Option.Option<boolean>;
    }>;
}>;
