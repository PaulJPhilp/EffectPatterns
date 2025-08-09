import { FileSystem, Path } from "@effect/platform";
import { Effect } from "effect";
import { RunManagementError } from "./errors.js";
import type { RunInfo } from "./types.js";
declare const RunManagement_base: Effect.Service.Class<RunManagement, "RunManagement", {
    readonly effect: Effect.Effect<{
        createRun: (namePrefix?: string) => Effect.Effect<RunInfo, import("@effect/platform/Error").PlatformError | {
            lastRunNumber: number;
        }, never>;
        getRunDirectory: (runName: string) => Effect.Effect<string, import("@effect/platform/Error").PlatformError | RunManagementError, never>;
        listRuns: () => Effect.Effect<RunInfo[], import("@effect/platform/Error").PlatformError | Effect.Effect<void, never, never>, never>;
        getRunInfo: (runName: string) => Effect.Effect<{
            timestamp: Date;
            name: string;
            directory: string;
            number: number;
        }, import("@effect/platform/Error").PlatformError | RunManagementError, never>;
    }, never, FileSystem.FileSystem | Path.Path>;
    readonly dependencies: readonly [];
}>;
export declare class RunManagement extends RunManagement_base {
}
export {};
