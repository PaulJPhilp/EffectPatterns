declare const NoActiveRunError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "NoActiveRunError";
} & Readonly<A>;
export declare class NoActiveRunError extends NoActiveRunError_base<{
    reason: string;
}> {
}
export {};
//# sourceMappingURL=errors.d.ts.map