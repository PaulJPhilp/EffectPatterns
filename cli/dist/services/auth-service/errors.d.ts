declare const AuthError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "AuthError";
} & Readonly<A>;
export declare class AuthError extends AuthError_base<{
    readonly message: string;
    readonly cause?: unknown;
}> {
}
export {};
