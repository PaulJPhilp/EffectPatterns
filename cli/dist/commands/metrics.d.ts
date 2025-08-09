import { Command } from "@effect/cli";
import { Option } from "effect";
import { MetricsService } from "../services/metrics-service/service.js";
export declare const metricsCommand: Command.Command<"metrics", MetricsService | import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path, import("@effect/platform/Error").PlatformError | import("../services/metrics-service/errors.js").MetricsError, {
    readonly subcommand: Option.Option<{
        readonly format: Option.Option<"console" | "json" | "jsonl">;
        readonly output: Option.Option<string>;
    } | {} | {}>;
}>;
