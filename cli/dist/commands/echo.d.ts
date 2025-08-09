import { Command } from "@effect/cli";
import { Option } from "effect";
import { ConfigService } from "../services/config-service/service.js";
export declare const echoCommand: Command.Command<"echo", ConfigService, import("../services/config-service/errors.js").ConfigError, {
    readonly file: string;
    readonly provider: Option.Option<"google" | "openai" | "anthropic">;
    readonly model: Option.Option<string>;
    readonly output: Option.Option<string>;
}>;
