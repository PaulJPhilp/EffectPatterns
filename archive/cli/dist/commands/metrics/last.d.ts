import { Command } from "@effect/cli";
import { Option } from "effect";
import { MetricsService } from "../../services/metrics-service/service.js";
export declare const metricsLast: Command.Command<"last", import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path | MetricsService | import("../../services/output-handler/service.js").OutputHandlerService, import("@effect/platform/Error").PlatformError | import("../../services/output-handler/errors.js").OutputHandlerError, {
    readonly json: Option.Option<boolean>;
    readonly output: Option.Option<string>;
}>;
//# sourceMappingURL=last.d.ts.map