import { Command } from "@effect/cli";
import { Option } from "effect";
export declare const runList: Command.Command<"list", import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path | import("../../services/output-handler/service.js").OutputHandlerService, import("@effect/platform/Error").PlatformError | import("../../services/output-handler/errors.js").OutputHandlerError, {
    readonly json: Option.Option<boolean>;
    readonly output: Option.Option<string>;
}>;
//# sourceMappingURL=list.d.ts.map