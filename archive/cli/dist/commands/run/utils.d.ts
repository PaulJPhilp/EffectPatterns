import { FileSystem, Path } from "@effect/platform";
import { Effect } from "effect";
export declare const getRunsDir: Effect.Effect<string, never, Path.Path>;
export declare const resolveRunDir: (name: string) => Effect.Effect<string, never, Path.Path>;
export declare const ensureInsideRunsDir: (runDir: string) => Effect.Effect<boolean, never, Path.Path>;
export declare const readRunInfo: (runDir: string, displayName?: string) => Effect.Effect<unknown, import("@effect/platform/Error").PlatformError, FileSystem.FileSystem | Path.Path>;
export declare const hasRunInfo: (runDir: string) => Effect.Effect<boolean, import("@effect/platform/Error").PlatformError, FileSystem.FileSystem | Path.Path>;
export declare const listRunNames: Effect.Effect<string[], import("@effect/platform/Error").PlatformError, FileSystem.FileSystem | Path.Path>;
//# sourceMappingURL=utils.d.ts.map