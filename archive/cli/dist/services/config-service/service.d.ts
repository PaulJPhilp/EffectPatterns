import { Effect, Option } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { ConfigError } from "./errors.js";
import { AppConfig } from "./types.js";
declare const ConfigService_base: Effect.Service.Class<ConfigService, "ConfigService", {
    readonly effect: Effect.Effect<{
        readonly get: (key: string) => Effect.Effect<Option.Option<string>, ConfigError, never>;
        readonly set: (key: string, value: string) => Effect.Effect<void, ConfigError, never>;
        readonly list: () => Effect.Effect<AppConfig, ConfigError, never>;
        readonly remove: (key: string) => Effect.Effect<void, ConfigError, never>;
        readonly getSystemPromptFile: () => Effect.Effect<Option.Option<string>, ConfigError, never>;
        readonly setSystemPromptFile: (filePath: string) => Effect.Effect<void, ConfigError, never>;
        readonly clearSystemPromptFile: () => Effect.Effect<void, ConfigError, never>;
    }, ConfigError, FileSystem.FileSystem | Path.Path>;
    readonly dependencies: readonly [import("effect/Layer").Layer<NodeContext.NodeContext, never, never>];
}>;
export declare class ConfigService extends ConfigService_base {
}
export {};
//# sourceMappingURL=service.d.ts.map