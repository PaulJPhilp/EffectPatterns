import { Command } from "@effect/cli";
import { Option } from "effect";
import { MetricsService } from "../../services/metrics-service/service.js";
export declare const metricsReport: Command.Command<"report", import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path | MetricsService | import("../../services/output-handler/service.js").OutputHandlerService, import("@effect/platform/Error").PlatformError | import("../../services/output-handler/errors.js").OutputHandlerError, {
    readonly format: Option.Option<"json" | "jsonl" | "console">;
    readonly output: Option.Option<string>;
}>;
//# sourceMappingURL=report.d.ts.map