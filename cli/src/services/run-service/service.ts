import { Effect, Layer, Console } from "effect";
import { FileSystem } from "@effect/platform";
import { Path } from "@effect/platform";
import { RunInfo } from "./types.js";

export class RunService extends Effect.Service<RunService>()("RunService", {
  accessors: true,
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    
    let currentRun: RunInfo | null = null;
    
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
    
    const writeSequentialNumber = (number: number) => Effect.gen(function* () {
      const configPath = path.join(process.cwd(), ".ai-cli-config.json");
      const config = { sequentialNumber: number };
      
      yield* fs.writeFileString(configPath, JSON.stringify(config, null, 2));
    });
    
    const generateRunName = (prefix?: string, sequentialNumber?: number): string => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const prefixStr = prefix ? `${prefix}-` : "";
      const seqStr = sequentialNumber ? `${sequentialNumber.toString().padStart(4, "0")}-` : "";
      return `${prefixStr}${seqStr}${timestamp}`;
    };
    
    return {
      createRunDirectory: (namePrefix?: string) =>
        Effect.gen(function* () {
          const sequentialNumber = yield* readSequentialNumber;
          const runName = generateRunName(namePrefix, sequentialNumber);
          const runDirectory = path.join(process.cwd(), "runs", runName);
          
          // Create runs directory if it doesn't exist
          const runsDirPath = path.join(process.cwd(), "runs");
          const runsDirExists = yield* fs.exists(runsDirPath);
          if (!runsDirExists) {
            yield* fs.makeDirectory(runsDirPath, { recursive: true });
          }
          
          // Create run directory
          yield* fs.makeDirectory(runDirectory, { recursive: true });
          
          // Update sequential number
          yield* writeSequentialNumber(sequentialNumber);
          
          const timestamp = new Date().toISOString();
          
          yield* Console.info(`Created run directory: ${runDirectory}`);
          
          const runInfo: RunInfo = {
            runName,
            runDirectory,
            timestamp,
            sequentialNumber,
          };
          
          currentRun = runInfo;
          return runInfo;
        }),
        
      getRunPath: () =>
        Effect.gen(function* () {
          if (!currentRun) {
            return yield* Effect.fail(new Error("No active run"));
          }
          return currentRun.runDirectory;
        }),
        
      getRunFilePath: (filename: string) =>
        Effect.gen(function* () {
          if (!currentRun) {
            return yield* Effect.fail(new Error("No active run"));
          }
          return path.join(currentRun.runDirectory, filename);
        }),
        
      getCurrentRun: () =>
        Effect.succeed(currentRun),
    };
  }),
  dependencies: []
}) {}
