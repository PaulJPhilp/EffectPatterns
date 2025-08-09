declare const ConfigError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ConfigError";
} & Readonly<A>;
export declare class ConfigError extends ConfigError_base<{
    readonly message: string;
    readonly cause?: unknown;
}> {
}
export {};
