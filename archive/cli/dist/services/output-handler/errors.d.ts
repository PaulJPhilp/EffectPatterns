declare const OutputHandlerError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "OutputHandlerError";
} & Readonly<A>;
export declare class OutputHandlerError extends OutputHandlerError_base {
    readonly message: string;
    readonly cause?: unknown;
    constructor(message: string, cause?: unknown);
}
export {};
//# sourceMappingURL=errors.d.ts.map