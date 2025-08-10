import { Command } from "@effect/cli";
import { Option } from "effect";
import { PlanError_InvalidRetries, PlanError_InvalidRetryMs, PlanError_InvalidFallbackSpec } from "./errors.js";
import { ConfigService } from "../services/config-service/service.js";
export declare const planCommand: Command.Command<"plan", ConfigService, import("../services/config-service/errors.js").ConfigError | PlanError_InvalidRetries | PlanError_InvalidRetryMs | PlanError_InvalidFallbackSpec, {
    readonly subcommand: Option.Option<{
        readonly retries: Option.Option<number>;
        readonly retryMs: Option.Option<number>;
        readonly fallbacks: Option.Option<string>;
    } | {} | {} | {}>;
}>;
