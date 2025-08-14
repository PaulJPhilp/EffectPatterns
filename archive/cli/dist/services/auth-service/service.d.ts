import { Effect, Option } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { AuthError } from "./errors.js";
import { AuthConfig } from "./types.js";
declare const AuthService_base: Effect.Service.Class<AuthService, "AuthService", {
    readonly accessors: true;
    readonly effect: Effect.Effect<{
        getApiKey: (provider: string) => Effect.Effect<Option.Option<string>, import("@effect/platform/Error").PlatformError | AuthError, FileSystem.FileSystem | Path.Path>;
        setApiKey: (provider: string, apiKey: string) => Effect.Effect<void, import("@effect/platform/Error").PlatformError | AuthError, FileSystem.FileSystem | Path.Path>;
        removeApiKey: (provider: string) => Effect.Effect<void, import("@effect/platform/Error").PlatformError | AuthError, FileSystem.FileSystem | Path.Path>;
        listProviders: () => Effect.Effect<string[], import("@effect/platform/Error").PlatformError | AuthError, FileSystem.FileSystem | Path.Path>;
        getAllConfig: () => Effect.Effect<{
            [k: string]: {
                apiKey: string;
                provider: string;
                createdAt: string;
                lastUsed?: string;
            };
        }, import("@effect/platform/Error").PlatformError | AuthError, FileSystem.FileSystem | Path.Path>;
        getProviderConfig: (provider: string) => Effect.Effect<Option.Option<AuthConfig>, import("@effect/platform/Error").PlatformError | AuthError, FileSystem.FileSystem | Path.Path>;
        updateLastUsed: (provider: string) => Effect.Effect<void, import("@effect/platform/Error").PlatformError | AuthError, FileSystem.FileSystem | Path.Path>;
        isProviderConfigured: (provider: string) => Effect.Effect<boolean, import("@effect/platform/Error").PlatformError | AuthError, FileSystem.FileSystem | Path.Path>;
        authFile: Effect.Effect<string, never, Path.Path>;
    }, never, never>;
    readonly dependencies: readonly [];
}>;
export declare class AuthService extends AuthService_base {
}
export {};
//# sourceMappingURL=service.d.ts.map