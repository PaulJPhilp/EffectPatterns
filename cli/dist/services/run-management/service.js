import { Effect, Data } from "effect";
import { FileSystem, Path } from "@effect/platform";
// Error types for run management
export class RunManagementError extends Data.TaggedError("RunManagementError") {
}
export class InvalidRunNameError extends Data.TaggedError("InvalidRunNameError") {
}
// Service definition using Effect.Service pattern
export class RunManagement extends Effect.Service()("RunManagement", {
    effect: Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const state = Effect.gen(function* () {
            const statePath = path.join(process.cwd(), ".effect-ai/runs.json");
            const exists = yield* fs.exists(statePath);
            if (!exists) {
                return { lastRunNumber: 0 };
            }
            const content = yield* fs.readFileString(statePath);
            try {
                const state = JSON.parse(content);
                return state;
            }
            catch (error) {
                return { lastRunNumber: 0 };
            }
        });
        const writeState = (state) => Effect.gen(function* () {
            const statePath = path.join(process.cwd(), ".effect-ai/runs.json");
            yield* fs.writeFileString(statePath, JSON.stringify(state, null, 2));
        });
        const createRunDirectory = (runName) => Effect.gen(function* () {
            const runsDir = path.join(process.cwd(), "runs");
            const runDir = path.join(runsDir, runName);
            yield* fs.makeDirectory(runDir, { recursive: true });
            // Create standard subdirectories
            yield* fs.makeDirectory(path.join(runDir, "outputs"), { recursive: true });
            yield* fs.makeDirectory(path.join(runDir, "logs"), { recursive: true });
            yield* fs.makeDirectory(path.join(runDir, "metrics"), { recursive: true });
            return runDir;
        });
        const generateRunName = (prefix = "run", number) => {
            return `${prefix}-${number.toString().padStart(4, "0")}`;
        };
        return {
            createRun: (namePrefix) => Effect.gen(function* () {
                const currentState = yield* state;
                const nextNumber = currentState.lastRunNumber + 1;
                const runName = generateRunName(namePrefix, nextNumber);
                const runDir = yield* createRunDirectory(runName);
                // Update state
                const newState = { lastRunNumber: nextNumber };
                yield* writeState(newState);
                const runInfo = {
                    name: runName,
                    directory: runDir,
                    timestamp: new Date(),
                    number: nextNumber,
                };
                // Write run metadata
                const metadataPath = path.join(runDir, "run-info.json");
                yield* fs.writeFileString(metadataPath, JSON.stringify(runInfo, null, 2));
                return runInfo;
            }),
            getRunDirectory: (runName) => Effect.gen(function* () {
                const runsDir = path.join(process.cwd(), "runs");
                const runDir = path.join(runsDir, runName);
                const exists = yield* fs.exists(runDir);
                if (!exists) {
                    return yield* Effect.fail(new RunManagementError({ reason: `Run directory not found: ${runName}` }));
                }
                return runDir;
            }),
            listRuns: () => Effect.gen(function* () {
                const runsDir = path.join(process.cwd(), "runs");
                const exists = yield* fs.exists(runsDir);
                if (!exists) {
                    return [];
                }
                const entries = yield* fs.readDirectory(runsDir);
                const runInfos = [];
                for (const entryName of entries) {
                    const runDir = path.join(runsDir, entryName);
                    const metadataPath = path.join(runDir, "run-info.json");
                    const isDirectory = yield* fs.exists(runDir).pipe(Effect.andThen(exists => exists ? fs.stat(runDir) : Effect.succeed(null)), Effect.map(stat => stat?.type === "Directory"));
                    if (isDirectory) {
                        const metadataExists = yield* fs.exists(metadataPath);
                        if (metadataExists) {
                            try {
                                const content = yield* fs.readFileString(metadataPath);
                                const info = JSON.parse(content);
                                runInfos.push({
                                    ...info,
                                    timestamp: new Date(info.timestamp),
                                });
                            }
                            catch (error) {
                                // Skip invalid run directories
                            }
                        }
                    }
                }
                // Sort by number descending
                return runInfos.sort((a, b) => b.number - a.number);
            }),
            getRunInfo: (runName) => Effect.gen(function* () {
                const runDir = yield* Effect.gen(function* () {
                    const runsDir = path.join(process.cwd(), "runs");
                    const runDir = path.join(runsDir, runName);
                    const exists = yield* fs.exists(runDir);
                    if (!exists) {
                        return yield* Effect.fail(new RunManagementError({ reason: `Run directory not found: ${runName}` }));
                    }
                    return runDir;
                });
                const metadataPath = path.join(runDir, "run-info.json");
                const exists = yield* fs.exists(metadataPath);
                if (!exists) {
                    return yield* Effect.fail(new RunManagementError({ reason: `Run info not found: ${runName}` }));
                }
                const content = yield* fs.readFileString(metadataPath);
                try {
                    const info = JSON.parse(content);
                    return {
                        ...info,
                        timestamp: new Date(info.timestamp),
                    };
                }
                catch (error) {
                    return yield* Effect.fail(new RunManagementError({ reason: `Invalid run info format: ${runName}` }));
                }
            }),
        };
    }),
    dependencies: []
}) {
}
