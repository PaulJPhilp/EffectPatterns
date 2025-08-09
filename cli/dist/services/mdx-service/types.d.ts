export interface Frontmatter {
    readonly expectedOutput?: string;
    readonly expectedError?: string;
    needsReview?: boolean;
    readonly [key: string]: unknown;
}
export interface ParsedMdxFile {
    readonly content: string;
    readonly frontmatter: Frontmatter;
    readonly body: string;
}
export interface ParameterDefinition {
    type: "string" | "number" | "boolean" | "array" | "object";
    description?: string;
    required?: boolean;
    default?: unknown;
}
export interface PromptTemplate {
    readonly content: string;
    readonly parameters: Record<string, ParameterDefinition>;
    readonly body: string;
}
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
export {};
