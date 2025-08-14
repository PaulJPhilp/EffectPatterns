import { Command } from "@effect/cli";
import { Option } from "effect";
import { MetricsService } from "../../services/metrics-service/service.js";
export declare const metricsClear: Command.Command<"clear", import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path | MetricsService | import("../../services/output-handler/service.js").OutputHandlerService, import("@effect/platform/Error").PlatformError | import("../../services/metrics-service/errors.js").MetricsError | import("../../services/output-handler/errors.js").OutputHandlerError, {
    readonly output: Option.Option<string>;
}>;
//# sourceMappingURL=clear.d.ts.map