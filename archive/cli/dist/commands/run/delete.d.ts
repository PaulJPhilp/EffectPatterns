import { Command } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Option } from "effect";
import { RunService } from "../../services/run-service/service.js";
export declare const runDelete: Command.Command<"delete", FileSystem.FileSystem | import("@effect/platform/Path").Path | RunService, import("@effect/platform/Error").PlatformError | Partial<import("../../services/run-service/types.js").RunInfo>, {
    readonly name: string;
    readonly force: Option.Option<boolean>;
    readonly quiet: Option.Option<boolean>;
}>;
//# sourceMappingURL=delete.d.ts.map