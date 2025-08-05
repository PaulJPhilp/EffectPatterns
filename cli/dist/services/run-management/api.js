import { Effect } from "effect";
import { RunManagement, RunManagementError } from "./service.js";
// High-level API for run management
export class RunManagementApi {
    static createRun(namePrefix) {
        return Effect.gen(function* () {
            const service = yield* RunManagement;
            return yield* service.createRun(namePrefix);
        }).pipe(Effect.mapError((cause) => new RunManagementError({ reason: "Failed to create run", cause })));
    }
    static getRunDirectory(runName) {
        return Effect.gen(function* () {
            const service = yield* RunManagement;
            return yield* service.getRunDirectory(runName);
        }).pipe(Effect.mapError((cause) => new RunManagementError({ reason: "Failed to get run directory", cause })));
    }
    static listRuns() {
        return Effect.gen(function* () {
            const service = yield* RunManagement;
            return yield* service.listRuns();
        }).pipe(Effect.mapError((cause) => new RunManagementError({ reason: "Failed to list runs", cause })));
    }
    static getRunInfo(runName) {
        return Effect.gen(function* () {
            const service = yield* RunManagement;
            return yield* service.getRunInfo(runName);
        }).pipe(Effect.mapError((error) => new RunManagementError({ reason: "Failed to get run info", cause: error })));
    }
    static getStandardRunDirectory() {
        return Effect.gen(function* () {
            const runsDir = "runs";
            return runsDir;
        });
    }
}
// Helper functions for run directory structure
export class RunDirectoryUtils {
    static getOutputsDir(runDir) {
        return `${runDir}/outputs`;
    }
    static getLogsDir(runDir) {
        return `${runDir}/logs`;
    }
    static getMetricsDir(runDir) {
        return `${runDir}/metrics`;
    }
    static getMetadataPath(runDir) {
        return `${runDir}/run-info.json`;
    }
    static getResponsePath(runDir, format = "md") {
        return `${runDir}/outputs/response.${format}`;
    }
    static getMetricsPath(runDir) {
        return `${runDir}/metrics/metrics.jsonl`;
    }
    static getLogPath(runDir) {
        return `${runDir}/logs/log.txt`;
    }
    static getPromptPath(runDir, format = "mdx") {
        return `${runDir}/outputs/prompt.${format}`;
    }
}
