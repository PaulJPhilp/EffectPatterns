import { Effect, Option } from "effect";
import { FileSystem, Path } from "@effect/platform";
declare const AuthError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "AuthError";
} & Readonly<A>;
export declare class AuthError extends AuthError_base<{
    readonly message: string;
    readonly cause?: unknown;
}> {
}
export interface AuthConfig {
    readonly provider: string;
    readonly apiKey: string;
    readonly createdAt: string;
    readonly lastUsed?: string;
}
export interface ProviderConfig {
    readonly name: string;
    readonly apiKey: string;
    readonly baseUrl?: string;
    readonly model?: string;
}
declare const AuthService_base: Effect.Service.Class<AuthService, "AuthService", {
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
