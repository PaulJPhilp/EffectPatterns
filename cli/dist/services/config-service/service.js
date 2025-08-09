import { Effect, Option } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import * as os from "node:os";
import { ConfigError } from "./errors.js";
export class ConfigService extends Effect.Service()("ConfigService", {
    effect: Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const configDir = path.join(os.homedir(), ".config", "ai-cli");
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
        }).pipe(Effect.mapError((cause) => new ConfigError({ message: "Failed to ensure config file exists", cause })));
        const readConfigFile = fs.exists(configFile).pipe(Effect.mapError((cause) => new ConfigError({ message: "Failed to check if config file exists", cause })), Effect.flatMap((exists) => exists
            ? fs.readFileString(configFile, "utf-8").pipe(Effect.mapError((cause) => new ConfigError({ message: "Failed to read config file", cause })), Effect.flatMap((content) => Effect.sync(() => {
                try {
                    return JSON.parse(content);
                }
                catch (cause) {
                    throw new ConfigError({ message: "Failed to parse config file", cause });
                }
            })))
            : Effect.succeed({})));
        const writeConfigFile = (config) => fs.writeFile(configFile, Buffer.from(JSON.stringify(config, null, 2), "utf-8")).pipe(Effect.mapError((cause) => new ConfigError({ message: "Failed to write config file", cause })));
        const get = (key) => readConfigFile.pipe(Effect.map((config) => Option.fromNullable(config[key])));
        const set = (key, value) => readConfigFile.pipe(Effect.flatMap((config) => writeConfigFile({ ...config, [key]: value })));
        const list = () => readConfigFile;
        const remove = (key) => readConfigFile.pipe(Effect.flatMap((config) => {
            const { [key]: _, ...rest } = config;
            return writeConfigFile(rest);
        }));
        // System prompt methods
        const getSystemPromptFile = () => get("systemPromptFile");
        const setSystemPromptFile = (filePath) => set("systemPromptFile", filePath);
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
        };
    }),
    dependencies: [NodeContext.layer]
}) {
}
