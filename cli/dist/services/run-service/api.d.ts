import { Effect } from "effect";
import { RunService } from "./service.js";
import type { RunInfo } from "./types.js";
export declare const createRun: (prefix?: string) => Effect.Effect<RunInfo, import("@effect/platform/Error").PlatformError, RunService>;
export declare const getRunPath: Effect.Effect<string, import("@effect/platform/Error").PlatformError | Error, RunService>;
export declare const getRunFilePath: (filename: string) => Effect.Effect<string, import("@effect/platform/Error").PlatformError | Error, RunService>;
export declare const getCurrentRun: Effect.Effect<any, import("@effect/platform/Error").PlatformError, RunService>;
export declare const setCurrentRun: (run: RunInfo) => Effect.Effect<void, import("@effect/platform/Error").PlatformError, RunService>;
export declare const clearCurrentRun: Effect.Effect<void, import("@effect/platform/Error").PlatformError, RunService>;
