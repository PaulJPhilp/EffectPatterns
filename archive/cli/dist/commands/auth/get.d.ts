import { Command } from "@effect/cli";
import { AuthService } from "../../services/auth-service/service.js";
export declare const authGet: Command.Command<"get", import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path | AuthService, import("@effect/platform/Error").PlatformError | import("../../services/auth-service/errors.js").AuthError, {
    readonly provider: string;
}>;
//# sourceMappingURL=get.d.ts.map