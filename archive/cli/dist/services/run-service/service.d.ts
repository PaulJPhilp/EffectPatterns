import { FileSystem, Path } from "@effect/platform";
import { Effect } from "effect";
import { NoActiveRunError } from "./errors.js";
import type { RunInfo } from "./types.js";
declare const RunService_base: Effect.Service.Class<RunService, "RunService", {
    readonly accessors: true;
    readonly effect: Effect.Effect<{
        createRunDirectory: (namePrefix?: string) => Effect.Effect<RunInfo, import("@effect/platform/Error").PlatformError, never>;
        getRunPath: () => Effect.Effect<string, import("@effect/platform/Error").PlatformError | NoActiveRunError | Partial<RunInfo>, never>;
        getRunFilePath: (filename: string) => Effect.Effect<string, import("@effect/platform/Error").PlatformError | NoActiveRunError | Partial<RunInfo>, never>;
        getCurrentRun: () => Effect.Effect<any, import("@effect/platform/Error").PlatformError | Partial<RunInfo>, never>;
        setCurrentRun: (run: RunInfo) => Effect.Effect<void, import("@effect/platform/Error").PlatformError, never>;
        clearCurrentRun: () => Effect.Effect<void, import("@effect/platform/Error").PlatformError, never>;
    }, never, FileSystem.FileSystem | Path.Path>;
    readonly dependencies: readonly [];
}>;
export declare class RunService extends RunService_base {
}
export {};
//# sourceMappingURL=service.d.ts.map