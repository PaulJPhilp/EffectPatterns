declare const UnsupportedTemplateFileError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "UnsupportedTemplateFileError";
} & Readonly<A>;
export declare class UnsupportedTemplateFileError extends UnsupportedTemplateFileError_base<{
    reason: string;
}> {
}
declare const InvalidParameterTypeError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "InvalidParameterTypeError";
} & Readonly<A>;
export declare class InvalidParameterTypeError extends InvalidParameterTypeError_base<{
    param?: string;
    expected: string;
    got: string;
}> {
}
declare const MissingParametersError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "MissingParametersError";
} & Readonly<A>;
export declare class MissingParametersError extends MissingParametersError_base<{
    params: string[];
}> {
}
declare const UnknownParametersError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "UnknownParametersError";
} & Readonly<A>;
export declare class UnknownParametersError extends UnknownParametersError_base<{
    params: string[];
}> {
}
declare const TemplateRenderError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "TemplateRenderError";
} & Readonly<A>;
export declare class TemplateRenderError extends TemplateRenderError_base<{
    reason: string;
}> {
}
export {};
//# sourceMappingURL=errors.d.ts.map