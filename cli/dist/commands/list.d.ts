import { Command } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Option } from "effect";
import { MetricsService } from "../services/metrics-service/service.js";
import { OtelService } from "../services/otel-service/service.js";
export declare const effectPatternsList: Command.Command<"list", FileSystem.FileSystem | import("@effect/platform/Path").Path | MetricsService | OtelService, import("@effect/platform/Error").PlatformError | import("../services/metrics-service/errors.js").MetricsError, {
    readonly pathspec: string[];
    readonly verbose: Option.Option<boolean>;
    readonly json: Option.Option<boolean>;
    readonly quiet: Option.Option<boolean>;
    readonly noColor: Option.Option<boolean>;
    readonly output: Option.Option<string>;
    readonly force: Option.Option<boolean>;
}>;
