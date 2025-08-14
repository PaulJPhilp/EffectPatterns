import { Command } from "@effect/cli";
import { Option } from "effect";
import { AuthService } from "../../services/auth-service/service.js";
export declare const authShow: Command.Command<"show", import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path | AuthService, import("@effect/platform/Error").PlatformError | import("../../services/auth-service/errors.js").AuthError, {
    readonly json: Option.Option<boolean>;
    readonly output: Option.Option<string>;
    readonly quiet: Option.Option<boolean>;
    readonly verbose: Option.Option<boolean>;
    readonly noColor: Option.Option<boolean>;
    readonly force: Option.Option<boolean>;
}>;
//# sourceMappingURL=show.d.ts.map