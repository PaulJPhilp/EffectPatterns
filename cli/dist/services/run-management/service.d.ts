import { Effect } from "effect";
import { FileSystem, Path } from "@effect/platform";
declare const RunManagementError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "RunManagementError";
} & Readonly<A>;
export declare class RunManagementError extends RunManagementError_base<{
    readonly reason: string;
    readonly cause?: unknown;
}> {
}
declare const InvalidRunNameError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "InvalidRunNameError";
} & Readonly<A>;
export declare class InvalidRunNameError extends InvalidRunNameError_base<{
    readonly name: string;
    readonly reason: string;
}> {
}
export interface RunState {
    readonly lastRunNumber: number;
}
export interface RunInfo {
    readonly name: string;
    readonly directory: string;
    readonly timestamp: Date;
    readonly number: number;
}
export interface RunManagementApi {
    readonly createRun: (namePrefix?: string) => Effect.Effect<RunInfo, RunManagementError>;
    readonly getRunDirectory: (runName: string) => Effect.Effect<string, RunManagementError>;
    readonly listRuns: () => Effect.Effect<ReadonlyArray<RunInfo>, RunManagementError>;
    readonly getRunInfo: (runName: string) => Effect.Effect<RunInfo, RunManagementError>;
}
declare const RunManagement_base: Effect.Service.Class<RunManagement, "RunManagement", {
    readonly effect: Effect.Effect<{
        createRun: (namePrefix?: string) => Effect.Effect<RunInfo, import("@effect/platform/Error").PlatformError, never>;
        getRunDirectory: (runName: string) => Effect.Effect<string, import("@effect/platform/Error").PlatformError | RunManagementError, never>;
        listRuns: () => Effect.Effect<RunInfo[], import("@effect/platform/Error").PlatformError, never>;
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
