import { Command } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { RunService } from "../../services/run-service/service.js";
export declare const runUse: Command.Command<"use", FileSystem.FileSystem | import("@effect/platform/Path").Path | RunService, import("@effect/platform/Error").PlatformError, {
    readonly name: string;
}>;
//# sourceMappingURL=use.d.ts.map