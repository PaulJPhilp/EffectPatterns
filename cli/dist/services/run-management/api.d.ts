import { Effect } from "effect";
import { RunInfo } from "./types.js";
import { RunManagementError } from "./errors.js";
export interface RunManagementApi {
    readonly createRun: (namePrefix?: string) => Effect.Effect<RunInfo, RunManagementError>;
    readonly getRunDirectory: (runName: string) => Effect.Effect<string, RunManagementError>;
    readonly listRuns: () => Effect.Effect<ReadonlyArray<RunInfo>, RunManagementError>;
    readonly getRunInfo: (runName: string) => Effect.Effect<RunInfo, RunManagementError>;
}
