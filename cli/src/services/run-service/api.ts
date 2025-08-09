import { Effect } from "effect";
import { RunService } from "./service.js";
import type { RunInfo } from "./types.js";

export const createRun = (prefix?: string) =>
  Effect.gen(function* () {
    const service = yield* RunService;
    return yield* service.createRunDirectory(prefix);
  });

export const getRunPath = Effect.gen(function* () {
  const service = yield* RunService;
  return yield* service.getRunPath();
});

export const getRunFilePath = (filename: string) =>
  Effect.gen(function* () {
    const service = yield* RunService;
    return yield* service.getRunFilePath(filename);
  });

export const getCurrentRun = Effect.gen(function* () {
  const service = yield* RunService;
  return yield* service.getCurrentRun();
});

export const setCurrentRun = (run: RunInfo) =>
  Effect.gen(function* () {
    const service = yield* RunService;
    return yield* service.setCurrentRun(run);
  });

export const clearCurrentRun = Effect.gen(function* () {
  const service = yield* RunService;
  return yield* service.clearCurrentRun();
});
