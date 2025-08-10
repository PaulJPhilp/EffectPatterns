declare const ModelNotFoundError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ModelNotFoundError";
} & Readonly<A>;
export declare class ModelNotFoundError extends ModelNotFoundError_base<{
    modelName: string;
}> {
}
declare const ProviderNotFoundError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ProviderNotFoundError";
} & Readonly<A>;
export declare class ProviderNotFoundError extends ProviderNotFoundError_base<{
    providerName: string;
}> {
}
export {};
