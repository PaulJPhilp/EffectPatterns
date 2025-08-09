import { FileSystem, Path } from "@effect/platform";
import { Console, Effect, Option } from "effect";
export class RunService extends Effect.Service()("RunService", {
    accessors: true,
    effect: Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        let currentRun = null;
        const readSequentialNumber = Effect.gen(function* () {
            const configPath = path.join(process.cwd(), ".ai-cli-config.json");
            const exists = yield* fs.exists(configPath);
            if (!exists) {
                return 1;
            }
            const content = yield* fs.readFileString(configPath);
            const config = JSON.parse(content);
            return (config.sequentialNumber || 0) + 1;
        });
        const writeSequentialNumber = (number) => Effect.gen(function* () {
            const configPath = path.join(process.cwd(), ".ai-cli-config.json");
            const config = { sequentialNumber: number };
            yield* fs.writeFileString(configPath, JSON.stringify(config, null, 2));
        });
        const generateRunName = (prefix, sequentialNumber) => {
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const prefixStr = prefix ? `${prefix}-` : "";
            const seqStr = sequentialNumber
                ? `${sequentialNumber.toString().padStart(4, "0")}-`
                : "";
            return `${prefixStr}${seqStr}${timestamp}`;
        };
        // Persist current run pointer in user config dir for cross-process access
        const getPointerPath = Effect.gen(function* () {
            const home = process.env.HOME || process.env.USERPROFILE || process.cwd();
            const pointerDir = path.join(home, ".config", "ai-cli");
            const pointerFile = path.join(pointerDir, "current-run.json");
            const dirExists = yield* fs.exists(pointerDir);
            if (!dirExists) {
                yield* fs.makeDirectory(pointerDir, { recursive: true });
            }
            return pointerFile;
        });
        const writeCurrentRunPointer = (info) => Effect.gen(function* () {
            const pointerFile = yield* getPointerPath;
            if (info === null) {
                const exists = yield* fs.exists(pointerFile);
                if (exists) {
                    // Clear file
                    yield* fs.writeFileString(pointerFile, JSON.stringify({}, null, 2));
                }
                return;
            }
            const content = JSON.stringify(info, null, 2);
            yield* fs.writeFileString(pointerFile, content);
        });
        const readCurrentRunPointer = Effect.gen(function* () {
            const pointerFile = yield* getPointerPath;
            const exists = yield* fs.exists(pointerFile);
            if (!exists) {
                return Option.none();
            }
            const content = yield* fs
                .readFileString(pointerFile)
                .pipe(Effect.catchAll(() => Effect.succeed("{}")));
            try {
                const parsed = JSON.parse(content);
                return parsed?.runDirectory && parsed?.runName
                    ? Option.some(parsed)
                    : Option.none();
            }
            catch {
                return Option.none();
            }
        });
        return {
            createRunDirectory: (namePrefix) => Effect.gen(function* () {
                const sequentialNumber = yield* readSequentialNumber;
                const runName = generateRunName(namePrefix, sequentialNumber);
                const runDirectory = path.join(process.cwd(), "runs", runName);
                // Create runs directory if it doesn't exist
                const runsDirPath = path.join(process.cwd(), "runs");
                const runsDirExists = yield* fs.exists(runsDirPath);
                if (!runsDirExists) {
                    yield* fs.makeDirectory(runsDirPath, { recursive: true });
                }
                // Create run directory and standard subdirectories
                yield* fs.makeDirectory(runDirectory, { recursive: true });
                yield* fs.makeDirectory(path.join(runDirectory, "outputs"), {
                    recursive: true,
                });
                yield* fs.makeDirectory(path.join(runDirectory, "logs"), {
                    recursive: true,
                });
                yield* fs.makeDirectory(path.join(runDirectory, "metrics"), {
                    recursive: true,
                });
                // Update sequential number
                yield* writeSequentialNumber(sequentialNumber);
                const timestamp = new Date().toISOString();
                yield* Console.info(`Created run directory: ${runDirectory}`);
                const runInfo = {
                    runName,
                    runDirectory,
                    timestamp,
                    sequentialNumber,
                };
                // Persist run metadata for discovery by list/info commands
                const metadataPath = path.join(runDirectory, "run-info.json");
                yield* fs.writeFileString(metadataPath, JSON.stringify(runInfo, null, 2));
                currentRun = runInfo;
                // Persist pointer for other commands/sessions
                yield* writeCurrentRunPointer(runInfo);
                return runInfo;
            }),
            getRunPath: () => Effect.gen(function* () {
                if (!currentRun) {
                    const pointer = yield* readCurrentRunPointer;
                    if (Option.isNone(pointer)) {
                        return yield* Effect.fail(new Error("No active run"));
                    }
                    currentRun = pointer.value;
                }
                return currentRun.runDirectory;
            }),
            getRunFilePath: (filename) => Effect.gen(function* () {
                if (!currentRun) {
                    const pointer = yield* readCurrentRunPointer;
                    if (Option.isNone(pointer)) {
                        return yield* Effect.fail(new Error("No active run"));
                    }
                    currentRun = pointer.value;
                }
                return path.join(currentRun.runDirectory, filename);
            }),
            getCurrentRun: () => Effect.gen(function* () {
                if (currentRun) {
                    return currentRun;
                }
                const pointer = yield* readCurrentRunPointer;
                return Option.getOrElse(pointer, () => null);
            }),
            setCurrentRun: (run) => Effect.gen(function* () {
                currentRun = run;
                yield* writeCurrentRunPointer(run);
            }),
            clearCurrentRun: () => Effect.gen(function* () {
                currentRun = null;
                yield* writeCurrentRunPointer(null);
            }),
        };
    }),
    dependencies: [],
}) {
}
