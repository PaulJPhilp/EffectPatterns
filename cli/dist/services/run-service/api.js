import { Effect } from "effect";
import { RunService } from "./service.js";
export const createRun = (prefix) => Effect.gen(function* () {
    const service = yield* RunService;
    return yield* service.createRunDirectory(prefix);
});
export const getRunPath = Effect.gen(function* () {
    const service = yield* RunService;
    return yield* service.getRunPath();
});
export const getRunFilePath = (filename) => Effect.gen(function* () {
    const service = yield* RunService;
    return yield* service.getRunFilePath(filename);
});
export const getCurrentRun = Effect.gen(function* () {
    const service = yield* RunService;
    return yield* service.getCurrentRun();
});
export const setCurrentRun = (run) => Effect.gen(function* () {
    const service = yield* RunService;
    return yield* service.setCurrentRun(run);
});
export const clearCurrentRun = Effect.gen(function* () {
    const service = yield* RunService;
    return yield* service.clearCurrentRun();
});
