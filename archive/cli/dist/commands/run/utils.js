import { FileSystem, Path } from "@effect/platform";
import { Console, Effect } from "effect";
// Returns the absolute path to the runs directory under the current cwd
export const getRunsDir = Effect.gen(function* () {
    const path = yield* Path.Path;
    return path.join(process.cwd(), "runs");
});
// Resolves the absolute directory for a given run name within runsDir
export const resolveRunDir = (name) => Effect.gen(function* () {
    const path = yield* Path.Path;
    const runsDir = yield* getRunsDir;
    return path.resolve(runsDir, name);
});
// Ensures a run directory is inside the runs directory boundary.
// Returns true if valid. Logs an error and returns false if invalid.
export const ensureInsideRunsDir = (runDir) => Effect.gen(function* () {
    const path = yield* Path.Path;
    const runsDir = yield* getRunsDir;
    const normalizedRuns = path.resolve(runsDir);
    const ok = runDir === normalizedRuns || runDir.startsWith(`${normalizedRuns}/`);
    if (!ok) {
        yield* Console.error("Invalid run name path");
        return false;
    }
    return true;
});
// Reads and parses run-info.json from a run directory.
// - On success: returns the parsed object
// - On failure: logs an error and returns null
export const readRunInfo = (runDir, displayName) => Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const infoPath = path.join(runDir, "run-info.json");
    const hasInfo = yield* fs.exists(infoPath);
    if (!hasInfo) {
        const id = displayName ?? runDir;
        yield* Console.error(`run-info.json missing for: ${id}`);
        return null;
    }
    const content = yield* fs.readFileString(infoPath);
    try {
        return JSON.parse(content);
    }
    catch (e) {
        yield* Console.error("Invalid JSON in run-info.json");
        return null;
    }
});
// Checks for presence of run-info.json in a run directory
export const hasRunInfo = (runDir) => Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const infoPath = path.join(runDir, "run-info.json");
    return yield* fs.exists(infoPath);
});
// Returns the list of run directory names under runsDir. If the directory
// does not exist or is empty, returns an empty array.
export const listRunNames = Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const runsDir = yield* getRunsDir;
    const exists = yield* fs.exists(runsDir);
    if (!exists)
        return [];
    const entries = yield* fs.readDirectory(runsDir);
    return entries;
});
//# sourceMappingURL=utils.js.map