import { Command } from "@effect/cli";
import { Option } from "effect";
import { AuthService } from "../../services/auth-service/service.js";
export declare const authList: Command.Command<"list", import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path | import("../../services/output-handler/service.js").OutputHandlerService | AuthService, import("@effect/platform/Error").PlatformError | import("../../services/output-handler/errors.js").OutputHandlerError | import("../../services/auth-service/errors.js").AuthError, {
    readonly output: Option.Option<string>;
}>;
//# sourceMappingURL=list.d.ts.map