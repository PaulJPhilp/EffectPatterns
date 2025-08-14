import { Command } from "@effect/cli";
import { RunService } from "../../services/run-service/service.js";
export declare const runPath: Command.Command<"path", RunService, import("@effect/platform/Error").PlatformError | import("../../services/run-service/errors.js").NoActiveRunError | Partial<import("../../services/run-service/types.js").RunInfo>, {}>;
//# sourceMappingURL=path.d.ts.map