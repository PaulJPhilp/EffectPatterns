import { Command } from "@effect/cli";
import { AuthService } from "../services/auth-service/service.js";
export declare const authCommand: Command.Command<"auth", import("@effect/platform/FileSystem").FileSystem | AuthService | import("@effect/platform/Path").Path, import("@effect/platform/Error").PlatformError | import("../services/auth-service/service.js").AuthError, {
    readonly subcommand: import("effect/Option").Option<{
        readonly provider: string;
        readonly apiKey: string;
    } | {
        readonly provider: string;
    } | {
        readonly provider: string;
    } | {} | {}>;
}>;
