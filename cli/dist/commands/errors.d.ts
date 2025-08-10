declare const PlanError_InvalidRetries_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "PlanError_InvalidRetries";
} & Readonly<A>;
export declare class PlanError_InvalidRetries extends PlanError_InvalidRetries_base<{
    value: number;
}> {
}
declare const PlanError_InvalidRetryMs_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "PlanError_InvalidRetryMs";
} & Readonly<A>;
export declare class PlanError_InvalidRetryMs extends PlanError_InvalidRetryMs_base<{
    value: number;
}> {
}
declare const PlanError_InvalidFallbackSpec_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "PlanError_InvalidFallbackSpec";
} & Readonly<A>;
export declare class PlanError_InvalidFallbackSpec extends PlanError_InvalidFallbackSpec_base<{
    reason: string;
}> {
}
declare const GenerateError_SchemaPromptRequired_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "GenerateError_SchemaPromptRequired";
} & Readonly<A>;
export declare class GenerateError_SchemaPromptRequired extends GenerateError_SchemaPromptRequired_base<{}> {
}
declare const GenerateError_InvalidJson_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "GenerateError_InvalidJson";
} & Readonly<A>;
export declare class GenerateError_InvalidJson extends GenerateError_InvalidJson_base<{
    reason: string;
}> {
}
declare const GenerateError_NoJsonFound_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "GenerateError_NoJsonFound";
} & Readonly<A>;
export declare class GenerateError_NoJsonFound extends GenerateError_NoJsonFound_base<{}> {
}
declare const GenerateError_MissingInput_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "GenerateError_MissingInput";
} & Readonly<A>;
export declare class GenerateError_MissingInput extends GenerateError_MissingInput_base<{}> {
}
declare const DryRunError_MissingInput_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "DryRunError_MissingInput";
} & Readonly<A>;
export declare class DryRunError_MissingInput extends DryRunError_MissingInput_base<{}> {
}
export {};
