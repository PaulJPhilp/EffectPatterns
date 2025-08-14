import { Effect } from "effect";
import { ConfigError } from "effect/ConfigError";
import { AppConfig } from "./types.js";
export interface ConfigServiceApi {
    get: (key: string) => Effect.Effect<string, ConfigError>;
    set: (key: string, value: string) => Effect.Effect<void, ConfigError>;
    list: () => Effect.Effect<AppConfig, ConfigError>;
    remove: (key: string) => Effect.Effect<void, ConfigError>;
    getSystemPromptFile: () => Effect.Effect<string, ConfigError>;
    setSystemPromptFile: (filePath: string) => Effect.Effect<void, ConfigError>;
    clearSystemPromptFile: () => Effect.Effect<void, ConfigError>;
}
//# sourceMappingURL=api.d.ts.map