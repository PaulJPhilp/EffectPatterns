import { Effect } from "effect";
import { RunManagement } from "./service.js";
import type { RunInfo } from "./types.js";
import type { RunManagementError } from "./service.js";

// High-level API for run management
export class RunManagementApi {
  static createRun(namePrefix?: string): Effect.Effect<RunInfo, RunManagementError> {
    return Effect.gen(function* () {
      const service = yield* RunManagement;
      return yield* service.createRun(namePrefix);
    });
  }

  static getRunDirectory(runName: string): Effect.Effect<string, RunManagementError> {
    return Effect.gen(function* () {
      const service = yield* RunManagement;
      return yield* service.getRunDirectory(runName);
    });
  }

  static listRuns(): Effect.Effect<ReadonlyArray<RunInfo>, RunManagementError> {
    return Effect.gen(function* () {
      const service = yield* RunManagement;
      return yield* service.listRuns();
    });
  }

  static getRunInfo(runName: string): Effect.Effect<RunInfo, RunManagementError> {
    return Effect.gen(function* () {
      const service = yield* RunManagement;
      return yield* service.getRunInfo(runName);
    });
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
