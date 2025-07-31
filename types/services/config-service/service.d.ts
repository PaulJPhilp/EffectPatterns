import { Effect, Option } from "effect";
import { FileSystem, Path } from "@effect/platform";
declare const ConfigError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ConfigError";
} & Readonly<A>;
export declare class ConfigError extends ConfigError_base<{
    readonly message: string;
    readonly cause?: unknown;
}> {
}
export type AppConfig = Record<string, string>;
declare const ConfigService_base: Effect.Service.Class<ConfigService, "ConfigService", {
    readonly effect: Effect.Effect<{
        get: (key: string) => Effect.Effect<Option.Option<string>, ConfigError, never>;
        set: (key: string, value: string) => Effect.Effect<void, ConfigError, never>;
        list: () => Effect.Effect<AppConfig, ConfigError, never>;
        configFile: Effect.Effect<string, never, never>;
    }, unknown, unknown>;
    readonly dependencies: readonly [import("effect/Layer").Layer<FileSystem.FileSystem, never, never>, import("effect/Layer").Layer<Path.Path, never, never>];
}>;
export declare class ConfigService extends ConfigService_base {
}
export {};
