import { Command } from "@effect/cli";
import { Option } from "effect";
import { RunService } from "../../services/run-service/service.js";
export declare const runCurrent: Command.Command<"current", import("../../services/output-handler/service.js").OutputHandlerService | RunService, import("@effect/platform/Error").PlatformError | import("../../services/output-handler/errors.js").OutputHandlerError | Partial<import("../../services/run-service/types.js").RunInfo>, {
    readonly json: Option.Option<boolean>;
    readonly output: Option.Option<string>;
}>;
//# sourceMappingURL=current.d.ts.map