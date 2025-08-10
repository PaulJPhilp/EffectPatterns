import { Command } from "@effect/cli";
import { Option } from "effect";
import { DryRunError_MissingInput } from "./errors.js";
import { ConfigService } from "../services/config-service/service.js";
export declare const dryRun: Command.Command<"dry-run", ConfigService, import("../services/config-service/errors.js").ConfigError | DryRunError_MissingInput, {
    readonly provider: Option.Option<"google" | "openai" | "anthropic">;
    readonly model: Option.Option<string>;
    readonly prompt: Option.Option<string>;
    readonly file: Option.Option<string>;
    readonly output: Option.Option<string>;
    readonly quiet: Option.Option<boolean>;
    readonly force: Option.Option<boolean>;
}>;
