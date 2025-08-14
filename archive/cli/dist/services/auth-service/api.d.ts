import { Effect } from "effect";
import { AuthService } from "./service.js";
declare const AuthApi_base: Effect.Service.Class<AuthApi, "AuthApi", {
    readonly accessors: true;
    readonly effect: Effect.Effect<{
        getApiKey: (provider: string) => Effect.Effect<import("effect/Option").Option<string>, import("@effect/platform/Error").PlatformError | import("./errors.js").AuthError, import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path>;
        setApiKey: (provider: string, apiKey: string) => Effect.Effect<void, import("@effect/platform/Error").PlatformError | import("./errors.js").AuthError, import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path>;
        removeApiKey: (provider: string) => Effect.Effect<void, import("@effect/platform/Error").PlatformError | import("./errors.js").AuthError, import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path>;
        listProviders: () => Effect.Effect<string[], import("@effect/platform/Error").PlatformError | import("./errors.js").AuthError, import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path>;
        getAllConfig: () => Effect.Effect<{
            [k: string]: {
                apiKey: string;
                provider: string;
                createdAt: string;
                lastUsed?: string;
            };
        }, import("@effect/platform/Error").PlatformError | import("./errors.js").AuthError, import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path>;
        getProviderConfig: (provider: string) => Effect.Effect<import("effect/Option").Option<import("./types.js").AuthConfig>, import("@effect/platform/Error").PlatformError | import("./errors.js").AuthError, import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path>;
        updateLastUsed: (provider: string) => Effect.Effect<void, import("@effect/platform/Error").PlatformError | import("./errors.js").AuthError, import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path>;
        isProviderConfigured: (provider: string) => Effect.Effect<boolean, import("@effect/platform/Error").PlatformError | import("./errors.js").AuthError, import("@effect/platform/FileSystem").FileSystem | import("@effect/platform/Path").Path>;
        authFile: () => Effect.Effect<string, never, import("@effect/platform/Path").Path>;
    }, never, AuthService>;
    readonly dependencies: readonly [import("effect/Layer").Layer<AuthService, never, never>];
}>;
export declare class AuthApi extends AuthApi_base {
}
export {};
//# sourceMappingURL=api.d.ts.map