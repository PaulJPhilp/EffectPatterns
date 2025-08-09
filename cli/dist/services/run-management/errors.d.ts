declare const RunManagementError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "RunManagementError";
} & Readonly<A>;
export declare class RunManagementError extends RunManagementError_base<{
    readonly reason: string;
    readonly cause?: unknown;
}> {
}
export {};
