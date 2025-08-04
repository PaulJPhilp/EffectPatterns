import { Effect } from "effect";
import { RunManagement, RunManagementError, type RunInfo } from "./service.js";
export declare class RunManagementApi {
    static createRun(namePrefix?: string): Effect.Effect<RunInfo, RunManagementError, RunManagement>;
    static getRunDirectory(runName: string): Effect.Effect<string, RunManagementError, RunManagement>;
    static listRuns(): Effect.Effect<ReadonlyArray<RunInfo>, RunManagementError, RunManagement>;
    static getRunInfo(runName: string): Effect.Effect<RunInfo, RunManagementError, RunManagement>;
    static getStandardRunDirectory(): Effect.Effect<string>;
}
export declare class RunDirectoryUtils {
    static getOutputsDir(runDir: string): string;
    static getLogsDir(runDir: string): string;
    static getMetricsDir(runDir: string): string;
    static getMetadataPath(runDir: string): string;
    static getResponsePath(runDir: string, format?: string): string;
    static getMetricsPath(runDir: string): string;
    static getLogPath(runDir: string): string;
    static getPromptPath(runDir: string, format?: string): string;
}
