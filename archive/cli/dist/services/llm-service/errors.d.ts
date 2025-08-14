import { Providers } from "./types.js";
export declare const logError: (e: unknown) => import("effect/Effect").Effect<void, never, never>;
declare const InvalidMdxFormatError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "InvalidMdxFormatError";
} & Readonly<A>;
export declare class InvalidMdxFormatError extends InvalidMdxFormatError_base<{
    reason: string;
}> {
}
declare const InvalidFrontmatterError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "InvalidFrontmatterError";
} & Readonly<A>;
export declare class InvalidFrontmatterError extends InvalidFrontmatterError_base<{
    reason: string;
}> {
}
declare const UnsupportedProviderError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "UnsupportedProviderError";
} & Readonly<A>;
export declare class UnsupportedProviderError extends UnsupportedProviderError_base<{
    provider: string;
}> {
}
declare const InvalidJsonResponseError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "InvalidJsonResponseError";
} & Readonly<A>;
export declare class InvalidJsonResponseError extends InvalidJsonResponseError_base<{
    reason: string;
}> {
}
declare const FileReadError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "FileReadError";
} & Readonly<A>;
export declare class FileReadError extends FileReadError_base<{
    filePath: string;
    reason: string;
}> {
}
declare const LlmServiceError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "LlmServiceError";
} & Readonly<A>;
export declare class LlmServiceError extends LlmServiceError_base<{
    reason: string;
    provider: Providers;
}> {
}
declare const RateLimitError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "RateLimitError";
} & Readonly<A>;
export declare class RateLimitError extends RateLimitError_base<{
    provider: Providers;
    reason: string;
}> {
}
declare const QuotaExceededError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "QuotaExceededError";
} & Readonly<A>;
export declare class QuotaExceededError extends QuotaExceededError_base<{
    provider: Providers;
    reason: string;
}> {
}
export {};
//# sourceMappingURL=errors.d.ts.map