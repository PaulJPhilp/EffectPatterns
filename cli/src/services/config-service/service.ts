import { Effect, Data, Option } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import * as OS from "node:os";

export class ConfigError extends Data.TaggedError("ConfigError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export type AppConfig = Record<string, string>



export class ConfigService extends Effect.Service<ConfigService>()(
  "ConfigService",
  {
    effect: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const configDir = path.join(OS.homedir(), ".config", "ai-cli");
      const configFile = path.join(configDir, "config.json");

      const ensureConfigExists = Effect.gen(function* () {
        const dirExists = yield* fs.exists(configDir);
        if (!dirExists) {
          yield* fs.makeDirectory(configDir, { recursive: true });
        }
        const fileExists = yield* fs.exists(configFile);
        if (!fileExists) {
          yield* fs.writeFile(configFile, Buffer.from("{}", "utf-8"));
        }
      }).pipe(
        Effect.mapError((cause) => new ConfigError({ message: "Failed to ensure config file exists", cause }))
      );

      const readConfigFile: Effect.Effect<AppConfig, ConfigError, never> = fs.exists(configFile).pipe(
        Effect.mapError((cause) => new ConfigError({ message: "Failed to check if config file exists", cause })),
        Effect.flatMap((exists) =>
          exists
            ? fs.readFileString(configFile, "utf-8").pipe(
                Effect.mapError((cause) => new ConfigError({ message: "Failed to read config file", cause })),
                Effect.flatMap((content: string) =>
                  Effect.sync(() => {
                    try {
                      return JSON.parse(content) as AppConfig;
                    } catch (cause) {
                      throw new ConfigError({ message: "Failed to parse config file", cause });
                    }
                  })
                )
              )
            : Effect.succeed({})
        )
      );

      const writeConfigFile = (config: AppConfig) =>
        fs.writeFile(configFile, Buffer.from(JSON.stringify(config, null, 2), "utf-8")).pipe(
          Effect.mapError((cause) => new ConfigError({ message: "Failed to write config file", cause }))
        );

      const get = (key: string) =>
        readConfigFile.pipe(
          Effect.map((config) => Option.fromNullable(config[key]))
        );

      const set = (key: string, value: string) =>
        readConfigFile.pipe(
          Effect.flatMap((config) =>
            writeConfigFile({ ...config, [key]: value })
          )
        );

      const list = () => readConfigFile;

      const remove = (key: string) =>
        readConfigFile.pipe(
          Effect.flatMap((config) => {
            const { [key]: _, ...rest } = config;
            return writeConfigFile(rest);
          })
        );

      // System prompt methods
      const getSystemPromptFile = () => get("systemPromptFile");
      
      const setSystemPromptFile = (filePath: string) => set("systemPromptFile", filePath);
      
      const clearSystemPromptFile = () => remove("systemPromptFile");

      yield* ensureConfigExists;

      return {
        get,
        set,
        list,
        remove,
        getSystemPromptFile,
        setSystemPromptFile,
        clearSystemPromptFile
      } as const;
    }),
    dependencies: [NodeContext.layer]
  }
) {}
