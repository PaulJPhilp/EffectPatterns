import { Effect } from "effect";
import { FileSystem } from "@effect/platform";
import { Path } from "@effect/platform";
export interface RunInfo {
    readonly runName: string;
    readonly runDirectory: string;
    readonly timestamp: string;
    readonly sequentialNumber: number;
}
declare const RunService_base: Effect.Service.Class<RunService, "RunService", {
    readonly accessors: true;
    readonly effect: Effect.Effect<{
        createRunDirectory: (namePrefix?: string) => Effect.Effect<RunInfo, import("@effect/platform/Error").PlatformError, never>;
        getRunPath: () => Effect.Effect<string, Error, never>;
        getRunFilePath: (filename: string) => Effect.Effect<string, Error, never>;
        getCurrentRun: () => Effect.Effect<RunInfo, never, never>;
    }, never, FileSystem.FileSystem | Path.Path>;
}>;
export declare class RunService extends RunService_base {
}
export declare const RunServiceDefault: typeof RunService;
export {};
