import { Effect } from "effect";
import { RunManagement, RunManagementError, type RunInfo } from "./service.js";

// High-level API for run management
export class RunManagementApi {
  static createRun(namePrefix?: string): Effect.Effect<RunInfo, RunManagementError, RunManagement> {
    return Effect.gen(function* () {
      const service = yield* RunManagement;
      return yield* service.createRun(namePrefix);
    }).pipe(
      Effect.mapError((cause) => new RunManagementError({ reason: "Failed to create run", cause }))
    );
  }

  static getRunDirectory(runName: string): Effect.Effect<string, RunManagementError, RunManagement> {
    return Effect.gen(function* () {
      const service = yield* RunManagement;
      return yield* service.getRunDirectory(runName);
    }).pipe(
      Effect.mapError((cause) => new RunManagementError({ reason: "Failed to get run directory", cause }))
    );
  }

  static listRuns(): Effect.Effect<ReadonlyArray<RunInfo>, RunManagementError, RunManagement> {
    return Effect.gen(function* () {
      const service = yield* RunManagement;
      return yield* service.listRuns();
    }).pipe(
      Effect.mapError((cause) => new RunManagementError({ reason: "Failed to list runs", cause }))
    );
  }

  static getRunInfo(runName: string): Effect.Effect<RunInfo, RunManagementError, RunManagement> {
    return Effect.gen(function* () {
      const service = yield* RunManagement;
      return yield* service.getRunInfo(runName);
    }).pipe(
      Effect.mapError((error) => new RunManagementError({ reason: "Failed to get run info", cause: error }))
    );
  }

  static getStandardRunDirectory(): Effect.Effect<string> {
    return Effect.gen(function* () {
      const runsDir = "runs";
      return runsDir;
    });
  }
}

// Helper functions for run directory structure
export class RunDirectoryUtils {
  static getOutputsDir(runDir: string): string {
    return `${runDir}/outputs`;
  }

  static getLogsDir(runDir: string): string {
    return `${runDir}/logs`;
  }

  static getMetricsDir(runDir: string): string {
    return `${runDir}/metrics`;
  }

  static getMetadataPath(runDir: string): string {
    return `${runDir}/run-info.json`;
  }

  static getResponsePath(runDir: string, format: string = "md"): string {
    return `${runDir}/outputs/response.${format}`;
  }

  static getMetricsPath(runDir: string): string {
    return `${runDir}/metrics/metrics.jsonl`;
  }

  static getLogPath(runDir: string): string {
    return `${runDir}/logs/log.txt`;
  }

  static getPromptPath(runDir: string, format: string = "mdx"): string {
    return `${runDir}/outputs/prompt.${format}`;
  }
}
